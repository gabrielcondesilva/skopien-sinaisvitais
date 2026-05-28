"use client";

import { useAlertStore } from "@/store/alerts";
import type { Alert } from "@/lib/simulation/types";
import { StreamlineIcon } from "./ui/StreamlineIcon";

const ALERT_META: Record<string, { icon: "sinal_vital" | "medicacao" | "predicao_alta"; title: string; color: string }> = {
  "sinal-vital": { icon: "sinal_vital",   title: "Sinal Vital Crítico", color: "var(--status-critical)"  },
  "medicacao":   { icon: "medicacao",     title: "Medicação Atrasada",  color: "var(--status-attention)" },
  "alta":        { icon: "predicao_alta", title: "Previsão de Alta",    color: "var(--accent)"           },
};

function formatRelative(firedAt: number): string {
  const mins = Math.floor((Date.now() - firedAt) / 60_000);
  if (mins < 1) return "agora";
  if (mins === 1) return "1 min atrás";
  return `${mins} min atrás`;
}

function AlertCard({ alert }: { alert: Alert }) {
  const dismiss = useAlertStore((s) => s.dismiss);
  const meta = ALERT_META[alert.type] ?? { icon: "!", title: "Alerta", color: "var(--muted)" };
  const isAlta = alert.type === "alta";

  return (
    <div className="p-4 flex flex-col gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-3">
        <StreamlineIcon name={meta.icon} size={22} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: meta.color }}>{meta.title}</p>
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

      {!isAlta && (
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
}

export function AlertsPanel({ onClose }: Props) {
  const active = useAlertStore((s) => s.active);

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
          <span className="text-sm font-semibold">Alertas Ativos</span>
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
