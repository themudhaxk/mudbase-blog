/**
 * Tiny inline sparkline for the per-article analytics table.
 *
 * Renders a 30-day trend as a compact SVG polyline.
 * Server-renderable; no client JS.
 */

interface DailyPoint {
  date: string;
  count: number;
}

interface SparklineProps {
  /** Sparse trend data - dates with zero views are omitted and filled in here. */
  trend: DailyPoint[];
  /** Start of the 30-day window (YYYY-MM-DD). */
  from: string;
  /** End of the 30-day window (YYYY-MM-DD). */
  to: string;
  className?: string;
}

function fillGaps(trend: DailyPoint[], from: string, to: string): DailyPoint[] {
  const indexed = new Map(trend.map((d) => [d.date, d.count]));
  const result: DailyPoint[] = [];
  const cursor = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cursor <= end) {
    const ds = cursor.toISOString().slice(0, 10);
    result.push({ date: ds, count: indexed.get(ds) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export function Sparkline({ trend, from, to, className }: SparklineProps): React.JSX.Element {
  const W = 80;
  const H = 24;
  const PAD_Y = 2;

  const points = fillGaps(trend, from, to);
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  const coords = points.map((p, i) => {
    const px = (i / Math.max(points.length - 1, 1)) * W;
    const py = PAD_Y + (H - PAD_Y * 2) - (p.count / maxCount) * (H - PAD_Y * 2);
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });

  const hasData = points.some((p) => p.count > 0);

  if (!hasData) {
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        className={className}
        style={{ width: W, height: H }}
      >
        <line
          x1="0"
          y1={H / 2}
          x2={W}
          y2={H / 2}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className={className}
      style={{ width: W, height: H }}
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="#3457d5"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Highlight the latest non-zero point */}
      {(() => {
        const lastIdx = points.reduceRight<number>(
          (found, p, i) => (found === -1 && p.count > 0 ? i : found),
          -1,
        );
        if (lastIdx === -1) return null;
        const [cx, cy] = (coords[lastIdx] ?? "0,0").split(",");
        return <circle cx={cx} cy={cy} r="2" fill="#3457d5" opacity="0.9" />;
      })()}
    </svg>
  );
}
