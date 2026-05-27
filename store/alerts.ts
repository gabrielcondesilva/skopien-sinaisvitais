import { create } from "zustand";
import type { Alert, AlertType, UnitId } from "@/lib/simulation/types";

let _alertCounter = 1;
const alertId = () => `alert-${_alertCounter++}`;

interface AlertState {
  active: Alert[];
  history: Alert[];
  // Track which internações were Crítico last tick to detect re-deterioration
  _criticalSet: Set<string>;

  activeCount: number;

  // Called by SimulationProvider on each tick with current state snapshot
  checkVitalAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      currentStatus: string;
      criticalMessage: string;
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

  // Dismiss an alert with an optional action note
  dismiss: (alertId: string, action?: string) => void;

  // Derived helper: returns active alerts for a specific internação
  getAlertsForInternacao: (internacaoId: string) => Alert[];
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  active: [],
  history: [],
  _criticalSet: new Set(),
  activeCount: 0,

  checkVitalAlerts(internacoes) {
    const prev = get()._criticalSet;
    const next = new Set<string>();

    const toFire: Alert[] = [];

    for (const inv of internacoes) {
      const isCritical = inv.currentStatus === "Crítico";
      if (isCritical) next.add(inv.id);

      // Fire when: was NOT critical last tick, IS critical now
      if (!prev.has(inv.id) && isCritical) {
        toFire.push({
          id: alertId(),
          type: "sinal-vital",
          internacaoId: inv.id,
          patientName: inv.patientName,
          bedLabel: inv.bedLabel,
          unit: inv.unit,
          message: inv.criticalMessage,
          firedAt: Date.now(),
          status: "active",
        });
      }
    }

    // Auto-clear sinal-vital alerts for internações that are no longer critical
    set((state) => {
      const nowActive: Alert[] = [];
      const toHistory: Alert[] = [];

      for (const a of state.active) {
        if (a.type === "sinal-vital" && !next.has(a.internacaoId)) {
          toHistory.push({ ...a, status: "auto-cleared" });
        } else {
          nowActive.push(a);
        }
      }

      const merged = [...nowActive, ...toFire];
      return {
        active: merged,
        history: [...state.history, ...toHistory],
        _criticalSet: next,
        activeCount: merged.length,
      };
    });
  },

  fireAlert({ type, internacaoId, patientName, bedLabel, unit, message }) {
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
    set((state) => {
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

  getAlertsForInternacao(internacaoId) {
    return get().active.filter((a) => a.internacaoId === internacaoId);
  },
}));
