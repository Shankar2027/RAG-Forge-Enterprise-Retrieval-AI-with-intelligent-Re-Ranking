# ─── STAGE 1: COMPILE THE REACT FRONTEND ───
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend

# Copy package configurations and install dependencies
COPY ragforge-frontend/package*.json ./
RUN npm install

# Copy source files and compile the production build
COPY ragforge-frontend/ ./
RUN npm run build

# ─── STAGE 2: FINAL PRODUCTION RUNTIME ──────────────────────────
FROM python:3.11-slim

# Set environment variables (No comments on these lines!)
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV HOME=/home/user
ENV PATH=/home/user/.local/bin:$PATH

# Install system tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 user
WORKDIR /app

# Setup persistent database and file upload storage
RUN mkdir -p /data/chroma_db /data/uploads && chown -R 1000:1000 /data

# Install Python dependencies
COPY --chown=user:user rag_forge_backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy backend application files
COPY --chown=user:user rag_forge_backend/ ./backend/

# Copy built frontend assets from Stage 1
COPY --chown=user:user --from=frontend-builder /frontend/dist/ ./backend/static/

# Copy the startup script
COPY --chown=user:user docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# User and Port
USER user
EXPOSE 7860

ENTRYPOINT ["./docker-entrypoint.sh"]