"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

const nav = [
  { href: "/", label: "Macro" },
  { href: "/analyze/AAPL", label: "Analyze" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/watchlist", label: "Watchlist" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const privacyMode = useUIStore((s) => s.privacyMode);
  const togglePrivacy = useUIStore((s) => s.togglePrivacy);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside
        className={`border-r border-zinc-800 bg-zinc-950/80 transition-[width] duration-200 ${
          sidebarOpen ? "w-56 px-4 py-5" : "w-0 overflow-hidden border-0 px-0 py-5"
        }`}
      >
        <div className="mb-6 text-[11px] font-semibold tracking-[0.2em] text-zinc-500">
          READY SPLASH
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href.startsWith("/analyze")
                  ? pathname.startsWith("/analyze")
                  : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded px-2 py-1.5 font-mono text-xs ${
                  active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle sidebar"
              className="rounded border border-zinc-800 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              Nav
            </button>
            <div className="hidden text-[11px] font-mono text-zinc-500 sm:block">
              US equities · RTH 09:30–16:00 ET · high-density terminal layout (Phase 5 scaffold)
            </div>
          </div>
          <button
            type="button"
            onClick={togglePrivacy}
            className="rounded border border-zinc-800 px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            Privacy {privacyMode ? "on" : "off"}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
