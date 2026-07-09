"use client";

import React, { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine, LabelList,
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

const DAY_ABBR = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
function getDay(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return DAY_ABBR[d.getDay()];
}
const LAST7 = Array.from({ length: 7 }, (_, i) => getDay(i - 6));

const PS_DOOR_TIME = [
  { day: LAST7[0], min: 22 }, { day: LAST7[1], min: 31 }, { day: LAST7[2], min: 18 },
  { day: LAST7[3], min: 27 }, { day: LAST7[4], min: 35 }, { day: LAST7[5], min: 29 },
  { day: "Hoje",   min: 24 },
];
const PS_LOS_FAIXA = [
  { faixa: "0–18", h: 2.1 }, { faixa: "18–40", h: 3.4 }, { faixa: "40–60", h: 4.8 },
  { faixa: "60–80", h: 6.2 }, { faixa: "80+", h: 8.9 },
];
const PS_BOARDING = (() => {
  const now = new Date().getHours();
  return Array.from({ length: 12 }, (_, i) => {
    const h = (now - 11 + i + 24) % 24;
    return {
      hora:     `${h.toString().padStart(2, "0")}h`,
      boarding: Math.max(0, Math.round(1.5 + Math.sin((h - 14) * 0.4) * 2.2 + (h > 18 ? 1 : 0))),
      livres:   Math.max(0, Math.round(4   - Math.sin((h - 10) * 0.35) * 2)),
    };
  });
})();
const PS_SHIFTS = [
  { turno: "Manhã",     hora: "07–13h", atend: 38, crit: 3, status: "OK"      },
  { turno: "Tarde",     hora: "13–19h", atend: 51, crit: 7, status: "Crítico" },
  { turno: "Noite",     hora: "19–01h", atend: 29, crit: 2, status: "OK"      },
  { turno: "Madrugada", hora: "01–07h", atend: 14, crit: 1, status: "OK"      },
];
const ENF_READMISSAO = [
  { esp: "Clín. Médica", pct: 8.2 }, { esp: "Cardiologia", pct: 12.1 },
  { esp: "Ortopedia",    pct: 4.3 }, { esp: "Neurologia",  pct: 9.7  },
  { esp: "Pneumologia",  pct: 11.4 },
];
const ENF_GAP_ALTA = [
  { day: LAST7[0], gap: 1.4 }, { day: LAST7[1], gap: 2.1 }, { day: LAST7[2], gap: 1.8 },
  { day: LAST7[3], gap: 2.6 }, { day: LAST7[4], gap: 1.2 }, { day: LAST7[5], gap: 1.9 },
  { day: "Hoje",   gap: 2.3 },
];
const UTI_LOS = [
  { day: LAST7[0], dias: 5.2 }, { day: LAST7[1], dias: 6.1 }, { day: LAST7[2], dias: 4.8 },
  { day: LAST7[3], dias: 7.3 }, { day: LAST7[4], dias: 6.4 }, { day: LAST7[5], dias: 5.9 },
  { day: "Hoje",   dias: 6.8 },
];
const UTI_SMR = [
  { day: LAST7[0], smr: 0.91 }, { day: LAST7[1], smr: 0.88 }, { day: LAST7[2], smr: 1.02 },
  { day: LAST7[3], smr: 0.95 }, { day: LAST7[4], smr: 0.84 }, { day: LAST7[5], smr: 0.97 },
  { day: "Hoje",   smr: 0.79 },
];
const CC_CANCELAMENTOS = [
  { motivo: "Paciente",  n: 12 }, { motivo: "Cirurgião", n: 8 },
  { motivo: "Anestesia", n: 5  }, { motivo: "Material",  n: 9 },
  { motivo: "Infecção",  n: 3  }, { motivo: "Outros",    n: 4 },
];
const CC_OCUPACAO_TURNO = [
  { day: LAST7[1], manha: 75, tarde: 88, noite: 52 },
  { day: LAST7[2], manha: 90, tarde: 95, noite: 41 },
  { day: LAST7[3], manha: 85, tarde: 79, noite: 55 },
  { day: LAST7[4], manha: 93, tarde: 97, noite: 38 },
  { day: LAST7[5], manha: 60, tarde: 72, noite: 30 },
  { day: "Hoje",   manha: 44, tarde: 58, noite: 22 },
];
const CC_ADERENCIA = [
  { sem: "S–4", pct: 87 }, { sem: "S–3", pct: 91 },
  { sem: "S–2", pct: 84 }, { sem: "S–1", pct: 89 },
];
const PROF_TABLE = [
  { nome: "Dr. Carlos Mendes",     respondidos: 14, tempoMedio: "4 min" },
  { nome: "Enf. Ana Souza",        respondidos: 22, tempoMedio: "2 min" },
  { nome: "Dr. Beatriz Lima",      respondidos:  9, tempoMedio: "7 min" },
  { nome: "Enf. Rodrigo Ferreira", respondidos: 17, tempoMedio: "3 min" },
];
const UNIT_LABEL: Record<string, string> = {
  "pronto-socorro":   "Pronto Socorro",
  "enfermaria":       "Enfermaria",
  "uti":              "UTI",
  "centro-cirurgico": "Centro Cirúrgico",
};

// ─── shared primitives ───────────────────────────────────────────────────────

const TS = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 11, color: "var(--foreground)",
};
const LS = { fill: "#f7f7f7", fontSize: 9, fontWeight: 600 } as React.CSSProperties;
const DOT_BLUE   = { r: 3, fill: "#3b82f6",  strokeWidth: 0 };
const DOT_AMBER  = { r: 3, fill: "#f59e0b",  strokeWidth: 0 };
const DOT_CYAN   = { r: 3, fill: "#06b6d4",  strokeWidth: 0 };
const DOT_ORANGE = { r: 3, fill: "#f97316",  strokeWidth: 0 };
const DOT_GREEN  = { r: 3, fill: "#22c55e",  strokeWidth: 0 };

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-lg px-3 py-2 flex flex-col gap-0.5"
      style={{ background: "var(--surface)", border: `1px solid ${accent ? "rgba(240,62,62,0.45)" : "var(--border)"}` }}>
      <span className="text-[9px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xl font-bold tabular-nums leading-tight"
        style={{ color: accent ? "var(--status-critical)" : "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-[9px] leading-none" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 flex flex-col min-h-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-[11px] font-semibold mb-1.5 shrink-0" style={{ color: "#f7f7f7" }}>{title}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── PS Dashboard ─────────────────────────────────────────────────────────────

function PSDashboard() {
  const beds       = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const occupied   = beds.filter((b) => b.internacaoId).length;
  const total      = beds.length;
  const waitingCount = beds.filter((b) => {
    const i = b.internacaoId ? internacoes[b.internacaoId] : null;
    return i && i.admissionProbability >= 40;
  }).length;

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <KpiCard label="Tempo de Porta"   value="27 min" sub="média hoje" />
        <KpiCard label="LOS PS"           value="4,2 h"  sub="média hoje" />
        <KpiCard label="Taxa de Internação" value="34%"  sub="dos atendimentos" />
        <KpiCard label="Leitos Virtuais"  value={String(waitingCount)} sub="pacientes aguardando leito" accent={waitingCount > 3} />
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        <ChartBox title="Tempo de Porta — 7 dias (min)">
          <AreaChart data={PS_DOOR_TIME} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="gtDoor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v} min`, "Tempo de Porta"]} />
            <Area type="monotone" dataKey="min" stroke="#3b82f6" fill="url(#gtDoor)" strokeWidth={2}
              dot={DOT_BLUE} isAnimationActive={false}>
              <LabelList dataKey="min" position="top" style={LS} />
            </Area>
          </AreaChart>
        </ChartBox>

        <ChartBox title="LOS por Faixa Etária (h)">
          <BarChart data={PS_LOS_FAIXA} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="faixa" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v} h`, "LOS médio"]} />
            <Bar dataKey="h" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="h" position="top" style={LS} />
            </Bar>
          </BarChart>
        </ChartBox>

        <ChartBox title="Boarding × Leitos Livres — últimas 12h">
          <BarChart data={PS_BOARDING} margin={{ top: 18, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hora" tick={{ fill: "var(--muted)", fontSize: 8 }} padding={{ left: 10, right: 10 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} />
            <Legend wrapperStyle={{ fontSize: 9, color: "var(--muted)" }} />
            <Bar dataKey="boarding" name="Boarding"     fill="#ef4444" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="boarding" position="top" style={{ ...LS, fontSize: 7 }} />
            </Bar>
            <Bar dataKey="livres"   name="Leitos Livres" fill="#22c55e" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="livres" position="top" style={{ ...LS, fontSize: 7 }} />
            </Bar>
          </BarChart>
        </ChartBox>
      </div>

      {/* Shift table compact */}
      <div className="shrink-0 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              {["Turno","Horário","Atend.","Críticos","Status"].map((h) => (
                <th key={h} className="px-3 py-1.5 text-left font-semibold" style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PS_SHIFTS.map((row, i) => (
              <tr key={row.turno} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                <td className="px-3 py-1.5 font-medium">{row.turno}</td>
                <td className="px-3 py-1.5" style={{ color: "var(--muted)" }}>{row.hora}</td>
                <td className="px-3 py-1.5 tabular-nums">{row.atend}</td>
                <td className="px-3 py-1.5 tabular-nums" style={{ color: row.crit > 4 ? "var(--status-critical)" : "var(--foreground)" }}>{row.crit}</td>
                <td className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: row.status === "Crítico" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                      color:      row.status === "Crítico" ? "var(--status-critical)" : "var(--status-stable)",
                    }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="h-full flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2 shrink-0">
        <KpiCard label="LOS Médio"        value="4,3 dias" sub="últimos 30 dias" />
        <KpiCard label="Taxa de Ocupação" value={`${occupancy}%`} sub={`${occupied}/${total} leitos`} accent={occupancy > 90} />
        <KpiCard label="Readmissão 30d"   value="8,2%"     sub="abaixo da meta 10%" />
        <KpiCard label="Gap Alta"         value="1,8 dias" sub="est. vs real" accent />
        <KpiCard label="Altas Hoje"       value="3"        sub="previstas: 5" />
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        <ChartBox title="Taxa de Readmissão por Especialidade (%) — últimos 30 dias">
          <BarChart data={ENF_READMISSAO} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" hide domain={[0, 16]} />
            <YAxis type="category" dataKey="esp" tick={{ fill: "var(--muted)", fontSize: 9 }} width={82} />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`, "Readmissão"]} />
            <Bar dataKey="pct" fill="#f59e0b" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${v}%`} style={LS} />
            </Bar>
          </BarChart>
        </ChartBox>

        <ChartBox title="Gap de Alta — últimos 7 dias (dias)">
          <AreaChart data={ENF_GAP_ALTA} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="gtGap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "Gap Alta"]} />
            <Area type="monotone" dataKey="gap" stroke="#f59e0b" fill="url(#gtGap)" strokeWidth={2}
              dot={DOT_AMBER} isAnimationActive={false}>
              <LabelList dataKey="gap" position="top" style={LS} />
            </Area>
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
    <div className="h-full flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2 shrink-0">
        <KpiCard label="LOS UTI"             value="6,1 dias" sub="média hoje" />
        <KpiCard label="Taxa de Ocupação"    value={`${occupancy}%`} sub={`${occupied}/${total} leitos`} accent={occupancy > 90} />
        <KpiCard label="Delay Pós-Alta"      value="3,4 h"    sub="aguardando leito ENF" accent />
        <KpiCard label="Mortalidade Ajustada" value="0,91"    sub="SMR — abaixo de 1,0" />
        <KpiCard label="Taxa IRAS"            value="2,1%"    sub="meta: ≤ 3,0%" />
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        <ChartBox title="LOS UTI — últimos 7 dias (dias)">
          <AreaChart data={UTI_LOS} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="gtUtiLos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v} dias`, "LOS UTI"]} />
            <Area type="monotone" dataKey="dias" stroke="#06b6d4" fill="url(#gtUtiLos)" strokeWidth={2}
              dot={DOT_CYAN} isAnimationActive={false}>
              <LabelList dataKey="dias" position="top" style={LS} />
            </Area>
          </AreaChart>
        </ChartBox>

        <ChartBox title="SMR / Mortalidade Ajustada — últimos 7 dias">
          <LineChart data={UTI_SMR} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide domain={[0.6, 1.4]} />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "SMR"]} />
            <ReferenceLine y={1} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="smr" stroke="#f97316" strokeWidth={2}
              dot={DOT_ORANGE} isAnimationActive={false}>
              <LabelList dataKey="smr" position="top" style={LS} />
            </Line>
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
    <div className="h-full flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2 shrink-0">
        <KpiCard label="Ocupação de Sala"  value={`${occupancy}%`} sub={`${occupied}/${total} salas`} />
        <KpiCard label="Sala Ociosa"       value="18 min"  sub="média entre cirurgias" accent />
        <KpiCard label="Turnover"          value="22 min"  sub="limpeza + setup" />
        <KpiCard label="Cancelamento"      value="6,8%"    sub="último mês" accent />
        <KpiCard label="Aderência ao Mapa" value="89%"     sub="semana atual" />
      </div>

      <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
        <ChartBox title="Cancelamentos por Motivo — mês atual">
          <BarChart data={CC_CANCELAMENTOS} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="motivo" tick={{ fill: "var(--muted)", fontSize: 9 }} width={58} />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Cancelamentos"]} />
            <Bar dataKey="n" fill="#ef4444" radius={[0, 3, 3, 0]} isAnimationActive={false}>
              <LabelList dataKey="n" position="right" style={LS} />
            </Bar>
          </BarChart>
        </ChartBox>

        <ChartBox title="Ocupação por Turno — últimos 6 dias (%)">
          <BarChart data={CC_OCUPACAO_TURNO} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`]} />
            <Legend wrapperStyle={{ fontSize: 9, color: "var(--muted)" }} />
            <Bar dataKey="manha" name="Manhã" fill="#3b82f6" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="manha" position="top" formatter={(v: unknown) => `${v}%`} style={{ ...LS, fontSize: 7 }} />
            </Bar>
            <Bar dataKey="tarde" name="Tarde" fill="#8b5cf6" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="tarde" position="top" formatter={(v: unknown) => `${v}%`} style={{ ...LS, fontSize: 7 }} />
            </Bar>
            <Bar dataKey="noite" name="Noite" fill="#475569" radius={[2, 2, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="noite" position="top" formatter={(v: unknown) => `${v}%`} style={{ ...LS, fontSize: 7 }} />
            </Bar>
          </BarChart>
        </ChartBox>

        <ChartBox title="Aderência ao Mapa Cirúrgico — 4 semanas (%)">
          <BarChart data={CC_ADERENCIA} margin={{ top: 18, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="sem" tick={{ fill: "var(--muted)", fontSize: 9 }} />
            <YAxis hide domain={[70, 100]} />
            <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`, "Aderência"]} />
            <Bar dataKey="pct" fill="#22c55e" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="pct" position="top" formatter={(v: unknown) => `${v}%`} style={LS} />
            </Bar>
          </BarChart>
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
  { key: "hoje", label: "Hoje" }, { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" }, { key: "custom", label: "Personalizado" },
];
const UNIT_OPTIONS: { key: UnitFilter; label: string }[] = [
  { key: "todas", label: "Todas" }, { key: "pronto-socorro", label: "Pronto Socorro" },
  { key: "enfermaria", label: "Enfermaria" }, { key: "uti", label: "UTI" },
  { key: "centro-cirurgico", label: "Centro Cirúrgico" },
];
const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: "todos", label: "Todos" }, { key: "sinal-vital", label: "Sinais Vitais" },
  { key: "medicacao", label: "Medicação" }, { key: "alta", label: "Previsão de Alta" },
];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
function getPeriodStart(period: PeriodKey, customDate: string): number {
  const now = new Date();
  if (period === "hoje")                 return startOfDay(now);
  if (period === "7d")                   return Date.now() - 7  * 86_400_000;
  if (period === "30d")                  return Date.now() - 30 * 86_400_000;
  if (period === "custom" && customDate) return startOfDay(new Date(customDate + "T00:00:00"));
  return 0;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
      style={{
        background: active ? "var(--accent)"  : "rgba(255,255,255,0.06)",
        color:      active ? "#fff"            : "var(--muted)",
        border:     `1px solid ${active ? "var(--accent)" : "transparent"}`,
      }}>
      {children}
    </button>
  );
}

function KpiUniform({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-lg px-4 flex flex-col justify-center gap-0.5"
      style={{ height: 72, background: "var(--surface)", border: `1px solid ${accent ? "rgba(240,62,62,0.45)" : "var(--border)"}` }}>
      <span className="text-[10px] uppercase tracking-wider leading-none" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums leading-tight"
        style={{ color: accent ? "var(--status-critical)" : "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-[10px] leading-none" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

const DEMO_HISTORY: Alert[] = (() => {
  const now = Date.now();
  const d = (days: number, hours = 0) => now - days * 86_400_000 - hours * 3_600_000;
  type Row = [number, number, UnitId, AlertType, number];
  const rows: Row[] = [
    [0,2,"uti","sinal-vital",2],[0,4,"pronto-socorro","medicacao",3],[0,6,"enfermaria","alta",2],
    [0,8,"uti","sinal-vital",3],[0,10,"centro-cirurgico","medicacao",2],
    [1,1,"uti","sinal-vital",3],[1,5,"enfermaria","medicacao",2],[1,9,"pronto-socorro","sinal-vital",4],
    [2,2,"uti","alta",3],[2,6,"enfermaria","sinal-vital",3],[2,10,"pronto-socorro","medicacao",4],
    [3,3,"uti","sinal-vital",4],[3,7,"centro-cirurgico","sinal-vital",3],
    [4,1,"enfermaria","alta",4],[4,5,"uti","sinal-vital",3],[4,9,"pronto-socorro","medicacao",4],
    [5,2,"uti","sinal-vital",4],[5,6,"enfermaria","medicacao",5],[6,4,"pronto-socorro","sinal-vital",4],
    [6,8,"uti","alta",5],[7,1,"enfermaria","sinal-vital",5],[7,5,"centro-cirurgico","medicacao",4],
    [8,3,"uti","sinal-vital",5],[9,6,"pronto-socorro","medicacao",6],[10,2,"enfermaria","alta",5],
    [11,7,"uti","sinal-vital",6],[12,4,"pronto-socorro","sinal-vital",6],[13,9,"centro-cirurgico","medicacao",7],
    [14,1,"uti","sinal-vital",6],[15,5,"enfermaria","medicacao",7],[16,3,"pronto-socorro","alta",7],
    [17,8,"uti","sinal-vital",7],[18,2,"enfermaria","sinal-vital",8],[19,6,"pronto-socorro","medicacao",7],
    [20,4,"uti","sinal-vital",8],[21,7,"centro-cirurgico","alta",8],[22,1,"enfermaria","sinal-vital",8],
    [23,9,"uti","medicacao",9],[24,3,"pronto-socorro","sinal-vital",8],[25,5,"enfermaria","alta",9],
    [26,2,"uti","sinal-vital",9],[27,8,"pronto-socorro","medicacao",8],[28,4,"centro-cirurgico","sinal-vital",9],
    [29,6,"enfermaria","sinal-vital",9],[30,1,"uti","alta",9],
  ];
  return rows.map(([days, hours, unit, type, responseMin], i) => {
    const firedAt = d(days, hours);
    return { id: `hist-${i}`, type, internacaoId: `hist-${i}`, patientName: "–", bedLabel: "–",
      unit, message: "–", firedAt, status: "dismissed" as const,
      dismissedAt: firedAt + responseMin * 60_000, dismissAction: "Ação tomada pela equipe" };
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

  const all = useMemo(() => [...storeActive, ...storeHistory, ...DEMO_HISTORY], [storeActive, storeHistory]);
  const filtered = useMemo(() => {
    const from = getPeriodStart(period, customDate);
    return all.filter((a) =>
      a.firedAt >= from &&
      (unitFilter === "todas" || a.unit === unitFilter) &&
      (typeFilter === "todos" || a.type === typeFilter)
    );
  }, [all, period, customDate, unitFilter, typeFilter]);

  const pendentes = useMemo(() =>
    storeActive.filter((a) =>
      (unitFilter === "todas" || a.unit === unitFilter) &&
      (typeFilter === "todos" || a.type === typeFilter)
    ).length, [storeActive, unitFilter, typeFilter]);

  const respondidos = filtered.filter((a) => a.status === "dismissed").length;

  const avgResponseTime = useMemo(() => {
    const dismissed = filtered.filter((a) => a.dismissedAt && a.status === "dismissed");
    if (dismissed.length === 0) return null;
    const avg = dismissed.reduce((s, a) => s + (a.dismissedAt! - a.firedAt) / 60_000, 0) / dismissed.length;
    return Math.round(avg * 10) / 10;
  }, [filtered]);

  const responseByDay = useMemo(() => {
    const cutoff = Date.now() - 15 * 86_400_000;
    const dismissed = all.filter((a) => a.dismissedAt && a.status === "dismissed" && a.firedAt >= cutoff);
    const byDay: Record<string, number[]> = {};
    for (const a of dismissed) {
      const day = new Date(a.firedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push((a.dismissedAt! - a.firedAt) / 60_000);
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => { const [da,ma]=a.split("/").map(Number); const [db,mb]=b.split("/").map(Number); return ma!==mb?ma-mb:da-db; })
      .map(([day, times]) => ({ day, tempo: Math.round((times.reduce((s,t)=>s+t,0)/times.length)*10)/10 }));
  }, [all]);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-3 px-4 shrink-0 rounded-lg"
        style={{ height: 40, background: "var(--surface)", border: "1px solid var(--border)" }}>
        <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>Período</span>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map((o) => <Pill key={o.key} active={period===o.key} onClick={()=>setPeriod(o.key)}>{o.label}</Pill>)}
          {period === "custom" && (
            <input type="date" max={todayStr} value={customDate} onChange={(e)=>setCustomDate(e.target.value)}
              className="px-2 py-1 rounded text-xs"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid var(--border)", color:customDate?"var(--foreground)":"var(--muted)", colorScheme:"dark", outline:"none" }} />
          )}
        </div>
        <div className="w-px self-stretch my-2 shrink-0" style={{ background: "var(--border)" }} />
        <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>Unidade</span>
        <div className="flex items-center gap-1">
          {UNIT_OPTIONS.map((o) => <Pill key={o.key} active={unitFilter===o.key} onClick={()=>setUnitFilter(o.key)}>{o.label}</Pill>)}
        </div>
        <div className="w-px self-stretch my-2 shrink-0" style={{ background: "var(--border)" }} />
        <span className="text-[9px] font-semibold uppercase tracking-widest shrink-0" style={{ color: "var(--muted)" }}>Tipo</span>
        <div className="flex items-center gap-1">
          {TYPE_OPTIONS.map((o) => <Pill key={o.key} active={typeFilter===o.key} onClick={()=>setTypeFilter(o.key)}>{o.label}</Pill>)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 shrink-0">
        <KpiUniform label="Total de Alertas"  value={String(filtered.length)} sub="no período" />
        <KpiUniform label="Pendentes"         value={String(pendentes)}       sub="em aberto agora" accent={pendentes > 0} />
        <KpiUniform label="Respondidos"       value={String(respondidos)}     sub="no período" />
        <KpiUniform label="Tempo Médio Resp." value={avgResponseTime !== null ? `${avgResponseTime} min` : "–"} sub="alertas respondidos" />
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        <div className="rounded-lg p-3 flex flex-col min-h-0" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <p className="text-[11px] font-semibold" style={{ color:"#f7f7f7" }}>Tempo Médio de Resposta — 15 dias (min)</p>
            <span className="flex items-center gap-1.5 text-[9px]" style={{ color:"var(--muted)" }}>
              <span className="inline-block w-5 border-t border-dashed" style={{ borderColor:"#f59e0b" }} />Meta 5 min
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseByDay.length>0?responseByDay:[{day:"–",tempo:0}]} margin={{top:18,right:16,bottom:0,left:-20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{fill:"var(--muted)",fontSize:9}} interval="preserveStartEnd" />
                <YAxis tick={{fill:"var(--muted)",fontSize:9}} domain={[0,12]} tickFormatter={(v)=>`${v}m`} />
                <Tooltip contentStyle={TS} formatter={(v)=>[`${v} min`,"Tempo médio"]} />
                <ReferenceLine y={5} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
                <Line type="monotone" dataKey="tempo" stroke="#3b82f6" strokeWidth={2}
                  dot={DOT_BLUE} activeDot={{r:5}} isAnimationActive={false}>
                  <LabelList dataKey="tempo" position="top" style={LS} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg flex flex-col min-h-0 overflow-hidden" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
          <p className="text-[11px] font-semibold px-4 pt-3 pb-2 shrink-0" style={{ color:"#f7f7f7" }}>Resposta por Profissional</p>
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full text-xs">
              <thead className="sticky top-0" style={{ background:"var(--surface)" }}>
                <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                  {["Profissional","Respondidos","Tempo Médio"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium"
                      style={{ color:"var(--muted)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROF_TABLE.map((row,i) => (
                  <tr key={row.nome} style={{ borderTop:i>0?"1px solid var(--border)":undefined }}>
                    <td className="px-4 py-2.5 font-medium">{row.nome}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.respondidos}</td>
                    <td className="px-4 py-2.5 tabular-nums" style={{ color:"var(--muted)" }}>{row.tempoMedio}</td>
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
  const tab       = useAdminStore((s) => s.tab);
  const setTab    = useAdminStore((s) => s.setTab);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const fullscreen = useSidebarStore((s) => s.fullscreen);

  return (
    <AuthGuard>
      <div className="flex" style={{ height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden"
          style={{ marginLeft: fullscreen ? 0 : collapsed ? 56 : 224, transition: "margin-left 200ms ease", background: "var(--background)" }}>
          <TopBar />

          <div className="flex flex-col flex-1 min-h-0 px-5 pt-4 pb-3 gap-2">
            <div className="flex items-baseline gap-3 shrink-0">
              <h1 className="text-base font-semibold">Visão Administrativa</h1>
              <span className="text-xs" style={{ color: "var(--muted)" }}>Indicadores gerenciais por unidade</span>
            </div>

            {/* Tab navigation */}
            <div className="shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex gap-1">
                {ADMIN_TABS.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className="px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                    style={{
                      color:        tab === t.id ? "var(--accent)"           : "var(--muted)",
                      borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                      marginBottom: -1,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content fills remaining height */}
            <div className="flex-1 min-h-0">
              {tab === "ps"      && <PSDashboard    />}
              {tab === "enf"     && <EnfDashboard   />}
              {tab === "uti"     && <UTIDashboard   />}
              {tab === "cc"      && <CCDashboard    />}
              {tab === "alertas" && <AlertasDashboard />}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
