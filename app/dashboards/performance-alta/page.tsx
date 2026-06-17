"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static data ──────────────────────────────────────────────────────────────

const WARD_PERF = [
  { ala: "Maternidade",    pct: 78 },
  { ala: "Pediatria",      pct: 65 },
  { ala: "Cardiologia",    pct: 82 },
  { ala: "Clín. Médica",   pct: 54 },
  { ala: "Cirurgia Geral", pct: 71 },
  { ala: "Neurologia",     pct: 60 },
  { ala: "Ortopedia",      pct: 77 },
  { ala: "Oncologia",      pct: 45 },
];

const BY_DOW = [
  { day: "Seg", n: 18 }, { day: "Ter", n: 21 }, { day: "Qua", n: 19 },
  { day: "Qui", n: 23 }, { day: "Sex", n: 20 }, { day: "Sáb", n: 9 }, { day: "Dom", n: 7 },
];

// Full hourly data for the day — filtered at render time based on current hour
const FULL_HOUR_DIST = [
  { h: "6h",  hour: 6,  n: 2  },
  { h: "7h",  hour: 7,  n: 5  },
  { h: "8h",  hour: 8,  n: 11 },
  { h: "9h",  hour: 9,  n: 18 },
  { h: "10h", hour: 10, n: 8  },
  { h: "11h", hour: 11, n: 6  },
  { h: "12h", hour: 12, n: 4  },
];

// ─── dynamic helpers ──────────────────────────────────────────────────────────

const PERF_BY_DOW: Record<number, number> = { 0: 52, 1: 68, 2: 72, 3: 65, 4: 74, 5: 70, 6: 58 };
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getLast7Days(): { day: string; pct: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (7 - i)); // index 0 = 7 days ago, index 6 = yesterday
    const dow = d.getDay();
    const dd  = d.getDate().toString().padStart(2, "0");
    const mm  = (d.getMonth() + 1).toString().padStart(2, "0");
    return { day: DAY_NAMES[dow], pct: PERF_BY_DOW[dow] ?? 60 };
  });
}

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── filter options ───────────────────────────────────────────────────────────

const SETORES = ["Todos", "Maternidade", "Pediatria", "Cardiologia", "Clín. Médica", "Cirurgia Geral", "Neurologia", "Ortopedia", "Oncologia"];
const DATAS   = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias"];

// ─── style constants ──────────────────────────────────────────────────────────

const TS = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

const pctFmt  = (v: unknown) => `${v}%`;
const LSTY    = { fill: "#f7f7f7", fontSize: 9,  fontWeight: 600 } as React.CSSProperties;
const LSTY_SM = { fill: "#f7f7f7", fontSize: 10, fontWeight: 600 } as React.CSSProperties;

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function DischargeGauge({ label, pct }: { label: string; pct: number }) {
  const R = 52, CX = 64, CY = 64;
  const CIRC = 2 * Math.PI * R;
  const arc  = (pct / 100) * CIRC;
  const color = pct >= 75 ? "var(--status-stable)" : pct >= 60 ? "var(--status-attention)" : "var(--status-critical)";

  return (
    <div className="rounded-lg p-4 flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-sm font-semibold">{label}</p>
      <svg viewBox="0 0 128 128" style={{ width: "min(100%, 220px)", height: "auto" }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle cx={CX} cy={CY} r={R} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${arc} ${CIRC}`}
          transform={`rotate(-90 ${CX} ${CY})`} />
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight="700" fill={color}>{pct}%</text>
        <text x={CX} y={CY + 14} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="var(--muted)">altas até 10h</text>
      </svg>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PerformanceAltaPage() {
  const [setor,      setSetor]      = useState("Todos");
  const [data,       setData]       = useState("Hoje");
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = () => {
      setLastUpdate(getLastUpdateLabel());
      setCurrentHour(new Date().getHours());
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const wardData  = setor === "Todos" ? WARD_PERF : WARD_PERF.filter((w) => w.ala === setor);
  const trend7d   = getLast7Days();
  const hourDist  = FULL_HOUR_DIST.filter((d) => d.hour <= currentHour);

  const hospitalPct = Math.round(
    WARD_PERF.reduce((s, w) => s + w.pct, 0) / WARD_PERF.length
  );

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
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Performance de Alta até 10h</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          height: 44, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 16,
          padding: "0 20px",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
        }}>
          {([
            { label: "Setor", value: setor, setter: setSetor, options: SETORES },
            { label: "Data",  value: data,  setter: setData,  options: DATAS   },
          ]).map(({ label, value, setter, options }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" as const }}>
                {label}:
              </span>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                  border: "1px solid var(--border)", background: "var(--background)",
                  color: "var(--foreground)", cursor: "pointer", outline: "none",
                }}
              >
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
            <KpiCard label="Performance Hospital" value={`${hospitalPct}%`}        sub="média de todas as alas" />
            <KpiCard label="Altas até 10h Hoje"   value="24"                       sub="de 38 previstas" />
            <KpiCard label="Meta Institucional"    value="80%"                     sub="alvo mensal" />
            <KpiCard label="Gap para Meta"         value={`${80 - hospitalPct}pp`} sub="pontos percentuais" />
          </div>

          {/* Linha 1: barras horizontais + 2 gauges */}
          <div style={{ flex: 3, minHeight: 0, display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>
                % de Altas até 10h por Ala — Hoje
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardData} layout="vertical" margin={{ top: 4, right: 44, bottom: 0, left: 8 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="ala" tick={{ fill: "#f7f7f7", fontSize: 10 }} width={90} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`, "Altas até 10h"]} />
                    <ReferenceLine x={80} stroke="rgba(239,68,68,0.5)" strokeDasharray="4 4" />
                    <Bar dataKey="pct" radius={[0, 3, 3, 0]} isAnimationActive={false} fill="#3b82f6">
                      <LabelList dataKey="pct" position="right" formatter={pctFmt} style={LSTY_SM} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <DischargeGauge label="Maternidade" pct={78} />
            <DischargeGauge label="Pediatria"   pct={65} />
          </div>

          {/* Linha 2: 3 gráficos menores */}
          <div style={{ flex: 2, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

            {/* Tendência 7 dias — último ponto = ontem */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>
                Tendência — últimos 7 dias (%)
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend7d} margin={{ top: 22, right: 12, bottom: 0, left: -32 }}>
                    <defs>
                      <linearGradient id="gtTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fill: "#f7f7f7", fontSize: 9 }} />
                    <YAxis hide domain={[40, 90]} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}%`]} />
                    <Area type="monotone" dataKey="pct" stroke="#3b82f6" fill="url(#gtTrend)"
                      strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} isAnimationActive={false}>
                      <LabelList dataKey="pct" position="top" offset={8} formatter={pctFmt} style={LSTY} />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Altas por dia da semana */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>
                Altas até 10h por Dia da Semana
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={BY_DOW} margin={{ top: 20, right: 8, bottom: 0, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: "#f7f7f7", fontSize: 9 }} />
                    <YAxis hide width={0} allowDecimals={false} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Altas"]} />
                    <Bar dataKey="n" fill="#22c55e" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" style={LSTY} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribuição por hora — mostra até a hora atual */}
            <div className="rounded-lg p-4 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>
                Distribuição por Hora — Hoje
              </p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourDist} margin={{ top: 22, right: 12, bottom: 0, left: -32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="h" tick={{ fill: "#f7f7f7", fontSize: 9 }} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip contentStyle={TS} formatter={(v) => [`${v}`, "Altas"]} />
                    <Line type="monotone" dataKey="n" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b" }} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" offset={8} style={LSTY} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
