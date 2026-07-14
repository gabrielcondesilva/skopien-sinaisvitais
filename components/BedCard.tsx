"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlertStore } from "@/store/alerts";
import { useAuthStore } from "@/store/auth";
import { useShallow } from "zustand/react/shallow";
import type { Alert, Bed, Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { StreamlineIcon } from "./ui/StreamlineIcon";

const STATUS_COLOR: Record<string, string> = {
  "Baixo":    "var(--status-stable)",
  "Moderado": "var(--status-attention)",
  "Alto":     "var(--status-critical)",
};

const ALERT_META: Record<string, { icon: "sinal_vital" | "medicacao" | "predicao_alta"; color: string; label: string }> = {
  "sinal-vital": { icon: "sinal_vital",   color: "var(--status-critical)",  label: "Sinal Vital Crítico" },
  "medicacao":   { icon: "medicacao",     color: "var(--status-attention)", label: "Medicação Atrasada"  },
  "alta":        { icon: "predicao_alta", color: "var(--accent)",           label: "Previsão de Alta"    },
};

function formatElapsed(admittedAt: number): string {
  const totalMin = Math.floor((Date.now() - admittedAt) / 60_000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return min > 0 ? `${h}h ${min}min` : `${h}h`;
  return `${totalMin}min`;
}

function AlertBadge({ alert }: { alert: Alert }) {
  const meta = ALERT_META[alert.type];
  if (!meta) return null;
  return (
    <span
      title={meta.label}
      className="animate-pulse select-none inline-flex items-center justify-center"
    >
      <StreamlineIcon name={meta.icon} size={16} />
    </span>
  );
}

interface Props {
  bed: Bed;
  internacao: Internacao | SurgicalInternacao | null;
}

export function BedCard({ bed, internacao }: Props) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");
  const alerts = useAlertStore(useShallow((s) =>
    internacao
      ? s.active.filter((a) => a.internacaoId === internacao.id && !(a.type === "alta" && bed.unit === "pronto-socorro"))
      : []
  ));

  if (!internacao) {
    const borderColor = bed.inoperante ? "rgba(255,255,255,0.12)" : "var(--status-stable)";
    const label       = bed.inoperante ? "Leito Inoperante"       : "Leito Disponível";
    const labelColor  = bed.inoperante ? "rgba(239,68,68,0.6)"    : "var(--foreground)";

    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-2"
        style={{
          background: bed.inoperante ? "rgba(255,255,255,0.02)" : "var(--surface)",
          border: `1px solid ${borderColor}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bed.label}</span>
        </div>
        <div>
          <p className="text-sm font-medium leading-snug" style={{ color: labelColor }}>{label}</p>
          <p className="text-xs mt-0.5 invisible" aria-hidden>– · – · –</p>
        </div>
        <p className="text-xs leading-tight line-clamp-1 invisible" aria-hidden>–</p>
        <div
          className="flex items-center justify-between pt-2 mt-auto"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-xs invisible" aria-hidden>EWS 0 –</span>
          <span className="text-xs invisible" aria-hidden>Braden 0 –</span>
        </div>
      </div>
    );
  }

  const statusColor  = STATUS_COLOR[internacao.currentStatus] ?? "var(--muted)";
  const isCritical   = internacao.currentStatus === "Alto";
  const hasAlerts    = alerts.length > 0;
  const showRedPulse = isCritical || hasAlerts;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/patients/${internacao.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/patients/${internacao.id}`)}
      className={`rounded-lg p-4 flex flex-col gap-2 cursor-pointer select-none hover:bg-white/[0.03] focus-visible:outline-none transition-colors${showRedPulse ? " sk-crit-pulse" : ""}`}
      style={{
        background: "var(--surface)",
        border: `1px solid ${showRedPulse ? "rgba(240,62,62,0.7)" : hovered ? "var(--accent)" : `${statusColor}44`}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Bed label + badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bed.label}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {internacao.hasPump && (
            <span title="Bomba de Infusão ativa" className="inline-flex items-center select-none">
              <StreamlineIcon name="bomba_infusao" size={16} />
            </span>
          )}
          {alerts.map((a) => <AlertBadge key={a.id} alert={a} />)}
        </div>
      </div>

      {/* Patient info */}
      <div>
        <p className="text-sm font-medium leading-snug truncate">{internacao.patient.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
          {internacao.patient.age} anos&nbsp;·&nbsp;
          {internacao.patient.gender === "M" ? "Masculino" : "Feminino"}&nbsp;·&nbsp;
          {formatElapsed(internacao.patient.admittedAt)}
        </p>
      </div>

      {/* Admission reason */}
      <p
        className="text-xs leading-tight line-clamp-1"
        style={{ color: isAntonio ? "var(--accent)" : "var(--muted)" }}
      >
        {internacao.patient.admissionReason}
      </p>

      {/* EWS / Braden footer */}
      <div
        className="flex items-center justify-between pt-2 mt-auto"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="text-xs tabular-nums">
          <span style={{ color: "var(--muted)" }}>EWS</span>{" "}
          <span style={{ color: statusColor, fontWeight: 600 }}>
            {internacao.currentEws} {internacao.currentStatus}
          </span>
        </span>

        {bed.label === "UTI-01" && (
          <span className="text-xs tabular-nums">
            <span style={{ color: "var(--muted)" }}>Braden</span>{" "}
            <span style={{ color: "var(--status-critical)", fontWeight: 600 }}>10 Alto</span>
          </span>
        )}
      </div>
    </div>
  );
}
