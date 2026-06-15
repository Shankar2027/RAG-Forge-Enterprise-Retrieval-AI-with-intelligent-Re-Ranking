# RAG Forge — Frontend

Enterprise-grade RAG (Retrieval-Augmented Generation) UI built with React 18, TypeScript, Tailwind CSS, and TanStack Query.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (custom dark design system) |
| State | Zustand (auth) + TanStack Query (server state) |
| Routing | React Router v6 |
| Charts | Recharts |
| Markdown | react-markdown |
| Upload | react-dropzone |
| Notifications | react-hot-toast |

## Project Structure

```
src/
├── api/            # Axios API clients (auth, collections, documents, rag, dashboard)
├── components/
│   ├── layout/     # DashboardLayout with collapsible sidebar
│   └── ui/         # Shared components (cards, badges, modals, skeletons)
├── pages/          # One file per route
│   ├── LoginPage
│   ├── RegisterPage
│   ├── ForgotPasswordPage
│   ├── DashboardPage    # KPIs + charts
│   ├── CollectionsPage  # CRUD collections
│   ├── CollectionDetailPage
│   ├── DocumentsPage    # Drag-and-drop upload + status tracking
│   ├── AskPage          # Streaming RAG chat interface
│   ├── HistoryPage      # Query logs with drill-down
│   └── SettingsPage     # Profile + pipeline config
├── stores/         # Zustand auth store (persisted)
└── types/          # TypeScript interfaces mirroring backend schemas
```

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit VITE_API_URL if your backend is not proxied
```

### 3. Start dev server
```bash
npm run dev
# Opens on http://localhost:3000
# API requests proxied to http://localhost:8000
```

### 4. Production build
```bash
npm run build
# Output in dist/ — serve with any static host or nginx
```

## Backend Integration

The frontend expects the RAG Forge backend running on `localhost:8000`. The Vite dev server proxies `/api/*` to the backend automatically.

For production, configure your reverse proxy (nginx / Caddy) to serve the `dist/` folder and proxy `/api` to the FastAPI backend:

```nginx
server {
    listen 80;
    root /var/www/ragforge;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # SSE streaming support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300;
    }
}
```

## Features

### Authentication
- JWT access + refresh token with auto-refresh interceptor
- Email + password login / registration
- OTP-based password reset flow

### Collections
- Create, view, update, delete collections
- Per-collection chunking and embedding settings
- Real-time document count and chunk statistics

### Documents
- Multi-file drag-and-drop upload (PDF, DOCX, TXT, HTML)
- Upload progress bar
- Real-time status polling (uploaded → parsing → chunking → embedding → ready)
- Chunk viewer with full text preview
- One-click re-index

### Ask AI
- Streaming SSE responses with live token rendering
- Configurable Top-K, Rerank-N, hybrid search toggle
- Per-message confidence score, timing breakdown
- Expandable source chunks with rerank scores
- Example question suggestions

### Dashboard
- KPI cards: documents, chunks, embeddings, query count
- 14-day query activity area chart
- Document type distribution pie chart
- Recent queries with confidence bars

### Query History
- Full log of all queries with drill-down
- Pipeline timing breakdown (retrieval / rerank / LLM)
- Source chunks and citations per query
- Filter by collection

## Design System

Deep-space dark theme with electric indigo primary and cyan accent:

- Background: `#0A0F1E` / `#0F172A` / `#1E293B`
- Primary: `#4F46E5` (indigo)
- Accent: `#06B6D4` (cyan)
- Success: `#10B981` · Warning: `#F59E0B` · Error: `#EF4444`
- Typography: Inter (UI) + JetBrains Mono (data/code)
