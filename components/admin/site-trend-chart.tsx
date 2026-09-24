/**
 * 30-day area chart for total pageviews.
 *
 * Fully server-renderable: pure SVG, no client JS required.
 * Gaps in the `daily` array (dates with zero views) are filled automatically so the
 * X-axis always represents a continuous 30-day window rather than skipping empty days.
 */

interface DailyPoint {
  date: string;
  count: number;
}

interface SiteTrendChartProps {
  daily: DailyPoint[];
  from: string;
  to: string;
}

/**
 * Expand a sparse daily array into a dense 30-day series.
 * Dates with no data get count=0 so the area fills down to the baseline.
 */
function fillDailyGaps(daily: DailyPoint[], from: string, to: string): DailyPoint[] {
  const indexed = new Map(daily.map((d) => [d.date, d.count]));
  const result: DailyPoint[] = [];
  const cursor = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    result.push({ date: dateStr, count: indexed.get(dateStr) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function formatShortDate(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function SiteTrendChart({ daily, from, to }: SiteTrendChartProps): React.JSX.Element {
  const W = 800;
  const H = 180;
  const PAD = { top: 16, right: 12, bottom: 32, left: 44 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const points = fillDailyGaps(daily, from, to);
  const maxCount = Math.max(...points.map((p) => p.count), 1);

  // Tick labels: pick ~5 evenly spaced dates
  const tickIndices: number[] = [0];
  const step = Math.floor(points.length / 4);
  for (let i = step; i < points.length - 1; i += step) tickIndices.push(i);
  tickIndices.push(points.length - 1);

  function x(i: number): number {
    return PAD.left + (i / Math.max(points.length - 1, 1)) * innerW;
  }
  function y(count: number): number {
    return PAD.top + innerH - (count / maxCount) * innerH;
  }

  // Build SVG path strings
  const linePath =
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ");

  const areaPath =
    `M${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} ` +
    points.map((p, i) => `L${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ") +
    ` L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  // Y-axis ticks
  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) {
    yTicks.push(Math.round((maxCount / yTickCount) * i));
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="30-day pageview trend chart"
      className="w-full"
      style={{ height: "180px" }}
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3457d5" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3457d5" stopOpacity="0.02" />
        </linearGradient>
        {/* Dark-mode gradient defined separately via currentColor trick is not possible in SVG;
            we rely on opacity to keep the fill subtle in both themes. */}
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick) => (
        <line
          key={tick}
          x1={PAD.left}
          y1={y(tick)}
          x2={PAD.left + innerW}
          y2={y(tick)}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#area-fill)" />

      {/* Trend line */}
      <path d={linePath} fill="none" stroke="#3457d5" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data dots on hover simulation: SVG only, show dot at each non-zero point */}
      {points.map((p, i) =>
        p.count > 0 ? (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.count)}
            r="2.5"
            fill="#3457d5"
            opacity="0.7"
          />
        ) : null,
      )}

      {/* Y-axis labels */}
      {yTicks.map((tick) => (
        <text
          key={tick}
          x={PAD.left - 6}
          y={y(tick) + 4}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          opacity="0.45"
        >
          {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
        </text>
      ))}

      {/* X-axis tick labels */}
      {tickIndices.map((idx) => (
        <text
          key={points[idx].date}
          x={x(idx)}
          y={PAD.top + innerH + 18}
          textAnchor={idx === 0 ? "start" : idx === points.length - 1 ? "end" : "middle"}
          fontSize="10"
          fill="currentColor"
          opacity="0.45"
        >
          {formatShortDate(points[idx].date)}
        </text>
      ))}
    </svg>
  );
}
