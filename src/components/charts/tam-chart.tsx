import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { investor } from "@/lib/content";

const data = investor.market.map((row) => ({
  k: row.k,
  value: Number(row.v.replace(/[^\d.]/g, "")),
  label: row.v,
}));

export function TamChart() {
  return (
    <div className="surface h-56 p-4 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}B`}
          />
          <YAxis
            type="category"
            dataKey="k"
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in oklab, var(--accent) 10%, transparent)" }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--fg)",
              fontSize: 12,
            }}
            formatter={(value: number, _name, item) => {
              const label = (item?.payload as { label?: string } | undefined)?.label ?? `$${value}B`;
              return [label, "Category sizing · target"];
            }}
          />
          <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
