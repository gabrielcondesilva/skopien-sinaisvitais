"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

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

const TICK    = { fontSize: 11, fill: "#f7f7f7" };
const TICK_SM = { fontSize: 10, fill: "#f7f7f7" };
const LABEL    = { fill: "#f7f7f7", fontSize: 10, fontWeight: 700 } as React.CSSProperties;
const LABEL_SM = { fill: "#f7f7f7", fontSize: 9,  fontWeight: 600 } as React.CSSProperties;
const LABEL_LG = { fill: "#f7f7f7", fontSize: 12, fontWeight: 700 } as React.CSSProperties;

const LEGEND_STYLE = { fontSize: 11, paddingTop: 4 };
const legendFormatter = (v: string) => (
  <span style={{ color: "rgba(255,255,255,0.7)" }}>{v}</span>
);

const pctFmt = (v: unknown) => `${v}%`;

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#f7f7f7", padding: "12px 16px 6px", flexShrink: 0,
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
        <BarChart
          data={CONFORMIDADE_DATA}
          margin={{ top: 22, right: 8, bottom: 4, left: 0 }}
          barCategoryGap="28%"
          barGap={5}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="mes" tick={TICK_SM} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [`${v}%`]} />
          <Legend wrapperStyle={LEGEND_STYLE} formatter={legendFormatter} />
          <Bar dataKey="decubito" name="Decúbito" fill="#38bdf8" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="decubito" position="top" formatter={pctFmt} style={LABEL_SM} />
          </Bar>
          <Bar dataKey="braden" name="Braden" fill="#a78bfa" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="braden" position="top" formatter={pctFmt} style={LABEL_SM} />
          </Bar>
          <Bar dataKey="curativo" name="Curativo" fill="#22c55e" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="curativo" position="top" formatter={pctFmt} style={LABEL_SM} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function MonthlyPanel() {
  return (
    <Card title="Cuidados Realizados por Mês — No Prazo × Atrasados">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={MONTHLY_DATA}
          margin={{ top: 22, right: 8, bottom: 4, left: 0 }}
          barCategoryGap="28%"
          barGap={3}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="mes" tick={TICK} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend wrapperStyle={LEGEND_STYLE} formatter={legendFormatter} />
          <Bar dataKey="noPrazo" name="No Prazo" fill="#06b6d4" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="noPrazo" position="top" style={LABEL} />
          </Bar>
          <Bar dataKey="atrasado" name="Atrasado" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85}>
            <LabelList dataKey="atrasado" position="top" style={LABEL} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function StagePanel() {
  return (
    <Card title="Lesões por Estágio">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={STAGE_DATA}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            width={145}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "lesões"]} />
          <Bar dataKey="value" name="Lesões" radius={[0, 4, 4, 0]}>
            {STAGE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="value" position="right" style={LABEL_LG} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function AnatomyPanel() {
  return (
    <Card title="Localização Anatômica">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={ANATOMY_DATA}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="local"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.04)" }} formatter={(v) => [v, "lesões"]} />
          <Bar dataKey="count" name="Lesões" fill="#38bdf8" radius={[0, 4, 4, 0]} opacity={0.9}>
            <LabelList dataKey="count" position="right" style={LABEL_LG} />
          </Bar>
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

        {/* Top bar — 3 columns: back link | centered title | clock + logo */}
        <div style={{
          height: TOPBAR_H, flexShrink: 0,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "0 24px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          <Link href="/command" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "none" }}>
            ← Central de Comando
          </Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Cuidados com a Pele</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
            <RealtimeClock />
            <Image src="/skinone.png" alt="skinOne" width={80} height={22} />
          </div>
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
