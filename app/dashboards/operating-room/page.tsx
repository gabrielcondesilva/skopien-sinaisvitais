"use client";

import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import type { SurgicalInternacao } from "@/lib/simulation/types";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static data ──────────────────────────────────────────────────────────────

const ARRIVALS = [
  { h: "07h", n: 2 }, { h: "08h", n: 4 }, { h: "09h", n: 3 }, { h: "10h", n: 5 },
  { h: "11h", n: 4 }, { h: "12h", n: 2 }, { h: "13h", n: 3 }, { h: "14h", n: 5 },
  { h: "15h", n: 4 }, { h: "16h", n: 3 }, { h: "17h", n: 2 }, { h: "18h", n: 1 },
];

const FORECAST = [
  { day: "Seg", n: 18 }, { day: "Ter", n: 21 }, { day: "Qua", n: 19 },
  { day: "Qui", n: 23 }, { day: "Sex", n: 20 }, { day: "Sáb", n: 12 }, { day: "Dom", n: 8 },
];

const STEP_NAMES = ["Admissão", "Procedimento", "RA", "Quarto"];
const STEP_COLOR = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"];

const TOOLTIP_STYLE = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

// ─── SVG Gauge (compact) ──────────────────────────────────────────────────────

function RoomGauge({
  label, stepIndex, isEmpty,
}: {
  label: string; stepIndex: number; isEmpty: boolean;
}) {
  const R = 40, CX = 48, CY = 48;
  const CIRC  = 2 * Math.PI * R;
  const pct   = isEmpty ? 0 : ((stepIndex + 1) / 4) * 100;
  const arc   = (pct / 100) * CIRC;
  const color = isEmpty ? "var(--border)" : STEP_COLOR[stepIndex];
  const stepLabel = isEmpty ? "Livre" : STEP_NAMES[stepIndex];

  return (
    <div
      className="rounded-lg p-3 flex flex-col items-center gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-mono font-semibold">{label}</p>
      <svg width={96} height={96}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={8} />
        {!isEmpty && (
          <circle
            cx={CX} cy={CY} r={R} fill="none"
            stroke={color} strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={18} fontWeight="700" fill={isEmpty ? "var(--muted)" : color}>
          {isEmpty ? "–" : `${Math.round(pct)}%`}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={8} fill="var(--muted)">
          {stepLabel}
        </text>
      </svg>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OperatingRoomPage() {
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "centro-cirurgico")));
  const internacoes = useSimulationStore((s) => s.internacoes);

  const occupied = beds.filter((b) => b.internacaoId).length;
  const total    = beds.length;

  function isSurgical(i: object): i is SurgicalInternacao {
    return "surgicalFlow" in i;
  }

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
        <div
          className="px-6"
          style={{
            height: 52, flexShrink: 0,
            display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
            background: "var(--surface)", borderBottom: "1px solid var(--border)",
          }}
        >
          <Link href="/command" className="text-xs transition-colors" style={{ color: "#F7F7F7" }}>← Voltar</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Centro Cirúrgico</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1, minHeight: 0,
            padding: 12,
            display: "flex", flexDirection: "column", gap: 10,
          }}
        >
          {/* 8 KPI cards — 2 linhas de 4 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
            <KpiCard label="Taxa de Ocupação"    value={`${Math.round(occupied / total * 100)}%`} sub={`${occupied}/${total} salas`} />
            <KpiCard label="Cirurgias do Dia"    value="14"        sub="realizadas hoje" />
            <KpiCard label="Tempo Médio"         value="3h 22min"  sub="por procedimento" />
            <KpiCard label="Cancelamento"        value="6,8%"      sub="último mês" />
            <KpiCard label="Giro de Sala"        value="22 min"    sub="entre cirurgias" />
            <KpiCard label="Sala Ociosa"         value="18 min"    sub="tempo médio ocioso" />
            <KpiCard label="Aderência ao Mapa"   value="89%"       sub="semana atual" />
            <KpiCard label="Agendadas × Realiz." value="16 × 14"   sub="hoje" />
          </div>

          {/* 6 gauges — 1 linha */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, flexShrink: 0 }}>
            {beds.map((bed) => {
              const i        = bed.internacaoId ? internacoes[bed.internacaoId] : null;
              const surgical = i && isSurgical(i) ? i : null;
              return (
                <RoomGauge
                  key={bed.id}
                  label={bed.label}
                  stepIndex={surgical ? surgical.currentStep : 0}
                  isEmpty={!bed.internacaoId}
                />
              );
            })}
          </div>

          {/* 2 gráficos — ocupa o restante da tela */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              className="rounded-lg p-3 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Chegadas por Hora — Hoje</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ARRIVALS} margin={{ top: 28, right: 12, bottom: 0, left: -32 }}>
                    <XAxis dataKey="h" tick={{ fill: "#f7f7f7", fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Cirurgias"]} />
                    <Line type="monotone" dataKey="n" stroke="#3b82f6" strokeWidth={2}
                      dot={{ r: 3, fill: "#3b82f6" }} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" offset={10} style={{ fill: "#f7f7f7", fontSize: 10, fontWeight: 600 }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-lg p-3 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Previsão Semanal de Cirurgias</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FORECAST} margin={{ top: 20, right: 12, bottom: 0, left: -32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: "#f7f7f7", fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Cirurgias"]} />
                    <Bar dataKey="n" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="n" position="top" style={{ fill: "#f7f7f7", fontSize: 10, fontWeight: 600 }} />
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
