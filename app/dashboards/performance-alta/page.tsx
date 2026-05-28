"use client";

import Link from "next/link";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";

// ─── static demo data ─────────────────────────────────────────────────────────

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

const TREND_7D = [
  { day: "Seg", pct: 68 }, { day: "Ter", pct: 72 }, { day: "Qua", pct: 65 },
  { day: "Qui", pct: 74 }, { day: "Sex", pct: 70 }, { day: "Sáb", pct: 58 }, { day: "Dom", pct: 52 },
];

const BY_DOW = [
  { day: "Seg", n: 18 }, { day: "Ter", n: 21 }, { day: "Qua", n: 19 },
  { day: "Qui", n: 23 }, { day: "Sex", n: 20 }, { day: "Sáb", n: 9 }, { day: "Dom", n: 7 },
];

const HOUR_DIST = [
  { h: "6h", n: 2 }, { h: "7h", n: 5 }, { h: "8h", n: 11 }, { h: "9h", n: 18 },
  { h: "10h", n: 8 }, { h: "11h", n: 6 }, { h: "12h+", n: 4 },
];

const TOOLTIP_STYLE = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function DischargeGauge({ label, pct }: { label: string; pct: number }) {
  const R = 52, CX = 64, CY = 64;
  const CIRC = 2 * Math.PI * R;
  const arc  = (pct / 100) * CIRC;
  const color = pct >= 75 ? "var(--status-stable)" : pct >= 60 ? "var(--status-attention)" : "var(--status-critical)";

  return (
    <div className="rounded-lg p-4 flex flex-col items-center justify-center gap-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold">{label}</p>
      <svg viewBox="0 0 128 128" width="100%" style={{ maxWidth: 112 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={CX} cy={CY} r={R} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${arc} ${CIRC}`}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
        <text x={CX} y={CY - 8} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight="700" fill={color}>{pct}</text>
        <text x={CX} y={CY + 10} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="var(--muted)">%</text>
      </svg>
      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>altas até 10h</p>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums"
        style={{ color: accent ? "var(--status-critical)" : "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PerformanceAltaPage() {
  const hospitalPct = Math.round(
    WARD_PERF.reduce((s, w) => s + w.pct, 0) / WARD_PERF.length
  );

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color: "var(--muted)" }}>
            ← Comando
          </Link>
          <span className="text-sm font-semibold">Performance de Alta até 10h</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse ml-auto"
            style={{ background: "rgba(34,197,94,0.12)", color: "var(--status-stable)" }}>
            Ao vivo
          </span>
        </div>

        <div className="p-6 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Performance Hospital" value={`${hospitalPct}%`} sub="média de todas as alas" />
            <KpiCard label="Altas até 10h Hoje"   value="24"    sub="de 38 previstas" />
            <KpiCard label="Meta Institucional"    value="80%"   sub="alvo mensal" />
            <KpiCard label="Gap para Meta"         value={`${80 - hospitalPct}`} sub="pontos percentuais" />
          </div>

          {/* Linha 1: gráfico de barras + 2 gauges */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2 rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>
                % de Altas até 10h por Ala — Hoje
              </p>
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={WARD_PERF} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="ala" tick={{ fill: "var(--muted)", fontSize: 10 }} width={88} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Altas até 10h"]} />
                  <ReferenceLine x={80} stroke="rgba(239,68,68,0.5)" strokeDasharray="4 4" />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} isAnimationActive={false} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <DischargeGauge label="Maternidade" pct={78} />
            <DischargeGauge label="Pediatria"   pct={65} />
          </div>

          {/* Linha 2: 3 gráficos menores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>
                Tendência — últimos 7 dias (%)
              </p>
              <ResponsiveContainer width="100%" height={118}>
                <AreaChart data={TREND_7D} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gtTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} domain={[40, 90]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`]} />
                  <Area type="monotone" dataKey="pct" stroke="#3b82f6" fill="url(#gtTrend)"
                    strokeWidth={2} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>
                Altas até 10h por Dia da Semana
              </p>
              <ResponsiveContainer width="100%" height={118}>
                <BarChart data={BY_DOW} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Altas"]} />
                  <Bar dataKey="n" fill="#22c55e" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>
                Distribuição por Hora — Hoje
              </p>
              <ResponsiveContainer width="100%" height={118}>
                <LineChart data={HOUR_DIST} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="h" tick={{ fill: "var(--muted)", fontSize: 9 }} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 9 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Altas"]} />
                  <Line type="monotone" dataKey="n" stroke="#f59e0b" strokeWidth={2}
                    dot={{ r: 3, fill: "#f59e0b" }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
