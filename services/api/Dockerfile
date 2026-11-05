# Contexto de build: raiz do monorepo (precisa de packages/fixtures).
#   docker build -f services/api/Dockerfile -t fin-analyst-api .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FIXTURES_DIR=/srv/fixtures

WORKDIR /srv
COPY services/api/pyproject.toml ./
COPY services/api/app ./app
COPY packages/fixtures ./fixtures
RUN pip install --no-cache-dir .

RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
