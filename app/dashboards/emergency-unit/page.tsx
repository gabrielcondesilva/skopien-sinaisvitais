"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";

// ─── types ───────────────────────────────────────────────────────────────────

const UNITS = [
  { id: "pronto-socorro",   label: "Pronto Socorro", total: 12, color: "#3b82f6" },
  { id: "enfermaria",       label: "Enfermaria",      total: 20, color: "#8b5cf6" },
  { id: "uti",              label: "UTI",             total: 10, color: "#ef4444" },
  { id: "centro-cirurgico", label: "Centro Cirúrgico",total:  6, color: "#f59e0b" },
] as const;

// Static sparkline trend (12 points per unit — last ~1 hour of simulated occupancy)
const SPARKLINE_DATA: Record<string, { t: number; occ: number }[]> = {
  "pronto-socorro":   [83,75,83,92,83,83,75,83,83,92,83,83].map((occ,t) => ({ t, occ })),
  "enfermaria":       [80,75,80,80,85,80,80,80,80,75,80,80].map((occ,t) => ({ t, occ })),
  "uti":              [90,90,80,90,90,90,80,90,90,90,80,90].map((occ,t) => ({ t, occ })),
  "centro-cirurgico": [67,50,67,83,67,67,83,67,50,67,67,83].map((occ,t) => ({ t, occ })),
};

function formatElapsed(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

// ─── subcomponents ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {sub && <span className="text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function Sparkline({ unitId, label, total, color }: {
  unitId: string; label: string; total: number; color: string;
}) {
  const beds     = useSimulationStore((s) => s.beds.filter((b) => b.unit === unitId));
  const occupied = beds.filter((b) => b.internacaoId).length;
  const pct      = Math.round((occupied / total) * 100);
  const data     = SPARKLINE_DATA[unitId] ?? [];

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
        <span className="text-sm font-bold tabular-nums">{pct}%</span>
      </div>
      <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>{occupied}/{total} leitos</p>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="occ" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          <XAxis dataKey="t" hide />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 10, borderRadius: 4 }}
            formatter={(v) => [`${v}%`, "Ocup."]}
            labelFormatter={() => ""}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface LOSRow { bed: string; name: string; reason: string; elapsed: number; status: string }

function LOSTable() {
  const beds       = useSimulationStore((s) => s.beds.filter((b) => b.unit === "pronto-socorro"));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now        = Date.now();

  const rows = useMemo<LOSRow[]>(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i) return [];
      return [{ bed: b.label, name: i.patient.name, reason: i.patient.admissionReason, elapsed: now - i.patient.admittedAt, status: i.currentStatus }];
    })
    .sort((a, b) => b.elapsed - a.elapsed)
    .slice(0, 8),
  [beds, internacoes, now]);

  const STATUS_COLOR: Record<string, string> = {
    "Estável":       "var(--status-stable)",
    "Atenção":       "var(--status-attention)",
    "Risco Elevado": "var(--status-elevated)",
    "Crítico":       "var(--status-critical)",
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold px-4 pt-4 pb-2" style={{ color: "var(--foreground)" }}>
        LOS — Tempo de Permanência (PS)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Leito", "Paciente", "Motivo", "Tempo", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.bed} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                <td className="px-3 py-2 font-mono">{row.bed}</td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{row.reason}</td>
                <td className="px-3 py-2 tabular-nums font-semibold"
                  style={{ color: row.elapsed > 14_400_000 ? "var(--status-critical)" : row.elapsed > 7_200_000 ? "var(--status-attention)" : "var(--foreground)" }}>
                  {formatElapsed(row.elapsed)}
                </td>
                <td className="px-3 py-2" style={{ color: STATUS_COLOR[row.status] ?? "var(--muted)" }}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WaitingForBedTable() {
  const beds       = useSimulationStore((s) => s.beds.filter((b) => b.unit === "pronto-socorro"));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now        = Date.now();

  interface WaitRow { bed: string; name: string; admissionProb: number; elapsed: number; manchester: string }

  const rows = useMemo<WaitRow[]>(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i || i.admissionProbability < 40) return [];
      return [{ bed: b.label, name: i.patient.name, admissionProb: i.admissionProbability, elapsed: now - i.patient.admittedAt, manchester: i.manchesterClass }];
    })
    .sort((a, b) => b.admissionProb - a.admissionProb),
  [beds, internacoes, now]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold px-4 pt-4 pb-2" style={{ color: "var(--foreground)" }}>
        Waiting for Bed — Aguardando Internação
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Leito", "Paciente", "Prob. Internação", "Espera", "Manchester"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "var(--muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-center" style={{ color: "var(--muted)" }}>Nenhum paciente aguardando</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.bed} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                <td className="px-3 py-2 font-mono">{row.bed}</td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 tabular-nums font-semibold"
                  style={{ color: row.admissionProb >= 70 ? "var(--status-critical)" : row.admissionProb >= 50 ? "var(--status-attention)" : "var(--foreground)" }}>
                  {row.admissionProb}%
                </td>
                <td className="px-3 py-2 tabular-nums">{formatElapsed(row.elapsed)}</td>
                <td className="px-3 py-2">{row.manchester}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function EmergencyUnitPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "var(--background)" }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/command" className="text-xs transition-colors hover:text-white" style={{ color: "var(--muted)" }}>
            ← Comando
          </Link>
          <span className="text-sm font-semibold">Emergency Unit</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full animate-pulse ml-auto"
            style={{ background: "rgba(34,197,94,0.12)", color: "var(--status-stable)" }}
          >
            Ao vivo
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Porta → Triagem" value="8 min" sub="média hoje" />
            <KpiCard label="Porta → Médico"  value="27 min" sub="média hoje" />
            <KpiCard label="LOS Médio"        value="4,2 h"  sub="em atendimento" />
            <KpiCard label="Boarding Time"    value="2,1 h"  sub="aguardando leito" />
          </div>

          {/* Sparklines */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              Ocupação por Unidade — tendência
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {UNITS.map((u) => (
                <Sparkline key={u.id} unitId={u.id} label={u.label} total={u.total} color={u.color} />
              ))}
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LOSTable />
            <WaitingForBedTable />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
