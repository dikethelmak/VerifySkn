"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as PieTooltip,
} from "recharts";

interface Props {
  dailyScanData:       Array<{ date: string; count: number }>;
  resultDistribution:  Array<{ name: string; value: number }>;
  topProducts:         Array<{ name: string; count: number }>;
}

const PIE_COLORS = ["#2D7A4F", "#E07B2A", "#C0392B"];

const TICK_STYLE = {
  fontFamily: "var(--font-rethink, sans-serif)",
  fontSize: 11,
  fill: "#9C9892",
};

export default function AnalyticsTab({
  dailyScanData,
  resultDistribution,
  topProducts,
}: Props) {
  const totalScans = resultDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Scan volume line chart ── */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-1 font-rethink text-sm font-semibold text-text-primary">
          Scan Volume — Last 30 Days
        </p>
        <p className="mb-5 font-rethink text-xs text-text-secondary">
          {totalScans} total scan{totalScans !== 1 ? "s" : ""} across all your products
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyScanData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E2DD" vertical={false} />
            <XAxis
              dataKey="date"
              tick={TICK_STYLE}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={TICK_STYLE}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontFamily: "var(--font-rethink, sans-serif)",
                fontSize: 12,
                borderRadius: 10,
                border: "1px solid #E5E2DD",
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Scans"
              stroke="#1A3C2E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#1A3C2E" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* ── Result distribution pie ── */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="mb-4 font-rethink text-sm font-semibold text-text-primary">
            Result Distribution
          </p>
          {totalScans === 0 ? (
            <p className="py-8 text-center font-rethink text-sm text-text-secondary">
              No scan data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={resultDistribution}
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={80}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {resultDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip
                  contentStyle={{
                    fontFamily: "var(--font-rethink, sans-serif)",
                    fontSize: 12,
                    borderRadius: 10,
                    border: "1px solid #E5E2DD",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontFamily: "var(--font-rethink, sans-serif)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Most scanned products ── */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="mb-4 font-rethink text-sm font-semibold text-text-primary">
            Most Scanned Products
          </p>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center font-rethink text-sm text-text-secondary">
              No scan data yet
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {topProducts.map((p, i) => {
                const pct = topProducts[0].count > 0
                  ? Math.round((p.count / topProducts[0].count) * 100)
                  : 0;
                return (
                  <li key={p.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-rethink text-sm text-text-primary line-clamp-1">
                        <span className="mr-2 font-mono text-xs text-text-secondary">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {p.name}
                      </span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-text-secondary">
                        {p.count}
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: "#E5E2DD" }}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
