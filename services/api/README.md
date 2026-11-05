# services/api

FastAPI. Na fase 1 só expõe `GET /health` e `GET /portfolio` (fixture). Na fase 2 faz o parser do
relatório B3; na fase 3, o servidor MCP. Sem DuckDB (o filesystem da Vercel é efêmero).

```bash
uv venv && uv pip install -e '.[dev]'
.venv/bin/ruff check . && .venv/bin/pytest
.venv/bin/uvicorn app.main:app --reload
```
