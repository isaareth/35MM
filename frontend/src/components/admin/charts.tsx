"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { hourLabel, shortDate, type DailyPoint, type NamedCount } from "@/lib/analytics";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="font-display font-black text-white text-2xl uppercase mb-6">{title}</h2>
      {children}
    </section>
  );
}

export function Card({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div className="border border-white/10 p-5 md:p-6 min-w-0">
      <p className="font-body text-xs tracking-widest uppercase text-white/40">{title}</p>
      {caption && <p className="font-body text-xs text-white/30 mt-1">{caption}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-ink p-5 md:p-6">
      <p className="font-display font-black text-neon text-4xl md:text-5xl leading-none mb-2">
        {value}
      </p>
      <p className="font-body text-white/50 text-xs tracking-widest uppercase">{label}</p>
      {hint && <p className="font-body text-white/30 text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function Empty({ children = "Todavía no hay datos." }: { children?: ReactNode }) {
  return <p className="font-body text-white/30 text-sm">{children}</p>;
}

/** Horizontal bars, one row per item; bar length is relative to the largest. */
export function HBars({ items, unit = "" }: { items: NamedCount[]; unit?: string }) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="flex justify-between gap-4 font-body text-sm mb-1">
            <span className="text-white/80 truncate">{item.name}</span>
            <span className="text-white tabular-nums flex-shrink-0">
              {item.count}
              {unit}
            </span>
          </div>
          <div className="h-1.5 bg-white/10">
            <div className="h-full bg-neon" style={{ width: `${(100 * item.count) / max}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns with a label under each; the tallest is highlighted. */
export function Columns({
  items,
  showEvery = 1,
}: {
  items: { label: string; value: number }[];
  showEvery?: number;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (max === 0) return <Empty />;
  return (
    <div className="flex items-end gap-1 h-36">
      {items.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <span className="font-body text-[10px] text-white/50 tabular-nums mb-1">
            {item.value > 0 ? item.value : ""}
          </span>
          <div
            className={item.value === max ? "w-full bg-neon" : "w-full bg-purple-bright/70"}
            style={{ height: `${(100 * item.value) / max}%`, minHeight: item.value > 0 ? 2 : 0 }}
          />
          <span className="font-body text-[10px] text-white/40 mt-1 h-3 whitespace-nowrap">
            {i % showEvery === 0 ? item.label : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HourColumns({ hourly }: { hourly: number[] }) {
  const peak = hourly.indexOf(Math.max(...hourly));
  return (
    <>
      <Columns
        items={hourly.map((value, h) => ({ label: String(h), value }))}
        showEvery={3}
      />
      {Math.max(...hourly) > 0 && (
        <p className="font-body text-xs text-white/40 mt-4">
          Hora con más inscripciones: <span className="text-neon">{hourLabel(peak)}</span> (hora de
          Colombia)
        </p>
      )}
    </>
  );
}

/** Measures an element's width so SVG charts render 1:1 (readable labels at any size). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Daily signups as bars plus the running total as a line (own right-hand scale). */
export function DailyChart({
  series,
  barLabel = "Por día",
  lineLabel = "Acumulado",
}: {
  series: DailyPoint[];
  barLabel?: string;
  lineLabel?: string;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  if (series.length === 0) return <Empty />;

  const W = Math.max(width, 240);
  const H = 200;
  const L = 30;
  const R = 36;
  const T = 10;
  const B = 24;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const maxDaily = Math.max(...series.map((p) => p.count), 1);
  const maxTotal = Math.max(series[series.length - 1].cumulative, 1);
  const slot = innerW / series.length;
  const barW = Math.max(1.5, slot * 0.7);
  const x = (i: number) => L + slot * i + slot / 2;
  const yBar = (v: number) => T + innerH - (v / maxDaily) * innerH;
  const yTotal = (v: number) => T + innerH - (v / maxTotal) * innerH;
  const line = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yTotal(p.cumulative).toFixed(1)}`)
    .join(" ");

  const peak = series.reduce((best, p) => (p.count > best.count ? p : best), series[0]);
  const mid = series[Math.floor((series.length - 1) / 2)];
  const label = `${barLabel} y ${lineLabel.toLowerCase()}: ${maxTotal} en total entre el ${shortDate(
    series[0].date
  )} y el ${shortDate(series[series.length - 1].date)}. Día con más: ${shortDate(peak.date)} (${peak.count}).`;

  return (
    <div ref={wrapRef} className="w-full min-w-0 overflow-hidden">
      {width > 0 && (
        <svg width={W} height={H} className="block" role="img" aria-label={label}>
          <line x1={L} x2={W - R} y1={T + innerH} y2={T + innerH} className="stroke-white/15" />
          <line x1={L} x2={W - R} y1={T} y2={T} className="stroke-white/5" />
          {series.map((p, i) => (
            <rect
              key={p.date}
              x={x(i) - barW / 2}
              y={yBar(p.count)}
              width={barW}
              height={T + innerH - yBar(p.count)}
              className={p === peak ? "fill-neon" : "fill-neon/50"}
            />
          ))}
          <path d={line} fill="none" strokeWidth={2} className="stroke-purple-bright" />
          <text x={L - 6} y={T + 4} textAnchor="end" className="fill-white/40 text-[11px]">
            {maxDaily}
          </text>
          <text x={L - 6} y={T + innerH} textAnchor="end" className="fill-white/40 text-[11px]">
            0
          </text>
          <text x={W - R + 6} y={T + 4} className="fill-purple-bright text-[11px]">
            {maxTotal}
          </text>
          <text x={L} y={H - 6} textAnchor="start" className="fill-white/40 text-[11px]">
            {shortDate(series[0].date)}
          </text>
          {series.length > 4 && (
            <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-white/40 text-[11px]">
              {shortDate(mid.date)}
            </text>
          )}
          <text x={W - R} y={H - 6} textAnchor="end" className="fill-white/40 text-[11px]">
            {shortDate(series[series.length - 1].date)}
          </text>
        </svg>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 font-body text-xs text-white/50">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 bg-neon/70 inline-block" /> {barLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-0.5 bg-purple-bright inline-block" /> {lineLabel}
        </span>
        <span>
          Día pico: <span className="text-neon">{shortDate(peak.date)}</span> ({peak.count})
        </span>
      </div>
    </div>
  );
}
