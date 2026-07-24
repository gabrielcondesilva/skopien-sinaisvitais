"use client";

import { useAlertStore } from "@/store/alerts";
import type { Alert, UnitId } from "@/lib/simulation/types";
import { ALARM_LABEL, alarmIconFor } from "@/lib/vitalAlarm";
import { StreamlineIcon, type IconName } from "./ui/StreamlineIcon";

const ALERT_META: Record<string, { icon?: IconName; title: string; color: string }> = {
  "sinal-vital": { icon: "monitor",       title: "Sinal Vital Crítico", color: "var(--status-critical)"  },
  "escore":      { title: "Escore Elevado", color: "var(--status-elevated)" },
  "medicacao":   { icon: "medicacao",     title: "Medicação Atrasada",  color: "var(--status-attention)" },
  "alta":        { icon: "predicao_alta", title: "Previsão de Alta",    color: "var(--accent)"           },
};

// Ícone do alerta de sinal-vital depende do parâmetro (FR = ventilador, demais
// = monitor) — não é fixo por tipo como os outros alertas. Alerta de Escore não tem
// ícone — a severidade já é visível na borda/rótulo do card. Ver CONTEXT.md § Alertas.
function alertIcon(alert: Alert): IconName | undefined {
  if (alert.type === "sinal-vital" && alert.parametro) return alarmIconFor(alert.parametro);
  return ALERT_META[alert.type]?.icon;
}

// Título do alerta de sinal-vital é dinâmico por parâmetro (ex.: "FC Crítica"),
// não o rótulo genérico — cada parâmetro fora do Limite de Alarme é um alerta à parte.
function alertTitle(alert: Alert): string {
  if (alert.type === "sinal-vital" && alert.parametro) {
    return `${ALARM_LABEL[alert.parametro]} Crítica`;
  }
  return ALERT_META[alert.type]?.title ?? "Alerta";
}

function formatRelative(firedAt: number): string {
  const mins = Math.floor((Date.now() - firedAt) / 60_000);
  if (mins < 1) return "agora";
  if (mins === 1) return "1 min atrás";
  return `${mins} min atrás`;
}

function AlertCard({ alert }: { alert: Alert }) {
  const dismiss = useAlertStore((s) => s.dismiss);
  const resolveVitalAlert = useAlertStore((s) => s.resolveVitalAlert);
  const meta = ALERT_META[alert.type] ?? { color: "var(--muted)" };
  const icon = alertIcon(alert);
  const isAlta = alert.type === "alta";
  const isSinalVital = alert.type === "sinal-vital";

  return (
    <div className="p-4 flex flex-col gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-3">
        {icon && <StreamlineIcon name={icon} size={22} className="mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: meta.color }}>{alertTitle(alert)}</p>
          <p className="text-sm font-medium mt-0.5 truncate">{alert.patientName}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {alert.bedLabel}&nbsp;·&nbsp;{alert.unit.replace(/-/g, " ")}
          </p>
          <p className="text-xs mt-1 leading-snug">{alert.message}</p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {formatRelative(alert.firedAt)}
          </p>
        </div>
      </div>

      {isAlta && (
        <div className="flex gap-2">
          <button
            onClick={() => dismiss(alert.id, "Confirmar Alta")}
            className="flex-1 text-xs py-1.5 rounded font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Confirmar Alta
          </button>
          <button
            onClick={() => dismiss(alert.id, "Manter Internado")}
            className="flex-1 text-xs py-1.5 rounded font-medium transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
          >
            Manter Internado
          </button>
        </div>
      )}

      {isSinalVital && (
        <div className="flex gap-2">
          <button
            onClick={() => resolveVitalAlert(alert.id, "acao-tomada")}
            className="flex-1 text-xs py-1.5 rounded font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Ação Tomada
          </button>
          <button
            onClick={() => resolveVitalAlert(alert.id, "falso-positivo")}
            className="flex-1 text-xs py-1.5 rounded font-medium transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
          >
            Falso Positivo
          </button>
        </div>
      )}

      {!isAlta && !isSinalVital && (
        <button
          onClick={() => dismiss(alert.id, "Ação tomada pela equipe")}
          className="w-full text-xs py-1.5 rounded font-medium transition-colors hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
        >
          Ação tomada pela equipe
        </button>
      )}
    </div>
  );
}

interface Props {
  onClose: () => void;
  unitFilter?: UnitId | null;
}

export function AlertsPanel({ onClose, unitFilter }: Props) {
  const all = useAlertStore((s) => s.active);
  const active = (unitFilter ? all.filter((a) => a.unit === unitFilter) : all)
    .filter((a) => !(a.type === "alta" && a.unit === "pronto-socorro"));

  return (
    <div
      className="fixed top-0 right-0 h-full w-80 flex flex-col z-50"
      style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {unitFilter ? `Alertas — ${unitFilter.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}` : "Alertas Ativos"}
          </span>
          {active.length > 0 && (
            <span
              className="text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold"
              style={{ background: "var(--status-critical)", color: "#fff" }}
            >
              {active.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-sm leading-none hover:opacity-70 transition-opacity"
          style={{ color: "var(--muted)" }}
        >
          ✕
        </button>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum alerta ativo</p>
          </div>
        ) : (
          active.map((a) => <AlertCard key={a.id} alert={a} />)
        )}
      </div>
    </div>
  );
}
