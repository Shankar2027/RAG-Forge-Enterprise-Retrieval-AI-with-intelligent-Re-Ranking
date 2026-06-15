"""
RAG Forge – ChromaDB Vector Store Service (free, local, persistent)
"""
from __future__ import annotations

import logging
import os
import numpy as np
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Wraps ChromaDB with sentence-transformers embeddings and hybrid search capabilities."""

    _instance: "VectorStoreService | None" = None
    _client: chromadb.PersistentClient | None = None
    _embedder: SentenceTransformer | None = None

    def __new__(cls) -> "VectorStoreService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def client(self) -> chromadb.PersistentClient:
        if self._client is None:
            # Ensure your config.py points settings.chroma_path to your persistent volume (e.g., "/data/chroma_db")
            chroma_path = str(settings.chroma_path)
            logger.info(f"Initializing Persistent ChromaDB client at: {chroma_path}")
            
            self._client = chromadb.PersistentClient(
                path=chroma_path,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return self._client

    @property
    def embedder(self) -> SentenceTransformer:
        if self._embedder is None:
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            self._embedder = SentenceTransformer(settings.embedding_model)
        return self._embedder

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        if not texts:
            return []
        embeddings = self.embedder.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        return embeddings.tolist()

    def get_or_create_collection(self, name: str) -> chromadb.Collection:
        return self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        collection_name: str,
        ids: list[str],
        texts: list[str],
        metadatas: list[dict],
        batch_size: int = 100,
    ) -> None:
        """Embed and store documents securely in batches."""
        col = self.get_or_create_collection(collection_name)

        for i in range(0, len(texts), batch_size):
            batch_ids = ids[i : i + batch_size]
            batch_texts = texts[i : i + batch_size]
            batch_meta = metadatas[i : i + batch_size]
            batch_embeddings = self.embed(batch_texts)
            
            col.upsert(
                ids=batch_ids,
                embeddings=batch_embeddings,
                documents=batch_texts,
                metadatas=batch_meta,
            )
            logger.debug(f"Stored batch {i // batch_size + 1} ({len(batch_ids)} chunks)")

    def vector_search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 15,
        where: dict | None = None,
    ) -> list[dict]:
        """
        Semantic vector search.
        Returns list of {id, text, metadata, score}.
        """
        col = self.get_or_create_collection(collection_name)
        total_elements = col.count()
        
        if total_elements == 0:
            return []

        query_embedding = self.embed([query])[0]

        kwargs: dict = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, total_elements),
            "include": ["documents", "metadatas", "distances"],
        }
        if where:
            kwargs["where"] = where

        results = col.query(**kwargs)

        if not results or not results["ids"] or not results["ids"][0]:
            return []

        output: list[dict] = []
        for i, doc_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i]
            # Convert cosine distance [0,2] → similarity [0,1]
            similarity = 1.0 - (distance / 2.0)
            output.append({
                "id": doc_id,
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "score": round(max(0.0, min(1.0, similarity)), 4),
            })

        return sorted(output, key=lambda x: x["score"], reverse=True)

    def keyword_search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 15,
        where: dict | None = None,
    ) -> list[dict]:
        """
        BM25 keyword search over stored documents.
        Returns list of {id, text, metadata, score}.
        
        Note: Fetches the matching subset into memory for BM25 calculations. 
        Optimized for targeted document sizes or specialized domains.
        """
        col = self.get_or_create_collection(collection_name)
        
        if col.count() == 0:
            return []

        # Fetch documents matching the metadata constraints
        kwargs: dict = {"include": ["documents", "metadatas"]}
        if where:
            kwargs["where"] = where

        all_docs = col.get(**kwargs)
        if not all_docs or not all_docs["ids"]:
            return []

        tokenized_corpus = [doc.lower().split() for doc in all_docs["documents"]]
        bm25 = BM25Okapi(tokenized_corpus)
        query_tokens = query.lower().split()
        scores = bm25.get_scores(query_tokens)

        # Safeguard top_k boundaries
        actual_top_k = min(top_k, len(all_docs["ids"]))
        top_indices = np.argsort(scores)[::-1][:actual_top_k]

        results = []
        max_score = max(scores[top_indices]) if len(top_indices) > 0 else 1.0
        
        for idx in top_indices:
            if scores[idx] > 0:
                results.append({
                    "id": all_docs["ids"][idx],
                    "text": all_docs["documents"][idx],
                    "metadata": all_docs["metadatas"][idx],
                    "score": round(float(scores[idx]) / max(max_score, 1.0), 4),
                })

        return results

    def hybrid_search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 15,
        alpha: float = 0.5,
        where: dict | None = None,
    ) -> list[dict]:
        """
        Hybrid search: alpha * vector_score + (1-alpha) * keyword_score.
        Returns fused, de-duplicated results matching metadata filters.
        """
        # Retrieve candidate pools
        vector_results = self.vector_search(collection_name, query, top_k * 2, where=where)
        keyword_results = self.keyword_search(collection_name, query, top_k * 2, where=where)

        if not vector_results and not keyword_results:
            return []

        # Merge scores by document ID
        scores: dict[str, dict] = {}
        for r in vector_results:
            scores[r["id"]] = {**r, "vector_score": r["score"], "keyword_score": 0.0}
            
        for r in keyword_results:
            if r["id"] in scores:
                scores[r["id"]]["keyword_score"] = r["score"]
            else:
                scores[r["id"]] = {**r, "vector_score": 0.0, "keyword_score": r["score"]}

        # Compute combined hybrid score
        for item in scores.values():
            item["score"] = round(alpha * item["vector_score"] + (1 - alpha) * item["keyword_score"], 4)

        fused = sorted(scores.values(), key=lambda x: x["score"], reverse=True)
        return fused[:top_k]

    def delete_by_document(self, collection_name: str, document_id: str) -> None:
        """Deletes all chunks belonging to a specific document ID."""
        try:
            col = self.get_or_create_collection(collection_name)
            col.delete(where={"document_id": document_id})
            logger.info(f"Successfully deleted vectors for document_id: {document_id}")
        except Exception as e:
            logger.warning(f"Could not delete vectors for doc {document_id}: {e}")

    def delete_collection(self, collection_name: str) -> None:
        """Drops an entire collection from storage."""
        try:
            self.client.delete_collection(collection_name)
            logger.info(f"Successfully dropped collection: {collection_name}")
        except Exception as e:
            logger.warning(f"Could not delete collection {collection_name}: {e}")

    def collection_count(self, collection_name: str) -> int:
        """Returns the complete element count inside the collection."""
        try:
            col = self.get_or_create_collection(collection_name)
            return col.count()
        except Exception:
            return 0