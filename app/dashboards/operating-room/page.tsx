"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import type { SurgicalInternacao } from "@/lib/simulation/types";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static data ──────────────────────────────────────────────────────────────

const ARRIVALS = [
  { h: "06h", hour: 6,  n: 1 }, { h: "07h", hour: 7,  n: 2 }, { h: "08h", hour: 8,  n: 4 }, { h: "09h", hour: 9,  n: 3 },
  { h: "10h", hour: 10, n: 5 }, { h: "11h", hour: 11, n: 4 }, { h: "12h", hour: 12, n: 2 },
  { h: "13h", hour: 13, n: 3 }, { h: "14h", hour: 14, n: 5 }, { h: "15h", hour: 15, n: 4 },
  { h: "16h", hour: 16, n: 3 }, { h: "17h", hour: 17, n: 2 }, { h: "18h", hour: 18, n: 1 },
];

const FORECAST = [
  { day: "Seg", n: 18 }, { day: "Ter", n: 21 }, { day: "Qua", n: 16 },
  { day: "Qui", n: 23 }, { day: "Sex", n: 20 }, { day: "Sáb", n: 12 }, { day: "Dom", n: 8 },
];

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const todayLabel = DAY_LABELS[new Date().getDay()];

const CANCELAMENTOS = [
  { causa: "Falta de Material",       n: 4, color: "#ef4444" },
  { causa: "Problemas Clínicos",      n: 3, color: "#f97316" },
  { causa: "Cancelado pelo Cirurgião",n: 2, color: "#eab308" },
  { causa: "Outro",                   n: 1, color: "#6b7280" },
];

const STEP_NAMES = ["Admissão", "Procedimento", "RA", "Quarto"];
const VISIBLE_ROOMS = 4;
const STEP_COLOR = ["#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"];

const TOOLTIP_STYLE = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, fontSize: 12, color: "var(--foreground)",
};

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── SVG Gauge (compact) ──────────────────────────────────────────────────────

function RoomGauge({
  label, stepIndex, isEmpty, isInoperante,
}: {
  label: string; stepIndex: number; isEmpty: boolean; isInoperante?: boolean;
}) {
  const R = 58, CX = 68, CY = 68;
  const CIRC  = 2 * Math.PI * R;
  const pct   = isEmpty ? 0 : ((stepIndex + 1) / 4) * 100;
  const arc   = (pct / 100) * CIRC;
  const color = isEmpty ? "var(--border)" : STEP_COLOR[stepIndex];
  const stepLabel = isInoperante ? "Inoperante" : isEmpty ? "Livre" : STEP_NAMES[stepIndex];
  const ringColor = isInoperante ? "rgba(239,68,68,0.25)" : "var(--border)";
  const textColor = isInoperante ? "rgba(239,68,68,0.6)" : isEmpty ? "var(--muted)" : color;

  return (
    <div
      className="rounded-lg p-3 flex flex-col items-center gap-1"
      style={{ background: "var(--surface)" }}
    >
      <p className="text-xs font-mono font-semibold">{label}</p>
      <svg width={136} height={136}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={ringColor} strokeWidth={10}
          strokeDasharray={isInoperante ? "6 6" : undefined} />
        {!isEmpty && !isInoperante && (
          <circle
            cx={CX} cy={CY} r={R} fill="none"
            stroke={color} strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize={24} fontWeight="700" fill={textColor}>
          {isInoperante ? "✕" : isEmpty ? "–" : `${Math.round(pct)}%`}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize={11} fontWeight="600" fill={textColor}>
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
  const [offset, setOffset] = useState(0);
  const canLeft  = offset > 0;
  const canRight = offset + VISIBLE_ROOMS < beds.length;

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
  const arrivals = ARRIVALS.filter((d) => d.hour <= currentHour);

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Atualizado às: <span style={{ color: "var(--foreground)" }}>{lastUpdate}</span>
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", flexShrink: 0 }} />
            <RealtimeClock />
          </div>
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
            {/* Cirurgias — total + split eletiva/urgência */}
            <div
              className="rounded-lg p-3 flex gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Cirurgias</span>
                <span className="text-xl font-bold tabular-nums">14</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>realizadas hoje</span>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Eletivas</span>
                <span className="text-xl font-bold tabular-nums">9</span>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Urgência</span>
                <span className="text-xl font-bold tabular-nums" style={{ color: "var(--status-critical)" }}>5</span>
              </div>
            </div>
            <KpiCard label="Tempo Médio"         value="3h 22min"  sub="por procedimento" />
            <KpiCard label="Cancelamento"        value="6,8%"      sub="último mês" />
            <KpiCard label="Tempo de Preparo de Sala" value="22 min" sub="entre cirurgias" />
            <KpiCard label="Sala Ociosa"         value="18 min"    sub="tempo médio ocioso" />
            <KpiCard label="Aderência ao Mapa"   value="89%"       sub="semana atual" />
            <KpiCard label="Agendadas × Realizadas" value="16 × 14"   sub="hoje" />
          </div>

          {/* Carousel de salas cirúrgicas */}
          <div style={{
            flexShrink: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px 8px",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>
                Salas Cirúrgicas
              </span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>
                {offset + 1}–{Math.min(offset + VISIBLE_ROOMS, beds.length)} de {beds.length}
              </span>
            </div>

            {/* Row: arrow + gauges + arrow */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Left arrow */}
              <button
                onClick={() => setOffset((o) => Math.max(0, o - 1))}
                disabled={!canLeft}
                style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  border: "none",
                  background: "transparent",
                  color: canLeft ? "var(--foreground)" : "var(--muted)",
                  cursor: canLeft ? "pointer" : "default",
                  fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                ‹
              </button>

              {/* Visible gauges */}
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${VISIBLE_ROOMS}, 1fr)`, gap: 10 }}>
                {beds.slice(offset, offset + VISIBLE_ROOMS).map((bed) => {
                  const i        = bed.internacaoId ? internacoes[bed.internacaoId] : null;
                  const surgical = i && isSurgical(i) ? i : null;
                  return (
                    <RoomGauge
                      key={bed.id}
                      label={bed.label}
                      stepIndex={surgical ? surgical.currentStep : 0}
                      isEmpty={!bed.internacaoId}
                      isInoperante={bed.inoperante}
                    />
                  );
                })}
              </div>

              {/* Right arrow */}
              <button
                onClick={() => setOffset((o) => Math.min(beds.length - VISIBLE_ROOMS, o + 1))}
                disabled={!canRight}
                style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  border: "none",
                  background: "transparent",
                  color: canRight ? "var(--foreground)" : "var(--muted)",
                  cursor: canRight ? "pointer" : "default",
                  fontSize: 22, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                ›
              </button>
            </div>

          </div>

          {/* 3 gráficos — ocupa o restante da tela */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div
              className="rounded-lg p-3 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Chegadas por Hora — Hoje</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={arrivals} margin={{ top: 28, right: 12, bottom: 16, left: 0 }}>
                    <XAxis dataKey="h" tick={{ fill: "#f7f7f7", fontSize: 9 }} interval={0} />
                    <YAxis hide />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} labelStyle={{ color: "#f7f7f7" }} itemStyle={{ color: "#f7f7f7" }} formatter={(v) => [`${v}`, "Cirurgias"]} />
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
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} labelStyle={{ color: "#f7f7f7" }} itemStyle={{ color: "#f7f7f7" }} formatter={(v) => [`${v}`, "Cirurgias"]} />
                    <Bar dataKey="n" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      {FORECAST.map((entry) => (
                        <Cell key={entry.day} fill={entry.day === todayLabel ? "#f59e0b" : "#8b5cf6"} />
                      ))}
                      <LabelList dataKey="n" position="top" style={{ fill: "#f7f7f7", fontSize: 10, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="rounded-lg p-3 flex flex-col"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "#f7f7f7" }}>Causas de Cancelamento</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={CANCELAMENTOS} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="causa" width={200} interval={0} tick={{ fill: "#f7f7f7", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={false} labelStyle={{ color: "#f7f7f7" }} itemStyle={{ color: "#f7f7f7" }} formatter={(v) => [`${v}`, "Cancelamentos"]} />
                    <Bar dataKey="n" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {CANCELAMENTOS.map((c) => (
                        <Cell key={c.causa} fill={c.color} />
                      ))}
                      <LabelList dataKey="n" position="right" style={{ fill: "#f7f7f7", fontSize: 11, fontWeight: 600 }} />
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
