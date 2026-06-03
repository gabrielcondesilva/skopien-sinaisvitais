"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
  LineChart, Line,
  PieChart, Pie, Cell,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MONTHLY_DATA = [
  { mes: "Out/25", noPrazo: 132, atrasado: 48 },
  { mes: "Nov/25", noPrazo: 118, atrasado: 62 },
  { mes: "Dez/25", noPrazo: 145, atrasado: 35 },
  { mes: "Jan/26", noPrazo: 128, atrasado: 52 },
  { mes: "Fev/26", noPrazo: 141, atrasado: 39 },
  { mes: "Mar/26", noPrazo: 135, atrasado: 45 },
  { mes: "Abr/26", noPrazo: 122, atrasado: 58 },
  { mes: "Mai/26", noPrazo: 150, atrasado: 37 },
];

const CONFORMIDADE_DATA = [
  { mes: "Out/25", decubito: 68, braden: 82, curativo: 71 },
  { mes: "Nov/25", decubito: 61, braden: 79, curativo: 67 },
  { mes: "Dez/25", decubito: 74, braden: 85, curativo: 76 },
  { mes: "Jan/26", decubito: 68, braden: 83, curativo: 72 },
  { mes: "Fev/26", decubito: 72, braden: 87, curativo: 75 },
  { mes: "Mar/26", decubito: 70, braden: 85, curativo: 74 },
  { mes: "Abr/26", decubito: 65, braden: 82, curativo: 70 },
  { mes: "Mai/26", decubito: 72, braden: 88, curativo: 74 },
];

const STAGE_DATA = [
  { name: "Estágio I",           value: 12, color: "#f97316" },
  { name: "Estágio II",          value:  8, color: "#ef4444" },
  { name: "Estágio III",         value:  4, color: "#dc2626" },
  { name: "Estágio IV",          value:  1, color: "#991b1b" },
  { name: "Não classificável",   value:  2, color: "#6b7280" },
  { name: "Les. Tissular Prof.", value:  1, color: "#7c3aed" },
];

const ANATOMY_DATA = [
  { local: "Sacro",        count: 8 },
  { local: "Calcâneo",     count: 7 },
  { local: "Orelha/Disp.", count: 4 },
  { local: "Outros",       count: 4 },
  { local: "Occipital",    count: 3 },
  { local: "Trocânter",    count: 2 },
];

const TOOLTIP_STYLE = {
  background: "#131823",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#fff",
};

const TICK = { fontSize: 11, fill: "rgba(255,255,255,0.38)" };
const LEGEND_STYLE = { fontSize: 11, paddingTop: 4 };
const legendFormatter = (v: string) => (
  <span style={{ color: "rgba(255,255,255,0.6)" }}>{v}</span>
);

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.35)", padding: "12px 16px 6px", flexShrink: 0,
      }}>
        {title}
      </p>
      <div style={{ flex: 1, minHeight: 0, padding: "0 10px 10px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Panels ────────────────────────────────────────────────────────────────────

function ConformanceTrendPanel() {
  return (
    <Card title="Conformidade ao Longo do Tempo (%)">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={CONFORMIDADE_DATA} margin={{ top: 6, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="mes" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[55, 100]} unit="%" />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "rgba(255,255,255,0.08)" }} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={LEGEND_STYLE} formatter={legendFormatter} />
          <Line type="monotone" dataKey="decubito" name="Decúbito" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="braden"   name="Braden"   stroke="#a78bfa" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="curativo"  name="Curativo" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function MonthlyPanel() {
  return (
    <Card title="Cuidados Realizados por Mês — No Prazo × Atrasados">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={MONTHLY_DATA} margin={{ top: 6, right: 12, bottom: 4, left: -16 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="mes" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis tick={TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend wrapperStyle={LEGEND_STYLE} formatter={legendFormatter} />
          <Bar dataKey="noPrazo"  name="No Prazo" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          <Bar dataKey="atrasado" name="Atrasado"  fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function StagePanel() {
  const total = STAGE_DATA.reduce((s, d) => s + d.value, 0);
  return (
    <Card title="Lesões por Estágio">
      <div style={{ display: "flex", gap: 16, height: "100%", alignItems: "center" }}>
        <div style={{ flexShrink: 0, width: 120, height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={STAGE_DATA} cx="50%" cy="50%" innerRadius={32} outerRadius={54}
                dataKey="value" paddingAngle={2} isAnimationActive={false}>
                {STAGE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "lesões"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          {STAGE_DATA.map((d) => (
            <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{d.value}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{total}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AnatomyPanel() {
  return (
    <Card title="Localização Anatômica">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ANATOMY_DATA} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="local" tick={TICK} axisLine={false} tickLine={false} width={80} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [v, "lesões"]} />
          <Bar dataKey="count" name="Lesões" fill="#38bdf8" radius={[0, 4, 4, 0]} opacity={0.85} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TOPBAR_H = 52;
const PAD      = 16;
const GAP      = 12;

export default function CuidadosComAPelePage() {
  const rowH = `calc((100vh - ${TOPBAR_H}px - ${PAD * 2}px - ${GAP}px) / 2)`;

  return (
    <AuthGuard>
      <div style={{ height: "100vh", overflow: "hidden", background: "var(--background)", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          height: TOPBAR_H, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/command" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>
              ← Central de Comando
            </Link>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Cuidados com a Pele</span>
              <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "var(--status-stable)" }}>
                Ao vivo
              </span>
            </div>
          </div>
          <Image src="/skinone.png" alt="skinOne" width={80} height={22} />
        </div>

        {/* 2 × 2 uniform grid */}
        <div style={{
          padding: PAD,
          display: "grid",
          gap: GAP,
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: `${rowH} ${rowH}`,
        }}>
          <ConformanceTrendPanel />
          <StagePanel />
          <MonthlyPanel />
          <AnatomyPanel />
        </div>

      </div>
    </AuthGuard>
  );
}
