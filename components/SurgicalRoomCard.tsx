"use client";

import type { Bed, Internacao, SurgicalInternacao, SurgicalStep } from "@/lib/simulation/types";
import { StreamlineIcon } from "./ui/StreamlineIcon";

function isSurgical(i: Internacao | SurgicalInternacao): i is SurgicalInternacao {
  return "surgicalFlow" in i;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
}

function StepRow({
  step,
  index,
  currentStep,
}: {
  step: SurgicalStep;
  index: number;
  currentStep: number;
}) {
  const isDone = index < currentStep;
  const isActive = index === currentStep;
  const isPending = index > currentStep;

  let dotColor = "var(--border)";
  let labelColor = "var(--muted)";

  if (isDone)   { dotColor = "var(--status-stable)";   labelColor = "var(--foreground)"; }
  if (isActive) { dotColor = "var(--accent)";           labelColor = "var(--foreground)"; }

  const elapsed =
    isActive && step.startedAt
      ? formatDuration(Date.now() - step.startedAt)
      : null;

  const duration =
    isDone && step.startedAt && step.completedAt
      ? formatDuration(step.completedAt - step.startedAt)
      : null;

  return (
    <div className="flex items-start gap-2 text-xs">
      {/* dot / check */}
      <span
        className="mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
        style={{
          background: isDone ? "var(--status-stable)" : isActive ? "var(--accent)" : "var(--border)",
          color: isDone || isActive ? "#fff" : "transparent",
        }}
      >
        {isDone ? "✓" : isActive ? "●" : ""}
      </span>

      <div className="flex flex-col gap-0.5 min-w-0">
        <span style={{ color: labelColor }} className={isActive ? "font-medium" : ""}>
          {step.name}
        </span>

        {isDone && step.startedAt && (
          <span style={{ color: "var(--muted)" }}>
            {formatTime(step.startedAt)}&nbsp;—&nbsp;{duration}
          </span>
        )}

        {isActive && step.startedAt && (
          <span style={{ color: "var(--accent)" }}>
            Em andamento&nbsp;({elapsed})
          </span>
        )}
      </div>
    </div>
  );
}

interface Props {
  bed: Bed;
  internacao: Internacao | SurgicalInternacao | null;
}

export function SurgicalRoomCard({ bed, internacao }: Props) {
  if (!internacao || !isSurgical(internacao)) {
    const isInop = bed.inoperante;
    return (
      <div
        className="rounded-lg p-4 flex flex-col gap-1 min-h-[100px] justify-center"
        style={{
          background: isInop ? "rgba(255,255,255,0.02)" : "var(--surface)",
          border: `1px solid ${isInop ? "rgba(255,255,255,0.12)" : "var(--border)"}`,
        }}
      >
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bed.label}</span>
        <span className="text-sm" style={{ color: isInop ? "rgba(239,68,68,0.6)" : "var(--muted)" }}>
          {isInop ? "Sala Inoperante" : "Sala Disponível"}
        </span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{bed.label}</span>
        {internacao.hasPump && (
          <span title="Bomba de Infusão ativa" className="inline-flex items-center select-none">
            <StreamlineIcon name="bomba_infusao" size={16} />
          </span>
        )}
      </div>

      {/* Patient + surgeon */}
      <div>
        <p className="text-sm font-medium leading-snug truncate">{internacao.patient.name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
          {internacao.surgeonName}
        </p>
      </div>

      {/* Procedure */}
      <p
        className="text-xs font-medium truncate px-2 py-1 rounded"
        style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent)" }}
      >
        {internacao.procedureName}
      </p>

      {/* Surgical flow */}
      <div
        className="flex flex-col gap-2 pt-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {internacao.surgicalFlow.map((step, i) => (
          <StepRow
            key={step.name}
            step={step}
            index={i}
            currentStep={internacao.currentStep}
          />
        ))}
      </div>
    </div>
  );
}
