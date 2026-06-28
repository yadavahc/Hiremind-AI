"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, CartesianGrid, LabelList,
} from "recharts";

const SILVER = "#c8cdd6";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = "#6b7280";

const tooltipStyle = {
  background: "rgba(10,10,11,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  fontSize: 12,
  color: "#fff",
  backdropFilter: "blur(8px)",
};

const REC_COLORS: Record<string, string> = {
  "Strong Hire": "#34d399",
  Interview: "#38bdf8",
  Maybe: "#fbbf24",
  Pass: "#71717a",
};

export function ScoreDistributionChart({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="barSilver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef1f6" />
            <stop offset="100%" stopColor="#7c828e" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="count" fill="url(#barSilver)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RecommendationDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={3} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={REC_COLORS[d.name] ?? SILVER} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold">{total}</span>
        <span className="text-xs text-muted-foreground">ranked</span>
      </div>
    </div>
  );
}

export function ComponentRadar({ data }: { data: { component: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="component" tick={{ fill: AXIS, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={SILVER} fill={SILVER} fillOpacity={0.18} strokeWidth={2} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Single-candidate radar (component scores). */
export function CandidateRadar({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: AXIS, fontSize: 10 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ExperienceBars({ data }: { data: { band: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="band" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {data.map((d, i) => <Cell key={i} fill={d.band === "5–7" || d.band === "7–9" ? "#38bdf8" : "#3f3f46"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SkillsBar({ data }: { data: { skill: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="count" fill={SILVER} radius={[0, 6, 6, 0]} maxBarSize={18}>
          <LabelList dataKey="count" position="right" fill="#9ca3af" fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const w = (d.count / max) * 100;
        return (
          <div key={d.stage}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{d.stage}</span>
              <span className="font-mono font-medium">{d.count.toLocaleString()}</span>
            </div>
            <div className="h-7 overflow-hidden rounded-lg bg-white/[0.04]">
              <div
                className="flex h-full items-center rounded-lg bg-gradient-to-r from-silver/80 to-silver-muted/40 transition-all duration-1000"
                style={{ width: `${w}%`, opacity: 1 - i * 0.12 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrendArea({ data }: { data: { x: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SILVER} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SILVER} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area dataKey="value" stroke={SILVER} strokeWidth={2} fill="url(#trendFill)" />
        <Tooltip contentStyle={tooltipStyle} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
