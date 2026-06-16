"use client";

import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import type { SurgicalInternacao } from "@/lib/simulation/types";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── static demo data ─────────────────────────────────────────────────────────

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

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

function RoomGauge({
  label, patientName, stepIndex, isEmpty,
}: {
  label: string; patientName?: string; stepIndex: number; isEmpty: boolean;
}) {
  const R = 52, CX = 64, CY = 64;
  const CIRC = 2 * Math.PI * R;
  const pct  = isEmpty ? 0 : ((stepIndex + 1) / 4) * 100;
  const arc  = (pct / 100) * CIRC;
  const color = isEmpty ? "var(--border)" : STEP_COLOR[stepIndex];
  const stepLabel = isEmpty ? "Livre" : STEP_NAMES[stepIndex];

  return (
    <div
      className="rounded-lg p-4 flex flex-col items-center gap-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-mono font-semibold">{label}</p>
      <svg width={128} height={128}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
        {!isEmpty && (
          <circle
            cx={CX} cy={CY} r={R} fill="none"
            stroke={color} strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize={22} fontWeight="700" fill={isEmpty ? "var(--muted)" : color}>
          {isEmpty ? "–" : `${Math.round(pct)}%`}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">
          {stepLabel}
        </text>
      </svg>
      {patientName && (
        <p className="text-xs text-center truncate w-full" style={{ color: "var(--muted)" }}>
          {patientName}
        </p>
      )}
      {isEmpty && <p className="text-xs" style={{ color: "var(--muted)" }}>Sala Livre</p>}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OperatingRoomPage() {
  const beds       = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "centro-cirurgico")));
  const internacoes = useSimulationStore((s) => s.internacoes);

  const occupied = beds.filter((b) => b.internacaoId).length;
  const total    = beds.length;

  function isSurgical(i: object): i is SurgicalInternacao {
    return "surgicalFlow" in i;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <Link href="/command" className="text-xs hover:text-white transition-colors" style={{ color: "var(--muted)" }}>
            ← Comando
          </Link>
          <span className="text-sm font-semibold">Centro Cirúrgico</span>
          <RealtimeClock className="ml-auto" />
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Taxa de Ocupação"   value={`${Math.round(occupied/total*100)}%`} sub={`${occupied}/${total} salas`} />
            <KpiCard label="Cirurgias do Dia"   value="14"    sub="realizadas hoje" />
            <KpiCard label="Tempo Médio"        value="3h 22min" sub="por procedimento" />
            <KpiCard label="Cancelamento"       value="6,8%"  sub="último mês" />
          </div>
          {/* KPIs row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Giro de Sala"        value="22 min" sub="entre cirurgias" />
            <KpiCard label="Sala Ociosa"        value="18 min" sub="tempo médio ocioso" />
            <KpiCard label="Aderência ao Mapa"  value="89%"   sub="semana atual" />
            <KpiCard label="Agendadas × Realiz." value="16 × 14" sub="hoje" />
          </div>

          {/* Room gauges */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Status das Salas — Tempo Real
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {beds.map((bed) => {
                const i = bed.internacaoId ? internacoes[bed.internacaoId] : null;
                const surgical = i && isSurgical(i) ? i : null;
                return (
                  <RoomGauge
                    key={bed.id}
                    label={bed.label}
                    patientName={surgical ? surgical.patient.name.split(" ").slice(0, 2).join(" ") : undefined}
                    stepIndex={surgical ? surgical.currentStep : 0}
                    isEmpty={!bed.internacaoId}
                  />
                );
              })}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "#f7f7f7" }}>
                Chegadas por Hora — Hoje
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ARRIVALS} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="h" tick={{ fill: "#f7f7f7", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#f7f7f7", fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Cirurgias"]} />
                  <Line type="monotone" dataKey="n" stroke="#3b82f6" strokeWidth={2}
                    dot={{ r: 3, fill: "#3b82f6" }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "#f7f7f7" }}>
                Previsão Semanal de Cirurgias
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={FORECAST} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "#f7f7f7", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#f7f7f7", fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}`, "Cirurgias"]} />
                  <Bar dataKey="n" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
