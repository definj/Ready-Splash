-- Continuous aggregates for `ohlcv` (run after ohlcv_hypertable_apply.sql).
-- If views already exist, skip or DROP before re-running.

CREATE MATERIALIZED VIEW IF NOT EXISTS ohlcv_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '5 minutes', "time") AS bucket,
  ticker,
  first(open, "time") AS open,
  max(high) AS high,
  min(low) AS low,
  last(close, "time") AS close,
  sum(volume) AS volume
FROM ohlcv
GROUP BY bucket, ticker
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'ohlcv_5m',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

CREATE MATERIALIZED VIEW IF NOT EXISTS ohlcv_1d
WITH (timescaledb.continuous) AS
SELECT
  time_bucket(INTERVAL '1 day', "time") AS bucket,
  ticker,
  first(open, "time") AS open,
  max(high) AS high,
  min(low) AS low,
  last(close, "time") AS close,
  sum(volume) AS volume
FROM ohlcv
GROUP BY bucket, ticker
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
  'ohlcv_1d',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
