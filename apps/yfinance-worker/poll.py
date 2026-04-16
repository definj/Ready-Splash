import os
import time
import requests
import yfinance as yf

API_URL = os.environ.get("API_URL", "http://host.docker.internal:4000").rstrip("/")
SECRET = os.environ.get("INTERNAL_CRON_SECRET", "")
TICKERS = [t.strip().upper() for t in os.environ.get("TICKERS", "SPY,QQQ").split(",") if t.strip()]
INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", "30"))


def post_tick(ticker: str, price: float, volume: float, ts: int) -> None:
    if not SECRET:
        print("INTERNAL_CRON_SECRET missing; skipping POST")
        return
    url = f"{API_URL}/internal/yfinance-tick"
    r = requests.post(
        url,
        json={"ticker": ticker, "price": price, "volume": volume, "ts": ts},
        headers={"Authorization": f"Bearer {SECRET}"},
        timeout=10,
    )
    print(f"POST {url} {ticker} -> {r.status_code}")


def main() -> None:
    while True:
        for t in TICKERS:
            try:
                tk = yf.Ticker(t)
                hist = tk.history(period="5d", interval="1d")
                if hist.empty:
                    continue
                row = hist.iloc[-1]
                price = float(row["Close"])
                vol = float(row["Volume"] or 0)
                ts = int(time.time() * 1000)
                post_tick(t, price, vol, ts)
            except Exception as exc:  # noqa: BLE001
                print(f"error {t}: {exc}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
