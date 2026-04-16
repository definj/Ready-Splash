import type Redis from "ioredis";
import type { Server } from "socket.io";
import WebSocket, { type RawData } from "ws";

type PolygonTrade = {
  ev: "T";
  sym: string;
  p: number;
  s: number;
  t: number;
};

type PolygonStatus = {
  ev: "status";
  status: string;
  message?: string;
};

type PolygonEvent = PolygonTrade | PolygonStatus | { ev: string; sym?: string };

function parsePolygonPayload(raw: RawData): PolygonEvent[] {
  try {
    const data = JSON.parse(raw.toString()) as unknown;
    return Array.isArray(data) ? (data as PolygonEvent[]) : [data as PolygonEvent];
  } catch {
    return [];
  }
}

export class MarketDataService {
  private ws: WebSocket | null = null;
  private readonly subscriptions = new Set<string>();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly io: Server,
  ) {}

  connect(): void {
    const key = process.env.POLYGON_API_KEY;
    if (!key) {
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.ws = new WebSocket("wss://socket.polygon.io/stocks");
    this.ws.on("open", () => {
      this.send({ action: "auth", params: key });
      for (const t of this.subscriptions) {
        this.sendSubscribe(t);
      }
    });
    this.ws.on("message", (raw) => {
      void this.handleMessage(raw);
    });
    this.ws.on("close", () => {
      this.ws = null;
      this.scheduleReconnect();
    });
    this.ws.on("error", () => {
      this.ws?.close();
    });
  }

  subscribe(tickers: string[]): void {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return;
    for (const raw of tickers) {
      const t = raw.trim().toUpperCase();
      if (!t) continue;
      if (!this.subscriptions.has(t)) {
        this.subscriptions.add(t);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.sendSubscribe(t);
        }
      }
    }
    this.connect();
  }

  private sendSubscribe(ticker: string): void {
    this.send({ action: "subscribe", params: `T.${ticker},A.${ticker}` });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (!process.env.POLYGON_API_KEY) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private async handleMessage(raw: RawData): Promise<void> {
    const events = parsePolygonPayload(raw);
    for (const ev of events) {
      if (ev.ev === "T" && "sym" in ev && typeof ev.sym === "string") {
        const trade = ev as PolygonTrade;
        const tick = { price: trade.p, volume: trade.s, ts: trade.t };
        const key = `tick:${trade.sym}`;
        await this.redis
          .multi()
          .hset(key, {
            price: String(tick.price),
            volume: String(tick.volume),
            ts: String(tick.ts),
          })
          .expire(key, 2)
          .exec();
        this.io.to(`ticker:${trade.sym}`).emit("tick", { ticker: trade.sym, ...tick });
      }
    }
  }

  private send(payload: object): void {
    this.ws?.send(JSON.stringify([payload]));
  }
}
