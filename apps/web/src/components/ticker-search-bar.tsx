"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TICKER_RE = /^[A-Z]{1,5}$/;

export function TickerSearchBar() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const go = () => {
    const t = raw.trim().toUpperCase();
    if (!t) {
      setHint("Enter a symbol.");
      return;
    }
    if (!TICKER_RE.test(t)) {
      setHint("Use 1–5 letters (e.g. AAPL).");
      return;
    }
    setHint(null);
    router.push(`/analyze/${t}`);
  };

  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Look up a ticker</h2>
      <p className="mt-1 text-[11px] leading-snug text-zinc-500">
        A <span className="text-zinc-400">ticker</span> is the symbol (like AAPL or MSFT) used to trade a stock. Enter
        letters only, then open its research page.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. AAPL"
          aria-label="Ticker symbol"
          className="min-w-[8rem] flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-600"
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
        />
        <button
          type="button"
          onClick={go}
          className="rounded border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700"
        >
          Open
        </button>
      </div>
      {hint && <p className="mt-2 text-xs text-amber-400/90">{hint}</p>}
    </div>
  );
}
