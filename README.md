<!-- Banner -->
<div align="center">

<img src="https://img.shields.io/badge/RAG%20Forge-Enterprise%20AI-4F46E5?style=for-the-badge&logo=zap&logoColor=white" alt="RAG Forge"/>

# ⚡ RAG Forge

### Enterprise Retrieval-Augmented Generation Platform

**Upload documents · Ask questions · Get cited, grounded answers — powered entirely by free, open-source tools.**

<br/>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-FF6B35?style=flat-square)](https://www.trychroma.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<br/>

[**Live Demo**](#) · [**Docs**](#documentation) · [**Quick Start**](#quick-start) · [**Architecture**](#architecture)

</div>

---

## 📋 Table of Contents

- [What is RAG Forge?](#what-is-rag-forge)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Quick Start](#quick-start)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [RAG Pipeline Deep Dive](#rag-pipeline-deep-dive)
- [API Reference](#api-reference)
- [Frontend Pages](#frontend-pages)
- [Design System](#design-system)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## What is RAG Forge?

RAG Forge is a **full-stack, production-ready Retrieval-Augmented Generation (RAG) platform** that lets you build a private, enterprise-grade AI knowledge base from your own documents — with zero cloud vendor lock-in and zero cost for compute.

You upload PDFs, DOCX files, text files, or HTML pages. RAG Forge parses them, splits them into semantically meaningful chunks, embeds them into a local vector database, and makes them instantly queryable through a beautiful chat interface. Every answer is **grounded in your documents only**, with **source citations** and **confidence scores** — no hallucinations, no external data leakage.

```
Your Documents → Parse → Chunk → Embed → ChromaDB
                                              ↓
Your Question → Embed → Vector Search → Re-Rank → LLM → Cited Answer
```

---

## Key Features

### 🏗 Full RAG Pipeline
- **Multi-format ingestion** — PDF (PyMuPDF), DOCX (python-docx), TXT, HTML (BeautifulSoup)
- **Sentence-aware chunking** with configurable size and overlap
- **Local vector embeddings** via `sentence-transformers` (384-dim, runs on CPU)
- **ChromaDB** persistent vector store with cosine similarity search
- **BM25 keyword search** with optional hybrid fusion (α-weighted)
- **Cross-encoder re-ranking** (`ms-marco-MiniLM-L-6-v2`) for precision
- **Grounded LLM answers** — model is constrained to answer only from context

### 🤖 LLM Flexibility
- **Ollama** (default) — fully local, 100% free, supports Llama 3.2, Mistral, Phi-3 and any pulled model
- **Groq** — free-tier cloud inference, sub-second latency on `llama3-8b-8192`
- Streaming SSE responses with real-time token delivery to the browser

### 🔐 Auth & Multi-tenancy
- JWT access + refresh token authentication
- Per-user collection isolation — users only see their own data
- OTP-based password reset (SMTP or console output in dev)
- Bcrypt password hashing via passlib

### 📊 Observability
- Every query logged with full pipeline telemetry: retrieval ms, rerank ms, LLM ms, total ms
- Confidence score derived from cross-encoder scores (sigmoid-normalized)
- Retrieved and reranked chunks stored per query for debugging
- Dashboard with real-time KPIs, 14-day activity chart, document-type breakdown

### 🎨 Premium UI
- Deep-space dark design system (not a template)
- Collapsible sidebar navigation
- Drag-and-drop file upload with real-time status polling
- Streaming chat with expandable source panels and score bars
- Fully responsive

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React)                          │
│  Auth ─ Collections ─ Documents ─ Ask AI ─ History ─ Dashboard  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / SSE
┌────────────────────────────▼────────────────────────────────────┐
│                    FASTAPI BACKEND                              │
│                                                                 │
│   /api/auth   /api/collections   /api/documents   /api/rag      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    RAG PIPELINE                          │   │
│  │                                                          │   │
│  │  Query ──► VectorStore.search() ──► ReRanker.rerank()   │   │
│  │               (ChromaDB)         (cross-encoder)        │   │
│  │                    │                      │             │   │
│  │                    ▼                      ▼             │   │
│  │           Top-K chunks          Top-N reranked chunks   │   │
│  │                                          │             │   │
│  │                                 LLMService.answer()     │   │
│  │                                (Ollama / Groq)          │   │
│  │                                          │             │   │
│  │                                   Cited Answer          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IngestionService                  SQLAlchemy (AsyncSession)    │
│    parse → clean → chunk → embed   SQLite (aiosqlite)           │
└─────────────────────────────────────────────────────────────────┘
              │                              │
    ┌─────────▼──────┐            ┌──────────▼────────┐
    │   ChromaDB      │            │   SQLite DB        │
    │  (local, disk)  │            │  (ragforge.db)     │
    │  vector store   │            │  users/collections │
    │  embeddings     │            │  documents/chunks  │
    └─────────────────┘            │  query_logs        │
                                   └────────────────────┘
```

---

## Tech Stack

### Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Web Framework** | [FastAPI](https://fastapi.tiangolo.com) | 0.111 | Async REST API, OpenAPI docs, SSE streaming |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org) | 0.30 | Production-grade async server |
| **Database ORM** | [SQLAlchemy](https://www.sqlalchemy.org) | 2.0 | Async ORM with type-safe mapped columns |
| **Database** | SQLite + [aiosqlite](https://github.com/omnilib/aiosqlite) | — | Zero-setup, file-based, async-compatible |
| **Migrations** | [Alembic](https://alembic.sqlalchemy.org) | 1.13 | Schema versioning |
| **Vector Store** | [ChromaDB](https://www.trychroma.com) | 0.5 | Local persistent vector DB, cosine similarity |
| **Embeddings** | [sentence-transformers](https://sbert.net) | 3.0 | `all-MiniLM-L6-v2` — 384-dim, CPU-friendly |
| **Re-Ranker** | [sentence-transformers CrossEncoder](https://sbert.net) | 3.0 | `ms-marco-MiniLM-L-6-v2` — precision re-ranking |
| **Keyword Search** | [rank-bm25](https://github.com/dorianbrown/rank_bm25) | 0.2 | BM25 Okapi for hybrid retrieval |
| **LLM (local)** | [Ollama](https://ollama.ai) | 0.2 | Local inference — Llama 3.2, Mistral, Phi-3 |
| **LLM (cloud)** | [Groq SDK](https://groq.com) | 0.9 | Free-tier fast cloud inference |
| **PDF Parsing** | [PyMuPDF](https://pymupdf.readthedocs.io) (fitz) | 1.24 | High-quality text + page extraction |
| **DOCX Parsing** | [python-docx](https://python-docx.readthedocs.io) | 1.1 | Paragraphs, tables, styles |
| **HTML Parsing** | [BeautifulSoup4](https://beautifulsoup.readthedocs.io) + lxml | 4.12 | Clean text extraction, tag removal |
| **Auth** | [python-jose](https://python-jose.readthedocs.io) + [passlib](https://passlib.readthedocs.io) | — | JWT (HS256) + bcrypt hashing |
| **Validation** | [Pydantic v2](https://docs.pydantic.dev) + pydantic-settings | 2.7 | Schema validation, settings management |
| **HTTP Client** | [httpx](https://www.python-httpx.org) | 0.27 | Async HTTP for Ollama API calls |
| **Utilities** | tenacity, tiktoken, numpy, aiofiles | — | Retry logic, token counting, file I/O |
| **Config** | python-dotenv | 1.0 | `.env` loading |

### Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | [React](https://react.dev) | 18.3 | Component model, concurrent features |
| **Language** | [TypeScript](https://www.typescriptlang.org) | 5.4 | Full type safety across all layers |
| **Build Tool** | [Vite](https://vitejs.dev) | 5.3 | Sub-second HMR, optimized production builds |
| **Routing** | [React Router](https://reactrouter.com) | v6.23 | Client-side routing, protected routes |
| **Server State** | [TanStack Query](https://tanstack.com/query) | v5.45 | Data fetching, caching, background refetch |
| **Global State** | [Zustand](https://zustand-demo.pmnd.rs) | 4.5 | Auth store with localStorage persistence |
| **HTTP Client** | [Axios](https://axios-http.com) | 1.7 | API calls, request/response interceptors |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | 3.4 | Utility-first, custom design tokens |
| **Charts** | [Recharts](https://recharts.org) | 2.12 | Area charts, pie charts, tooltips |
| **Icons** | [Lucide React](https://lucide.dev) | 0.400 | 1,400+ consistent SVG icons |
| **File Upload** | [react-dropzone](https://react-dropzone.js.org) | 14.2 | Drag-and-drop, MIME type filtering |
| **Markdown** | [react-markdown](https://github.com/remarkjs/react-markdown) | 9.0 | Render LLM markdown answers |
| **Animations** | [Framer Motion](https://www.framer.com/motion) | 11.2 | Page transitions, micro-interactions |
| **Notifications** | [react-hot-toast](https://react-hot-toast.com) | 2.4 | Non-intrusive toast notifications |
| **Date Utils** | [date-fns](https://date-fns.org) | 3.6 | Date formatting, relative times |
| **Classnames** | [clsx](https://github.com/lukeed/clsx) | 2.1 | Conditional class merging |
| **Fonts** | Inter + JetBrains Mono | — | UI typeface + monospace for data |

### Infrastructure & Tooling

| Tool | Purpose |
|------|---------|
| PostCSS + Autoprefixer | CSS processing and browser compatibility |
| ESLint + TypeScript ESLint | Code quality and type-aware linting |
| `tsconfig.json` strict mode | Maximum type safety |
| Vite proxy | Dev API proxying to avoid CORS in development |

---

## File Structure

```
ragforge/
│
├── 📁 backend/                        # FastAPI application
│   ├── 📄 main.py                     # App entry point, middleware, router registration
│   ├── 📄 requirements.txt            # All Python dependencies
│   ├── 📄 .env.example                # Environment variable template
│   │
│   ├── 📁 app/
│   │   ├── 📁 api/                    # HTTP route handlers
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 auth.py             # Register, login, refresh, OTP, /me
│   │   │   ├── 📄 collections.py      # CRUD for document collections
│   │   │   ├── 📄 documents.py        # Upload, status, chunks, reindex, delete
│   │   │   ├── 📄 rag.py              # /ask, /ask/stream (SSE), /logs
│   │   │   └── 📄 dashboard.py        # KPI stats, activity time-series
│   │   │
│   │   ├── 📁 core/                   # App-wide configuration
│   │   │   ├── 📄 config.py           # Pydantic Settings — all env vars
│   │   │   ├── 📄 database.py         # Async SQLAlchemy engine + session
│   │   │   └── 📄 security.py         # JWT creation/decode, bcrypt, OTP
│   │   │
│   │   ├── 📁 models/
│   │   │   └── 📄 models.py           # SQLAlchemy ORM: User, Collection,
│   │   │                              #   Document, Chunk, QueryLog
│   │   │
│   │   ├── 📁 schemas/
│   │   │   └── 📄 schemas.py          # Pydantic v2 request/response models
│   │   │
│   │   └── 📁 services/               # Business logic layer
│   │       ├── 📄 ingestion.py        # Parse → clean → chunk → embed pipeline
│   │       ├── 📄 vector_store.py     # ChromaDB wrapper (vector/keyword/hybrid)
│   │       ├── 📄 reranker.py         # Cross-encoder re-ranking service
│   │       ├── 📄 llm.py              # Ollama + Groq LLM service, streaming
│   │       └── 📄 rag_pipeline.py     # Orchestrates full query flow + logging
│   │
│   ├── 📄 ragforge.db                 # SQLite database (auto-created)
│   ├── 📁 chroma_db/                  # ChromaDB vector store (auto-created)
│   └── 📁 uploads/                    # Uploaded files (auto-created)
│
├── 📁 frontend/                       # React application
│   ├── 📄 index.html                  # HTML entry point, Google Fonts
│   ├── 📄 package.json                # npm dependencies and scripts
│   ├── 📄 vite.config.ts              # Vite config + /api proxy
│   ├── 📄 tailwind.config.js          # Custom design tokens
│   ├── 📄 tsconfig.json               # TypeScript strict config
│   ├── 📄 postcss.config.js           # PostCSS + Autoprefixer
│   ├── 📄 .env.example                # Frontend environment template
│   │
│   ├── 📁 public/
│   │   └── 📄 favicon.svg             # Custom SVG favicon
│   │
│   └── 📁 src/
│       ├── 📄 main.tsx                # React root, QueryClientProvider
│       ├── 📄 App.tsx                 # Router, protected/public route guards
│       ├── 📄 index.css               # Global styles, Tailwind directives,
│       │                              #   scrollbar, animations, component classes
│       │
│       ├── 📁 api/                    # Axios API layer (mirrors backend routes)
│       │   ├── 📄 client.ts           # Axios instance + JWT + auto-refresh interceptors
│       │   ├── 📄 auth.ts             # register, login, me, forgotPassword, verifyOtp
│       │   ├── 📄 collections.ts      # list, get, create, update, delete
│       │   ├── 📄 documents.ts        # list, upload, getChunks, reindex, delete
│       │   ├── 📄 rag.ts              # ask, streamAskFetch (AsyncGenerator), getLogs
│       │   └── 📄 dashboard.ts        # getStats, getActivity
│       │
│       ├── 📁 components/
│       │   ├── 📁 layout/
│       │   │   └── 📄 DashboardLayout.tsx  # Sidebar + <Outlet>, collapsible nav
│       │   │
│       │   └── 📁 ui/
│       │       └── 📄 index.tsx            # Spinner, PageHeader, EmptyState,
│       │                                   # StatusBadge, ConfidenceBar, MetricCard,
│       │                                   # SkeletonRows, Modal, Tooltip,
│       │                                   # FileTypeIcon, formatBytes/Ms/Number
│       │
│       ├── 📁 pages/
│       │   ├── 📄 LoginPage.tsx            # Email/password auth
│       │   ├── 📄 RegisterPage.tsx         # Registration + password strength
│       │   ├── 📄 ForgotPasswordPage.tsx   # 2-step OTP password reset
│       │   ├── 📄 DashboardPage.tsx        # KPIs + area chart + pie chart
│       │   ├── 📄 CollectionsPage.tsx      # Collection grid + create/delete modal
│       │   ├── 📄 CollectionDetailPage.tsx # Collection stats + doc list + config
│       │   ├── 📄 DocumentsPage.tsx        # Dropzone upload + table + chunk viewer
│       │   ├── 📄 AskPage.tsx              # Streaming RAG chat interface
│       │   ├── 📄 HistoryPage.tsx          # Query logs + drill-down + citations
│       │   └── 📄 SettingsPage.tsx         # Profile, pipeline defaults, system info
│       │
│       ├── 📁 stores/
│       │   └── 📄 authStore.ts             # Zustand auth (persisted to localStorage)
│       │
│       └── 📁 types/
│           └── 📄 index.ts                 # TypeScript interfaces (mirrors Pydantic schemas)
│
└── 📄 README.md
```

---

## Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **Ollama** (recommended) — [install here](https://ollama.ai/download)

---

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/rag-forge.git
cd rag-forge/backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Linux / macOS
# venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env — minimum required: SECRET_KEY

# 5. Pull an LLM model (if using Ollama)
ollama pull llama3.2              # ~2GB download

# 6. Start the backend
uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`
Interactive docs available at `http://localhost:8000/docs`

---

### Frontend Setup

```bash
# From the repository root
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Default VITE_API_URL=/api works out of the box with the Vite proxy

# 3. Start the dev server
npm run dev
```

Open `http://localhost:3000` — register an account, create a collection, upload documents, and start asking questions.

---

### Environment Variables

#### Backend `.env`

```env
# ── Application ───────────────────────────────────────────────
APP_NAME=RAG Forge
DEBUG=true
SECRET_KEY=your-32-character-random-secret-here    # REQUIRED — change in prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=http://localhost:3000

# ── Database ──────────────────────────────────────────────────
DATABASE_URL=sqlite+aiosqlite:///./ragforge.db

# ── ChromaDB ──────────────────────────────────────────────────
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_PREFIX=ragforge

# ── Embeddings & Re-Ranker ────────────────────────────────────
EMBEDDING_MODEL=all-MiniLM-L6-v2
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
EMBEDDING_DIMENSION=384

# ── LLM ──────────────────────────────────────────────────────
LLM_PROVIDER=ollama                                # "ollama" | "groq"
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

GROQ_API_KEY=                                      # Only needed if LLM_PROVIDER=groq
GROQ_MODEL=llama3-8b-8192

# ── File Storage ──────────────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
ALLOWED_EXTENSIONS=.pdf,.docx,.txt,.html

# ── RAG Pipeline Defaults ────────────────────────────────────
DEFAULT_CHUNK_SIZE=512
DEFAULT_CHUNK_OVERLAP=50
DEFAULT_TOP_K=15
DEFAULT_RERANK_TOP_N=5
DEFAULT_MAX_TOKENS=2048

# ── OTP / Email ───────────────────────────────────────────────
OTP_EXPIRE_MINUTES=10
SMTP_HOST=                                         # Leave empty for console output in dev
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

#### Frontend `.env`

```env
# API base URL — change if backend is on a different host/port
VITE_API_URL=/api

# For standalone deployment (no Vite proxy):
# VITE_API_URL=https://api.yourdomain.com/api
```

---

## RAG Pipeline Deep Dive

### Document Ingestion

```
upload file
    │
    ▼
IngestionService.process_document()
    │
    ├─ 1. Parse         PyMuPDF / python-docx / BS4 → raw text + page count
    │
    ├─ 2. Clean         Remove null bytes, normalize whitespace, filter noise lines
    │
    ├─ 3. Chunk         Sentence-aware sliding window
    │                   • Split on [.!?] boundaries
    │                   • Long sentences split by word
    │                   • Configurable size (128–2048 chars) + overlap
    │
    ├─ 4. Embed         SentenceTransformer.encode() → List[List[float]]
    │                   Batched at 100 chunks per ChromaDB upsert
    │
    ├─ 5. Store         ChromaDB.upsert(ids, embeddings, documents, metadatas)
    │                   Metadata: document_id, document_name, collection_id,
    │                             chunk_index, file_type, char_count
    │
    └─ 6. Update DB     Document.status = "ready", chunk_count, embedding_count, indexed_at
```

### Query Pipeline

```
user question
    │
    ▼
RAGPipelineService.query()
    │
    ├─ 1. Retrieve      VectorStore.vector_search()  — cosine similarity, top-K chunks
    │   (optional)      VectorStore.keyword_search() — BM25 Okapi over corpus
    │   (optional)      VectorStore.hybrid_search()  — α·vector + (1-α)·keyword
    │
    ├─ 2. Re-Rank       CrossEncoder.predict([(query, chunk_text), ...])
    │                   → Scores all (query, passage) pairs jointly
    │                   → Select top-N by re-rank score
    │
    ├─ 3. Build Context Format: "[filename | chunk_N]\n{text}\n\n---\n\n..."
    │
    ├─ 4. LLM Answer    Prompt: SYSTEM (grounding rules + context) + question
    │                   Ollama: POST /api/generate (stream or blocking)
    │                   Groq:   chat.completions.create (stream or blocking)
    │
    ├─ 5. Confidence    sigmoid(mean(top-3 rerank scores) × 0.5) × 100
    │
    └─ 6. Log           QueryLog persisted with full telemetry:
                        retrieved_chunks, reranked_chunks, final_context,
                        citations, all timing metrics
```

### Confidence Scoring

```python
# Cross-encoder scores are unbounded (typically -10 to +10)
# We map them to [0, 100] via a sigmoid:
avg_score = mean(top_3_rerank_scores)
confidence = sigmoid(avg_score × 0.5) × 100

# Interpretation:
#   ≥ 70  →  green   — strong contextual match
#   40–70 →  amber   — partial match
#   < 40  →  red     — low confidence, answer may be unreliable
```

---

## API Reference

All endpoints are prefixed with `/api`. Interactive documentation at `/docs` (Swagger UI) and `/redoc`.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Create new account |
| `POST` | `/auth/login/json` | Login with email + password → JWT tokens |
| `POST` | `/auth/login` | OAuth2 form login (for Swagger UI) |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token |
| `POST` | `/auth/forgot-password` | Send OTP to email |
| `POST` | `/auth/verify-otp` | Verify OTP and set new password |
| `GET`  | `/auth/me` | Get current user profile |

### Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/collections` | List all collections for current user |
| `POST` | `/collections` | Create collection |
| `GET` | `/collections/{id}` | Get collection details |
| `PATCH` | `/collections/{id}` | Update collection name/description |
| `DELETE` | `/collections/{id}` | Delete collection + all documents + vectors |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/documents/upload?collection_id={id}` | Upload files (multipart, multiple) |
| `GET` | `/documents?collection_id={id}` | List documents in a collection |
| `GET` | `/documents/{id}` | Get document details |
| `GET` | `/documents/{id}/chunks` | Get paginated chunks with full text |
| `POST` | `/documents/{id}/reindex` | Delete vectors + re-run ingestion |
| `DELETE` | `/documents/{id}` | Delete document + vectors |

### RAG

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/rag/ask` | Full pipeline — returns complete response with citations |
| `POST` | `/rag/ask/stream` | Streaming SSE — yields tokens in real time |
| `GET` | `/rag/logs` | Query history (filterable by collection) |
| `GET` | `/rag/logs/{id}` | Full log detail with chunks and context |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dashboard/stats` | KPIs: document count, chunk count, query stats |
| `GET` | `/dashboard/activity?days=14` | Daily query counts for chart |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Email/password auth with auto-redirect |
| `/register` | RegisterPage | Account creation with password strength indicators |
| `/forgot-password` | ForgotPasswordPage | 2-step OTP-based password reset |
| `/dashboard` | DashboardPage | KPI cards, activity chart, doc-type pie, recent queries |
| `/collections` | CollectionsPage | Collection grid with create/delete modals |
| `/collections/:id` | CollectionDetailPage | Collection stats, document list, configuration panel |
| `/collections/:id/documents` | DocumentsPage | Drag-and-drop upload, status table, chunk viewer |
| `/ask` | AskPage | Streaming RAG chat with source panels and timing |
| `/history` | HistoryPage | Query logs with expandable pipeline drill-down |
| `/settings` | SettingsPage | Profile, pipeline defaults, system info |

---

## Design System

RAG Forge uses a custom dark design system built on Tailwind CSS with semantic design tokens:

### Color Palette

```
Background:   #0A0F1E  (primary)   #0F172A  (secondary)   #1E293B  (card)
Brand:        #4F46E5  (indigo)    #6366F1  (indigo-light) #312E81  (indigo-dim)
Accent:       #06B6D4  (cyan)      #22D3EE  (cyan-light)   #164E63  (cyan-dim)
Semantic:     #10B981  (green)     #F59E0B  (amber)        #EF4444  (red)
Text:         #E2E8F0  (primary)   #94A3B8  (secondary)    #64748B  (muted)
```

### Typography

- **UI text**: [Inter](https://rsms.me/inter/) — 300, 400, 500, 600, 700, 800
- **Data/code**: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) — 400, 500, 600

### Component Classes (global CSS)

```css
.btn-primary    /* Indigo glow button with hover lift */
.btn-secondary  /* Border button, hover indigo */
.btn-ghost      /* Transparent hover */
.btn-danger     /* Red destructive action */
.card           /* Dark card with border and shadow */
.card-hover     /* Clickable card with indigo hover glow */
.input          /* Dark input with indigo focus ring */
.label          /* Form label */
.badge          /* Inline status pill */
.skeleton       /* Shimmer loading placeholder */
```

---

## Deployment

### Docker (recommended)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```yaml
# docker-compose.yml
version: "3.9"
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    volumes:
      - ./data/db:/app/ragforge.db
      - ./data/chroma:/app/chroma_db
      - ./data/uploads:/app/uploads
    env_file: ./backend/.env

  frontend:
    build: ./frontend
    ports: ["80:80"]
    depends_on: [backend]
```

```bash
docker-compose up -d
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/ragforge;

    # Serve React SPA
    location / {
        try_files $uri $uri/ /index.html;
        gzip_static on;
    }

    # Proxy API to FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Critical for SSE streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

### Production Checklist

- [ ] Generate a strong `SECRET_KEY`: `openssl rand -hex 32`
- [ ] Set `DEBUG=false` in backend `.env`
- [ ] Configure `SMTP_*` variables for real OTP email delivery
- [ ] Set `FRONTEND_URL` to your actual domain in backend `.env`
- [ ] Update CORS `allow_origins` in `main.py`
- [ ] Mount persistent volumes for `chroma_db/`, `uploads/`, `ragforge.db`
- [ ] Configure `MAX_FILE_SIZE_MB` based on your server capacity
- [ ] Set up a reverse proxy with SSL (Let's Encrypt / Caddy)
- [ ] Pull your chosen Ollama model before first use: `ollama pull llama3.2`

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, descriptive commits
4. Run the frontend type-check: `npm run build`
5. Test your changes against the backend
6. Open a Pull Request with a clear description of what changes and why

### Development Tips

- Backend auto-reloads with `--reload` flag
- Frontend HMR works out of the box via Vite
- Use the `/docs` Swagger UI to test API endpoints directly
- In dev mode, OTP codes print to the backend console — no SMTP setup needed
- ChromaDB and SQLite are file-based — delete `chroma_db/` and `ragforge.db` for a clean slate

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ using entirely free, open-source technology.

**No cloud vendor lock-in. No per-query fees. Your data stays yours.**

<br/>

⭐ If RAG Forge is useful to you, please star the repository!

</div>
