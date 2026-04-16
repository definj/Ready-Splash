"use client";

import type { MarketTickResponse } from "@ready-splash/types";
import { tickPayloadSchema } from "@ready-splash/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Subscribes to live `tick` events for a symbol and merges them into TanStack Query cache under `['tick', ticker]`.
 */
export function useLiveTick(ticker: string): void {
  const qc = useQueryClient();
  const symbol = ticker.trim().toUpperCase();

  useEffect(() => {
    if (!symbol) return;
    const socket = getSocket();
    socket.emit("subscribe", symbol);

    const onTick = (raw: unknown) => {
      const parsed = tickPayloadSchema.safeParse(raw);
      if (!parsed.success) return;
      const data = parsed.data;
      if (String(data.ticker ?? "").toUpperCase() !== symbol) return;
      qc.setQueryData<MarketTickResponse>(["tick", symbol], (prev) => ({
        ticker: symbol,
        price: data.price,
        volume: data.volume,
        ts: data.ts,
        source: "redis",
        marketOpen: prev?.marketOpen ?? true,
      }));
    };

    socket.on("tick", onTick);
    return () => {
      socket.emit("unsubscribe", symbol);
      socket.off("tick", onTick);
    };
  }, [symbol, qc]);
}
