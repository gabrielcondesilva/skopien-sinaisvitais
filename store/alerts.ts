import { create } from "zustand";
import type { Alert, AlertType, UnitId, VitalAlertResolution } from "@/lib/simulation/types";
import { ALARM_VITAL_KEYS, ALARM_LABEL, ALARM_UNIT, isOutOfAlarmLimit, type AlarmVitalKey } from "@/lib/vitalAlarm";

let _alertCounter = 1;
const alertId = () => `alert-${_alertCounter++}`;

// Carência de re-disparo pro mesmo (internação, parâmetro) depois de "Ação Tomada" —
// contada a partir do disparo ORIGINAL, não do clique. Ver CONTEXT.md § Alertas.
const VITAL_ALERT_COOLDOWN_MS = 60 * 60_000;

function cooldownKey(internacaoId: string, parametro: AlarmVitalKey): string {
  return `${internacaoId}:${parametro}`;
}

interface AlertState {
  active: Alert[];
  history: Alert[];
  // Carência pendente por (internação, parâmetro): valor = firedAt do alerta original
  // fechado via "Ação Tomada". Some quando uma leitura normal aparece ou quando os
  // 60min completam — nesse ponto a próxima piora é tratada como episódio novo.
  _cooldowns: Map<string, number>;

  activeCount: number;

  // Called by SimulationProvider on each tick with o valor atual dos 5 sinais vitais
  // (Slot Temporal fixo de 15 min) por internação — dispara/auto-encerra por parâmetro.
  checkVitalAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      vitals: Record<AlarmVitalKey, number>;
    }>
  ) => void;

  // Fire a scripted (non-vital) alert
  fireAlert: (params: {
    type: Exclude<AlertType, "sinal-vital">;
    internacaoId: string;
    patientName: string;
    bedLabel: string;
    unit: UnitId;
    message: string;
  }) => void;

  // Dismiss an alert with an optional action note — usado só por medicacao/alta
  dismiss: (alertId: string, action?: string) => void;

  // Encerra um alerta de sinal-vital por ação humana — Ação Tomada abre carência de
  // 60min pro mesmo parâmetro, Falso Positivo não abre carência nenhuma.
  resolveVitalAlert: (alertId: string, resolvedAs: VitalAlertResolution) => void;

  // Seed all demo alert types at app startup (called once by SimulationProvider)
  seedDemoAlerts: (items: Array<Omit<Alert, "id" | "firedAt" | "status">>) => void;

  // Derived helper: returns active alerts for a specific internação
  getAlertsForInternacao: (internacaoId: string) => Alert[];
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  active: [],
  history: [],
  _cooldowns: new Map(),
  activeCount: 0,

  checkVitalAlerts(internacoes) {
    const now = Date.now();

    set((state) => {
      const cooldowns = new Map(state._cooldowns);
      const stillActive = [...state.active];
      const toFire: Alert[] = [];
      const toHistory: Alert[] = [];

      for (const inv of internacoes) {
        for (const key of ALARM_VITAL_KEYS) {
          const value = inv.vitals[key];
          const outOfRange = isOutOfAlarmLimit(key, value);
          const ckKey = cooldownKey(inv.id, key);

          const activeIdx = stillActive.findIndex(
            (a) => a.type === "sinal-vital" && a.internacaoId === inv.id && a.parametro === key
          );

          if (activeIdx !== -1) {
            // Já ativo — nunca duplica. Só sai da lista ativa se normalizar sozinho.
            if (!outOfRange) {
              const [cleared] = stillActive.splice(activeIdx, 1);
              toHistory.push({ ...cleared, status: "auto-cleared", dismissedAt: now });
            }
            continue;
          }

          if (!outOfRange) {
            // Valor normal: qualquer carência pendente vira obsoleta — a próxima
            // piora (se vier) é um episódio novo, não uma continuação da crise.
            cooldowns.delete(ckKey);
            continue;
          }

          // Fora do limite, sem alerta ativo — checa carência antes de disparar.
          const pendingSince = cooldowns.get(ckKey);
          if (pendingSince != null) {
            if (now - pendingSince < VITAL_ALERT_COOLDOWN_MS) continue; // ainda em carência
            cooldowns.delete(ckKey); // carência completou — libera disparo
          }

          toFire.push({
            id: alertId(),
            type: "sinal-vital",
            internacaoId: inv.id,
            patientName: inv.patientName,
            bedLabel: inv.bedLabel,
            unit: inv.unit,
            message: `${ALARM_LABEL[key]} ${value}${ALARM_UNIT[key]} — fora do Limite de Alarme`,
            firedAt: now,
            status: "active",
            parametro: key,
            valor: value,
          });
        }
      }

      const merged = [...stillActive, ...toFire];
      return {
        active: merged,
        history: [...state.history, ...toHistory],
        activeCount: merged.length,
        _cooldowns: cooldowns,
      };
    });
  },

  fireAlert({ type, internacaoId, patientName, bedLabel, unit, message }) {
    set((state) => {
      // Skip if an active alert of the same type already exists for this internação
      if (state.active.some((a) => a.type === type && a.internacaoId === internacaoId)) {
        return {};
      }
      const alert: Alert = {
        id: alertId(),
        type,
        internacaoId,
        patientName,
        bedLabel,
        unit,
        message,
        firedAt: Date.now(),
        status: "active",
      };
      const merged = [...state.active, alert];
      return { active: merged, activeCount: merged.length };
    });
  },

  dismiss(id, action) {
    set((state) => {
      const target = state.active.find((a) => a.id === id);
      if (!target) return {};

      const dismissed: Alert = {
        ...target,
        status: "dismissed",
        dismissedAt: Date.now(),
        dismissAction: action,
      };
      const nowActive = state.active.filter((a) => a.id !== id);
      return {
        active: nowActive,
        history: [...state.history, dismissed],
        activeCount: nowActive.length,
      };
    });
  },

  resolveVitalAlert(id, resolvedAs) {
    set((state) => {
      const target = state.active.find((a) => a.id === id);
      if (!target || !target.parametro) return {};

      const resolved: Alert = {
        ...target,
        status: "dismissed",
        dismissedAt: Date.now(),
        resolvidoComo: resolvedAs,
      };
      const nowActive = state.active.filter((a) => a.id !== id);

      const cooldowns = new Map(state._cooldowns);
      const ckKey = cooldownKey(target.internacaoId, target.parametro);
      if (resolvedAs === "acao-tomada") {
        cooldowns.set(ckKey, target.firedAt);
      } else {
        cooldowns.delete(ckKey);
      }

      return {
        active: nowActive,
        history: [...state.history, resolved],
        activeCount: nowActive.length,
        _cooldowns: cooldowns,
      };
    });
  },

  seedDemoAlerts(items) {
    const now = Date.now();
    const seeded: Alert[] = items.map((item) => ({
      ...item,
      id: alertId(),
      firedAt: now,
      status: "active" as const,
    }));
    set((state) => {
      const merged = [...state.active, ...seeded];
      return {
        active: merged,
        activeCount: merged.length,
      };
    });
  },

  getAlertsForInternacao(internacaoId) {
    return get().active.filter((a) => a.internacaoId === internacaoId);
  },
}));
