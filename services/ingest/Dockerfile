# Contexto de build: raiz do monorepo.
#   docker build -f services/ingest/Dockerfile -t fin-analyst-ingest .
# Cada job do orquestrador roda um comando: `ingest run cotahist --daily`, `ingest db migrate`…
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv
COPY services/ingest/pyproject.toml ./
COPY services/ingest/fin_ingest ./fin_ingest
RUN pip install --no-cache-dir .

RUN useradd --create-home ingest
USER ingest

ENTRYPOINT ["ingest"]
CMD ["--help"]
