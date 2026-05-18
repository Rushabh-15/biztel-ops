"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

export type ChartBucket = { label: string; value: number };
export type TimeSeriesPoint = { date: string; value: number };

const BAR_FILL = "var(--chart-2)";
const LINE_STROKE = "var(--chart-1)";

export function DashboardCharts({
  byShift,
  byMachine,
  topOps,
  qtyOverTime,
}: {
  byShift: ChartBucket[];
  byMachine: ChartBucket[];
  topOps: ChartBucket[];
  qtyOverTime: TimeSeriesPoint[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="Quantity over time"
        subtitle="Total units produced per day"
        empty={qtyOverTime.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={qtyOverTime.map((p) => ({
              ...p,
              label: format(parseISO(p.date), "MMM d"),
            }))}
            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [Number(v ?? 0).toLocaleString(), "units"]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_STROKE}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Shift-wise production"
        subtitle="Total units per shift"
        empty={byShift.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byShift} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [Number(v ?? 0).toLocaleString(), "units"]}
            />
            <Bar dataKey="value" fill={BAR_FILL} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Machine output"
        subtitle="Units produced by machine (top 8)"
        empty={byMachine.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={byMachine}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 12, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={70}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [Number(v ?? 0).toLocaleString(), "units"]}
            />
            <Bar dataKey="value" fill={BAR_FILL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Top 5 operations"
        subtitle="Most-frequently logged operation codes"
        empty={topOps.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={topOps}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 12, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={80}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => [Number(v ?? 0), "records"]}
            />
            <Bar dataKey="value" fill={BAR_FILL} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            Not enough data yet.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

const tooltipLabelStyle: React.CSSProperties = {
  color: "var(--muted-foreground)",
};
