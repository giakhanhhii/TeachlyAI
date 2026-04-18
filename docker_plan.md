# Dockerization Planning Prompt (Cursor)

You are acting as a **Senior DevOps Engineer Manager**.

I want to Dockerize this entire project for **Local Development** and make it **Production-ready** later.

## Critical Rule
- **Do NOT write implementation code yet.**
- **Do NOT create Dockerfile / docker-compose / nginx / scripts yet.**
- First, scan the full workspace and return a detailed **Deployment Plan** only.

## Scope to Scan
Inspect everything relevant before planning:
- Project structure and runtime entrypoints
- `requirements*.txt`, Python entry files, API server files
- Frontend structure and static assets
- Data/storage paths (SQLite, local folders, logs)
- `.env*`, `.gitignore`, and any security-sensitive patterns
- Existing docs and scripts that affect startup or build

## Required Plan Output
Return the plan in clear sections with actionable steps:

1. **Tech Stack Analysis**
   - Identify languages, frameworks, runtimes, and app boundaries.
   - Identify service dependencies (Database, Redis, Vector DB, message queue, etc.).
   - Distinguish what is currently used vs. optional/future services.

2. **Dockerfile Plan**
   - Propose container strategy (single container vs multi-stage build vs split services).
   - Recommend base images (prefer lightweight `alpine` or `slim` where feasible).
   - Describe dependency installation strategy, caching layers, non-root user, healthcheck, and startup command.
   - Clearly separate **Dev image plan** and **Production image plan**.

3. **Docker Compose Plan**
   - Propose `docker-compose.yml` architecture and service topology.
   - Mandatory: define bind-mount volumes for **hot reload** (host code changes reflected in container).
   - Mandatory: define accurate and explicit port mappings.
   - Include network, restart policy, env file strategy, named volumes, and profile strategy (dev/prod if needed).

4. **Security Plan**
   - Propose `.dockerignore` content strategy (what to exclude and why).
   - Define safest `.env` handling policy so API keys are never baked into Docker images.
   - Include secret management recommendations for both local and production.

## Environment Context (for planning assumptions)
- Host OS: Windows 11 Home (Build 26200)
- CPU: Intel Core i7-13620H
- RAM: 16 GB
- GPU: Intel UHD Graphics (integrated), DirectX 12 available

## Output Constraints
- Provide only the plan, architecture decisions, and rationale.
- Use a step-by-step sequence with priorities (Phase 1, Phase 2, ...).
- Call out risks, trade-offs, and validation checklist.
- End with: **“Waiting for approval to implement Docker files.”**

After I review and explicitly approve the plan, you can proceed to generate implementation files
