"""
RAG Forge – Re-Ranker Service
Uses a free cross-encoder model (ms-marco-MiniLM-L-6-v2) locally.
Cross-encoders see the full (query, chunk) pair → much better relevance than cosine.
"""
from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from app.core.config import settings

logger = logging.getLogger(__name__)


class ReRankerService:
    """Singleton cross-encoder re-ranker."""

    _instance: "ReRankerService | None" = None
    _model = None

    def __new__(cls) -> "ReRankerService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @property
    def model(self):
        if self._model is None:
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading re-ranker model: {settings.reranker_model}")
            self._model = CrossEncoder(settings.reranker_model, max_length=512)
        return self._model

    def rerank(
        self,
        query: str,
        candidates: list[dict],
        top_n: int = 5,
    ) -> tuple[list[dict], float]:
        """
        Re-rank candidate chunks using cross-encoder.

        Args:
            query: User question
            candidates: List of {id, text, metadata, score, ...}
            top_n: Number of best chunks to return

        Returns:
            (reranked_chunks, elapsed_ms)
        """
        if not candidates:
            return [], 0.0

        t0 = time.time()

        # Build (query, passage) pairs
        pairs = [(query, c["text"]) for c in candidates]

        # Cross-encoder scores — higher = more relevant
        scores = self.model.predict(pairs)

        # Attach re-rank scores
        for chunk, score in zip(candidates, scores):
            chunk["rerank_score"] = round(float(score), 4)

        # Sort descending by rerank score
        ranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
        top = ranked[:top_n]

        elapsed_ms = (time.time() - t0) * 1000
        logger.debug(f"Re-ranked {len(candidates)} chunks → top {top_n} in {elapsed_ms:.1f}ms")
        return top, elapsed_ms

    def score_pair(self, query: str, text: str) -> float:
        """Score a single (query, text) pair."""
        score = self.model.predict([(query, text)])
        return float(score[0])