FROM node:20-bookworm-slim AS node_runtime

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY --from=node_runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node_runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium

COPY src ./src
COPY frontend ./frontend
COPY backend ./backend
COPY scripts ./scripts
COPY .env.example ./.env.example

RUN mkdir -p /app/data /app/output /ms-playwright && \
    useradd --create-home --shell /bin/bash appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /app/data /app/output /ms-playwright

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" || exit 1

FROM base AS dev
USER appuser
CMD ["uvicorn", "src.api_server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS prod
USER appuser
CMD ["uvicorn", "src.api_server:app", "--host", "0.0.0.0", "--port", "8000"]
