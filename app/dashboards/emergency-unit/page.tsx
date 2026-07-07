"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useSimulationStore } from "@/store/simulation";
import { useShallow } from "zustand/react/shallow";
import { RealtimeClock } from "@/components/RealtimeClock";

// ─── helpers ──────────────────────────────────────────────────────────────────

const DATAS = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias"];

function getLastUpdateLabel(): string {
  const now = new Date();
  const lastFiveMin = Math.floor(now.getMinutes() / 5) * 5;
  const d = new Date(now);
  d.setMinutes(lastFiveMin, 0, 0);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ─── constants ────────────────────────────────────────────────────────────────

const UNITS = [
  { id: "pronto-socorro",   label: "Pronto Socorro",  total: 12, color: "#3b82f6" },
  { id: "enfermaria",       label: "Enfermaria",       total: 15, color: "#8b5cf6" },
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

function KpiCard({ label, value, sub, compact }: { label: string; value: string; sub?: string; compact?: boolean }) {
  return (
    <div
      className={compact ? "rounded-lg p-2.5 flex flex-col gap-0.5" : "rounded-lg p-4 flex flex-col gap-1"}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className={compact ? "text-[10px] uppercase tracking-wide" : "text-xs uppercase tracking-wide"} style={{ color: "var(--muted)" }}>{label}</span>
      <span className={compact ? "text-lg font-bold tabular-nums" : "text-2xl font-bold tabular-nums"}>{value}</span>
      {sub && <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function UnitCard({ unitId, label, total, color, compact }: {
  unitId: string; label: string; total: number; color: string; compact?: boolean;
}) {
  const beds     = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === unitId)));
  const occupied = beds.filter((b) => b.internacaoId).length;
  const pct      = Math.round((occupied / total) * 100);
  return (
    <div
      className={compact ? "rounded-lg p-2.5 flex flex-col gap-0.5" : "rounded-lg p-4 flex flex-col gap-1"}
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <span className={compact ? "text-[10px] uppercase tracking-wide" : "text-xs uppercase tracking-wide"} style={{ color: "var(--muted)" }}>{label}</span>
      <span className={compact ? "text-lg font-bold tabular-nums" : "text-2xl font-bold tabular-nums"} style={{ color }}>{pct}%</span>
      <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: "var(--muted)" }}>{occupied}/{total} leitos</span>
    </div>
  );
}

interface LOSRow { bed: string; name: string; reason: string; elapsed: number; status: string }

function useLOSRows(): LOSRow[] {
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now         = Date.now();

  return useMemo<LOSRow[]>(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i) return [];
      return [{ bed: b.label, name: i.patient.name, reason: i.patient.admissionReason, elapsed: now - i.patient.admittedAt, status: i.currentStatus }];
    })
    .sort((a, b) => b.elapsed - a.elapsed)
    .slice(0, 8),
  [beds, internacoes, now]);
}

function LOSTable({ rows }: { rows: LOSRow[] }) {
  const STATUS_COLOR: Record<string, string> = {
    "Baixo":    "var(--status-stable)",
    "Moderado": "var(--status-attention)",
    "Alto":     "var(--status-critical)",
  };

  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)", height: "100%" }}
    >
      <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
        style={{ color: "var(--foreground)", background: "var(--surface)" }}>
        Tempo de Permanência (PS)
        <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
          — {rows.length} Pacientes em Atendimento
        </span>
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

const MANCHESTER_PRIORITY: Record<string, number> = {
  "Vermelho": 0,
  "Laranja":  1,
  "Amarelo":  2,
  "Verde":    3,
  "Azul":     4,
};

const MANCHESTER_COLOR: Record<string, string> = {
  "Vermelho": "#ef4444",
  "Laranja":  "#f97316",
  "Amarelo":  "#eab308",
  "Verde":    "#22c55e",
  "Azul":     "#3b82f6",
};

const WAITING_STATUSES = ["Aguarda Leito", "Aguarda Exame", "Aguarda Liberação de Convênio"] as const;
type WaitingStatus = (typeof WAITING_STATUSES)[number];

const WAITING_STATUS_COLOR: Record<WaitingStatus, string> = {
  "Aguarda Leito":                    "var(--status-critical)",
  "Aguarda Exame":                    "var(--status-attention)",
  "Aguarda Liberação de Convênio":    "#8b5cf6",
};

function waitingStatusFor(id: string): WaitingStatus {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  // avalanche mix — without it, sequential ids like "id-3"/"id-6"/"id-9" all
  // collapse to the same bucket because 31 ≡ 1 (mod 3)
  h = h ^ (h >>> 16);
  h = Math.imul(h, 0x45d9f3b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return WAITING_STATUSES[h % WAITING_STATUSES.length];
}

interface WaitRow { bed: string; name: string; status: WaitingStatus; elapsed: number; manchester: string }

function useWaitingForBedRows(): WaitRow[] {
  const beds        = useSimulationStore(useShallow((s) => s.beds.filter((b) => b.unit === "pronto-socorro")));
  const internacoes = useSimulationStore((s) => s.internacoes);
  const now         = Date.now();

  return useMemo<WaitRow[]>(() => beds
    .filter((b) => b.internacaoId)
    .flatMap((b) => {
      const i = internacoes[b.internacaoId!];
      if (!i || i.admissionProbability < 40) return [];
      return [{ bed: b.label, name: i.patient.name, status: waitingStatusFor(i.id), elapsed: now - i.patient.admittedAt, manchester: i.manchesterClass }];
    })
    .sort((a, b) => (MANCHESTER_PRIORITY[a.manchester] ?? 99) - (MANCHESTER_PRIORITY[b.manchester] ?? 99)),
  [beds, internacoes, now]);
}

function WaitingForBedTable({ rows }: { rows: WaitRow[] }) {
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ border: "1px solid var(--border)", height: "100%" }}
    >
      <p className="text-xs font-semibold px-4 pt-3 pb-2 shrink-0"
        style={{ color: "var(--foreground)", background: "var(--surface)" }}>
        Aguardando Internação
        <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
          — {rows.length} Pacientes Aguardando
        </span>
      </p>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "auto" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.30)" }}>
              {["Leito", "Paciente", "Status", "Espera", "Manchester"].map((h) => (
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
                <td className="px-3 py-2">
                  <span
                    className={`font-semibold whitespace-nowrap ${row.status === "Aguarda Liberação de Convênio" ? "" : "px-2 py-0.5 rounded-full"}`}
                    style={{
                      background: row.status === "Aguarda Liberação de Convênio" ? "transparent" : `${WAITING_STATUS_COLOR[row.status]}22`,
                      color: WAITING_STATUS_COLOR[row.status],
                    }}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{formatElapsed(row.elapsed)}</td>
                <td className="px-3 py-2">
                  <span
                    className="px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                    style={{
                      background: `${MANCHESTER_COLOR[row.manchester] ?? "#6b7280"}22`,
                      color: MANCHESTER_COLOR[row.manchester] ?? "var(--muted)",
                    }}
                  >
                    {row.manchester}
                  </span>
                </td>
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
  const [data,       setData]       = useState("Hoje");
  const [lastUpdate, setLastUpdate] = useState(getLastUpdateLabel);

  const losRows     = useLOSRows();
  const waitingRows = useWaitingForBedRows();
  const waitingCount = waitingRows.length;
  const avgWaitMs = waitingCount > 0 ? waitingRows.reduce((sum, r) => sum + r.elapsed, 0) / waitingCount : 0;
  const avgWaitLabel = (avgWaitMs / 3_600_000).toFixed(1).replace(".", ",") + " h";

  const patientsToday        = losRows.length + waitingRows.length;
  const aguardandoExame      = waitingRows.filter((r) => r.status === "Aguarda Exame").length;
  const aguardandoRetornoMed = waitingRows.filter((r) => r.status === "Aguarda Leito" || r.status === "Aguarda Liberação de Convênio").length;

  useEffect(() => {
    const id = setInterval(() => setLastUpdate(getLastUpdateLabel()), 30_000);
    return () => clearInterval(id);
  }, []);

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
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Unidade de Emergência</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" as const }}>Data:</span>
            <select
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 6,
                border: "1px solid var(--border)", background: "var(--background)",
                color: "var(--foreground)", cursor: "pointer", outline: "none",
              }}
            >
              {DATAS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

        </div>

        {/* Content */}
        <div
          style={{
            flex: 1, minHeight: 0,
            padding: 16,
            display: "flex", flexDirection: "column", gap: 12,
          }}
        >
          {/* Row 1 — 4 equal cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flexShrink: 0 }}>
            {/* Porta → Triagem */}
            <div
              className="rounded-lg p-4 flex gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Porta → Triagem</span>
                <span className="text-2xl font-bold tabular-nums">8 min</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>tempo médio</span>
              </div>
              <div style={{ width: 1, background: "var(--border)", flexShrink: 0, alignSelf: "stretch" }} />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Pacientes</span>
                <span className="text-2xl font-bold tabular-nums">7</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>na fila</span>
              </div>
            </div>
            {/* Porta → Médico */}
            <div
              className="rounded-lg p-4 flex gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Porta → Médico</span>
                <span className="text-2xl font-bold tabular-nums">27 min</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>tempo médio</span>
              </div>
              <div style={{ width: 1, background: "var(--border)", flexShrink: 0, alignSelf: "stretch" }} />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Pacientes</span>
                <span className="text-2xl font-bold tabular-nums">7</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>na fila</span>
              </div>
            </div>
            <KpiCard label="Permanência Média" value="4,2 h"  sub="em atendimento" />
            {/* Espera por Leito + Leito Virtual */}
            <div
              className="rounded-lg p-4 flex gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Espera por Leito</span>
                <span className="text-2xl font-bold tabular-nums">{avgWaitLabel}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>aguardando leito</span>
              </div>
              <div style={{ width: 1, background: "var(--border)", flexShrink: 0, alignSelf: "stretch" }} />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>Leito Virtual</span>
                <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--status-attention)" }}>{waitingCount}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>pacientes aguardando</span>
              </div>
            </div>
          </div>

          {/* Row 2 — left half: patient-count cards · right half: unit occupancy cards (aligned under row 1's last two cards) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flexShrink: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <KpiCard compact label="Pacientes no Dia"            value={String(patientsToday)}        sub="total nas tabelas" />
              <KpiCard compact label="Aguardando Exame"            value={String(aguardandoExame)}       sub="aguarda exame" />
              <KpiCard compact label="Aguardando Retorno Médico"   value={String(aguardandoRetornoMed)}  sub="aguarda leito/convênio" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {UNITS.map((u) => (
                <UnitCard key={u.id} compact unitId={u.id} label={u.label} total={u.total} color={u.color} />
              ))}
            </div>
          </div>

          {/* Tables — fill remaining height */}
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LOSTable rows={losRows} />
            <WaitingForBedTable rows={waitingRows} />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
