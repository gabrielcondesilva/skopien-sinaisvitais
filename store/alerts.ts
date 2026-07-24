import { create } from "zustand";
import type { Alert, AlertType, StatusClinico, UnitId, VitalAlertResolution } from "@/lib/simulation/types";
import { ALARM_VITAL_KEYS, ALARM_LABEL, ALARM_UNIT, isOutOfAlarmLimit, type AlarmVitalKey } from "@/lib/vitalAlarm";
import { SCORE_STATUS_RANK } from "@/lib/simulation/vitals";

let _alertCounter = 1;
const alertId = () => `alert-${_alertCounter++}`;

// Carência de re-disparo pro mesmo (internação, parâmetro) depois de "Ação Tomada" —
// contada a partir do disparo ORIGINAL, não do clique. Ver CONTEXT.md § Alertas.
const VITAL_ALERT_COOLDOWN_MS = 60 * 60_000;

// Mesma margem, agora pro Alerta de Escore ficar parado na mesma categoria sem piorar.
const SCORE_ALERT_COOLDOWN_MS = 60 * 60_000;

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

  // Último Status Clínico observado por internação — usado só pra detectar transição
  // de categoria no próximo tick, nunca dispara nada sozinho (ver checkScoreAlerts).
  _lastStatus: Map<string, StatusClinico>;

  // Carência pendente por internação (Alerta de Escore): valor = firedAt do alerta
  // original fechado via "Ação Tomada" enquanto o Escore seguia na mesma categoria.
  _scoreCooldowns: Map<string, number>;

  activeCount: number;

  // Called by SimulationProvider on each tick com a leitura BRUTA mais recente (1/min)
  // por internação — o Limite de Alarme reage em tempo real, sem esperar nenhuma
  // agregação (Slot Temporal ou Janela de Escore). Ver CONTEXT.md § Limite de Alarme.
  checkVitalAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      vitals: Record<AlarmVitalKey, number>;
    }>
  ) => void;

  // Called by SimulationProvider on each tick com o Status Clínico atual (calculado
  // sobre a Janela de Escore) por internação — dispara/auto-encerra o Alerta de Escore
  // por transição de categoria. Ver CONTEXT.md § Alertas.
  checkScoreAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      status: StatusClinico;
      ewsTotal: number;
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

  // Backfill de Alerta de Escore: recria retroativamente os que teriam disparado
  // dentro do histórico já semeado (buildHistory pré-popula até 62h antes do motor
  // de alerta existir pra ver ao vivo — sem isso o gráfico mostra piora sem marcador).
  // Cada item já vem com firedAt/status definidos (computeScoreTransitionHistory),
  // só falta o id. Ver CONTEXT.md § Alertas.
  seedBackfilledScoreAlerts: (items: Array<Omit<Alert, "id">>) => void;

  // Derived helper: returns active alerts for a specific internação
  getAlertsForInternacao: (internacaoId: string) => Alert[];
}

export const useAlertStore = create<AlertState>()((set, get) => ({
  active: [],
  history: [],
  _cooldowns: new Map(),
  _lastStatus: new Map(),
  _scoreCooldowns: new Map(),
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
          // Leitura vazia/zerada (falha de equipamento) — ignora por completo, não
          // dispara nem encerra um alerta ativo, só aguarda a próxima leitura válida.
          if (!value) continue;

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

  checkScoreAlerts(internacoes) {
    const now = Date.now();

    set((state) => {
      const lastStatus = new Map(state._lastStatus);
      const cooldowns = new Map(state._scoreCooldowns);
      const stillActive = [...state.active];
      const toFire: Alert[] = [];
      const toHistory: Alert[] = [];

      for (const inv of internacoes) {
        const prevStatus = lastStatus.get(inv.id);
        lastStatus.set(inv.id, inv.status);

        if (prevStatus == null) {
          // Primeira observação desta internação — só define a base, não dispara nada.
          continue;
        }

        const activeIdx = stillActive.findIndex((a) => a.type === "escore" && a.internacaoId === inv.id);
        const prevRank = SCORE_STATUS_RANK[prevStatus];
        const rank = SCORE_STATUS_RANK[inv.status];

        if (rank > prevRank) {
          // Piora de categoria — episódio novo, dispara na hora. Se um Alerta de
          // Escore anterior ainda estiver ativo (esquecido), é substituído.
          if (activeIdx !== -1) {
            const [superseded] = stillActive.splice(activeIdx, 1);
            toHistory.push({
              ...superseded,
              status: "dismissed",
              dismissedAt: now,
              dismissAction: "Substituído — nova piora",
            });
          }
          cooldowns.delete(inv.id);
          toFire.push({
            id: alertId(),
            type: "escore",
            internacaoId: inv.id,
            patientName: inv.patientName,
            bedLabel: inv.bedLabel,
            unit: inv.unit,
            message: `Status Clínico piorou para ${inv.status} (Escore ${inv.ewsTotal})`,
            firedAt: now,
            status: "active",
          });
        } else if (rank < prevRank) {
          // Melhora — nunca dispara, e limpa sozinho um Alerta de Escore ativo.
          if (activeIdx !== -1) {
            const [cleared] = stillActive.splice(activeIdx, 1);
            toHistory.push({ ...cleared, status: "auto-cleared", dismissedAt: now });
          }
          cooldowns.delete(inv.id);
        } else if (rank > 0 && activeIdx === -1) {
          // Mesma categoria, sem alerta ativo (dispensado antes) — só reabre depois
          // de completar 60min sem melhora desde o disparo original.
          const pendingSince = cooldowns.get(inv.id);
          if (pendingSince != null && now - pendingSince >= SCORE_ALERT_COOLDOWN_MS) {
            cooldowns.delete(inv.id);
            toFire.push({
              id: alertId(),
              type: "escore",
              internacaoId: inv.id,
              patientName: inv.patientName,
              bedLabel: inv.bedLabel,
              unit: inv.unit,
              message: `Status Clínico permanece ${inv.status} (Escore ${inv.ewsTotal})`,
              firedAt: now,
              status: "active",
            });
          }
        }
      }

      const merged = [...stillActive, ...toFire];
      return {
        active: merged,
        history: [...state.history, ...toHistory],
        activeCount: merged.length,
        _lastStatus: lastStatus,
        _scoreCooldowns: cooldowns,
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

      // "Ação Tomada" no Alerta de Escore abre a carência de 60min pro mesmo
      // paciente, ancorada no disparo original — ver checkScoreAlerts.
      const scoreCooldowns = target.type === "escore"
        ? new Map(state._scoreCooldowns).set(target.internacaoId, target.firedAt)
        : state._scoreCooldowns;

      return {
        active: nowActive,
        history: [...state.history, dismissed],
        activeCount: nowActive.length,
        _scoreCooldowns: scoreCooldowns,
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

  seedBackfilledScoreAlerts(items) {
    set((state) => {
      const withIds: Alert[] = items.map((item) => ({ ...item, id: alertId() }));
      const historyItems = withIds.filter((a) => a.status !== "active");
      // Nunca duplica um Alerta de Escore já ativo pra mesma internação — pode
      // acontecer se um dos alertas de demo roteirizados (seedDemoAlerts) já
      // cobrir essa internação. Só o histórico (já resolvido) sempre entra.
      const activeItems = withIds.filter(
        (a) => a.status === "active" && !state.active.some((x) => x.type === "escore" && x.internacaoId === a.internacaoId)
      );
      const merged = [...state.active, ...activeItems];
      return {
        active: merged,
        history: [...state.history, ...historyItems],
        activeCount: merged.length,
      };
    });
  },

  getAlertsForInternacao(internacaoId) {
    return get().active.filter((a) => a.internacaoId === internacaoId);
  },
}));
