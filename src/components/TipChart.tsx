"use client";

/**
 * TipChart.tsx
 *
 * SVG area chart for the daily tip time series.
 *
 * - Window selector: 7 / 14 / 30 days (default 30).
 * - Fetches from analyticsApi.timeSeries on mount and window change.
 * - Handles empty series and zero-activity days without collapsing.
 * - Renders in both light and dark themes via CSS custom properties
 *   (currentColor / Tailwind semantic tokens).
 * - No external charting dependencies — pure SVG + React.
 */

import { useEffect, useState, useRef, useCallback, useId } from "react";
import { analyticsApi } from "@/lib/api";
import { formatUsdc } from "@novatip/sdk";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataPoint {
  date:      string; // "YYYY-MM-DD"
  tipCount:  number;
  amountRaw: string; // raw stroops string
}

type Window = 7 | 14 | 30;
type Mode   = "count" | "amount";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format "YYYY-MM-DD" → short month + day, e.g. "Jun 3" */
function fmtDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}

/**
 * Fill in any calendar gaps so the chart always has exactly `days` points.
 * Zero-activity days are represented as { tipCount: 0, amountRaw: "0" }.
 */
function fillSeries(raw: DataPoint[], days: number): DataPoint[] {
  const byDate = new Map(raw.map((p) => [p.date, p]));
  const result: DataPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(
      byDate.get(key) ?? { date: key, tipCount: 0, amountRaw: "0" },
    );
  }
  return result;
}

/** Map data values to SVG y-coordinates (top-aligned, small padding). */
function toYCoords(values: number[], height: number, padPct = 0.12): number[] {
  const max = Math.max(...values, 1); // guard against all-zero
  const usable = height * (1 - padPct);
  return values.map((v) => height - (v / max) * usable);
}

/** Build an SVG polyline / area path from coordinate pairs. */
function buildPath(xs: number[], ys: number[], close?: { width: number; height: number }): string {
  if (xs.length === 0) return "";
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(" L ");
  if (!close) return `M ${pts}`;
  const { width, height } = close;
  return `M ${pts} L ${width},${height} L 0,${height} Z`;
}

// ── Chart SVG ─────────────────────────────────────────────────────────────────

interface ChartSvgProps {
  series:  DataPoint[];
  mode:    Mode;
  width:   number;
  height:  number;
  gradId:  string;
}

function ChartSvg({ series, mode, width, height, gradId }: ChartSvgProps) {
  const n = series.length;
  if (n === 0) return null;

  const values =
    mode === "count"
      ? series.map((p) => p.tipCount)
      : series.map((p) => Number(BigInt(p.amountRaw)));

  const ys   = toYCoords(values, height);
  const step = width / Math.max(n - 1, 1);
  const xs   = series.map((_, i) => i * step);

  const linePath = buildPath(xs, ys);
  const areaPath = buildPath(xs, ys, { width, height });

  // Label ticks: first, middle, last
  const tickIdxs =
    n <= 2
      ? [0, n - 1].filter((v, i, a) => a.indexOf(v) === i)
      : [0, Math.floor((n - 1) / 2), n - 1];

  // Value dots: only show non-zero points with a dot
  const dots = series
    .map((p, i) => ({
      x:     xs[i],
      y:     ys[i],
      value: values[i],
      label:
        mode === "count"
          ? String(p.tipCount)
          : `$${formatUsdc(BigInt(p.amountRaw), 2)}`,
      date:  p.date,
    }))
    .filter((d) => d.value > 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="w-full overflow-visible"
      style={{ height }}
    >
      <defs>
        {/* Gradient fill — uses CSS vars so it works in light and dark */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--color-accent-stop-top)"    stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent-stop-bottom)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={0} y1={height * frac * 0.88}
          x2={width} y2={height * frac * 0.88}
          className="stroke-hairline"
          strokeWidth={0.5}
        />
      ))}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradId})`}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        className="stroke-accent"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data dots */}
      {dots.map((d) => (
        <circle
          key={d.date}
          cx={d.x}
          cy={d.y}
          r={3}
          className="fill-accent stroke-canvas"
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis date labels */}
      {tickIdxs.map((idx) => {
        const x = xs[idx];
        const anchor =
          idx === 0 ? "start" : idx === n - 1 ? "end" : "middle";
        return (
          <text
            key={idx}
            x={x}
            y={height + 18}
            textAnchor={anchor}
            fontSize={10}
            className="fill-fg-dim font-sans"
          >
            {fmtDate(series[idx].date)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TipChartProps {
  jwt: string;
}

const WINDOWS: { label: string; value: Window }[] = [
  { label: "7d",  value: 7  },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
];

export function TipChart({ jwt }: TipChartProps) {
  const [window,  setWindow]  = useState<Window>(30);
  const [mode,    setMode]    = useState<Mode>("count");
  const [series,  setSeries]  = useState<DataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const gradId   = useId().replace(/:/g, ""); // SVG id must not contain colons

  const fetchSeries = useCallback((days: Window) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    analyticsApi
      .timeSeries(jwt, days, { signal: controller.signal })
      .then((r) => {
        setSeries(fillSeries(r.series, days));
        setError(null);
      })
      .catch((e: any) => {
        if (e.code === "ABORTED") return;
        setError(e.message ?? "Failed to load chart data.");
      })
      .finally(() => {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      });
  }, [jwt]);

  useEffect(() => {
    fetchSeries(window);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchSeries, window]);

  // ── Derived summary ────────────────────────────────────────────────────────
  const totalCount  = series?.reduce((s, p) => s + p.tipCount, 0) ?? 0;
  const totalAmount = series?.reduce((s, p) => s + Number(BigInt(p.amountRaw)), 0) ?? 0;
  const activeDays  = series?.filter((p) => p.tipCount > 0).length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    /*
      CSS custom properties for the SVG gradient. Defined inline so they
      cascade correctly in both light and dark without needing a Tailwind
      plugin — accent is brand-400 in dark (#38bdf8) and brand-600 in light
      (#0284c7), both accessed via the semantic token.
    */
    <Card
      style={{
        // @ts-expect-error -- CSS custom properties
        "--color-accent-stop-top":    "rgb(var(--color-accent))",
        "--color-accent-stop-bottom": "rgb(var(--color-accent))",
      }}
    >
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Tip activity</CardTitle>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-hairline overflow-hidden text-xs">
              {(["count", "amount"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-2.5 py-1 transition-colors",
                    mode === m
                      ? "bg-brand-500/20 text-accent font-medium"
                      : "text-fg-subtle hover:text-fg hover:bg-surface-strong",
                  )}
                  aria-pressed={mode === m}
                >
                  {m === "count" ? "Tips" : "USDC"}
                </button>
              ))}
            </div>

            {/* Window selector */}
            <div className="flex rounded-lg border border-hairline overflow-hidden text-xs">
              {WINDOWS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setWindow(w.value)}
                  className={cn(
                    "px-2.5 py-1 transition-colors",
                    window === w.value
                      ? "bg-brand-500/20 text-accent font-medium"
                      : "text-fg-subtle hover:text-fg hover:bg-surface-strong",
                  )}
                  aria-pressed={window === w.value}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Loading skeleton */}
      {loading && (
        <div className="h-36 rounded-xl bg-hairline/40 animate-pulse" />
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-danger py-4">{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && series && activeDays === 0 && (
        <div className="flex flex-col items-center justify-center h-36 gap-2">
          <p className="text-sm text-fg-faint">No tips in this window yet.</p>
          <p className="text-xs text-fg-dim">Share your tip link to get started.</p>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && series && activeDays > 0 && (
        <div className="flex flex-col gap-4">
          {/* Summary row */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-fg-faint text-xs uppercase tracking-wider">Tips</span>
              <p className="font-semibold text-fg">{totalCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-fg-faint text-xs uppercase tracking-wider">Earned</span>
              <p className="font-semibold text-fg">
                ${formatUsdc(BigInt(Math.round(totalAmount)), 2)}
              </p>
            </div>
            <div>
              <span className="text-fg-faint text-xs uppercase tracking-wider">Active days</span>
              <p className="font-semibold text-fg">{activeDays}</p>
            </div>
          </div>

          {/* SVG chart — responsive via padding-bottom trick */}
          <div
            className="relative w-full pb-6"
            role="img"
            aria-label={`Daily ${mode === "count" ? "tip count" : "USDC earned"} over the last ${window} days`}
          >
            <ChartSvg
              series={series}
              mode={mode}
              width={600}
              height={120}
              gradId={`grad-${gradId}`}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
