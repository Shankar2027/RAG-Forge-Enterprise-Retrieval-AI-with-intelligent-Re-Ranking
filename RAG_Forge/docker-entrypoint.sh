#!/bin/sh
set -e

echo "Starting RAG Forge Initialization..."

# Double check write access to the Hugging Face persistent volume
if [ -d "/data" ]; then
    echo "Persistent volume detected at /data. Ensuring internal directories exist..."
    mkdir -p /data/chroma_db /data/uploads
else
    echo "WARNING: /data directory not found. Running in ephemeral mode."
fi

echo "Launching FastAPI Backend via Uvicorn on port 7860..."
# Navigate to backend directory and start Uvicorn
cd backend
exec uvicorn app.main:app --host 0.0.0.0 --port 7860