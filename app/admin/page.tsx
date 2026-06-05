"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useSidebarStore } from "@/store/sidebar";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import { useAlertStore } from "@/store/alerts";
import { useAdminStore, ADMIN_TABS } from "@/store/admin";
import type { Alert, AlertType, UnitId } from "@/lib/simulation/types";

// ─── static demo data ───────────────────────────────────────────────────────

const PS_DOOR_TIME = [
  { day: "Seg", min: 22 },
  { day: "Ter", min: 31 },
  { day: "Qua", min: 18 },
  { day: "Qui", min: 27 },
  { day: "Sex", min: 35 },
  { day: "Sáb", min: 29 },
  { day: "Dom", min: 24 },
];

const PS_LOS_FAIXA = [
  { faixa: "0–18",  h: 2.1 },
  { faixa: "18–40", h: 3.4 },
  { faixa: "40–60", h: 4.8 },
  { faixa: "60–80", h: 6.2 },
  { faixa: "80+",   h: 8.9 },
];

const PS_BOARDING = Array.from({ length: 24 }, (_, i) => ({
  hora: `${i.toString().padStart(2, "0")}h`,
  boarding: Math.max(0, Math.round(1.5 + Math.sin((i - 14) * 0.4) * 2.2 + (i > 18 ? 1 : 0))),
  livres:   Math.max(0, Math.round(4  - Math.sin((i - 10) * 0.35) * 2)),
}));

const PS_SHIFTS = [
  { turno: "Manhã",     hora: "07:00–13:00", atend: 38, crit: 3, status: "OK"      },
  { turno: "Tarde",     hora: "13:00–19:00", atend: 51, crit: 7, status: "Crítico" },
  { turno: "Noite",     hora: "19:00–01:00", atend: 29, crit: 2, status: "OK"      },
  { turno: "Madrugada", hora: "01:00–07:00", atend: 14, crit: 1, status: "OK"      },
];

const ENF_READMISSAO = [
  { esp: "Clín. Médica",  pct: 8.2  },
  { esp: "Cardiologia",   pct: 12.1 },
  { esp: "Ortopedia",     pct: 4.3  },
  { esp: "Neurologia",    pct: 9.7  },
  { esp: "Pneumologia",   pct: 11.4 },
];

const ENF_GAP_ALTA = [
  { day: "Seg", gap: 1.4 },
  { day: "Ter", gap: 2.1 },
  { day: "Qua", gap: 1.8 },
  { day: "Qui", gap: 2.6 },
  { day: "Sex", gap: 1.2 },
  { day: "Sáb", gap: 1.9 },
  { day: "Dom", gap: 2.3 },
];

// UTI
const UTI_LOS = [
  { day: "Seg", dias: 5.2 },
  { day: "Ter", dias: 6.1 },
  { day: "Qua", dias: 4.8 },
  { day: "Qui", dias: 7.3 },
  { day: "Sex", dias: 6.4 },
  { day: "Sáb", dias: 5.9 },
  { day: "Dom", dias: 6.8 },
];

const UTI_SMR = [
  { day: "Seg", smr: 0.91 },
  { day: "Ter", smr: 0.88 },
  { day: "Qua", smr: 1.02 },
  { day: "Qui", smr: 0.95 },
  { day: "Sex", smr: 0.84 },
  { day: "Sáb", smr: 0.97 },
  { day: "Dom", smr: 0.79 },
];

// CC
const CC_CANCELAMENTOS = [
  { motivo: "Paciente",  n: 12 },
  { motivo: "Cirurgião", n: 8  },
  { motivo: "Anestesia", n: 5  },
  { motivo: "Material",  n: 9  },
  { motivo: "Infecção",  n: 3  },
  { motivo: "Outros",    n: 4  },
];

const CC_OCUPACAO_TURNO = [
  { day: "Seg", manha: 82, tarde: 91, noite: 48 },
  { day: "Ter", manha: 75, tarde: 88, noite: 52 },
  { day: "Qua", manha: 90, tarde: 95, noite: 41 },
  { day: "Qui", manha: 85, tarde: 79, noite: 55 },
  { day: "Sex", manha: 93, tarde: 97, noite: 38 },
  { day: "Sáb", manha: 60, tarde: 72, noite: 30 },
  { day: "Dom", manha: 44, tarde: 58, noite: 22 },
];

const CC_ADERENCIA = [
  { sem: "S–4", pct: 87 },
  { sem: "S–3", pct: 91 },
  { sem: "S–2", pct: 84 },
  { sem: "S–1", pct: 89 },
];

// Alertas — professionals table (static)
const PROF_TABLE = [
  { nome: "Dr. Carlos Mendes",      respondidos: 14, tempoMedio: "4 min" },
  { nome: "Enf. Ana Souza",         respondidos: 22, tempoMedio: "2 min" },
  { nome: "Dr. Beatriz Lima",       respondidos:  9, tempoMedio: "7 min" },
  { nome: "Enf. Rodrigo Ferreira",  respondidos: 17, tempoMedio: "3 min" },
];

const UNIT_LABEL: Record<string, string> = {
  "pronto-socorro":   "Pronto Socorro",
  "enfermaria":       "Enfermaria",
  "uti":              "UTI",
  "centro-cirurgico": "Centro Cirúrgico",
};

// ─── shared primitives ───────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--foreground)",
};

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color: accent ? "var(--status-critical)" : "var(--foreground)" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
      {children}
    </h2>
  );
}

function ChartBox({ title, children, height = 160 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

// ─── PS Dashboard ─────────────────────────────────────────────────────────────

function PSDashboard() {
  const beds       = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const occupied   = beds.filter((b) => b.internacaoId).length;
  const total      = beds.length;

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Indicadores — Pronto Socorro</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Tempo de Porta" value="27 min" sub="média hoje" />
          <KpiCard label="LOS PS" value="4,2 h" sub="média hoje" />
          <KpiCard label="Taxa de Internação" value="34%" sub="dos atendimentos" />
          <KpiCard label="Boarding Médio" value="2,1 h" sub={`${occupied}/${total} leitos ocupados`} accent={occupied / total > 0.85} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartBox title="Tempo de Porta — 7 dias (min)">
          <AreaChart data={PS_DOOR_TIME} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gtDoor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 50]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} min`, "Tempo de Porta"]} />
            <Area type="monotone" dataKey="min" stroke="#3b82f6" fill="url(#gtDoor)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ChartBox>

        <ChartBox title="LOS por Faixa Etária (h)">
          <BarChart data={PS_LOS_FAIXA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="faixa" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 12]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} h`, "LOS médio"]} />
            <Bar dataKey="h" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartBox>

        <ChartBox title="Boarding × Leitos Livres — 24h">
          <ComposedChart data={PS_BOARDING} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hora" tick={{ fill: "var(--muted)", fontSize: 9 }} interval={5} />
            <YAxis yAxisId="left"  tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 8]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 8]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />
            <Bar   yAxisId="left"  dataKey="boarding" name="Boarding" fill="#ef4444" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Line  yAxisId="right" dataKey="livres"   name="Livres"   stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ChartBox>
      </div>

      <div>
        <SectionTitle>Desempenho por Turno — Hoje</SectionTitle>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                {["Turno", "Horário", "Atendimentos", "Críticos", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PS_SHIFTS.map((row, i) => (
                <tr key={row.turno} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                  <td className="px-4 py-3 font-medium">{row.turno}</td>
                  <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{row.hora}</td>
                  <td className="px-4 py-3 tabular-nums">{row.atend}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: row.crit > 4 ? "var(--status-critical)" : "var(--foreground)" }}>{row.crit}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: row.status === "Crítico" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                        color:      row.status === "Crítico" ? "var(--status-critical)" : "var(--status-stable)",
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── ENF Dashboard ────────────────────────────────────────────────────────────

function EnfDashboard() {
  const beds      = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "enfermaria")));
  const occupied  = beds.filter((b) => b.internacaoId).length;
  const total     = beds.length;
  const occupancy = Math.round((occupied / total) * 100);

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Indicadores — Enfermaria</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="LOS Médio" value="4,3 dias" sub="últimos 30 dias" />
          <KpiCard label="Taxa de Ocupação" value={`${occupancy}%`} sub={`${occupied}/${total} leitos`} accent={occupancy > 90} />
          <KpiCard label="Readmissão 30d" value="8,2%" sub="abaixo da meta 10%" />
          <KpiCard label="Gap Alta" value="1,8 dias" sub="est. vs real" accent />
          <KpiCard label="Altas Hoje" value="3" sub="previstas: 5" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBox title="Taxa de Readmissão por Especialidade (%)" height={200}>
          <BarChart data={ENF_READMISSAO} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 16]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="esp" tick={{ fill: "var(--muted)", fontSize: 10 }} width={88} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Readmissão"]} />
            <Bar dataKey="pct" fill="#f59e0b" radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartBox>

        <ChartBox title="Gap de Alta — últimos 7 dias (dias)" height={200}>
          <AreaChart data={ENF_GAP_ALTA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gtGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 4]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} dias`, "Gap Alta"]} />
            <Area type="monotone" dataKey="gap" stroke="#f59e0b" fill="url(#gtGap)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ChartBox>
      </div>
    </div>
  );
}

// ─── UTI Dashboard ────────────────────────────────────────────────────────────

function UTIDashboard() {
  const beds      = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "uti")));
  const occupied  = beds.filter((b) => b.internacaoId).length;
  const total     = beds.length;
  const occupancy = Math.round((occupied / total) * 100);

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Indicadores — UTI</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="LOS UTI" value="6,1 dias" sub="média hoje" />
          <KpiCard label="Taxa de Ocupação" value={`${occupancy}%`} sub={`${occupied}/${total} leitos`} accent={occupancy > 90} />
          <KpiCard label="Delay Pós-Alta" value="3,4 h" sub="aguardando leito ENF" accent />
          <KpiCard label="Mortalidade Ajustada" value="0,91" sub="SMR — abaixo de 1,0" />
          <KpiCard label="Taxa IRAS" value="2,1%" sub="meta: ≤ 3,0%" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBox title="LOS UTI — últimos 7 dias (dias)" height={200}>
          <AreaChart data={UTI_LOS} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gtUtiLos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 10]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} dias`, "LOS UTI"]} />
            <Area type="monotone" dataKey="dias" stroke="#06b6d4" fill="url(#gtUtiLos)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ChartBox>

        <ChartBox title="SMR / Mortalidade Ajustada — últimos 7 dias" height={200}>
          <LineChart data={UTI_SMR} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0.6, 1.4]} tickCount={5} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "SMR"]} />
            <Line type="monotone" dataKey="smr" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} isAnimationActive={false} />
          </LineChart>
        </ChartBox>
      </div>
    </div>
  );
}

// ─── CC Dashboard ─────────────────────────────────────────────────────────────

function CCDashboard() {
  const beds      = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "centro-cirurgico")));
  const occupied  = beds.filter((b) => b.internacaoId).length;
  const total     = beds.length;
  const occupancy = Math.round((occupied / total) * 100);

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Indicadores — Centro Cirúrgico</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Ocupação de Sala" value={`${occupancy}%`} sub={`${occupied}/${total} salas`} />
          <KpiCard label="Sala Ociosa" value="18 min" sub="média entre cirurgias" accent />
          <KpiCard label="Turnover" value="22 min" sub="limpeza + setup" />
          <KpiCard label="Cancelamento" value="6,8%" sub="último mês" accent />
          <KpiCard label="Aderência ao Mapa" value="89%" sub="semana atual" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartBox title="Cancelamentos por Motivo — mês atual" height={200}>
          <BarChart data={CC_CANCELAMENTOS} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis type="category" dataKey="motivo" tick={{ fill: "var(--muted)", fontSize: 10 }} width={60} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Cancelamentos"]} />
            <Bar dataKey="n" fill="#ef4444" radius={[0, 3, 3, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartBox>

        <ChartBox title="Ocupação por Turno — últimos 7 dias (%)" height={200}>
          <BarChart data={CC_OCUPACAO_TURNO} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
            <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />
            <Bar dataKey="manha" name="Manhã"  fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="tarde" name="Tarde"  fill="#8b5cf6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="noite" name="Noite"  fill="#475569" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ChartBox>

        <ChartBox title="Aderência ao Mapa Cirúrgico — últimas 4 semanas (%)" height={200}>
          <LineChart data={CC_ADERENCIA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="sem" tick={{ fill: "var(--muted)", fontSize: 10 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[70, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Aderência"]} />
            <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e" }} isAnimationActive={false} />
          </LineChart>
        </ChartBox>
      </div>
    </div>
  );
}

// ─── Alertas Dashboard ────────────────────────────────────────────────────────

type PeriodKey  = "hoje" | "7d" | "30d" | "custom";
type UnitFilter = "todas" | "pronto-socorro" | "enfermaria" | "uti" | "centro-cirurgico";
type TypeFilter = "todos" | "sinal-vital" | "medicacao" | "alta";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "hoje",   label: "Hoje" },
  { key: "7d",     label: "7 dias" },
  { key: "30d",    label: "30 dias" },
  { key: "custom", label: "Personalizado" },
];

const UNIT_OPTIONS: { key: UnitFilter; label: string }[] = [
  { key: "todas",            label: "Todas" },
  { key: "pronto-socorro",   label: "Pronto Socorro" },
  { key: "enfermaria",       label: "Enfermaria" },
  { key: "uti",              label: "UTI" },
  { key: "centro-cirurgico", label: "Centro Cirúrgico" },
];

const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: "todos",       label: "Todos" },
  { key: "sinal-vital", label: "Sinais Vitais" },
  { key: "medicacao",   label: "Medicação" },
  { key: "alta",        label: "Previsão de Alta" },
];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getPeriodStart(period: PeriodKey, customDate: string): number {
  const now = new Date();
  if (period === "hoje")                      return startOfDay(now);
  if (period === "7d")                        return Date.now() - 7  * 86_400_000;
  if (period === "30d")                       return Date.now() - 30 * 86_400_000;
  if (period === "custom" && customDate)      return startOfDay(new Date(customDate + "T00:00:00"));
  return 0;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
      style={{
        background: active ? "var(--accent)"           : "rgba(255,255,255,0.06)",
        color:      active ? "#fff"                    : "var(--muted)",
        border:     `1px solid ${active ? "var(--accent)" : "transparent"}`,
      }}
    >
      {children}
    </button>
  );
}

// Fixed-height KPI card — all instances render at exactly h-[78px]
function KpiUniform({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-lg px-4 flex flex-col justify-center gap-0.5"
      style={{
        height: 78,
        background: "var(--surface)",
        border: `1px solid ${accent ? "rgba(240,62,62,0.45)" : "var(--border)"}`,
      }}
    >
      <span className="text-[10px] uppercase tracking-wider leading-none" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span
        className="text-2xl font-bold tabular-nums leading-tight"
        style={{ color: accent ? "var(--status-critical)" : "var(--foreground)" }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px] leading-none" style={{ color: "var(--muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// Alertas históricos sintéticos distribuídos pelos últimos 30 dias.
// Todos "dismissed". Tempos de resposta variados: mais recente = mais rápido
// (narrativa de melhoria contínua da equipe).
const DEMO_HISTORY: Alert[] = (() => {
  const now = Date.now();
  const d = (days: number, hours = 0) => now - days * 86_400_000 - hours * 3_600_000;

  // [daysAgo, hoursOffset, unit, type, responseMinutes]
  type Row = [number, number, UnitId, AlertType, number];
  const rows: Row[] = [
    // ── hoje (2–3 min) ──────────────────────────────────
    [0, 2,  "uti",              "sinal-vital", 2],
    [0, 4,  "pronto-socorro",   "medicacao",   3],
    [0, 6,  "enfermaria",       "alta",        2],
    [0, 8,  "uti",              "sinal-vital", 3],
    [0, 10, "centro-cirurgico", "medicacao",   2],
    // ── 1–7 dias (2–4 min) ──────────────────────────────
    [1, 1,  "uti",              "sinal-vital", 3],
    [1, 5,  "enfermaria",       "medicacao",   2],
    [1, 9,  "pronto-socorro",   "sinal-vital", 4],
    [2, 2,  "uti",              "alta",        3],
    [2, 6,  "enfermaria",       "sinal-vital", 3],
    [2, 10, "pronto-socorro",   "medicacao",   4],
    [3, 3,  "uti",              "sinal-vital", 4],
    [3, 7,  "centro-cirurgico", "sinal-vital", 3],
    [4, 1,  "enfermaria",       "alta",        4],
    [4, 5,  "uti",              "sinal-vital", 3],
    [4, 9,  "pronto-socorro",   "medicacao",   4],
    [5, 2,  "uti",              "sinal-vital", 4],
    [5, 6,  "enfermaria",       "medicacao",   5],
    [6, 4,  "pronto-socorro",   "sinal-vital", 4],
    [6, 8,  "uti",              "alta",        5],
    [7, 1,  "enfermaria",       "sinal-vital", 5],
    [7, 5,  "centro-cirurgico", "medicacao",   4],
    // ── 8–30 dias (5–9 min, mais antigo = mais lento) ───
    [8,  3,  "uti",              "sinal-vital", 5],
    [9,  6,  "pronto-socorro",   "medicacao",   6],
    [10, 2,  "enfermaria",       "alta",        5],
    [11, 7,  "uti",              "sinal-vital", 6],
    [12, 4,  "pronto-socorro",   "sinal-vital", 6],
    [13, 9,  "centro-cirurgico", "medicacao",   7],
    [14, 1,  "uti",              "sinal-vital", 6],
    [15, 5,  "enfermaria",       "medicacao",   7],
    [16, 3,  "pronto-socorro",   "alta",        7],
    [17, 8,  "uti",              "sinal-vital", 7],
    [18, 2,  "enfermaria",       "sinal-vital", 8],
    [19, 6,  "pronto-socorro",   "medicacao",   7],
    [20, 4,  "uti",              "sinal-vital", 8],
    [21, 7,  "centro-cirurgico", "alta",        8],
    [22, 1,  "enfermaria",       "sinal-vital", 8],
    [23, 9,  "uti",              "medicacao",   9],
    [24, 3,  "pronto-socorro",   "sinal-vital", 8],
    [25, 5,  "enfermaria",       "alta",        9],
    [26, 2,  "uti",              "sinal-vital", 9],
    [27, 8,  "pronto-socorro",   "medicacao",   8],
    [28, 4,  "centro-cirurgico", "sinal-vital", 9],
    [29, 6,  "enfermaria",       "sinal-vital", 9],
    [30, 1,  "uti",              "alta",        9],
  ];

  return rows.map(([days, hours, unit, type, responseMin], i) => {
    const firedAt = d(days, hours);
    return {
      id:            `hist-${i}`,
      type,
      internacaoId:  `hist-${i}`,
      patientName:   "–",
      bedLabel:      "–",
      unit,
      message:       "–",
      firedAt,
      status:        "dismissed" as const,
      dismissedAt:   firedAt + responseMin * 60_000,
      dismissAction: "Ação tomada pela equipe",
    };
  });
})();

function AlertasDashboard() {
  const [period,     setPeriod]     = React.useState<PeriodKey>("hoje");
  const [customDate, setCustomDate] = React.useState<string>("");
  const [unitFilter, setUnitFilter] = React.useState<UnitFilter>("todas");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("todos");

  const storeActive  = useAlertStore((s) => s.active);
  const storeHistory = useAlertStore((s) => s.history);
  const todayStr     = new Date().toISOString().slice(0, 10);

  const all = useMemo(
    () => [...storeActive, ...storeHistory, ...DEMO_HISTORY],
    [storeActive, storeHistory],
  );

  const filtered = useMemo(() => {
    const from = getPeriodStart(period, customDate);
    return all.filter((a) =>
      a.firedAt >= from &&
      (unitFilter === "todas" || a.unit === unitFilter) &&
      (typeFilter === "todos" || a.type === typeFilter)
    );
  }, [all, period, customDate, unitFilter, typeFilter]);

  // Pendentes = tempo real: ignora filtro de período, só aplica unidade e tipo
  const pendentes = useMemo(() =>
    storeActive.filter((a) =>
      (unitFilter === "todas" || a.unit === unitFilter) &&
      (typeFilter === "todos" || a.type === typeFilter)
    ).length,
  [storeActive, unitFilter, typeFilter]);

  const respondidos = filtered.filter((a) => a.status === "dismissed").length;

  const avgResponseTime = useMemo(() => {
    const dismissed = filtered.filter((a) => a.dismissedAt && a.status === "dismissed");
    if (dismissed.length === 0) return null;
    const avg = dismissed.reduce((s, a) => s + (a.dismissedAt! - a.firedAt) / 60_000, 0) / dismissed.length;
    return Math.round(avg * 10) / 10;
  }, [filtered]);

  // Série diária de tempo médio — sempre últimos 30 dias, ignora filtros
  const responseByDay = useMemo(() => {
    const cutoff = Date.now() - 30 * 86_400_000;
    const dismissed = all.filter((a) => a.dismissedAt && a.status === "dismissed" && a.firedAt >= cutoff);
    const byDay: Record<string, number[]> = {};
    for (const a of dismissed) {
      const day = new Date(a.firedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push((a.dismissedAt! - a.firedAt) / 60_000);
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => {
        const [da, ma] = a.split("/").map(Number);
        const [db, mb] = b.split("/").map(Number);
        return ma !== mb ? ma - mb : da - db;
      })
      .map(([day, times]) => ({
        day,
        tempo: Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10,
      }));
  }, [all]);

  // TopBar h-14(56) + p-6 top(24) + h1+sub+mb-6(68) + tabs+mb-6(64) = 212px
  return (
    <div
      className="flex flex-col gap-3 overflow-hidden"
      style={{ height: "calc(100vh - 212px)" }}
    >
      {/* ── Filter strip — single compact row ── */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 rounded-lg"
        style={{
          height: 44,
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>
          Período
        </span>
        <div className="flex items-center gap-1.5">
          {PERIOD_OPTIONS.map((o) => (
            <Pill key={o.key} active={period === o.key} onClick={() => setPeriod(o.key)}>
              {o.label}
            </Pill>
          ))}
          {period === "custom" && (
            <input
              type="date"
              max={todayStr}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border)",
                color: customDate ? "var(--foreground)" : "var(--muted)",
                colorScheme: "dark",
                outline: "none",
              }}
            />
          )}
        </div>

        <div className="w-px self-stretch my-2.5 shrink-0" style={{ background: "var(--border)" }} />

        <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>
          Unidade
        </span>
        <div className="flex items-center gap-1.5">
          {UNIT_OPTIONS.map((o) => (
            <Pill key={o.key} active={unitFilter === o.key} onClick={() => setUnitFilter(o.key)}>
              {o.label}
            </Pill>
          ))}
        </div>

        <div className="w-px self-stretch my-2.5 shrink-0" style={{ background: "var(--border)" }} />

        <span className="text-[10px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>
          Tipo
        </span>
        <div className="flex items-center gap-1.5">
          {TYPE_OPTIONS.map((o) => (
            <Pill key={o.key} active={typeFilter === o.key} onClick={() => setTypeFilter(o.key)}>
              {o.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* ── 4 uniform KPI cards — single row, identical height ── */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <KpiUniform label="Total de Alertas"  value={String(filtered.length)} sub="no período" />
        <KpiUniform label="Pendentes"         value={String(pendentes)}       sub="em aberto agora" accent={pendentes > 0} />
        <KpiUniform label="Respondidos"       value={String(respondidos)}     sub="no período" />
        <KpiUniform label="Tempo Médio Resp." value={avgResponseTime !== null ? `${avgResponseTime} min` : "–"} sub="alertas respondidos" />
      </div>

      {/* ── Chart + Table — fill every remaining pixel ── */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">

        {/* Tempo médio de resposta por dia */}
        <div
          className="rounded-lg p-4 flex flex-col min-h-0"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3 shrink-0">
            <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
              Tempo Médio de Resposta — últimos 30 dias (min)
            </p>
            <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--muted)" }}>
              <span className="inline-block w-6 border-t border-dashed" style={{ borderColor: "#f59e0b" }} />
              Meta 5 min
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={responseByDay.length > 0 ? responseByDay : [{ day: "–", tempo: 0 }]}
                margin={{ top: 8, right: 16, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 12]} tickFormatter={(v) => `${v}m`} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${v} min`, "Tempo médio"]}
                />
                <ReferenceLine
                  y={5}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="tempo"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resposta por profissional */}
        <div
          className="rounded-lg flex flex-col min-h-0 overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-medium px-4 pt-4 pb-3 shrink-0" style={{ color: "var(--muted)" }}>
            Resposta por Profissional
          </p>
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {["Profissional", "Respondidos", "Tempo Médio"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium"
                      style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROF_TABLE.map((row, i) => (
                  <tr key={row.nome} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                    <td className="px-4 py-3 font-medium">{row.nome}</td>
                    <td className="px-4 py-3 tabular-nums">{row.respondidos}</td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "var(--muted)" }}>{row.tempoMedio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const tab      = useAdminStore((s) => s.tab);
  const setTab   = useAdminStore((s) => s.setTab);
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto flex flex-col"
          style={{
            marginLeft: collapsed ? 56 : 224,
            transition: "margin-left 200ms ease",
            minHeight: "100vh",
            background: "var(--background)",
          }}
        >
          <TopBar />
          <div className="p-6 flex-1">
          <h1 className="text-lg font-semibold mb-1">Visão Administrativa</h1>
          <p className="text-xs mb-6" style={{ color: "var(--muted)" }}>
            Indicadores gerenciais por unidade
          </p>

          {/* Tab navigation */}
          <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
            {ADMIN_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                style={{
                  color:        tab === t.id ? "var(--accent)"           : "var(--muted)",
                  borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "ps"      && <PSDashboard    />}
          {tab === "enf"     && <EnfDashboard   />}
          {tab === "uti"     && <UTIDashboard   />}
          {tab === "cc"      && <CCDashboard    />}
          {tab === "alertas" && <AlertasDashboard />}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
