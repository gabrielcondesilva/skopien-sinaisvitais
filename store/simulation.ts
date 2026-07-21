import { create } from "zustand";
import { buildSeed } from "@/lib/simulation/seed";
import { nextReading, currentSlotValues, computeSlots, CARD_SLOT_MINUTES } from "@/lib/simulation/vitals";
import { calculateEWS } from "@/lib/ews";
import type { Bed, Internacao, SurgicalInternacao, SlotReading, UnitId, NivelConsciencia, RawReading } from "@/lib/simulation/types";

// Deve cobrir a maior Janela selecionável na aba Sinais Vitais (62h, ver "Janela estendida")
const HISTORY_RETENTION_MS = 62 * 60 * 60 * 1000;

// Returned by checkScenes for each alert that should fire
export interface SceneAlert {
  type: "medicacao" | "alta";
  internacaoId: string;
  patientName: string;
  bedLabel: string;
  unit: UnitId;
  message: string;
}

interface SimulationState {
  beds: Bed[];
  internacoes: Record<string, Internacao | SurgicalInternacao>;
  startedAt: number;
  tick: number;
  lastUpdated: number;
  firedScenes: number[];

  advance: () => void;
  checkScenes: () => SceneAlert[];
  setNivelConsciencia: (internacaoId: string, nc: NivelConsciencia) => void;

  getBedsForUnit: (unit: string) => Bed[];
  getInternacao: (id: string) => Internacao | SurgicalInternacao | null;
  getSlots: (internacaoId: string, slotMinutes: number, windowMs: number) => SlotReading[];
  getCurrentVitals: (internacaoId: string, slotMinutes: number) => ReturnType<typeof currentSlotValues>;
}

function initState() {
  return { ...buildSeed(), startedAt: Date.now(), tick: 0, lastUpdated: Date.now(), firedScenes: [] as number[] };
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  ...initState(),

  advance() {
    const now = Date.now();
    const cutoff = now - HISTORY_RETENTION_MS;

    set((state) => {
      const updated: Record<string, Internacao | SurgicalInternacao> = {};

      for (const [id, internacao] of Object.entries(state.internacoes)) {
        const prev = internacao.rawHistory[internacao.rawHistory.length - 1];
        const next = nextReading(prev, internacao.baseline);

        const trimmed = internacao.rawHistory.filter((r) => r.t >= cutoff);
        trimmed.push(next);

        // Card/badge EWS reflete a última leitura válida do Slot Temporal, nunca o valor instantâneo
        const cardCurrent = currentSlotValues(trimmed, CARD_SLOT_MINUTES, now);
        const ews = calculateEWS(cardCurrent);
        updated[id] = {
          ...internacao,
          rawHistory: trimmed,
          currentEws: ews.total,
          currentStatus: ews.status,
        };
      }

      return { internacoes: updated, tick: state.tick + 1, lastUpdated: now };
    });
  },

  // Edição manual do enfermeiro/médico via AVPU (Alerta/Confuso/Responde à Dor/Inconsciente).
  // Atualiza o baseline (pra próximas leituras simuladas seguirem o novo valor) e registra
  // uma leitura imediata, já que NC é avaliação pontual — não sofre random walk.
  setNivelConsciencia(internacaoId, nc) {
    set((state) => {
      const internacao = state.internacoes[internacaoId];
      if (!internacao) return state;

      const now = Date.now();
      const last = internacao.rawHistory[internacao.rawHistory.length - 1];
      const reading: RawReading = last
        ? { ...last, t: now, nc }
        : { t: now, fr: internacao.baseline.fr, spo2: internacao.baseline.spo2, pas: internacao.baseline.pas, fc: internacao.baseline.fc, temp: internacao.baseline.temp, nc };

      const current = currentSlotValues([...internacao.rawHistory, reading], CARD_SLOT_MINUTES, now);
      const ews = calculateEWS(current);

      return {
        internacoes: {
          ...state.internacoes,
          [internacaoId]: {
            ...internacao,
            baseline: { ...internacao.baseline, nc },
            rawHistory: [...internacao.rawHistory, reading],
            currentEws: ews.total,
            currentStatus: ews.status,
          },
        },
      };
    });
  },

  checkScenes() {
    const state = get();
    const elapsed = Date.now() - state.startedAt;
    const already = new Set(state.firedScenes);
    const toFire: SceneAlert[] = [];
    const now = Date.now();
    let stateChanged = false;
    const internacoesCopy = { ...state.internacoes };

    function bed(label: string, unit: UnitId) {
      return state.beds.find((b) => b.label === label && b.unit === unit);
    }

    // ── Cena 1 (~5 min): UTI-01 baseline shifts to critical range ──────────────
    if (!already.has(1) && elapsed >= 4.5 * 60_000) {
      already.add(1);
      const b = bed("UTI-01", "uti");
      if (b?.internacaoId) {
        const inv = internacoesCopy[b.internacaoId];
        if (inv) {
          internacoesCopy[b.internacaoId] = {
            ...inv,
            baseline: { fr: 29, spo2: 87, pas: 88, fc: 138, temp: 38.9, nc: "Confuso" },
          };
          stateChanged = true;
        }
      }
    }

    // ── Cena 2 (~8 min): ENF-01 delayed medication alert ──────────────────────
    if (!already.has(2) && elapsed >= 7.5 * 60_000) {
      already.add(2);
      const b = bed("ENF-01", "enfermaria");
      if (b?.internacaoId) {
        const inv = internacoesCopy[b.internacaoId];
        if (inv) {
          toFire.push({
            type: "medicacao",
            internacaoId: b.internacaoId,
            patientName: inv.patient.name,
            bedLabel: b.label,
            unit: inv.unit,
            message: "Furosemida 40mg — prevista 08:00 — não confirmada",
          });
        }
      }
    }

    // Cena 3 removida — Previsão de Alta não se aplica ao Pronto Socorro

    // ── Cena 4 (~15 min): CC01 advances Procedimento → RA ────────────────────
    if (!already.has(4) && elapsed >= 14.5 * 60_000) {
      already.add(4);
      const b = bed("CC01", "centro-cirurgico");
      if (b?.internacaoId) {
        const inv = internacoesCopy[b.internacaoId];
        if (inv && "surgicalFlow" in inv) {
          const si = inv as SurgicalInternacao;
          if (si.currentStep === 1) {
            const updatedFlow = si.surgicalFlow.map((step, i) => {
              if (i === 1) return { ...step, completedAt: now };
              if (i === 2) return { ...step, startedAt: now };
              return step;
            });
            internacoesCopy[b.internacaoId] = {
              ...si,
              surgicalFlow: updatedFlow,
              currentStep: 2,
            };
            stateChanged = true;
          }
        }
      }
    }

    if (already.size > state.firedScenes.length) {
      if (stateChanged) {
        set({ internacoes: internacoesCopy, firedScenes: Array.from(already) });
      } else {
        set({ firedScenes: Array.from(already) });
      }
    }

    return toFire;
  },

  getBedsForUnit(unit) {
    return get().beds.filter((b) => b.unit === unit);
  },

  getInternacao(id) {
    return get().internacoes[id] ?? null;
  },

  getSlots(internacaoId, slotMinutes, windowMs) {
    const internacao = get().internacoes[internacaoId];
    if (!internacao) return [];
    return computeSlots(internacao.rawHistory, slotMinutes, windowMs, Date.now());
  },

  getCurrentVitals(internacaoId, slotMinutes) {
    const internacao = get().internacoes[internacaoId];
    if (!internacao) return { t: Date.now(), fr: 0, spo2: 0, pas: 0, fc: 0, temp: 0, nc: "Alerta" };
    return currentSlotValues(internacao.rawHistory, slotMinutes, Date.now());
  },
}));
