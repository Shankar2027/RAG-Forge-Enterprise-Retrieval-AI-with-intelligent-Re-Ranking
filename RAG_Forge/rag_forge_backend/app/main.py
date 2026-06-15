"""
RAG Forge – FastAPI Application Entry Point
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, collections, dashboard, documents, rag

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    logger.info("Starting RAG Forge backend…")
    await init_db()
    logger.info("Database initialized")
    try:
        from app.services.vector_store import VectorStoreService
        # Trigger embedder initialization
        _ = VectorStoreService().embedder
        logger.info("Embedding model loaded")
    except Exception as e:
        logger.warning(f"Could not pre-load embedding model: {e}")
    yield
    logger.info("Shutting down RAG Forge")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise Retrieval-Augmented Generation with Re-Ranker",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url, 
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.59.110.138:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
PREFIX = "/api"
app.include_router(auth.router,         prefix=PREFIX)
app.include_router(collections.router, prefix=PREFIX)
app.include_router(documents.router,   prefix=PREFIX)
app.include_router(rag.router,         prefix=PREFIX)
app.include_router(dashboard.router,   prefix=PREFIX)

@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


# ── Frontend Static Asset Management ──────────────────────────────
# Resolves the 'static' directory copied by the Stage 2 Docker container
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.exists():
    logger.info(f"Production static UI assets detected at: {STATIC_DIR}")
    
    # Mount Vite/React asset folders safely if they are compiled
    ASSETS_DIR = STATIC_DIR / "assets"
    if ASSETS_DIR.exists():
        app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

    @app.get("/")
    async def root():
        """Serves the main entry point of the React app."""
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": f"Welcome to {settings.app_name} API", "docs": "/docs"}

    @app.get("/{catchall:path}")
    async def frontend_catchall(catchall: str):
        """
        Enables seamless page reloads for React Router (SPA Single Page App routing).
        Bypasses API, documentation, and health checking endpoints.
        """
        if catchall.startswith(("api", "docs", "redoc", "openapi.json", "health")):
            # Fallthrough to FastAPI standard 404 handlers instead of rendering the index page
            return None
            
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Static assets missing or build incomplete"}
else:
    logger.warning("Static UI assets directory not found. Defaulting to standalone API mode.")
    
    @app.get("/")
    async def root():
        return {"message": f"Welcome to {settings.app_name} API (Standalone Mode)", "docs": "/docs"}


# ── Debugging Helper ──────────────────────────────────────────────
@app.on_event("startup")
def print_routes():
    for route in app.routes:
        if hasattr(route, "path"):
            logger.debug(f"Registered path: {route.path}")