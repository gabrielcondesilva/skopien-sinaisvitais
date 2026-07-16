"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAlertStore } from "@/store/alerts";
import { useAuthStore } from "@/store/auth";
import { useShallow } from "zustand/react/shallow";
import type { Alert, Bed, Internacao, SurgicalInternacao } from "@/lib/simulation/types";
import { StreamlineIcon } from "./ui/StreamlineIcon";
import { UTI_TIPO_LABELS } from "@/lib/units";

function bedDisplayLabel(bed: Bed): string {
  const number = bed.label.match(/(\d+)$/)?.[0] ?? bed.label;
  const suffix = bed.unit === "uti" && bed.utiTipo ? ` (${UTI_TIPO_LABELS[bed.utiTipo]})` : "";
  return `Leito ${number}${suffix}`;
}

export const STATUS_COLOR: Record<string, string> = {
  "Estável":       "#2F9E44",
  "Atenção":       "#F59F00",
  "Risco Elevado": "#F76707",
  "Crítico":       "#F03E3E",
};

// Regras institucionais de risco Braden: Muito Alto=Vermelho, Alto=Rosa Avermelhado,
// Moderado=Laranja, Leve=Verde, Baixo Risco=Verde Claro
export const BRADEN_COLOR: Record<string, string> = {
  "Muito Alto":  "#F03E3E",
  "Alto":        "#F06595",
  "Moderado":    "#F76707",
  "Leve":        "#2F9E44",
  "Baixo Risco": "#8CE99A",
};

const PILL_SIZE = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3.5 py-1.5 text-sm",
  lg: "px-5 py-2 text-lg",
} as const;

export function ScorePill({ text, color, onClick, size = "sm" }: {
  text: string; color: string; onClick?: () => void; size?: keyof typeof PILL_SIZE;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center rounded-full font-bold tabular-nums leading-none whitespace-nowrap ${PILL_SIZE[size]}`}
      style={{
        color,
        background: `${color}1F`,
        border: `1px solid ${color}`,
        boxShadow: `0 0 6px ${color}66, inset 0 0 6px ${color}14`,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {text}
    </Tag>
  );
}

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
    const label      = bed.inoperante ? "Leito Inoperante" : "Leito Disponível";
    const labelColor = bed.inoperante ? "var(--status-critical)" : "var(--status-stable)";

    return (
      <div
        className="rounded-xl p-5 flex flex-col gap-2.5"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--muted)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bedDisplayLabel(bed)}</span>
        </div>
        <div>
          <p className="text-sm font-medium leading-snug" style={{ color: labelColor }}>{label}</p>
          <p className="text-xs mt-0.5 invisible" aria-hidden>– · – · –</p>
        </div>
        <p className="text-xs leading-tight line-clamp-1 invisible" aria-hidden>–</p>
        <div
          className="flex items-center justify-between pt-2.5 mt-auto"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="text-[11px] invisible" aria-hidden>EWS 0 - –</span>
          <span className="text-[11px] invisible" aria-hidden>Braden 0 - –</span>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLOR[internacao.currentStatus] ?? "var(--muted)";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/patients/${internacao.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/patients/${internacao.id}`)}
      className="rounded-xl p-5 flex flex-col gap-2.5 cursor-pointer select-none hover:bg-white/[0.03] focus-visible:outline-none transition-colors"
      style={{
        background: "var(--surface)",
        border: `1px solid ${hovered ? "var(--accent)" : statusColor}`,
        boxShadow: `0 0 14px ${statusColor}55, inset 0 0 36px -8px ${statusColor}80`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Bed label + badges */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bedDisplayLabel(bed)}</span>
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
        className="flex items-center justify-between gap-2 pt-2.5 mt-auto flex-wrap"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <ScorePill text={`EWS ${internacao.currentEws} - ${internacao.currentStatus}`} color={statusColor} />

        {bed.label === "UTI-01" && (
          <ScorePill text="Braden 10 - Alto" color={BRADEN_COLOR["Alto"]} />
        )}
      </div>
    </div>
  );
}
