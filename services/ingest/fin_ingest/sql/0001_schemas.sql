-- Schemas, papéis e tabelas da plataforma de dados. Idempotente: roda inteiro a cada `ingest db migrate`.
--   ingest      estado da ingestão (ledger, unidades, watermarks, DLQ, cache HTTP, chamadas)
--   core        recorte tipado que o Postgres serve (o volume completo fica no lake)
--   marts       lido pelo web; marts_next é o build em andamento (publish troca os dois)

CREATE SCHEMA IF NOT EXISTS ingest;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS marts;
CREATE SCHEMA IF NOT EXISTS marts_next;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fa_ingest') THEN CREATE ROLE fa_ingest NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fa_transform') THEN CREATE ROLE fa_transform NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fa_web') THEN CREATE ROLE fa_web NOLOGIN; END IF;
END $$;

-- ───────────── ingest ─────────────
CREATE TABLE IF NOT EXISTS ingest.runs (
  run_id       uuid PRIMARY KEY,
  source       text NOT NULL,
  dataset      text NOT NULL,
  args         jsonb NOT NULL DEFAULT '{}',
  status       text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed', 'degraded', 'skipped', 'aborted')),
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  units_total  int NOT NULL DEFAULT 0,
  units_done   int NOT NULL DEFAULT 0,
  units_failed int NOT NULL DEFAULT 0,
  units_skipped int NOT NULL DEFAULT 0,
  rows_loaded  bigint NOT NULL DEFAULT 0,
  rows_quarantined bigint NOT NULL DEFAULT 0,
  bytes_in     bigint NOT NULL DEFAULT 0,
  api_calls    int NOT NULL DEFAULT 0,
  error        text
);
CREATE INDEX IF NOT EXISTS runs_source_started ON ingest.runs (source, dataset, started_at DESC);

-- Unidade de trabalho (um ano, um dia, uma série, um ticker): permite retomar backfills.
-- 'aborted': execução interrompida (sinal ou processo morto). Bancos criados antes recebem o novo CHECK.
ALTER TABLE ingest.runs DROP CONSTRAINT IF EXISTS runs_status_check;
ALTER TABLE ingest.runs ADD CONSTRAINT runs_status_check
  CHECK (status IN ('running', 'success', 'partial', 'failed', 'degraded', 'skipped', 'aborted'));

CREATE TABLE IF NOT EXISTS ingest.units (
  source     text NOT NULL,
  dataset    text NOT NULL,
  unit       text NOT NULL,
  status     text NOT NULL CHECK (status IN ('running', 'done', 'failed', 'not_modified')),
  run_id     uuid,
  sha256     text,
  rows       bigint,
  attempts   int NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, dataset, unit)
);

CREATE TABLE IF NOT EXISTS ingest.watermarks (
  source     text NOT NULL,
  dataset    text NOT NULL,
  key        text NOT NULL,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, dataset, key)
);

CREATE TABLE IF NOT EXISTS ingest.dlq (
  source     text NOT NULL,
  dataset    text NOT NULL,
  unit       text NOT NULL,
  error      text NOT NULL,
  attempts   int NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, dataset, unit)
);

CREATE TABLE IF NOT EXISTS ingest.http_cache (
  key           text PRIMARY KEY,
  etag          text,
  last_modified text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingest.api_calls (
  source text NOT NULL,
  day    date NOT NULL,
  calls  int NOT NULL DEFAULT 0,
  PRIMARY KEY (source, day)
);

CREATE TABLE IF NOT EXISTS ingest.publishes (
  id          bigserial PRIMARY KEY,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status      text NOT NULL,
  note        text
);

-- ───────────── core ─────────────
CREATE TABLE IF NOT EXISTS core.instruments (
  ticker        text PRIMARY KEY,
  name          text NOT NULL,
  specification text,
  isin          text,
  codbdi        text,
  asset_class   text NOT NULL CHECK (asset_class IN ('Ação', 'FII', 'ETF', 'BDR')),
  first_seen    date NOT NULL,
  last_seen     date NOT NULL
);

CREATE TABLE IF NOT EXISTS core.prices_daily (
  ticker     text NOT NULL,
  trade_date date NOT NULL,
  open       numeric(18, 4),
  high       numeric(18, 4),
  low        numeric(18, 4),
  avg        numeric(18, 4),
  close      numeric(18, 4) NOT NULL,
  trades     integer,
  quantity   bigint,
  volume     numeric(22, 2),
  PRIMARY KEY (ticker, trade_date)
) PARTITION BY RANGE (trade_date);

-- Fatos como reportados à CVM (ITR: DRE do trimestre e DFC acumulado; DFP: anual).
-- O trimestre isolado (4T = anual − 9M; DFC por diferença) é calculado no dbt.
CREATE TABLE IF NOT EXISTS core.fundamentals (
  cnpj         text NOT NULL,
  company      text NOT NULL,
  doc          text NOT NULL CHECK (doc IN ('ITR', 'DFP')),
  statement    text NOT NULL CHECK (statement IN ('DRE', 'DFC')),
  period_start date NOT NULL,
  period_end   date NOT NULL,
  line         text NOT NULL,
  value        numeric(22, 2) NOT NULL,
  PRIMARY KEY (cnpj, doc, statement, period_start, period_end, line)
);

CREATE TABLE IF NOT EXISTS core.macro_series (
  series   text NOT NULL,
  ref_date date NOT NULL,
  value    numeric(18, 8) NOT NULL,
  PRIMARY KEY (series, ref_date)
);

CREATE TABLE IF NOT EXISTS core.dividends (
  ticker       text NOT NULL,
  ex_date      date NOT NULL,
  payment_date date,
  kind         text NOT NULL,
  value        numeric(18, 8) NOT NULL,
  PRIMARY KEY (ticker, ex_date, kind)
);

-- ───────────── permissões ─────────────
GRANT USAGE ON SCHEMA ingest, core TO fa_ingest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ingest, core TO fa_ingest;
GRANT USAGE ON SCHEMA core, ingest TO fa_transform;
GRANT SELECT ON ALL TABLES IN SCHEMA core TO fa_transform;
GRANT ALL ON SCHEMA marts, marts_next TO fa_transform;
GRANT USAGE ON SCHEMA marts TO fa_web;
ALTER DEFAULT PRIVILEGES IN SCHEMA marts GRANT SELECT ON TABLES TO fa_web;
