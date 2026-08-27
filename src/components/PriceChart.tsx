import { useMemo } from "react";
import type { Tick } from "@/lib/protocol";
import { fmtPrice } from "@/lib/format";

type Props = {
  ticks: Tick[];
  liqPrice?: number | null;
  entryPrice?: number | null;
};

export function PriceChart({ ticks, liqPrice, entryPrice }: Props) {
  const geometry = useMemo(() => {
    if (ticks.length < 2) return null;
    const prices = ticks.map((tick) => tick.price);
    const candidates = [...prices];
    if (liqPrice) candidates.push(liqPrice);
    if (entryPrice) candidates.push(entryPrice);
    const min = Math.min(...candidates);
    const max = Math.max(...candidates);
    const pad = (max - min) * 0.12 || max * 0.02 || 1;
    const low = min - pad;
    const high = max + pad;
    const width = 1000;
    const height = 380;

    const x = (index: number) => (index / (prices.length - 1)) * width;
    const y = (price: number) => height - ((price - low) / (high - low)) * height;

    const line = prices.map((price, index) => `${x(index)},${y(price)}`).join(" ");
    const area = `0,${height} ${line} ${width},${height}`;

    return {
      width,
      height,
      line,
      area,
      y,
      last: prices[prices.length - 1],
      first: prices[0],
      low,
      high,
      rising: prices[prices.length - 1] >= prices[0],
    };
  }, [ticks, liqPrice, entryPrice]);

  if (!geometry) {
    return (
      <div className="grid h-full w-full place-items-center bg-surface-2">
        <span className="label-xs font-mono">Waiting for price feed</span>
      </div>
    );
  }

  const stroke = geometry.rising ? "var(--color-long)" : "var(--color-short)";

  return (
    <div className="relative h-full w-full bg-surface-2">
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label="Live price feed"
      >
        <defs>
          <linearGradient id="feedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={geometry.width}
            y1={geometry.height * ratio}
            y2={geometry.height * ratio}
            stroke="var(--color-border)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
        ))}

        <polygon points={geometry.area} fill="url(#feedFill)" />
        <polyline
          points={geometry.line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {entryPrice ? (
          <line
            x1={0}
            x2={geometry.width}
            y1={geometry.y(entryPrice)}
            y2={geometry.y(entryPrice)}
            stroke="var(--color-subtle)"
            strokeWidth="1"
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {liqPrice ? (
          <line
            x1={0}
            x2={geometry.width}
            y1={geometry.y(liqPrice)}
            y2={geometry.y(liqPrice)}
            stroke="var(--color-warn)"
            strokeWidth="1"
            strokeDasharray="2 6"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      <div className="pointer-events-none absolute top-3 right-4 flex flex-col items-end gap-1">
        <span className="num text-sm text-card-foreground">{fmtPrice(geometry.last)}</span>
        <span className="label-xs font-mono">mark</span>
      </div>

      {liqPrice ? (
        <div className="pointer-events-none absolute bottom-24 left-4 flex items-center gap-2">
          <span className="h-px w-6 bg-warn" />
          <span className="label-xs font-mono text-warn">liq {fmtPrice(liqPrice)}</span>
        </div>
      ) : null}
    </div>
  );
}
