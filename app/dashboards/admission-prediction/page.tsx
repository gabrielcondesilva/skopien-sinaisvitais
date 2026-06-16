"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static data ──────────────────────────────────────────────────────────────

const FORECAST_7D = [
  { day:"Seg", n:14 },{ day:"Ter", n:18 },{ day:"Qua", n:16 },
  { day:"Qui", n:22 },{ day:"Sex", n:19 },{ day:"Sáb", n:11 },{ day:"Dom", n:8  },
];

const HOURLY = [
  { h:"06h",real:2, pred:3  },{ h:"07h",real:5, pred:4  },{ h:"08h",real:8, pred:9  },
  { h:"09h",real:12,pred:11 },{ h:"10h",real:9, pred:10 },{ h:"11h",real:7, pred:8  },
  { h:"12h",real:5, pred:6  },{ h:"13h",real:6, pred:5  },{ h:"14h",real:8, pred:9  },
  { h:"15h",real:7, pred:7  },{ h:"16h",real:4, pred:5  },{ h:"17h",real:3, pred:4  },
];

const AGE_PROFILE = [
  { faixa:"0–17",  n:4  },{ faixa:"18–39", n:8  },{ faixa:"40–59", n:14 },
  { faixa:"60–74", n:21 },{ faixa:"75+",   n:17 },
];

const SPECIALTY_GRID = [
  { esp:"Clín. Médica",  enf:8,  uti:2,  cc:0 },
  { esp:"Cardiologia",   enf:4,  uti:3,  cc:1 },
  { esp:"Ortopedia",     enf:5,  uti:1,  cc:2 },
  { esp:"Neurologia",    enf:3,  uti:2,  cc:0 },
  { esp:"Pneumologia",   enf:4,  uti:2,  cc:0 },
  { esp:"Cirurgia Geral",enf:3,  uti:1,  cc:3 },
];

const PROB_COLOR = (p: number) =>
  p >= 70 ? "var(--status-critical)" : p >= 50 ? "var(--status-attention)" : "var(--foreground)";

const STATUS_COLOR: Record<string, string> = {
  "Estável":      "var(--status-stable)",
  "Atenção":      "var(--status-attention)",
  "Risco Elevado":"var(--status-elevated)",
  "Crítico":      "var(--status-critical)",
};

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdmissionPredictionPage() {
  const beds       = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);

  // Build patient table from live PS patients with admissionProbability >= 30
  const candidates = useMemo(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i || i.admissionProbability < 30) return [];
      return [{
        bed:       b.label,
        name:      i.patient.name,
        age:       i.patient.age,
        prob:      i.admissionProbability,
        ews:       i.currentEws,
        status:    i.currentStatus,
        manchester:i.manchesterClass,
        destino:   i.currentEws >= 5 ? "UTI" : "Enfermaria",
      }];
    })
    .sort((a, b) => b.prob - a.prob),
  [beds, internacoes]);

  const highProb = candidates.filter((c) => c.prob >= 70).length;

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background:"var(--background)" }}>
        <div className="sticky top-0 z-10 px-6"
          style={{ height: 52, display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color:"var(--muted)" }}>← Comando</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Predição de Internações</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>Forecast 7 dias</span>
              <span className="text-2xl font-bold tabular-nums">{FORECAST_7D.reduce((s,x)=>s+x.n,0)}</span>
              <span className="text-xs" style={{ color:"var(--muted)" }}>internações previstas</span>
            </div>
            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>Candidatos PS Agora</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color:"var(--status-attention)" }}>{candidates.length}</span>
              <span className="text-xs" style={{ color:"var(--muted)" }}>prob. ≥ 30% — ao vivo</span>
            </div>
            <div className="rounded-lg p-4 flex flex-col gap-1"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>Alta Probabilidade</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color:"var(--status-critical)" }}>{highProb}</span>
              <span className="text-xs" style={{ color:"var(--muted)" }}>prob. ≥ 70% — ao vivo</span>
            </div>
          </div>

          {/* Forecast 7d + hourly real vs predicted */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Forecast de Internações — 7 dias</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={FORECAST_7D} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:10 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Internações"]} />
                  <Bar dataKey="n" fill="#3b82f6" radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-1" style={{ color:"#f7f7f7" }}>Real × Predito por Hora — Hoje</p>
              <div className="flex gap-4 mb-2 text-xs" style={{ color:"var(--muted)" }}>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5" style={{ background:"#3b82f6" }} />Real</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5" style={{ background:"#f59e0b" }} />Predito</span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <ComposedChart data={HOURLY} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="h" tick={{ fill:"#f7f7f7", fontSize:9 }} interval={2} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} />
                  <Line type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="Real" />
                  <Line type="monotone" dataKey="pred" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="Predito" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Age profile + specialty grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Perfil Etário dos Candidatos</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={AGE_PROFILE} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="faixa" tick={{ fill:"#f7f7f7", fontSize:10 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Candidatos"]} />
                  <Bar dataKey="n" fill="#8b5cf6" radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Predição por Especialidade e Destino</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                      {["Especialidade","ENF","UTI","CC"].map((h)=>(
                        <th key={h} className="px-3 py-1.5 text-left font-medium" style={{ color:"var(--muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SPECIALTY_GRID.map((row,i)=>(
                      <tr key={row.esp} style={{ borderTop: i>0 ? "1px solid var(--border)" : undefined, background:"var(--surface)" }}>
                        <td className="px-3 py-1.5 font-medium">{row.esp}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color:"var(--status-attention)" }}>{row.enf}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color:"var(--status-critical)" }}>{row.uti}</td>
                        <td className="px-3 py-1.5 tabular-nums" style={{ color:"var(--accent)" }}>{row.cc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Live patient table */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color:"var(--foreground)" }}>
              Pacientes — Probabilidade de Internação (Ao vivo)
            </p>
            <div className="rounded-lg overflow-hidden" style={{ border:"1px solid var(--border)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                      {["Leito","Paciente","Idade","Prob.","EWS","Status","Manchester","Destino Previsto"].map((h)=>(
                        <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                          style={{ color:"var(--muted)", borderBottom:"1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length === 0 ? (
                      <tr><td colSpan={8} className="px-3 py-6 text-center"
                        style={{ color:"var(--muted)", background:"var(--surface)" }}>
                        Nenhum candidato com prob. ≥ 30% no momento
                      </td></tr>
                    ) : candidates.map((c, i) => (
                      <tr key={c.bed} style={{ borderTop: i>0 ? "1px solid var(--border)" : undefined, background:"var(--surface)" }}>
                        <td className="px-3 py-2.5 font-mono">{c.bed}</td>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{c.name}</td>
                        <td className="px-3 py-2.5 tabular-nums">{c.age}</td>
                        <td className="px-3 py-2.5 tabular-nums font-bold" style={{ color:PROB_COLOR(c.prob) }}>{c.prob}%</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold"
                          style={{ color: c.ews >= 7 ? "var(--status-critical)" : c.ews >= 5 ? "var(--status-elevated)" : c.ews >= 3 ? "var(--status-attention)" : "var(--foreground)" }}>
                          {c.ews}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color:STATUS_COLOR[c.status] ?? "var(--muted)" }}>{c.status}</td>
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
