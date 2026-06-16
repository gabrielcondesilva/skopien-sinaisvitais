"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ComposedChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── types & helpers ──────────────────────────────────────────────────────────

type Specialty = "Clín. Médica" | "Cardiologia" | "Ortopedia" | "Neurologia" | "Pediatria" | "Cirurgia";

const SPECIALTIES: Specialty[] = ["Clín. Médica","Cardiologia","Ortopedia","Neurologia","Pediatria","Cirurgia"];

const WEEK = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

function buildMain(past: number[], connector: number, future: [number,number,number]) {
  return [
    ...WEEK.slice(0,6).map((day,i) => ({ day, real: past[i], forecast: undefined as number|undefined })),
    { day:"Dom",  real: connector, forecast: connector },
    { day:"Seg+", real: undefined, forecast: future[0] },
    { day:"Ter+", real: undefined, forecast: future[1] },
    { day:"Qua+", real: undefined, forecast: future[2] },
  ];
}

function buildError(vals: number[]) { return WEEK.map((day,i) => ({ day, pct: vals[i] })); }
function buildSurg (vals: number[]) { return WEEK.map((day,i) => ({ day, n:   vals[i] })); }

// ─── data ─────────────────────────────────────────────────────────────────────

const ALL_DATA = {
  main:  buildMain([38,42,35,47,44,29], 31, [36,41,38]),
  error: buildError([4.2,2.8,5.1,3.4,6.2,4.8,3.9]),
  surg:  buildSurg([14,18,16,21,19,10,7]),
};

const SPEC_DATA: Record<Specialty, typeof ALL_DATA> = {
  "Clín. Médica": {
    main:  buildMain([28,32,29,35,31,29], 30, [33,36,31]),
    error: buildError([3.8,2.5,4.6,3.1,5.5,4.2,3.6]),
    surg:  buildSurg([6,7,6,8,7,4,3]),
  },
  "Cardiologia": {
    main:  buildMain([12,14,11,16,13,9], 11, [13,15,12]),
    error: buildError([5.1,3.2,6.0,4.1,7.2,5.5,4.8]),
    surg:  buildSurg([3,4,3,5,4,2,1]),
  },
  "Ortopedia": {
    main:  buildMain([9,11,8,13,10,7], 8, [10,12,9]),
    error: buildError([4.5,2.9,5.3,3.7,6.5,5.0,4.1]),
    surg:  buildSurg([2,3,2,4,3,2,1]),
  },
  "Neurologia": {
    main:  buildMain([7,8,6,9,7,5], 6, [8,9,7]),
    error: buildError([3.9,2.6,4.8,3.3,5.8,4.4,3.7]),
    surg:  buildSurg([1,2,1,2,2,1,1]),
  },
  "Pediatria": {
    main:  buildMain([15,17,14,18,16,11], 13, [15,17,14]),
    error: buildError([4.0,2.7,4.9,3.4,6.0,4.6,3.8]),
    surg:  buildSurg([1,1,2,1,2,1,0]),
  },
  "Cirurgia": {
    main:  buildMain([11,13,10,14,12,8], 10, [12,14,11]),
    error: buildError([4.3,2.8,5.0,3.5,6.3,4.9,4.0]),
    surg:  buildSurg([3,4,3,5,4,2,1]),
  },
};

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };
const LS = { fill: "#f7f7f7", fontSize: 9, fontWeight: 600 } as React.CSSProperties;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PatientPredictionPage() {
  const [active, setActive] = useState<Specialty | null>(null);
  const data = active ? SPEC_DATA[active] : ALL_DATA;

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
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color: "var(--muted)" }}>← Comando</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Predição de Deterioração</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
            {[
              { label:"Volume Hoje",          value:"31",   sub:"pacientes internados" },
              { label:"Previsão Amanhã",      value:"36",   sub:"modelo preditivo" },
              { label:"Altas Previstas Hoje", value:"8",    sub:"baseado no modelo" },
              { label:"Erro Médio Modelo",    value:"4,3%", sub:"MAPE 7 dias" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-4 flex flex-col gap-1"
                style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>{k.label}</span>
                <span className="text-2xl font-bold tabular-nums">{k.value}</span>
                <span className="text-xs" style={{ color:"var(--muted)" }}>{k.sub}</span>
              </div>
            ))}
          </div>

          {/* Specialty filters */}
          <div className="flex flex-wrap gap-2 items-center shrink-0">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Especialidade:</span>
            {SPECIALTIES.map((s) => {
              const isActive = active === s;
              return (
                <button key={s} onClick={() => setActive(isActive ? null : s)}
                  className="text-xs px-3 py-1 rounded-full font-medium transition-all"
                  style={{
                    background: isActive ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                    color:      isActive ? "var(--accent)" : "var(--foreground)",
                    border:     `1px solid ${isActive ? "rgba(59,130,246,0.3)" : "var(--border)"}`,
                  }}>
                  {s}
                </button>
              );
            })}
            {active && (
              <button onClick={() => setActive(null)}
                className="text-xs px-3 py-1 rounded-full ml-1 transition-all"
                style={{ color: "var(--muted)", border: "1px solid var(--border)" }}>
                Limpar
              </button>
            )}
          </div>

          {/* Main chart: Real × Previsão */}
          <div className="rounded-lg p-4 flex flex-col"
            style={{ flex: 3, minHeight: 0, background:"var(--surface)", border:"1px solid var(--border)" }}>
            <p className="text-xs font-medium mb-1" style={{ color:"#f7f7f7" }}>
              Internações — Real × Previsão{active ? ` · ${active}` : ""}
            </p>
            <div className="flex gap-4 mb-2 text-xs" style={{ color:"var(--muted)" }}>
              <span className="flex items-center gap-1.5">
                <svg width={20} height={2}><line x1="0" y1="1" x2="20" y2="1" stroke="#3b82f6" strokeWidth={2}/></svg>Real
              </span>
              <span className="flex items-center gap-1.5">
                <svg width={20} height={2}><line x1="0" y1="1" x2="20" y2="1" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3"/></svg>Previsão
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.main} margin={{ top: 22, right: 16, bottom: 0, left: 4 }}>
                  <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:10 }} />
                  <YAxis hide width={0} />
                  <Tooltip contentStyle={TS} />
                  <Line type="monotone" dataKey="real" stroke="#3b82f6" strokeWidth={2}
                    dot={{ r:3, fill:"#3b82f6" }} connectNulls={false} isAnimationActive={false} name="Real">
                    <LabelList dataKey="real" position="top" offset={8} style={LS} />
                  </Line>
                  <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2}
                    strokeDasharray="5 3" dot={{ r:3, fill:"#f59e0b" }}
                    connectNulls={false} isAnimationActive={false} name="Previsão">
                    <LabelList dataKey="forecast" position="top" offset={8} style={{ ...LS, fill:"#f59e0b" }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom row: Erro Percentual + Agendamento Cirúrgico */}
          <div style={{ flex: 2, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

            <div className="rounded-lg p-4 flex flex-col"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>
                Erro Percentual Diário — Modelo (%){active ? ` · ${active}` : ""}
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.error} margin={{ top:20, right:12, bottom:0, left:12 }}>
                    <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:9 }} padding={{ left:20, right:20 }} />
                    <YAxis hide width={0} domain={[0,10]} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v}%`,"Erro"]} />
                    <Bar dataKey="pct" fill="#8b5cf6" radius={[3,3,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="pct" position="top" formatter={(v: unknown) => `${v}%`} style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg p-4 flex flex-col"
              style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>
                Agendamento Cirúrgico Previsto — 7 dias{active ? ` · ${active}` : ""}
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.surg} margin={{ top:20, right:12, bottom:0, left:12 }}>
                    <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:9 }} padding={{ left:20, right:20 }} />
                    <YAxis hide width={0} />
                    <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Cirurgias"]} />
                    <Bar dataKey="n" fill="#22c55e" radius={[3,3,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" style={LS} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
