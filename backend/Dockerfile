# ─────────────────────────────────────────────────────────────────────────────
# Research.io Backend — HuggingFace Spaces Dockerfile
#
# HF Spaces constraints:
#   • Must expose port 7860 (HF routes external traffic here)
#   • App must run as a non-root user (uid 1000 = "user" on HF)
#   • HOME must be set to /home/user for writable space
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.10.11-slim

# ── System dependencies ───────────────────────────────────────────────────────
# libgomp1  → required by sentence-transformers / scikit-learn (OpenMP)
# libglib2-0 → required by some native libs inside sentence-transformers
# git       → huggingface-hub may need it to clone model repos
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 \
        libglib2.0-0 \
        git \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user (required by HuggingFace Spaces) ───────────────────────────
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /home/user/app

# ── Python dependencies ───────────────────────────────────────────────────────
# Copy requirements first to leverage Docker layer cache
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application source ────────────────────────────────────────────────────────
COPY --chown=user . .

# ── Runtime directories (images + pdfs written at startup) ────────────────────
RUN mkdir -p static/images static/pdfs

# ── HuggingFace Spaces: expose port 7860 ─────────────────────────────────────
EXPOSE 7860

# ── Start the FastAPI server ──────────────────────────────────────────────────
# --host 0.0.0.0  → accept connections from outside the container
# --port 7860     → HF Spaces mandatory port
# --workers 1     → keep it single-worker (HF free tier is memory-constrained)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
