"use client";

import { rsiSeries } from "@ready-splash/indicators";
import { useQuery } from "@tanstack/react-query";
import { CandlestickSeries, ColorType, createChart, LineSeries } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";

type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };

type BarsResponse = {
  ticker: string;
  bars: Bar[];
  disclaimer?: string;
};

function businessDayTime(ms: number) {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  } as const;
}

export function AnalysisChart({ ticker }: { ticker: string }) {
  const candleRef = useRef<HTMLDivElement | null>(null);
  const rsiRef = useRef<HTMLDivElement | null>(null);
  const candleChartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const rsiChartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const q = useQuery({
    queryKey: ["bars", ticker, "div"],
    queryFn: async (): Promise<BarsResponse> => {
      const res = await apiFetch(
        `/market/bars/${encodeURIComponent(ticker)}?limit=180&adjusted=true&dividends=true`,
      );
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as BarsResponse;
    },
  });

  useEffect(() => {
    const cEl = candleRef.current;
    const rEl = rsiRef.current;
    if (!cEl || !rEl || !q.data?.bars?.length) return;

    candleChartRef.current?.remove();
    rsiChartRef.current?.remove();

    const asc = [...q.data.bars].reverse();
    const candleData = asc.map((b) => ({
      time: businessDayTime(b.t),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
    }));

    const closes = asc.map((b) => b.c);
    const rsiVals = rsiSeries(closes, 14);
    const rsiData = asc
      .map((b, i) => {
        const v = rsiVals[i];
        if (v == null || !Number.isFinite(v)) return null;
        return { time: businessDayTime(b.t), value: v };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    const chartBase = {
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
    };

    const cChart = createChart(cEl, { ...chartBase, height: 320 });
    candleChartRef.current = cChart;
    const cSeries = cChart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#f43f5e",
    });
    cSeries.setData(candleData);
    cChart.timeScale().fitContent();

    const rChart = createChart(rEl, { ...chartBase, height: 120 });
    rsiChartRef.current = rChart;
    const rSeries = rChart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 1,
    });
    rSeries.setData(rsiData);
    rChart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      const w = cEl.clientWidth;
      cChart.applyOptions({ width: w });
      rChart.applyOptions({ width: w });
    });
    ro.observe(cEl);
    cChart.applyOptions({ width: cEl.clientWidth });
    rChart.applyOptions({ width: cEl.clientWidth });

    return () => {
      ro.disconnect();
      cChart.remove();
      rChart.remove();
      candleChartRef.current = null;
      rsiChartRef.current = null;
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
      <div ref={candleRef} className="w-full rounded border border-zinc-800" />
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">RSI (14)</div>
      <div ref={rsiRef} className="w-full rounded border border-zinc-800" />
    </div>
  );
}
