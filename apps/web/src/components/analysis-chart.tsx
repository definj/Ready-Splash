"use client";

import { useQuery } from "@tanstack/react-query";
import { CandlestickSeries, ColorType, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";

type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

type BarsResponse = {
  ticker: string;
  bars: Bar[];
  disclaimer?: string;
};

export function AnalysisChart({ ticker }: { ticker: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const q = useQuery({
    queryKey: ["bars", ticker],
    queryFn: async (): Promise<BarsResponse> => {
      const res = await apiFetch(`/market/bars/${encodeURIComponent(ticker)}?limit=180&adjusted=true`);
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as BarsResponse;
    },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !q.data?.bars?.length) return;

    chartRef.current?.remove();
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#09090b" },
        textColor: "#a1a1aa",
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
      rightPriceScale: { borderColor: "#27272a" },
      timeScale: { borderColor: "#27272a" },
      height: 360,
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#f43f5e",
    });

    const data = [...q.data.bars]
      .reverse()
      .map((b) => {
        const d = new Date(b.t);
        return {
          time: {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth() + 1,
            day: d.getUTCDate(),
          } as const,
          open: b.o,
          high: b.h,
          low: b.l,
          close: b.c,
        };
      });

    series.setData(data);
    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    ro.observe(el);
    chart.applyOptions({ width: el.clientWidth });

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [q.data]);

  return (
    <div className="space-y-2">
      {q.isLoading && <p className="text-xs text-zinc-500">Loading OHLCV…</p>}
      {q.error && (
        <p className="text-xs text-amber-400">
          {(q.error as Error).message || "Unable to load bars (Polygon key / network)."}
        </p>
      )}
      {q.data?.disclaimer && (
        <p className="text-[10px] leading-relaxed text-zinc-600">{q.data.disclaimer}</p>
      )}
      <div ref={containerRef} className="w-full rounded border border-zinc-800" />
    </div>
  );
}
