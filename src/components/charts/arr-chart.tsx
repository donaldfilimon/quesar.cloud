import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { investor } from "@/lib/content";

const data = investor.arr.map((row) => ({ year: row.year, value: Number(row.v) }));

export function ArrChart() {
  return (
    <div className="surface h-64 p-4 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}M`}
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
            formatter={(value) => [`$${value}M`, "ARR target"]}
          />
          <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
