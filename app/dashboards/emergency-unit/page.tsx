"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── constants ────────────────────────────────────────────────────────────────

const UNITS = [
  { id: "pronto-socorro",   label: "Pronto Socorro",  total: 12, color: "#3b82f6" },
  { id: "enfermaria",       label: "Enfermaria",       total: 20, color: "#8b5cf6" },
  { id: "uti",              label: "UTI",              total: 10, color: "#ef4444" },
  { id: "centro-cirurgico", label: "Centro Cirúrgico", total:  6, color: "#f59e0b" },
] as const;

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

function UnitCard({ unitId, label, total, color }: {
  unitId: string; label: string; total: number; color: string;
}) {
  const beds     = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === unitId)));
  const occupied = beds.filter((b) => b.internacaoId).length;
  const pct      = Math.round((occupied / total) * 100);
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-1"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{pct}%</span>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{occupied}/{total} leitos</span>
    </div>
  );
}

interface LOSRow { bed: string; name: string; reason: string; elapsed: number; status: string }

function LOSTable() {
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now         = Date.now();

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
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)", height: "100%" }}
    >
      <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
        style={{ color: "var(--foreground)", background: "var(--surface)" }}>
        Tempo de Permanência (PS)
      </p>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.30)" }}>
              {["Leito", "Paciente", "Motivo", "Tempo", "Status"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium"
                  style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.bed} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                <td className="px-3 py-2 font-mono">{row.bed}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
                <td className="px-3 py-2" style={{ color: "var(--foreground)" }}>{row.reason}</td>
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
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now         = Date.now();

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
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)", height: "100%" }}
    >
      <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
        style={{ color: "var(--foreground)", background: "var(--surface)" }}>
        Aguardando Internação
      </p>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.30)" }}>
              {["Leito", "Paciente", "Prob. Internação", "Espera", "Manchester"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium"
                  style={{ color: "var(--foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center" style={{ color: "var(--muted)" }}>
                  Nenhum paciente aguardando
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.bed} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, background: "var(--surface)" }}>
                <td className="px-3 py-2 font-mono">{row.bed}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{row.name}</td>
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
          <Link href="/command" className="text-xs transition-colors hover:text-white" style={{ color: "var(--muted)" }}>← Comando</Link>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Unidade de Emergência</span>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><RealtimeClock /></div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1, minHeight: 0,
            padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          {/* 8 cards — 2 rows of 4, equal size */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flexShrink: 0 }}>
            <KpiCard label="Porta → Triagem"   value="8 min"  sub="média hoje" />
            <KpiCard label="Porta → Médico"    value="27 min" sub="média hoje" />
            <KpiCard label="Permanência Média" value="4,2 h"  sub="em atendimento" />
            <KpiCard label="Espera por Leito"  value="2,1 h"  sub="aguardando leito" />
            {UNITS.map((u) => (
              <UnitCard key={u.id} unitId={u.id} label={u.label} total={u.total} color={u.color} />
            ))}
          </div>

          {/* Tables — fill remaining height */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LOSTable />
            <WaitingForBedTable />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
