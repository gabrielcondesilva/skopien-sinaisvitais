import { create } from "zustand";
import type { Alert, AlertType, StatusClinico, UnitId, VitalAlertResolution } from "@/lib/simulation/types";
import { ALARM_VITAL_KEYS, ALARM_LABEL, ALARM_UNIT, isOutOfAlarmLimit, type AlarmVitalKey } from "@/lib/vitalAlarm";
import { SCORE_STATUS_RANK } from "@/lib/simulation/vitals";

let _alertCounter = 1;
const alertId = () => `alert-${_alertCounter++}`;

// Supressão de re-disparo pro mesmo (internação, parâmetro) — sempre 30min a partir
// do disparo ORIGINAL, não importa como o alerta anterior foi encerrado (normalização
// automática, Ação Tomada ou Falso Positivo). Ver CONTEXT.md § Alertas.
// Exportada pro backfill (computeVitalAlarmBackfill) usar a mesma regra.
export const VITAL_ALERT_COOLDOWN_MS = 30 * 60_000;

// Margem própria do Alerta de Escore (60min, diferente dos 30min do Sinal Vital) pro
// caso de ficar parado na mesma categoria sem piorar nem melhorar.
const SCORE_ALERT_COOLDOWN_MS = 60 * 60_000;

function cooldownKey(internacaoId: string, parametro: AlarmVitalKey): string {
  return `${internacaoId}:${parametro}`;
}

interface AlertState {
  active: Alert[];
  history: Alert[];
  // Supressão pendente por (internação, parâmetro): valor = firedAt do alerta
  // original. Setada sempre que um alerta desse parâmetro encerra — normalização
  // automática, Ação Tomada ou Falso Positivo, sem distinção. Só expira pelo tempo
  // (30min), nunca é invalidada por uma leitura normal no meio do caminho.
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
  // `now` é o relógio SIMULADO (timestamp da leitura mais recente), nunca
  // Date.now() — senão o firedAt do alerta desalinha do bucket que o gráfico usa
  // pra plotar, e o valor mostrado no marcador diverge do ponto onde ele aparece.
  checkVitalAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      vitals: Record<AlarmVitalKey, number>;
    }>,
    now: number
  ) => void;

  // Called by SimulationProvider on each tick com o Status Clínico atual (calculado
  // sobre a Janela de Escore) por internação — dispara/auto-encerra o Alerta de Escore
  // por transição de categoria. `now` também é o relógio simulado. Ver CONTEXT.md § Alertas.
  checkScoreAlerts: (
    internacoes: Array<{
      id: string;
      patientName: string;
      bedLabel: string;
      unit: UnitId;
      status: StatusClinico;
      ewsTotal: number;
    }>,
    now: number
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

  // Encerra um alerta de sinal-vital por ação humana (Ação Tomada ou Falso Positivo)
  // — os dois abrem a mesma supressão de 30min pro mesmo parâmetro, sem distinção.
  resolveVitalAlert: (alertId: string, resolvedAs: VitalAlertResolution) => void;

  // Seed all demo alert types at app startup (called once by SimulationProvider)
  seedDemoAlerts: (items: Array<Omit<Alert, "id" | "firedAt" | "status">>) => void;

  // Backfill de Alerta de Escore: recria retroativamente os que teriam disparado
  // dentro do histórico já semeado (buildHistory pré-popula até 62h antes do motor
  // de alerta existir pra ver ao vivo — sem isso o gráfico mostra piora sem marcador).
  // Cada item já vem com firedAt/status definidos (computeScoreTransitionHistory),
  // só falta o id. Ver CONTEXT.md § Alertas.
  seedBackfilledScoreAlerts: (items: Array<Omit<Alert, "id">>) => void;

  // Mesma ideia pro Alerta de Sinal Vital Crítico (computeVitalAlarmBackfill, em
  // lib/vitalAlarm.ts). Além dos alertas em si, semeia a supressão pendente por
  // (internação, parâmetro) que ainda não completou 30min no fim do histórico — sem
  // isso o primeiro tick ao vivo poderia disparar de novo antes da hora.
  seedBackfilledVitalAlerts: (
    items: Array<Omit<Alert, "id">>,
    pendingCooldowns: Array<{ internacaoId: string; parametro: AlarmVitalKey; since: number }>
  ) => void;

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

  checkVitalAlerts(internacoes, now) {
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
            // Já ativo — nunca duplica. Se normalizar sozinho, encerra e abre os
            // 30min de supressão a partir do disparo original, igual a qualquer
            // outra forma de encerramento — ver resolveVitalAlert.
            if (!outOfRange) {
              const [cleared] = stillActive.splice(activeIdx, 1);
              toHistory.push({ ...cleared, status: "auto-cleared", dismissedAt: now });
              cooldowns.set(ckKey, cleared.firedAt);
            }
            continue;
          }

          if (!outOfRange) continue; // normal, sem alerta ativo — nada a fazer

          // Fora do limite, sem alerta ativo — supressão de 30min desde o disparo
          // original, sempre, não importa como o alerta anterior encerrou.
          const pendingSince = cooldowns.get(ckKey);
          if (pendingSince != null) {
            if (now - pendingSince < VITAL_ALERT_COOLDOWN_MS) continue; // ainda suprimido
            cooldowns.delete(ckKey); // supressão completou — libera disparo
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

  checkScoreAlerts(internacoes, now) {
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

      // Ação Tomada ou Falso Positivo — sem distinção, os 30min de supressão
      // sempre abrem a partir do disparo original. Ver CONTEXT.md § Alertas.
      const cooldowns = new Map(state._cooldowns).set(
        cooldownKey(target.internacaoId, target.parametro),
        target.firedAt
      );

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

  seedBackfilledVitalAlerts(items, pendingCooldowns) {
    set((state) => {
      const withIds: Alert[] = items.map((item) => ({ ...item, id: alertId() }));
      const historyItems = withIds.filter((a) => a.status !== "active");
      // Nunca duplica um Alerta de Sinal Vital já ativo pro mesmo (internação,
      // parâmetro) — pode acontecer se um dos alertas de demo roteirizados
      // (seedDemoAlerts) já cobrir esse parâmetro. Só o histórico sempre entra.
      const activeItems = withIds.filter(
        (a) =>
          a.status === "active" &&
          !state.active.some(
            (x) => x.type === "sinal-vital" && x.internacaoId === a.internacaoId && x.parametro === a.parametro
          )
      );
      const merged = [...state.active, ...activeItems];

      const cooldowns = new Map(state._cooldowns);
      for (const c of pendingCooldowns) {
        cooldowns.set(cooldownKey(c.internacaoId, c.parametro), c.since);
      }

      return {
        active: merged,
        history: [...state.history, ...historyItems],
        activeCount: merged.length,
        _cooldowns: cooldowns,
      };
    });
  },

  getAlertsForInternacao(internacaoId) {
    return get().active.filter((a) => a.internacaoId === internacaoId);
  },
}));
