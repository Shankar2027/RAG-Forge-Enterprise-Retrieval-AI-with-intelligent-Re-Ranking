"""
RAG Forge – Core Configuration
Reads settings from .env / environment variables.
"""
import os
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────
    app_name: str = "RAG Forge"
    app_version: str = "1.0.0"
    debug: bool = False  # Set to False for production
    secret_key: str = "change-me-in-production-use-32-char-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    
    # DYNAMIC FRONTEND URL
    # If the app is on HF, it uses the space URL. Otherwise, defaults to localhost.
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # ── Database ─────────────────────────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./ragforge.db"

    # ── ChromaDB ─────────────────────────────────────────────────
    chroma_persist_dir: str = "./chroma_db"
    chroma_collection_prefix: str = "ragforge"

    # ── Embeddings & Reranker ────────────────────────────────────
    embedding_model: str = "all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    embedding_dimension: int = 384

    # ── LLM ──────────────────────────────────────────────────────
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    groq_api_key: str = ""
    groq_model: str = "llama3-8b-8192"

    # ── File Storage ─────────────────────────────────────────────
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 100
    allowed_extensions: str = ".pdf,.docx,.txt,.html"

    # ── RAG Pipeline Defaults ────────────────────────────────────
    default_chunk_size: int = 512
    default_chunk_overlap: int = 150  # Synced to 150 to bridge logical gaps in docs
    default_top_k: int = 15
    default_rerank_top_n: int = 5
    default_max_tokens: int = 2048

    # ── OTP & Email ──────────────────────────────────────────────
    otp_expire_minutes: int = 10
    
    # Google Apps Script Webhook (Bypasses HF SMTP blocks)
    apps_script_url: str = ""

    @property
    def allowed_ext_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_extensions.split(",")]

    @property
    def upload_path(self) -> Path:
        # If running inside Hugging Face Spaces, map storage to the persistent volume
        if os.getenv("HF_SPACE"):
            p = Path("/data/uploads")
        else:
            p = Path(self.upload_dir)
            
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def chroma_path(self) -> Path:
        # Check if an explicit persistent dir is provided, otherwise default to HF volume if present
        explicit_persist_dir = os.getenv("PERSIST_DIR")
        
        if explicit_persist_dir:
            p = Path(explicit_persist_dir)
        elif os.getenv("HF_SPACE"):
            p = Path("/data/chroma_db")
        else:
            p = Path(self.chroma_persist_dir)
            
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()