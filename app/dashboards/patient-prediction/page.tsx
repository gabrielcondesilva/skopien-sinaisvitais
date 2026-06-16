"use client";

import Link from "next/link";
import {
  ComposedChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── data ─────────────────────────────────────────────────────────────────────

// Real (last 7 days) + Forecast (next 3 days); connector at index 6
const MAIN_CHART = [
  { day:"Seg",  real:38,          forecast: undefined },
  { day:"Ter",  real:42,          forecast: undefined },
  { day:"Qua",  real:35,          forecast: undefined },
  { day:"Qui",  real:47,          forecast: undefined },
  { day:"Sex",  real:44,          forecast: undefined },
  { day:"Sáb",  real:29,          forecast: undefined },
  { day:"Dom",  real:31, forecast:31                  }, // connector
  { day:"Seg+", real: undefined,  forecast:36          },
  { day:"Ter+", real: undefined,  forecast:41          },
  { day:"Qua+", real: undefined,  forecast:38          },
];

const ERROR_DAILY = [
  { day:"Seg",pct:4.2},{ day:"Ter",pct:2.8},{ day:"Qua",pct:5.1},
  { day:"Qui",pct:3.4},{ day:"Sex",pct:6.2},{ day:"Sáb",pct:4.8},{ day:"Dom",pct:3.9},
];

const SURG_FORECAST = [
  { day:"Seg",n:14},{ day:"Ter",n:18},{ day:"Qua",n:16},
  { day:"Qui",n:21},{ day:"Sex",n:19},{ day:"Sáb",n:10},{ day:"Dom",n:7},
];

const SPECIALTIES_MINI = [
  { name:"Clín. Médica", data:[{v:28},{v:32},{v:29},{v:35},{v:31},{v:33}] },
  { name:"Cardiologia",  data:[{v:12},{v:14},{v:11},{v:16},{v:13},{v:15}] },
  { name:"Ortopedia",    data:[{v:9}, {v:11},{v:8}, {v:13},{v:10},{v:12}] },
  { name:"Neurologia",   data:[{v:7}, {v:8}, {v:6}, {v:9}, {v:7}, {v:8}]  },
  { name:"Pediatria",    data:[{v:15},{v:17},{v:14},{v:18},{v:16},{v:14}] },
  { name:"Cirurgia",     data:[{v:11},{v:13},{v:10},{v:14},{v:12},{v:13}] },
];

const TS = { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:6, fontSize:11, color:"var(--foreground)" };

export default function PatientPredictionPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background:"var(--background)" }}>
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background:"var(--surface)", borderBottom:"1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color:"var(--muted)" }}>← Comando</Link>
          <span className="text-sm font-semibold">Predição de Deterioração</span>
          <RealtimeClock className="ml-auto" />
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:"Volume Hoje",        value:"31",   sub:"pacientes internados" },
              { label:"Previsão Amanhã",    value:"36",   sub:"modelo preditivo" },
              { label:"Altas Previstas Hoje",value:"8",   sub:"baseado no modelo" },
              { label:"Erro Médio Modelo",  value:"4,3%", sub:"MAPE 7 dias" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg p-4 flex flex-col gap-1"
                style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
                <span className="text-xs uppercase tracking-wide" style={{ color:"var(--muted)" }}>{k.label}</span>
                <span className="text-2xl font-bold tabular-nums">{k.value}</span>
                <span className="text-xs" style={{ color:"var(--muted)" }}>{k.sub}</span>
              </div>
            ))}
          </div>

          {/* Main chart: real (solid) + forecast (dashed) */}
          <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
            <p className="text-xs font-medium mb-1" style={{ color:"#f7f7f7" }}>
              Internações — Real × Previsão
            </p>
            <div className="flex gap-4 mb-3 text-xs" style={{ color:"var(--muted)" }}>
              <span className="flex items-center gap-1.5">
                <svg width={20} height={2}><line x1="0" y1="1" x2="20" y2="1" stroke="#3b82f6" strokeWidth={2}/></svg>
                Real
              </span>
              <span className="flex items-center gap-1.5">
                <svg width={20} height={2}><line x1="0" y1="1" x2="20" y2="1" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3"/></svg>
                Previsão
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={MAIN_CHART} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:10 }} />
                <YAxis tick={{ fill:"#f7f7f7", fontSize:10 }} domain={[0,55]} />
                <Tooltip contentStyle={TS} />
                <Line type="monotone" dataKey="real"     stroke="#3b82f6" strokeWidth={2}
                  dot={{ r:3, fill:"#3b82f6" }} connectNulls={false} isAnimationActive={false} name="Real" />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2}
                  strokeDasharray="5 3" dot={{ r:3, fill:"#f59e0b" }}
                  connectNulls={false} isAnimationActive={false} name="Previsão" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Error + surgical forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Erro Percentual Diário — Modelo (%)</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={ERROR_DAILY} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:9 }} domain={[0,10]} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}%`,"Erro"]} />
                  <Bar dataKey="pct" fill="#8b5cf6" radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4" style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color:"#f7f7f7" }}>Agendamento Cirúrgico Previsto — 7 dias</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={SURG_FORECAST} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill:"#f7f7f7", fontSize:9 }} />
                  <YAxis tick={{ fill:"#f7f7f7", fontSize:9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Cirurgias"]} />
                  <Bar dataKey="n" fill="#22c55e" radius={[3,3,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6 specialty mini charts */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color:"var(--foreground)" }}>Previsão por Especialidade — 7 dias</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {SPECIALTIES_MINI.map((sp) => (
                <div key={sp.name} className="rounded-lg p-3"
                  style={{ background:"var(--surface)", border:"1px solid var(--border)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color:"#f7f7f7" }}>{sp.name}</p>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={sp.data} margin={{ top:2, right:2, bottom:0, left:2 }}>
                      <defs>
                        <linearGradient id={`g-${sp.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" fill={`url(#g-${sp.name})`}
                        strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <XAxis dataKey="v" hide />
                      <YAxis hide domain={["auto","auto"]} />
                      <Tooltip contentStyle={TS} formatter={(v)=>[`${v}`,"Pacientes"]} labelFormatter={()=>""} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
