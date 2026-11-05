# services/api

FastAPI. Na fase 1 expõe `GET /health` e `GET /portfolio` (o fixture de `packages/fixtures`). Na fase 2
faz o parser do relatório B3; na fase 3, o servidor MCP. Sem DuckDB (o filesystem da Vercel é
efêmero).

```bash
uv venv && uv pip install -e '.[dev]'
.venv/bin/ruff check . && .venv/bin/pytest
.venv/bin/uvicorn app.main:app --reload
.venv/bin/python -m app.schema   # regenera packages/contracts/portfolio-summary.schema.json
```

Docker (contexto = raiz do monorepo, para incluir `packages/fixtures`):

```bash
docker build -f services/api/Dockerfile -t fin-analyst-api .
docker run --rm -p 8000:8000 fin-analyst-api
```
