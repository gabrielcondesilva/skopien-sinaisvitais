"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ── Types ─────────────────────────────────────────────────────────────────────

type Departamento = "Todos" | "UTI" | "Enfermaria" | "Pronto Socorro" | "Centro Cirúrgico";

interface ConformidadeItem { mes: string; decubito: number; braden: number; curativo: number; }
interface MonthlyItem      { mes: string; noPrazo: number; atrasado: number; }
interface StageItem        { name: string; value: number; color: string; }
interface AnatomyItem      { local: string; count: number; }

// ── Filter options ────────────────────────────────────────────────────────────

const CONVENIOS   = ["Todos", "Unimed", "Bradesco Saúde", "SulAmérica", "Amil", "Particular", "SUS"];
const DEPARTAMENTOS: Departamento[] = ["Todos", "UTI", "Enfermaria", "Pronto Socorro", "Centro Cirúrgico"];
const ALAS        = ["Todos", "Ala Norte", "Ala Sul", "Ala Leste", "Ala Oeste"];

// ── Conformidade por setor ────────────────────────────────────────────────────

const CONFORMIDADE: Record<Departamento, ConformidadeItem[]> = {
  "Todos": [
    { mes: "Out/25", decubito: 68, braden: 82, curativo: 71 },
    { mes: "Nov/25", decubito: 61, braden: 79, curativo: 67 },
    { mes: "Dez/25", decubito: 74, braden: 85, curativo: 76 },
    { mes: "Jan/26", decubito: 68, braden: 83, curativo: 72 },
    { mes: "Fev/26", decubito: 72, braden: 87, curativo: 75 },
    { mes: "Mar/26", decubito: 70, braden: 85, curativo: 74 },
    { mes: "Abr/26", decubito: 65, braden: 82, curativo: 70 },
    { mes: "Mai/26", decubito: 72, braden: 88, curativo: 74 },
  ],
  "UTI": [
    { mes: "Out/25", decubito: 76, braden: 88, curativo: 72 },
    { mes: "Nov/25", decubito: 74, braden: 85, curativo: 70 },
    { mes: "Dez/25", decubito: 80, braden: 91, curativo: 78 },
    { mes: "Jan/26", decubito: 78, braden: 89, curativo: 76 },
    { mes: "Fev/26", decubito: 82, braden: 93, curativo: 80 },
    { mes: "Mar/26", decubito: 79, braden: 90, curativo: 78 },
    { mes: "Abr/26", decubito: 77, braden: 88, curativo: 75 },
    { mes: "Mai/26", decubito: 83, braden: 94, curativo: 81 },
  ],
  "Enfermaria": [
    { mes: "Out/25", decubito: 66, braden: 80, curativo: 69 },
    { mes: "Nov/25", decubito: 62, braden: 77, curativo: 65 },
    { mes: "Dez/25", decubito: 70, braden: 83, curativo: 74 },
    { mes: "Jan/26", decubito: 67, braden: 81, curativo: 71 },
    { mes: "Fev/26", decubito: 69, braden: 84, curativo: 73 },
    { mes: "Mar/26", decubito: 68, braden: 82, curativo: 72 },
    { mes: "Abr/26", decubito: 64, braden: 79, curativo: 68 },
    { mes: "Mai/26", decubito: 70, braden: 85, curativo: 73 },
  ],
  "Pronto Socorro": [
    { mes: "Out/25", decubito: 55, braden: 72, curativo: 58 },
    { mes: "Nov/25", decubito: 51, braden: 68, curativo: 54 },
    { mes: "Dez/25", decubito: 60, braden: 75, curativo: 62 },
    { mes: "Jan/26", decubito: 57, braden: 71, curativo: 60 },
    { mes: "Fev/26", decubito: 62, braden: 74, curativo: 63 },
    { mes: "Mar/26", decubito: 58, braden: 72, curativo: 61 },
    { mes: "Abr/26", decubito: 54, braden: 70, curativo: 57 },
    { mes: "Mai/26", decubito: 63, braden: 76, curativo: 64 },
  ],
  "Centro Cirúrgico": [
    { mes: "Out/25", decubito: 75, braden: 80, curativo: 70 },
    { mes: "Nov/25", decubito: 72, braden: 78, curativo: 68 },
    { mes: "Dez/25", decubito: 78, braden: 83, curativo: 74 },
    { mes: "Jan/26", decubito: 76, braden: 81, curativo: 72 },
    { mes: "Fev/26", decubito: 80, braden: 84, curativo: 76 },
    { mes: "Mar/26", decubito: 77, braden: 82, curativo: 74 },
    { mes: "Abr/26", decubito: 74, braden: 80, curativo: 71 },
    { mes: "Mai/26", decubito: 81, braden: 85, curativo: 77 },
  ],
};

// ── Cuidados mensais por setor ────────────────────────────────────────────────

const MONTHLY: Record<Departamento, MonthlyItem[]> = {
  "Todos": [
    { mes: "Out/25", noPrazo: 132, atrasado: 48 },
    { mes: "Nov/25", noPrazo: 118, atrasado: 62 },
    { mes: "Dez/25", noPrazo: 145, atrasado: 35 },
    { mes: "Jan/26", noPrazo: 128, atrasado: 52 },
    { mes: "Fev/26", noPrazo: 141, atrasado: 39 },
    { mes: "Mar/26", noPrazo: 135, atrasado: 45 },
    { mes: "Abr/26", noPrazo: 122, atrasado: 58 },
    { mes: "Mai/26", noPrazo: 150, atrasado: 37 },
  ],
  "UTI": [
    { mes: "Out/25", noPrazo: 45, atrasado: 12 },
    { mes: "Nov/25", noPrazo: 41, atrasado: 16 },
    { mes: "Dez/25", noPrazo: 52, atrasado:  9 },
    { mes: "Jan/26", noPrazo: 47, atrasado: 13 },
    { mes: "Fev/26", noPrazo: 55, atrasado:  8 },
    { mes: "Mar/26", noPrazo: 50, atrasado: 11 },
    { mes: "Abr/26", noPrazo: 44, atrasado: 14 },
    { mes: "Mai/26", noPrazo: 58, atrasado:  7 },
  ],
  "Enfermaria": [
    { mes: "Out/25", noPrazo: 58, atrasado: 22 },
    { mes: "Nov/25", noPrazo: 52, atrasado: 28 },
    { mes: "Dez/25", noPrazo: 65, atrasado: 17 },
    { mes: "Jan/26", noPrazo: 56, atrasado: 24 },
    { mes: "Fev/26", noPrazo: 63, atrasado: 18 },
    { mes: "Mar/26", noPrazo: 60, atrasado: 21 },
    { mes: "Abr/26", noPrazo: 54, atrasado: 26 },
    { mes: "Mai/26", noPrazo: 68, atrasado: 15 },
  ],
  "Pronto Socorro": [
    { mes: "Out/25", noPrazo: 30, atrasado: 28 },
    { mes: "Nov/25", noPrazo: 26, atrasado: 34 },
    { mes: "Dez/25", noPrazo: 35, atrasado: 22 },
    { mes: "Jan/26", noPrazo: 29, atrasado: 30 },
    { mes: "Fev/26", noPrazo: 33, atrasado: 25 },
    { mes: "Mar/26", noPrazo: 28, atrasado: 29 },
    { mes: "Abr/26", noPrazo: 25, atrasado: 36 },
    { mes: "Mai/26", noPrazo: 37, atrasado: 21 },
  ],
  "Centro Cirúrgico": [
    { mes: "Out/25", noPrazo: 20, atrasado:  7 },
    { mes: "Nov/25", noPrazo: 18, atrasado:  9 },
    { mes: "Dez/25", noPrazo: 24, atrasado:  5 },
    { mes: "Jan/26", noPrazo: 21, atrasado:  7 },
    { mes: "Fev/26", noPrazo: 25, atrasado:  4 },
    { mes: "Mar/26", noPrazo: 22, atrasado:  6 },
    { mes: "Abr/26", noPrazo: 19, atrasado:  8 },
    { mes: "Mai/26", noPrazo: 27, atrasado:  4 },
  ],
};

// ── Estágios por setor (valores; estrutura com cores fixa) ────────────────────

const STAGE_COLORS: Record<string, string> = {
  "Estágio I":           "#f97316",
  "Estágio II":          "#ef4444",
  "Estágio III":         "#dc2626",
  "Estágio IV":          "#991b1b",
  "Não classificável":   "#6b7280",
  "Les. Tissular Prof.": "#7c3aed",
};
const STAGE_ORDER = Object.keys(STAGE_COLORS);

const STAGE_VALUES: Record<Departamento, Partial<Record<string, number>>> = {
  "Todos":            { "Estágio I": 12, "Estágio II":  8, "Estágio III": 4, "Estágio IV": 1, "Não classificável": 2, "Les. Tissular Prof.": 1 },
  "UTI":              { "Estágio I":  3, "Estágio II":  5, "Estágio III": 4, "Estágio IV": 2, "Não classificável": 1, "Les. Tissular Prof.": 1 },
  "Enfermaria":       { "Estágio I":  7, "Estágio II":  3, "Estágio III": 1, "Não classificável": 1 },
  "Pronto Socorro":   { "Estágio I":  5, "Estágio II":  2 },
  "Centro Cirúrgico": { "Estágio I":  2, "Estágio II":  1 },
};

function getStageData(setor: Departamento): StageItem[] {
  const vals = STAGE_VALUES[setor];
  return STAGE_ORDER
    .map((name) => ({ name, value: vals[name] ?? 0, color: STAGE_COLORS[name] }))
    .filter((s) => s.value > 0);
}

// ── Anatomia por setor ────────────────────────────────────────────────────────

const ANATOMY_LOCS = ["Sacro", "Calcâneo", "Orelha/Disp.", "Outros", "Occipital", "Trocânter"];

const ANATOMY_VALUES: Record<Departamento, Partial<Record<string, number>>> = {
  "Todos":            { "Sacro": 8, "Calcâneo": 7, "Orelha/Disp.": 4, "Outros": 4, "Occipital": 3, "Trocânter": 2 },
  "UTI":              { "Sacro": 6, "Calcâneo": 4, "Occipital": 2, "Trocânter": 2, "Orelha/Disp.": 1, "Outros": 1 },
  "Enfermaria":       { "Sacro": 3, "Calcâneo": 2, "Outros": 3, "Orelha/Disp.": 2, "Occipital": 1, "Trocânter": 1 },
  "Pronto Socorro":   { "Orelha/Disp.": 3, "Sacro": 2, "Calcâneo": 1, "Occipital": 1 },
  "Centro Cirúrgico": { "Occipital": 1, "Sacro": 1, "Trocânter": 1, "Orelha/Disp.": 1 },
};

function getAnatomyData(setor: Departamento): AnatomyItem[] {
  const vals = ANATOMY_VALUES[setor];
  return ANATOMY_LOCS
    .map((local) => ({ local, count: vals[local] ?? 0 }))
    .filter((a) => a.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ── Style constants ───────────────────────────────────────────────────────────

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
const LABEL_SM = { fill: "#f7f7f7", fontSize:  9, fontWeight: 600 } as React.CSSProperties;
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

function ConformanceTrendPanel({ data }: { data: ConformidadeItem[] }) {
  return (
    <Card title="Conformidade ao Longo do Tempo (%)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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

function MonthlyPanel({ data }: { data: MonthlyItem[] }) {
  return (
    <Card title="Cuidados Realizados por Mês — No Prazo × Atrasados">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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

function StagePanel({ data }: { data: StageItem[] }) {
  return (
    <Card title="Lesões por Estágio">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={TICK} axisLine={false} tickLine={false} width={145} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "lesões"]} />
          <Bar dataKey="value" name="Lesões" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="value" position="right" style={LABEL_LG} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function AnatomyPanel({ data }: { data: AnatomyItem[] }) {
  return (
    <Card title="Localização Anatômica">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="local" tick={TICK} axisLine={false} tickLine={false} width={90} />
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

const TOPBAR_H  = 52;
const FILTER_H  = 44;
const PAD       = 16;
const GAP       = 12;

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function CuidadosComAPelePage() {
  const [convenio,     setConvenio]     = useState("Todos");
  const [departamento, setDepartamento] = useState<Departamento>("Todos");
  const [ala,          setAla]          = useState("Todos");
  const [lastUpdate,   setLastUpdate]   = useState(getLastUpdateLabel);

  useEffect(() => {
    const tick = () => setLastUpdate(getLastUpdateLabel());
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const conformidadeData = CONFORMIDADE[departamento];
  const monthlyData      = MONTHLY[departamento];
  const stageData        = getStageData(departamento);
  const anatomyData      = getAnatomyData(departamento);

  const rowH = `calc((100vh - ${TOPBAR_H}px - ${FILTER_H}px - ${PAD * 2}px - ${GAP}px) / 2)`;

  return (
    <AuthGuard>
      <div style={{ height: "100vh", overflow: "hidden", background: "var(--background)", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          height: TOPBAR_H, flexShrink: 0,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "0 24px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          <Link href="/command" style={{ fontSize: 12, color: "#F7F7F7", textDecoration: "none" }}>← Voltar</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Cuidados com a Pele</span>
            <Image src="/skinone.png" alt="skinOne" width={80} height={22} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <RealtimeClock />
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          height: FILTER_H, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 20px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          {([
            { label: "Convênio",     value: convenio,     setter: setConvenio,     options: CONVENIOS },
            { label: "Departamento", value: departamento, setter: (v: string) => setDepartamento(v as Departamento), options: DEPARTAMENTOS },
            { label: "Ala",          value: ala,          setter: setAla,          options: ALAS },
          ] as const).map(({ label, value, setter, options }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" as const }}>
                {label}:
              </span>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  color: "var(--foreground)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}

          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" as const }}>
            Última atualização: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
          </span>
        </div>

        {/* 2 × 2 grid */}
        <div style={{
          flex: 1,
          padding: PAD,
          display: "grid",
          gap: GAP,
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: `${rowH} ${rowH}`,
          minHeight: 0,
        }}>
          <ConformanceTrendPanel data={conformidadeData} />
          <StagePanel            data={stageData} />
          <MonthlyPanel          data={monthlyData} />
          <AnatomyPanel          data={anatomyData} />
        </div>

      </div>
    </AuthGuard>
  );
}
