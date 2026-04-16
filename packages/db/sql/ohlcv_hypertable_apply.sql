-- Ready Splash: Timescale OHLCV hypertable (run once against DB with Timescale extension).
-- Safe to re-run: uses IF NOT EXISTS where supported.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS ohlcv (
  "time" TIMESTAMPTZ NOT NULL,
  ticker TEXT NOT NULL,
  open NUMERIC(18, 6),
  high NUMERIC(18, 6),
  low NUMERIC(18, 6),
  close NUMERIC(18, 6),
  volume BIGINT,
  vwap NUMERIC(18, 6),
  adjusted BOOLEAN DEFAULT false
);

SELECT public.create_hypertable('ohlcv', 'time', if_not_exists => TRUE);

CREATE UNIQUE INDEX IF NOT EXISTS ohlcv_ticker_time_uidx ON ohlcv (ticker, "time");

CREATE INDEX IF NOT EXISTS ohlcv_ticker_time_desc_idx ON ohlcv (ticker, "time" DESC);
