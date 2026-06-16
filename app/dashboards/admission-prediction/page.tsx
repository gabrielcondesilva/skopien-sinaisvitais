"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart, Bar, Cell, ComposedChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static data ──────────────────────────────────────────────────────────────

// Internações esperadas por dia da semana (Dom=0..Sáb=6) — padrão clínico típico
const N_BY_DOW = [8, 14, 18, 16, 22, 19, 11];
const DAY_ABBR  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildForecast7d() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    return { day: i === 0 ? "Hoje" : DAY_ABBR[dow], n: N_BY_DOW[dow], isToday: i === 0 };
  });
}

const HOUR_SEED = [
  { h:"06h", hour:6,  real:1, pred:2 },{ h:"07h", hour:7,  real:3, pred:2 },
  { h:"08h", hour:8,  real:4, pred:5 },{ h:"09h", hour:9,  real:6, pred:6 },
  { h:"10h", hour:10, real:5, pred:5 },{ h:"11h", hour:11, real:4, pred:4 },
  { h:"12h", hour:12, real:3, pred:3 },{ h:"13h", hour:13, real:3, pred:3 },
  { h:"14h", hour:14, real:4, pred:5 },{ h:"15h", hour:15, real:4, pred:4 },
  { h:"16h", hour:16, real:2, pred:3 },{ h:"17h", hour:17, real:2, pred:2 },
];

const AGE_BANDS = [
  { faixa:"0–17",  min:0,  max:17  },
  { faixa:"18–39", min:18, max:39  },
  { faixa:"40–59", min:40, max:59  },
  { faixa:"60–74", min:60, max:74  },
  { faixa:"75+",   min:75, max:999 },
];

const SPECIALTY_GRID = [
  { esp:"Clín. Médica",  enf:8, uti:2, cc:0 },
  { esp:"Cardiologia",   enf:4, uti:3, cc:1 },
  { esp:"Ortopedia",     enf:5, uti:1, cc:2 },
  { esp:"Neurologia",    enf:3, uti:2, cc:0 },
  { esp:"Pneumologia",   enf:4, uti:2, cc:0 },
  { esp:"Cirurgia Geral",enf:3, uti:1, cc:3 },
];

const PROB_COLOR = (p: number) =>
  p >= 70 ? "var(--status-critical)" : p >= 50 ? "var(--status-attention)" : "var(--foreground)";

const STATUS_COLOR: Record<string, string> = {
  "Estável":       "var(--status-stable)",
  "Atenção":       "var(--status-attention)",
  "Risco Elevado": "var(--status-elevated)",
  "Crítico":       "var(--status-critical)",
};

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };
const LS = { fill: "#f7f7f7", fontSize: 9, fontWeight: 600 } as React.CSSProperties;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdmissionPredictionPage() {
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);

  const candidates = useMemo(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i || i.admissionProbability < 30) return [];
      return [{
        bed:        b.label,
        name:       i.patient.name,
        age:        i.patient.age,
        prob:       i.admissionProbability,
        ews:        i.currentEws,
        status:     i.currentStatus,
        manchester: i.manchesterClass,
        destino:    i.currentEws >= 5 ? "UTI" : "Enfermaria",
      }];
    })
    .sort((a, b) => b.prob - a.prob),
  [beds, internacoes]);

  const highProb = candidates.filter((c) => c.prob >= 70).length;

  const ageProfile = useMemo(() =>
    AGE_BANDS.map(b => ({
      faixa: b.faixa,
      n: candidates.filter(c => c.age >= b.min && c.age <= b.max).length,
    })),
  [candidates]);

  const forecast7d = useMemo(() => buildForecast7d(), []);

  const currentHour = new Date().getHours();
  const hourlyChart = HOUR_SEED.map(d => ({
    h:    d.h,
    real: d.hour < currentHour ? d.real : d.hour === currentHour ? candidates.length : undefined as number | undefined,
    pred: d.hour >= currentHour ? d.pred : undefined as number | undefined,
  }));

  return (
    <AuthGuard>
      <div
        style={{
          height: "100vh", overflow: "hidden",
          display: "flex", flexDirection: "column",
          background: "var(--background)",
        }}
      >
        {/* Top bar */}
        <div className="px-6"
          style={{ height: 52, flexShrink: 0, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Predição de Internações</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flexShrink: 0 }}>
            <div className="rounded-lg p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Forecast 7 dias</span>
              <span className="text-2xl font-bold tabular-nums">{forecast7d.reduce((s,x)=>s+x.n,0)}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>internações previstas</span>
            </div>
            <div className="rounded-lg p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Candidatos PS Agora</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-attention)" }}>{candidates.length}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>prob. ≥ 30% — ao vivo</span>
            </div>
            <div className="rounded-lg p-4 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Alta Probabilidade</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-critical)" }}>{highProb}</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>prob. ≥ 70% — ao vivo</span>
            </div>
          </div>

          {/* Row 1: 3 charts */}
          <div style={{ flex: 2, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

            {/* Forecast 7d */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Forecast de Internações — 7 dias</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast7d} margin={{ top: 20, right: 12, bottom: 0, left: 12 }}>
                    <XAxis dataKey="day" tick={{ fill: "#f7f7f7", fontSize: 10 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Internações"]} />
                    <Bar dataKey="n" radius={[3,3,0,0]} isAnimationActive={false}>
                      {forecast7d.map((entry, i) => (
                        <Cell key={i} fill={entry.isToday ? "#4DABF7" : "#3b82f6"} />
                      ))}
                      <LabelList dataKey="n" position="top" style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Real × Predito por Hora */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "#f7f7f7" }}>Real × Predito por Hora — Hoje</p>
              <div className="flex gap-4 mb-2 text-xs" style={{ color: "var(--muted)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#3b82f6" }} />Real (realizado)
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width={20} height={2}><line x1="0" y1="1" x2="20" y2="1" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3"/></svg>Predito
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourlyChart} margin={{ top: 22, right: 12, bottom: 0, left: 4 }}>
                    <XAxis dataKey="h" tick={{ fill: "#f7f7f7", fontSize: 8 }} interval={1} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} />
                    <Bar dataKey="real" fill="#3b82f6" radius={[3,3,0,0]} barSize={16} isAnimationActive={false} name="Real">
                      <LabelList dataKey="real" position="top" offset={4} style={{ ...LS, fontSize: 8 }} />
                    </Bar>
                    <Line type="monotone" dataKey="pred" stroke="#f59e0b" strokeWidth={2}
                      strokeDasharray="4 3" dot={{ r: 2, fill: "#f59e0b" }}
                      connectNulls={false} isAnimationActive={false} name="Predito">
                      <LabelList dataKey="pred" position="top" offset={8} style={{ ...LS, fontSize: 8, fill: "#f59e0b" }} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Perfil Etário */}
            <div className="rounded-lg p-4 flex flex-col" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Perfil Etário dos Candidatos</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageProfile} margin={{ top: 20, right: 12, bottom: 0, left: 12 }}>
                    <XAxis dataKey="faixa" tick={{ fill: "#f7f7f7", fontSize: 10 }} padding={{ left: 20, right: 20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Candidatos"]} />
                    <Bar dataKey="n" fill="#8b5cf6" radius={[3,3,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Especialidade table + Live patient table */}
          <div style={{ flex: 3, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>

            {/* Especialidade e Destino */}
            <div className="rounded-lg overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
                style={{ color: "var(--foreground)", background: "var(--surface)" }}>
                Predição por Especialidade e Destino
              </p>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.30)" }}>
                      {["Especialidade","ENF","UTI","CC"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold"
                          style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SPECIALTY_GRID.map((row, i) => (
                      <tr key={row.esp} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                        <td className="px-3 py-2.5 font-medium">{row.esp}</td>
                        <td className="px-3 py-2.5 tabular-nums" style={{ color: "var(--status-attention)" }}>{row.enf}</td>
                        <td className="px-3 py-2.5 tabular-nums" style={{ color: "var(--status-critical)" }}>{row.uti}</td>
                        <td className="px-3 py-2.5 tabular-nums" style={{ color: "var(--accent)" }}>{row.cc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live patient table */}
            <div className="rounded-lg overflow-hidden flex flex-col" style={{ border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
                style={{ color: "var(--foreground)", background: "var(--surface)" }}>
                Pacientes — Probabilidade de Internação (Ao vivo)
              </p>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.30)" }}>
                      {["Leito","Paciente","Idade","Prob.","EWS","Status","Manchester","Destino"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length === 0 ? (
                      <tr><td colSpan={8} className="px-3 py-6 text-center"
                        style={{ color: "var(--muted)", background: "var(--surface)" }}>
                        Nenhum candidato com prob. ≥ 30% no momento
                      </td></tr>
                    ) : candidates.map((c, i) => (
                      <tr key={c.bed} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                        <td className="px-3 py-2.5 font-mono">{c.bed}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.name}</td>
                        <td className="px-3 py-2.5 tabular-nums">{c.age}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color: PROB_COLOR(c.prob) }}>{c.prob}%</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold"
                          style={{ color: c.ews>=7?"var(--status-critical)":c.ews>=5?"var(--status-elevated)":c.ews>=3?"var(--status-attention)":"var(--foreground)" }}>
                          {c.ews}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: STATUS_COLOR[c.status] ?? "var(--muted)" }}>{c.status}</td>
                        <td className="px-3 py-2.5">{c.manchester}</td>
                        <td className="px-3 py-2.5 font-medium"
                          style={{ color: c.destino === "UTI" ? "var(--status-critical)" : "var(--status-attention)" }}>
                          {c.destino}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
