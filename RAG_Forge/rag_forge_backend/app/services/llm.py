"""
RAG Forge – LLM Service
Supports Ollama and Groq with proper streaming and answer collection for logging.
"""
from __future__ import annotations

import json
import logging
import time
from typing import AsyncGenerator, Tuple

import httpx
import numpy as np
import math

from app.core.config import settings
from app.schemas.schemas import Citation

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are RAG Forge, an enterprise knowledge assistant.
Answer ONLY using the provided context chunks below. Do NOT use external knowledge.

Rules:
1. If the answer is found in the context, answer clearly and cite [DocumentName | Chunk ID].
2. If the answer is NOT in the context, respond EXACTLY: "Not found in the knowledge base."
3. Be concise and factual. Never hallucinate.
4. Use citations at the end of every factual sentence.
5. Format citations as: [filename | chunk_N]
6. LOGICAL INFERENCE: When evaluating numerical thresholds (like performance ratings or ranges), 
   treat them as mathematical boundaries ($>=$ or $<=$). If a specific value (e.g., 3.5) is not 
   explicitly listed but falls within a defined threshold, apply the corresponding rule logically.

Context:
{context}
"""

def build_context(chunks: list[dict]) -> tuple[str, list[Citation]]:
    parts: list[str] = []
    citations: list[Citation] = []
    for i, chunk in enumerate(chunks):
        meta = chunk.get("metadata", {})
        doc_name = meta.get("document_name", "Unknown")
        chunk_idx = meta.get("chunk_index", i)
        label = f"[{doc_name} | chunk_{chunk_idx}]"
        parts.append(f"{label}\n{chunk.get('text', '')}")
        citations.append(Citation(
            document_name=doc_name,
            chunk_id=chunk.get("id", "unknown"),
            chunk_index=chunk_idx,
            page_number=meta.get("page_number"),
        ))
    return "\n\n---\n\n".join(parts), citations

def compute_confidence(reranked_chunks: list[dict]) -> float:
    """Calculates an accurate confidence 0-100% based on the BEST retrieval score."""
    if not reranked_chunks: 
        return 0.0
    
    # Check if we have cross-encoder logits or standard vector cosine scores
    has_rerank = False
    for c in reranked_chunks:
        if isinstance(c, dict) and c.get("rerank_score") is not None:
            has_rerank = True
            break
        elif hasattr(c, "rerank_score") and getattr(c, "rerank_score") is not None:
            has_rerank = True
            break
            
    if has_rerank:
        # Cross-encoder logits can be negative (-10 to +10)
        scores = []
        for c in reranked_chunks:
            score = c.get("rerank_score") if isinstance(c, dict) else getattr(c, "rerank_score", None)
            if score is not None:
                scores.append(float(score))
                
        if not scores:
            return 0.0
            
        # Use the single best score
        best_score = float(max(scores))
        
        # 1:1 match with frontend Platt Scaling logic
        # Shift logit by +5 and scale by 0.5 to normalize negative MS-MARCO biases
        normalized = 1 / (1 + math.exp(-(best_score + 5) * 0.5))
        return round(normalized * 100, 1)
    else:
        # Standard vector cosine similarity
        scores = []
        for c in reranked_chunks:
            if isinstance(c, dict):
                score = c.get("similarity_score", c.get("score", 0.0))
            else:
                score = getattr(c, "similarity_score", getattr(c, "score", 0.0))
            if score is not None:
                scores.append(float(score))
                
        if not scores:
            return 0.0
            
        # Use the single best score
        best_score = float(max(scores))
        return round(best_score * 100, 1)

class GroqLLM:
    def __init__(self):
        from groq import AsyncGroq
        self.client = AsyncGroq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    async def generate(self, prompt: str) -> tuple[str, float]:
        t0 = time.time()
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.1,
        )
        elapsed = (time.time() - t0) * 1000
        return response.choices[0].message.content or "", elapsed

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
            temperature=0.1,
            stream=True,
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token

class LLMService:
    def __init__(self):
        self._llm = GroqLLM()

    def _build_prompt(self, question: str, context: str) -> str:
        system = SYSTEM_PROMPT.format(context=context)
        return f"{system}\n\nQuestion: {question}\n\nAnswer:"

    async def answer(self, question: str, reranked_chunks: list[dict]) -> tuple[str, list[Citation], float, float]:
        context, citations = build_context(reranked_chunks)
        prompt = self._build_prompt(question, context)
        text, elapsed = await self._llm.generate(prompt)
        confidence = compute_confidence(reranked_chunks)
        return text.strip(), citations, confidence, elapsed

    async def stream_answer(self, question: str, reranked_chunks: list[dict]) -> AsyncGenerator[str, None]:
        context, _ = build_context(reranked_chunks)
        prompt = self._build_prompt(question, context)
        async for token in self._llm.stream(prompt):
            yield token