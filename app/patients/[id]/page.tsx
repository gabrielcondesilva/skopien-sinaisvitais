"use client";

import { use, useState, useEffect, useLayoutEffect, useRef, Fragment } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { VitalCard } from "@/components/VitalCard";
import { VitalsHeatmap } from "@/components/VitalsHeatmap";
import { ReorderableVitalsCharts } from "@/components/ReorderableVitalsCharts";
import { EWSForecastChart } from "@/components/EWSForecastChart";
import { CameraPlayer } from "@/components/CameraPlayer";
import { FloatingCameraWindow } from "@/components/FloatingCameraWindow";
import { SkinLesionTab, LESION_COUNT } from "@/components/SkinLesionTab";
import { MedicationTab, MEDICATION_ALERT_COUNT } from "@/components/MedicationTab";
import { PatientRecordPanel } from "@/components/PatientRecordPanel";
import { ScorePill, BRADEN_COLOR } from "@/components/BedCard";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Icon } from "@/components/ui/Icon";
import { StreamlineIcon, type IconName } from "@/components/ui/StreamlineIcon";
import { useSimulationStore } from "@/store/simulation";
import { useSidebarStore } from "@/store/sidebar";
import { useAlertStore } from "@/store/alerts";
import { useAuthStore } from "@/store/auth";
import { computeSlots, currentSlotValues, currentScoreVitals, computeScoreHistory, SCORE_WINDOW_MINUTES } from "@/lib/simulation/vitals";
import { calculateEWS } from "@/lib/ews";
import { vitalSeverity } from "@/lib/vitalSeverity";
import { ALARM_LABEL, alarmIconFor, type AlarmVitalKey } from "@/lib/vitalAlarm";
import { UTI_TIPO_LABELS } from "@/lib/units";
import type { Internacao, SurgicalInternacao, NivelConsciencia, Bed, Alert, SlotReading } from "@/lib/simulation/types";

const NC_OPTIONS: readonly NivelConsciencia[] = ["Alerta", "Confuso", "Responde à Dor", "Inconsciente"];

// ─── Shared config ────────────────────────────────────────────────────────────

const UNIT_LABELS: Record<string, string> = {
  "pronto-socorro":    "Pronto Socorro",
  "enfermaria":        "Enfermaria",
  "uti":               "UTI",
  "centro-cirurgico":  "Centro Cirúrgico",
};

function bedUnitLabel(bed: Bed | null, unit: string): string {
  if (!bed) return UNIT_LABELS[unit] ?? unit;
  const number = bed.label.match(/(\d+)$/)?.[0] ?? bed.label;
  const noun = unit === "centro-cirurgico" ? "Sala" : "Leito";
  const unitLabel = unit === "uti" && bed.utiTipo ? UTI_TIPO_LABELS[bed.utiTipo] : UNIT_LABELS[unit] ?? unit;
  return `${unitLabel} - ${noun} ${number}`;
}

function formatElapsed(admittedAt: number): string {
  const totalMin = Math.floor((Date.now() - admittedAt) / 60_000);
  const h = Math.floor(totalMin / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h`;
  return `${totalMin}min`;
}

function formatAdmissionDate(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

// Default de Slot/Janela por modo de exibição dos gráficos (Antonio) — janela igual, só o slot muda
const CHART_LAYOUT_DEFAULTS = {
  linha:  { slotMin: 15, windowMs: 21_600_000 }, // 6h
  matriz: { slotMin: 30, windowMs: 21_600_000 }, // 6h
} as const;

// Gráfico de Early Warning Score (aba Sinais Vitais) não segue o Slot escolhido —
// é sempre a Janela de Escore (30min/mediana). A Janela dele só aumenta a partir de
// um mínimo de 3h, nunca reduz abaixo disso, mesmo que o usuário escolha uma Janela
// menor pros demais gráficos. Ver CONTEXT.md § Janela de Escore.
const EWS_CHART_MIN_WINDOW_MS = 3 * 3_600_000;

const SLOT_OPTS = [
  { label: "1min", min: 1 },
  { label: "5min", min: 5 },
  { label: "15min", min: 15 },
  { label: "30min", min: 30 },
  { label: "1h", min: 60 },
] as const;
const WINDOW_OPTS = [
  { label: "15min", ms:    900_000 },
  { label: "30min", ms:  1_800_000 },
  { label: "1h",     ms:  3_600_000 },
  { label: "3h",     ms: 10_800_000 },
  { label: "6h",     ms: 21_600_000 },
] as const;

const VITALS = [
  { key: "fr"   as const, label: "FR",   unit: "rpm"  },
  { key: "spo2" as const, label: "SpO₂", unit: "%"    },
  { key: "pas"  as const, label: "PAS",  unit: "mmHg" },
  { key: "fc"   as const, label: "FC",   unit: "bpm"  },
  { key: "temp" as const, label: "TEMP", unit: "°C"   },
  { key: "nc"   as const, label: "NC",   unit: ""     },
] as const;

// SpO2 não entra no Escore MEWS — sem pontuação associada, sempre exibido neutro
function scoreOf(scores: { fr: number; pas: number; fc: number; temp: number; nc: number }, key: string): number {
  return key === "spo2" ? 0 : (scores as Record<string, number>)[key] ?? 0;
}

const ALERT_TYPE_LABEL: Record<string, string> = {
  escore: "Escore",
  medicacao: "Medicação Atrasada",
  alta: "Previsão de Alta",
};

// Resumo exibido no gráfico de EWS ao passar o mouse na bolinha vermelha — recebe
// só os Alertas de Escore (filtrados na chamada), cada gráfico mostra o próprio
// alerta. Sinal vital por parâmetro é papel de buildVitalAlertSlotMap, usado nos
// gráficos de vitais.
function buildAlertSlotLabels(alerts: Alert[], slots: SlotReading[], slotMin: number): Map<number, string> {
  const slotMs = slotMin * 60_000;
  const bySlot = new Map<number, Alert[]>();
  for (const a of alerts) {
    // firedAt cai dentro do bucket que acabou de fechar quando o alerta disparou
    // (ao vivo, alguns segundos depois do fechamento; no backfill, exatamente no
    // fechamento). Math.floor já aponta pro fechamento desse bucket — que é
    // numericamente igual ao t (fechamento) do ponto correspondente em ewsSlots,
    // sem precisar somar nada. Ver computeScoreHistory.
    const bucket = Math.floor(a.firedAt / slotMs) * slotMs;
    const arr = bySlot.get(bucket);
    if (arr) arr.push(a); else bySlot.set(bucket, [a]);
  }

  const labels = new Map<number, string>();
  for (const slot of slots) {
    const here = bySlot.get(slot.t);
    if (!here?.length) continue;

    const parts: string[] = [];
    for (const a of here) {
      const label = a.type === "sinal-vital" && a.parametro
        ? ALARM_LABEL[a.parametro]
        : (ALERT_TYPE_LABEL[a.type] ?? "Alerta");
      if (!parts.includes(label)) parts.push(label);
    }

    labels.set(slot.t, `Alerta - ${parts.join(" · ")}`);
  }
  return labels;
}

// Marca em qual slot exibido cada alerta de Sinal Vital caiu, por parâmetro — usado
// pra piscar só no gráfico responsável, com o valor e horário reais do disparo
// (CONTEXT.md § Alertas), independente da granularidade (slotMin) escolhida na tela.
function buildVitalAlertSlotMap(
  alerts: Alert[],
  slots: SlotReading[],
  slotMin: number
): Partial<Record<AlarmVitalKey, Map<number, Alert>>> {
  const slotMs = slotMin * 60_000;
  const result: Partial<Record<AlarmVitalKey, Map<number, Alert>>> = {};

  for (const a of alerts) {
    if (a.type !== "sinal-vital" || !a.parametro) continue;
    const bucket = Math.floor(a.firedAt / slotMs) * slotMs;
    if (!slots.some((s) => s.t === bucket)) continue;
    const map = result[a.parametro] ?? new Map<number, Alert>();
    map.set(bucket, a); // slot exibido largo com 2 alertas do mesmo parâmetro: fica o mais recente
    result[a.parametro] = map;
  }

  return result;
}

const STATUS_COLOR: Record<string, string> = {
  "Estável":       "#2F9E44",
  "Atenção":       "#F59F00",
  "Risco Elevado": "#F76707",
  "Crítico":       "#F03E3E",
};

const SCORE_COLOR = [
  "var(--status-stable)",
  "var(--status-attention)",
  "var(--status-elevated)",
  "var(--status-critical)",
];

const MANCHESTER_STYLE: Record<string, { bg: string; text: string }> = {
  "Vermelho": { bg: "#ef444420", text: "#ef4444" },
  "Laranja":  { bg: "#f9731620", text: "#f97316" },
  "Amarelo":  { bg: "#eab30820", text: "#eab308" },
  "Verde":    { bg: "#22c55e20", text: "#22c55e" },
  "Azul":     { bg: "#3b82f620", text: "#3b82f6" },
};

function probColor(p: number): string {
  if (p >= 70) return "var(--status-elevated)";
  if (p >= 50) return "var(--status-attention)";
  return "var(--status-stable)";
}

// ─── Selector button ─────────────────────────────────────────────────────────

function SelBtn({ active, onClick, disabled, children }: {
  active?: boolean; onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs px-2.5 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      style={{
        background: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
        color: active ? "#fff" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Shared controls bar (slot + window) ─────────────────────────────────────

function ControlsBar({ slotMin, setSlotMin, windowMs, setWindowMs, view, setView, showViewToggle, legend }: {
  slotMin: number;
  setSlotMin: (v: number) => void;
  windowMs: number;
  setWindowMs: (v: number) => void;
  view: "graficos" | "heatmap";
  setView: (v: "graficos" | "heatmap") => void;
  showViewToggle: boolean;
  legend?: React.ReactNode;
}) {
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [windowPickerOpen, setWindowPickerOpen] = useState(false);

  const EXTENDED_WINDOW_MS = [12, 24, 36, 48, 62].map((h) => h * 3_600_000);
  const isExtended = EXTENDED_WINDOW_MS.includes(windowMs);

  const isCustomSlot = !SLOT_OPTS.some((o) => o.min === slotMin);

  return (
    <div
      className="flex items-center gap-8 px-6 py-3 flex-wrap"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {showViewToggle && (
        <div className="flex items-center gap-1.5">
          <SelBtn active={view === "graficos"} onClick={() => setView("graficos")}>Gráficos</SelBtn>
          <SelBtn active={view === "heatmap"}  onClick={() => setView("heatmap")}>Heatmap</SelBtn>
        </div>
      )}

      <div
        className="flex items-center gap-1.5"
        style={showViewToggle ? { paddingLeft: 28, borderLeft: "1px solid var(--border)" } : undefined}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Slot</span>
        {SLOT_OPTS.map((o) => (
          <SelBtn key={o.min} active={slotMin === o.min} onClick={() => setSlotMin(o.min)}>
            {o.label}
          </SelBtn>
        ))}

        {/* Escolher Slot button + dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setSlotPickerOpen((v) => !v)}
            className="text-xs px-2.5 py-1 rounded transition-colors"
            style={{
              background: isCustomSlot ? "rgba(77,171,247,0.15)" : "rgba(255,255,255,0.06)",
              color: isCustomSlot ? "#4DABF7" : "var(--muted)",
              border: `1px solid ${isCustomSlot ? "rgba(77,171,247,0.4)" : "var(--border)"}`,
            }}
          >
            {isCustomSlot ? `${slotMin >= 60 ? `${slotMin / 60}h` : `${slotMin}min`}` : "Outros"}
          </button>

          {slotPickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 50,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 4,
                width: 196,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 10,
                  color: "var(--muted)",
                  marginBottom: 4,
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Outros (hora em hora, 2h–24h)
              </div>
              {Array.from({ length: 23 }, (_, i) => {
                const hVal = i + 2;
                const mVal = hVal * 60;
                const active = slotMin === mVal;
                return (
                  <button
                    key={mVal}
                    onClick={() => { setSlotMin(mVal); setSlotPickerOpen(false); }}
                    className="text-xs py-1 rounded transition-colors"
                    style={{
                      background: active ? "rgba(77,171,247,0.2)" : "rgba(255,255,255,0.05)",
                      color: active ? "#4DABF7" : "var(--foreground)",
                      border: `1px solid ${active ? "rgba(77,171,247,0.4)" : "transparent"}`,
                    }}
                  >
                    {hVal}h
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1.5"
        style={{ paddingLeft: 28, borderLeft: "1px solid var(--border)" }}
      >
        <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>Janela</span>
        {WINDOW_OPTS.map((o) => (
          <SelBtn key={o.ms} active={windowMs === o.ms} onClick={() => setWindowMs(o.ms)}>
            {o.label}
          </SelBtn>
        ))}

        {/* Escolher Janela button + dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setWindowPickerOpen((v) => !v)}
            className="text-xs px-2.5 py-1 rounded transition-colors"
            style={{
              background: isExtended ? "rgba(77,171,247,0.15)" : "rgba(255,255,255,0.06)",
              color: isExtended ? "#4DABF7" : "var(--muted)",
              border: `1px solid ${isExtended ? "rgba(77,171,247,0.4)" : "var(--border)"}`,
            }}
          >
            {isExtended ? `${Math.round(windowMs / 3_600_000)}h` : "Escolher Janela"}
          </button>

          {windowPickerOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 50,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                width: 120,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  marginBottom: 4,
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Janela estendida
              </div>
              {[12, 24, 36, 48, 62].map((h) => {
                const ms = h * 3_600_000;
                const active = windowMs === ms;

                return (
                  <button
                    key={h}
                    onClick={() => { setWindowMs(ms); setWindowPickerOpen(false); }}
                    className="text-xs py-1.5 rounded transition-colors"
                    style={{
                      background: active ? "rgba(77,171,247,0.2)" : "rgba(255,255,255,0.05)",
                      color: active ? "#4DABF7" : "var(--foreground)",
                      border: `1px solid ${active ? "rgba(77,171,247,0.4)" : "transparent"}`,
                    }}
                  >
                    {h}h
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {legend && <div className="flex items-center ml-auto">{legend}</div>}
    </div>
  );
}

// ─── Tab: Sinais Vitais ───────────────────────────────────────────────────────

// Enfermaria (Antonio): em vez de uma altura fixa pequena, os 6 gráficos (2x3)
// preenchem o espaço vertical realmente disponível na tela do usuário — numa
// notebook maior isso significa gráficos maiores, não sobra em branco embaixo.
const ENFERMARIA_GRID_ROWS = 3;
const ENFERMARIA_GRID_ROW_GAP = 8; // gap-2
const ENFERMARIA_CARD_CHROME = 34; // padding + linha de título de cada card, fora do chart em si
const ENFERMARIA_CHART_MIN_HEIGHT = 85;
const ENFERMARIA_CHART_MAX_HEIGHT = 220;

function useEnfermariaChartHeight(enabled: boolean) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(ENFERMARIA_CHART_MIN_HEIGHT);

  useLayoutEffect(() => {
    if (!enabled) return;

    function measure() {
      const el = gridRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - 8; // pequena folga além do pb-6 do container pai
      const perRow = (available - ENFERMARIA_GRID_ROW_GAP * (ENFERMARIA_GRID_ROWS - 1)) / ENFERMARIA_GRID_ROWS;
      const next = Math.min(
        ENFERMARIA_CHART_MAX_HEIGHT,
        Math.max(ENFERMARIA_CHART_MIN_HEIGHT, Math.round(perRow - ENFERMARIA_CARD_CHROME))
      );
      setChartHeight(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [enabled]);

  return { gridRef, chartHeight };
}

function SinaisVitaisTab({ internacao, slotMin, windowMs, view, cardsVisible, chartLayout, alerts, showAlertTimesOnCharts }: {
  internacao: Internacao | SurgicalInternacao;
  slotMin: number;
  windowMs: number;
  view: "graficos" | "heatmap";
  cardsVisible: boolean;
  chartLayout: "linha" | "matriz";
  alerts?: Alert[];
  showAlertTimesOnCharts?: boolean;
}) {
  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");
  const setNivelConsciencia = useSimulationStore((s) => s.setNivelConsciencia);

  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  // A timeline simulada roda mais rápido que o relógio real — janela/slot usam o
  // timestamp da própria leitura mais recente, nunca Date.now(), senão o gráfico
  // desalinha do relógio conforme a sessão avança (ver store/simulation.ts § advance).
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const slots = computeSlots(rawHistory, slotMin, windowMs, simNow);
  // Cartão sempre reflete o último ponto do gráfico (mesmo slot em andamento) — nunca uma leitura bruta à parte
  const current = slots[slots.length - 1] ?? currentSlotValues(rawHistory, slotMin, simNow);
  const ews     = calculateEWS(current);

  // Gráfico de EWS: sempre Janela de Escore (30min/mediana), Janela com mínimo de
  // 3h — nunca segue o Slot escolhido pros demais gráficos.
  const ewsWindowMs = Math.max(windowMs, EWS_CHART_MIN_WINDOW_MS);
  const ewsSlots = computeScoreHistory(rawHistory, ewsWindowMs, simNow);

  // Bucket do horário de cada alerta no slot exibido — só marca no gráfico se o slot
  // correspondente estiver de fato renderizado (dentro da janela escolhida). O gráfico
  // de EWS mostra só Alerta de Escore (bucketado pela Janela de Escore fixa) — cada
  // gráfico mostra o próprio alerta, sinal vital não aparece aqui.
  const ewsAlerts = alerts?.filter((a) => a.type === "escore");
  const alertSlotLabels = showAlertTimesOnCharts && ewsAlerts?.length
    ? buildAlertSlotLabels(ewsAlerts, ewsSlots, SCORE_WINDOW_MINUTES)
    : undefined;
  const vitalAlertSlotMap = showAlertTimesOnCharts && alerts?.length
    ? buildVitalAlertSlotMap(alerts, slots, slotMin)
    : undefined;

  const minMax = Object.fromEntries(
    VITALS.map((v) => {
      if (v.key === "nc") return [v.key, undefined];
      const vals = slots.map((s) => s[v.key]).filter((x) => x != null) as number[];
      return [v.key, vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : undefined];
    })
  ) as Record<string, { min: number; max: number } | undefined>;

  const isMatrix = chartLayout === "matriz";
  const { gridRef, chartHeight } = useEnfermariaChartHeight(isMatrix && view === "graficos");

  return (
    <div className="flex flex-col gap-2">
      {/* Vital cards */}
      {(!isAntonio || cardsVisible) && (
        <div className={isMatrix ? "flex gap-2" : "flex gap-3"}>
          {VITALS.map((v) => (
            <VitalCard
              key={v.key}
              label={v.label}
              unit={v.unit}
              value={current[v.key]}
              score={vitalSeverity(v.key, current[v.key])}
              min={minMax[v.key]?.min}
              max={minMax[v.key]?.max}
              editOptions={v.key === "nc" ? NC_OPTIONS : undefined}
              onEdit={v.key === "nc" ? (nc) => setNivelConsciencia(internacao.id, nc as NivelConsciencia) : undefined}
            />
          ))}
        </div>
      )}

      {/* Linha: gráficos empilhados, largura total. Matriz: grid 2x3 ajustado à página.
          Nos dois casos os gráficos podem ser arrastados e reordenados. */}
      {view === "graficos" ? (
        <div ref={isMatrix ? gridRef : undefined}>
          <ReorderableVitalsCharts
            slots={slots}
            ewsSlots={ewsSlots}
            syncId={`vitals-${internacao.id}`}
            layout={chartLayout}
            compact={isMatrix}
            chartHeight={isMatrix ? chartHeight : undefined}
            alertSlotLabels={alertSlotLabels}
            vitalAlertSlotMap={vitalAlertSlotMap}
          />
        </div>
      ) : (
        <VitalsHeatmap slots={slots} />
      )}
    </div>
  );
}

// ─── Tab: Predição EWS ───────────────────────────────────────────────────────

const EWS_FORECAST_WINDOW_MS = 3 * 3_600_000; // esta aba é sempre 3h histórico + 3h previsão

function EWSTab({ internacao }: {
  internacao: Internacao | SurgicalInternacao;
}) {
  // Histórico do Escore sempre pela Janela de Escore (30min/mediana) — não segue
  // nenhum Slot escolhido nos gráficos de Sinais Vitais. Ver CONTEXT.md § Janela de Escore.
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const slots = computeScoreHistory(rawHistory, EWS_FORECAST_WINDOW_MS, Date.now());

  return (
    <EWSForecastChart
      internacao={internacao}
      slots={slots}
    />
  );
}

// ─── Tab: Predição de Internação ─────────────────────────────────────────────

function InternacaoTab({ internacao }: {
  internacao: Internacao | SurgicalInternacao;
}) {
  // Escore EWS sempre canônico (Janela de Escore, 30min/mediana) — ver CONTEXT.md § Janela de Escore.
  // Usa o timestamp da própria leitura mais recente, não Date.now() (timeline simulada).
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const simNow = rawHistory[rawHistory.length - 1]?.t ?? Date.now();
  const current = currentScoreVitals(rawHistory, simNow);
  const ews = calculateEWS(current);

  const prob  = internacao.admissionProbability;
  const color = probColor(prob);
  const ms    = MANCHESTER_STYLE[internacao.manchesterClass] ?? MANCHESTER_STYLE["Amarelo"];

  const GAUGE_R = 58;
  const CX = 80, CY = 80;
  const CIRC = 2 * Math.PI * GAUGE_R;
  const arc  = (prob / 100) * CIRC;

  const factors: { label: string; value: React.ReactNode }[] = [
    {
      label: "Classificação de Manchester",
      value: (
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ background: ms.bg, color: ms.text }}
        >
          {internacao.manchesterClass}
        </span>
      ),
    },
    {
      label: "Escore EWS atual",
      value: (
        <span style={{ color: STATUS_COLOR[ews.status] ?? "var(--muted)" }}>
          {ews.total}&nbsp;·&nbsp;{ews.status}
        </span>
      ),
    },
    { label: "Idade", value: `${internacao.patient.age} anos` },
    { label: "Gênero", value: internacao.patient.gender === "M" ? "Masculino" : "Feminino" },
    { label: "Motivo de Admissão", value: internacao.patient.admissionReason },
    ...VITALS.map((v) => ({
      label: v.label,
      value: (
        <span style={{ color: SCORE_COLOR[Math.min(scoreOf(ews.scores, v.key), 3)] }}>
          {current[v.key]}&nbsp;{v.unit}
        </span>
      ),
    })),
  ];

  return (
    <div className="flex gap-8 items-start">
      {/* Circular gauge */}
      <div className="flex flex-col items-center gap-4 shrink-0">
        <svg width={160} height={160}>
          <circle cx={CX} cy={CY} r={GAUGE_R} fill="none" stroke="var(--border)" strokeWidth={12} />
          <circle
            cx={CX} cy={CY} r={GAUGE_R}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={34} fontWeight="700" fill={color}>
            {prob}
          </text>
          <text x={CX} y={CY + 16} textAnchor="middle" fontSize={13} fill="#888">
            %
          </text>
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium">Prob. de Internação</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {prob >= 70 ? "Risco elevado" : prob >= 50 ? "Risco moderado" : "Risco baixo"}
          </p>
        </div>
      </div>

      {/* Factors list */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium mb-3">Fatores Contribuintes</p>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {factors.map((f, i) => (
            <div
              key={f.label}
              className="flex items-center justify-between px-4 py-2.5 gap-6"
              style={{
                background: i % 2 === 0 ? "var(--surface)" : "rgba(255,255,255,0.015)",
                borderBottom: i < factors.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span className="text-sm shrink-0" style={{ color: "var(--muted)" }}>{f.label}</span>
              <span className="text-sm font-medium text-right">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Patient alerts modal (Antonio) ──────────────────────────────────────────
// Popup aberto pelo ícone de monitor ao lado da aba Medicamento — mostra os
// alertas ativos e o histórico daquela internação. Sempre abre em "Ativos".

const PATIENT_ALERT_META: Record<string, { icon?: IconName; title: string; color: string }> = {
  "sinal-vital": { icon: "monitor",       title: "Sinal Vital Crítico", color: "var(--status-critical)"  },
  "escore":      { title: "Escore Elevado", color: "var(--status-elevated)" },
  "medicacao":   { icon: "medicacao",     title: "Medicação Atrasada",  color: "var(--status-attention)" },
  "alta":        { icon: "predicao_alta", title: "Previsão de Alta",    color: "var(--accent)"           },
};

// Ícone do alerta de sinal-vital depende do parâmetro (FR = ventilador, demais
// = monitor). Alerta de Escore não tem ícone. Ver CONTEXT.md § Alertas.
function patientAlertIcon(alert: Alert): IconName | undefined {
  if (alert.type === "sinal-vital" && alert.parametro) return alarmIconFor(alert.parametro);
  return PATIENT_ALERT_META[alert.type]?.icon;
}

function formatAlertClock(ts: number): string {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).replace(",", "");
}

function PatientAlertCard({ alert }: { alert: Alert }) {
  const resolveVitalAlert = useAlertStore((s) => s.resolveVitalAlert);
  const meta = PATIENT_ALERT_META[alert.type] ?? { title: "Alerta", color: "var(--muted)" };
  const icon = patientAlertIcon(alert);
  const title = alert.type === "sinal-vital" && alert.parametro
    ? `${ALARM_LABEL[alert.parametro]} Crítica`
    : meta.title;
  const isActiveSinalVital = alert.type === "sinal-vital" && alert.status === "active";
  const statusLabel = alert.status === "active"
    ? `Disparado em ${formatAlertClock(alert.firedAt)}`
    : `${alert.dismissedAt ? `${formatAlertClock(alert.dismissedAt)} · ` : ""}${
        alert.dismissAction ?? (alert.status === "auto-cleared" ? "Normalizado automaticamente" : "Encerrado")
      }`;

  return (
    <div className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-start gap-3">
        {icon && <StreamlineIcon name={icon} size={20} className="mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: meta.color }}>{title}</p>
          <p className="text-xs mt-1 leading-snug">{alert.message}</p>
          <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{statusLabel}</p>
        </div>
      </div>

      {isActiveSinalVital && (
        <div className="flex gap-2 pl-8">
          <button
            onClick={() => resolveVitalAlert(alert.id, "acao-tomada")}
            className="flex-1 text-[11px] py-1 rounded font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Ação Tomada
          </button>
          <button
            onClick={() => resolveVitalAlert(alert.id, "falso-positivo")}
            className="flex-1 text-[11px] py-1 rounded font-medium transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
          >
            Falso Positivo
          </button>
        </div>
      )}
    </div>
  );
}

function PatientAlertsModal({ internacaoId, view, onViewChange, onClose }: {
  internacaoId: string;
  view: "ativos" | "historico";
  onViewChange: (v: "ativos" | "historico") => void;
  onClose: () => void;
}) {
  const active  = useAlertStore(useShallow((s) => s.active.filter((a) => a.internacaoId === internacaoId)));
  const history = useAlertStore(useShallow((s) => s.history.filter((a) => a.internacaoId === internacaoId)));
  const list = view === "ativos" ? active : history;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col rounded-xl overflow-hidden"
        style={{ width: "min(420px, 90vw)", maxHeight: "80vh", background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-semibold">Alertas do Paciente</span>
          <button
            onClick={onClose}
            className="text-sm leading-none hover:opacity-70 transition-opacity"
            style={{ color: "var(--muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-1 px-4 pt-3 shrink-0">
          <button
            onClick={() => onViewChange("ativos")}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
            style={{
              background: view === "ativos" ? "var(--accent)" : "rgba(255,255,255,0.06)",
              color: view === "ativos" ? "#fff" : "var(--muted)",
            }}
          >
            Ativos{active.length > 0 ? ` (${active.length})` : ""}
          </button>
          <button
            onClick={() => onViewChange("historico")}
            className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
            style={{
              background: view === "historico" ? "var(--accent)" : "rgba(255,255,255,0.06)",
              color: view === "historico" ? "#fff" : "var(--muted)",
            }}
          >
            Histórico{history.length > 0 ? ` (${history.length})` : ""}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3">
          {list.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {view === "ativos" ? "Nenhum alerta ativo" : "Nenhum alerta no histórico"}
              </p>
            </div>
          ) : (
            list.map((a) => <PatientAlertCard key={a.id} alert={a} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Patient content ─────────────────────────────────────────────────────────

type Tab = "sinais-vitais" | "ews" | "lesao-pele" | "medicamento" | "internacao";

const TAB_LABELS: Record<Tab, string> = {
  "sinais-vitais": "Sinais Vitais",
  "ews":           "Predição EWS",
  "lesao-pele":    "Lesão de Pele",
  "medicamento":   "Medicamento",
  "internacao":    "Predição de Internação",
};

function PatientContent({ id }: { id: string }) {
  const router = useRouter();

  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");
  const logout    = useAuthStore((s) => s.logout);
  const active    = useAlertStore((s) => s.active);
  const history   = useAlertStore((s) => s.history);

  const internacao = useSimulationStore((s) => s.internacoes[id] ?? null);
  const bed = useSimulationStore((s) => s.beds.find((b) => b.internacaoId === id) ?? null);

  // Enfermaria (Antonio): abre direto no layout Matriz (grade compacta) — ver CHART_LAYOUT_DEFAULTS
  const isEnfermariaCompact = isAntonio && internacao?.unit === "enfermaria";

  const [tab, setTab]                 = useState<Tab>("sinais-vitais");
  const [slotMin, setSlotMin]         = useState<number>(() => CHART_LAYOUT_DEFAULTS[isEnfermariaCompact ? "matriz" : "linha"].slotMin);
  const [windowMs, setWindowMs]       = useState<number>(() => CHART_LAYOUT_DEFAULTS[isEnfermariaCompact ? "matriz" : "linha"].windowMs);
  const [view, setView]               = useState<"graficos" | "heatmap">("graficos");
  const [chartLayout, setChartLayout] = useState<"linha" | "matriz">(() => isEnfermariaCompact ? "matriz" : "linha");
  const [cardsVisible, setCardsVisible] = useState(true);
  const [camOpen, setCamOpen]         = useState(false);
  const [camFullscreen, setCamFullscreen] = useState(false);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [recordPanel, setRecordPanel] = useState<null | "exames" | "prontuario">(null);
  // Mostra o horário dos alertas do paciente sobreposto nos gráficos — só visual por enquanto
  const [showAlertTimesOnCharts, setShowAlertTimesOnCharts] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [alertsModalView, setAlertsModalView] = useState<"ativos" | "historico">("ativos");

  if (!internacao) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Internação não encontrada.</p>
      </div>
    );
  }

  // Escore EWS sempre canônico (Janela de Escore, 30min/mediana) — nunca segue o
  // Slot/Janela escolhidos nos gráficos de Sinais Vitais. Ver CONTEXT.md § Janela de Escore.
  const statusColor = STATUS_COLOR[internacao.currentStatus] ?? "var(--muted)";
  const proxyUrl = process.env.NEXT_PUBLIC_CAMERA_PROXY_URL;
  const isLiveCamera = bed?.label === "UTI-01" && !!proxyUrl;
  const streamUrl = `${proxyUrl}/stream/index.m3u8`;
  const activeAlertCount = active.filter((a) => a.unit === internacao.unit).length;
  const patientAlerts = [
    ...active.filter((a) => a.internacaoId === internacao.id),
    ...history.filter((a) => a.internacaoId === internacao.id),
  ];
  const patientAlertCount = patientAlerts.length;

  const metaItems = [
    `${internacao.patient.age} anos`,
    internacao.patient.gender === "M" ? "Masculino" : "Feminino",
    internacao.patient.admissionReason,
    `Admissão: ${formatAdmissionDate(internacao.patient.admittedAt)}`,
  ];
  const ADMISSION_REASON_INDEX = 2;

  // Antonio: diagnóstico sai do fluxo de texto e vira um badge centralizado, alinhado com o Escore EWS
  const antonioMetaItems = metaItems.filter((_, i) => i !== ADMISSION_REASON_INDEX);
  const bedUnitText = bedUnitLabel(bed, internacao.unit);

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: "var(--background)" }}>

      {isAntonio ? (
        /* ── Antonio: header compacto (sem TopBar) — ganha espaço vertical de tela ── */
        <div className="px-6 pt-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Linha 1: identidade do paciente + Escore EWS (centralizado na página) + controles de perfil */}
          <div className="relative flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => router.push(`/units/${internacao.unit}`)}
                className="text-base hover:opacity-70 transition-opacity shrink-0"
                style={{ color: "var(--muted)" }}
                aria-label={`Voltar para ${UNIT_LABELS[internacao.unit] ?? internacao.unit}`}
              >
                ←
              </button>
              <h1 className="text-xl font-semibold">{internacao.patient.name}</h1>
              <span className="text-sm" style={{ color: "var(--muted)" }}>{bedUnitText}</span>
            </div>

            {/* Escore EWS — centralizado na página (mesma referência horizontal do diagnóstico na linha de baixo) */}
            <div
              className="absolute flex items-center gap-3"
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              <ScorePill text={`EWS ${internacao.currentEws} - ${internacao.currentStatus}`} color={statusColor} size="md" />

              {/* Braden — apenas para UTI-01 */}
              {bed?.label === "UTI-01" && (
                <ScorePill
                  text="Braden 10 - Alto"
                  color={BRADEN_COLOR["Alto"]}
                  onClick={() => setTab("lesao-pele")}
                  size="md"
                />
              )}
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm" style={{ color: "var(--muted)" }}>
                <Icon name="user-circle" size={15} color="currentColor" />
                <span className="text-xs">Profissional Assistencial</span>
              </div>

              <button
                onClick={() => setPanelOpen(true)}
                aria-label="Abrir painel de alertas"
                className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                  activeAlertCount > 0 ? "sk-alert-blink" : "hover:bg-white/5"
                }`}
                style={{ color: activeAlertCount > 0 ? "var(--status-critical)" : "var(--muted)" }}
              >
                <Icon name="bell-ringing" size={17} color="currentColor" />
                {activeAlertCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                    style={{ background: "var(--status-critical)", color: "#fff" }}
                  >
                    {activeAlertCount > 99 ? "99+" : activeAlertCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { logout(); router.replace("/login"); }}
                aria-label="Sair da sessão"
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--muted)" }}
              >
                <Icon name="logout" size={17} color="currentColor" />
              </button>
            </div>
          </div>

          {/* Linha 2: metadados (idade, gênero, admissão, tempo internado) + Exames / Prontuário / Câmera.
              Diagnóstico vira um badge à parte, centralizado bem embaixo do Escore EWS. */}
          <div className="relative flex items-center justify-between gap-3 flex-wrap mt-1.5 pl-6">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm" style={{ color: "var(--muted)" }}>
              {antonioMetaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span>·</span>}
                  <span>{item}</span>
                </span>
              ))}
              {internacao.unit !== "pronto-socorro" && (
                <span className="flex items-center gap-1.5">
                  <span>·</span>
                  <span style={{ color: "var(--foreground)" }}>
                    ⏱ Internado há {formatElapsed(internacao.patient.admittedAt)}
                  </span>
                </span>
              )}
            </div>

            <span
              className="absolute text-lg font-bold whitespace-nowrap"
              style={{ left: "50%", transform: "translateX(-50%)", color: "var(--accent)" }}
            >
              {internacao.patient.admissionReason}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setRecordPanel((p) => (p === "exames" ? null : "exames"))}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: recordPanel === "exames" ? "var(--accent)" : "rgba(255,255,255,0.06)",
                  color: recordPanel === "exames" ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="flask" size={14} color="currentColor" />
                Exames
              </button>
              <button
                onClick={() => setRecordPanel((p) => (p === "prontuario" ? null : "prontuario"))}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: recordPanel === "prontuario" ? "var(--accent)" : "rgba(255,255,255,0.06)",
                  color: recordPanel === "prontuario" ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="file-text" size={14} color="currentColor" />
                Prontuário
              </button>
              <button
                onClick={() => setCamFullscreen(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)", border: "1px solid var(--border)" }}
              >
                <Icon name="video" size={14} color="currentColor" />
                Câmera
                {isLiveCamera && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--status-stable)" }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--status-stable)" }} />
                    LIVE
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Patient header ── */}
          <div className="px-6 pt-4 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            {/* Name + EWS badge */}
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <button
                onClick={() => router.push(`/units/${internacao.unit}`)}
                className="text-base hover:opacity-70 transition-opacity shrink-0"
                style={{ color: "var(--muted)" }}
                aria-label={`Voltar para ${UNIT_LABELS[internacao.unit] ?? internacao.unit}`}
              >
                ←
              </button>
              <h1 className="text-xl font-semibold">{internacao.patient.name}</h1>
              <ScorePill text={`EWS ${internacao.currentEws} - ${internacao.currentStatus}`} color={statusColor} size="lg" />

              {/* Badge Braden — apenas para UTI-01 */}
              {bed?.label === "UTI-01" && (
                <ScorePill
                  text="Braden 10 - Alto"
                  color={BRADEN_COLOR["Alto"]}
                  onClick={() => setTab("lesao-pele")}
                  size="lg"
                />
              )}
            </div>

            {/* Compact metadata row */}
            <div
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm pl-6"
              style={{ color: "var(--muted)" }}
            >
              {metaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span>·</span>}
                  <span>{item}</span>
                </span>
              ))}
              {internacao.unit !== "pronto-socorro" && (
                <span className="flex items-center gap-1.5">
                  <span>·</span>
                  <span style={{ color: "var(--foreground)" }}>
                    ⏱ Internado há {formatElapsed(internacao.patient.admittedAt)}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* ── Camera collapsible ── */}
          <div style={{ borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={() => setCamOpen((v) => !v)}
              className="w-full flex items-center justify-between px-6 py-3 text-sm hover:bg-white/[0.02] transition-colors"
              style={{ background: "var(--surface)" }}
            >
              <div className="flex items-center gap-2.5" style={{ color: "var(--muted)" }}>
                <Icon name="video" size={15} color="currentColor" />
                <span>Câmera do {bed?.label ?? "Leito"} — Detecção automática</span>
              </div>
              <div className="flex items-center gap-3">
                {isLiveCamera && (
                  <span
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--status-stable)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "var(--status-stable)" }}
                    />
                    LIVE
                  </span>
                )}
                <Icon
                  name={camOpen ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="var(--muted)"
                />
              </div>
            </button>

            {camOpen && (
              <div
                className="relative overflow-hidden"
                style={{ height: 240, background: "#000" }}
              >
                {isLiveCamera ? (
                  <>
                    <CameraPlayer streamUrl={streamUrl} />
                    <button
                      onClick={() => setCamFullscreen(true)}
                      className="absolute bottom-3 right-3 text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                      style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
                    >
                      ⛶ Expandir
                    </button>
                  </>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                    style={{ color: "var(--muted)" }}
                  >
                    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <span className="text-xs">Câmera Indisponível</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {alertsModalOpen && (
        <PatientAlertsModal
          internacaoId={internacao.id}
          view={alertsModalView}
          onViewChange={setAlertsModalView}
          onClose={() => setAlertsModalOpen(false)}
        />
      )}

      {/* Camera fullscreen modal */}
      {camFullscreen && isLiveCamera && (
        isAntonio ? (
          <FloatingCameraWindow
            streamUrl={streamUrl}
            bedLabel={bed?.label}
            onClose={() => setCamFullscreen(false)}
          />
        ) : (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setCamFullscreen(false)}
          >
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ width: "min(900px, 90vw)", aspectRatio: "16/9" }}
              onClick={(e) => e.stopPropagation()}
            >
              <CameraPlayer streamUrl={streamUrl} />
              <button
                onClick={() => setCamFullscreen(false)}
                className="absolute top-3 right-3 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-opacity hover:opacity-80"
                style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
              >
                ✕
              </button>
            </div>
          </div>
        )
      )}

      {/* ── Tab nav ── */}
      <div className="flex items-center px-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {(Object.keys(TAB_LABELS) as Tab[])
          .filter((t) => t !== "internacao" || internacao.unit === "pronto-socorro")
          .map((t) => {
          const active = tab === t;
          return (
            <Fragment key={t}>
            <button
              onClick={() => setTab(t)}
              className="flex items-center px-4 py-3 text-sm transition-colors"
              style={{
                color: active ? "var(--foreground)" : "var(--muted)",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              <span className="relative inline-block">
                {TAB_LABELS[t]}
                {t === "lesao-pele" && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    {LESION_COUNT}
                  </span>
                )}
                {t === "medicamento" && MEDICATION_ALERT_COUNT > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                    style={{ background: "var(--status-critical)", color: "#fff" }}
                  >
                    {MEDICATION_ALERT_COUNT}
                  </span>
                )}
              </span>
            </button>
            {t === "medicamento" && isAntonio && (
              <div className="flex items-center gap-1">
                <span
                  className="flex items-center pl-4 pr-1.5 py-3 text-sm"
                  style={{
                    color: "var(--foreground)",
                    borderBottom: "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  Alertas
                </span>
                <button
                  onClick={() => setShowAlertTimesOnCharts((v) => !v)}
                  aria-pressed={showAlertTimesOnCharts}
                  aria-label="Mostrar horário dos alertas nos gráficos"
                  title="Mostrar horário dos alertas nos gráficos"
                  className="flex items-center rounded-full overflow-hidden text-[10px] font-bold tracking-wide"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <span
                    className="px-2 py-1 transition-colors"
                    style={{
                      background: showAlertTimesOnCharts ? "var(--accent)" : "transparent",
                      color: showAlertTimesOnCharts ? "#fff" : "var(--muted)",
                    }}
                  >
                    ON
                  </span>
                  <span
                    className="px-2 py-1 transition-colors"
                    style={{
                      background: !showAlertTimesOnCharts ? "rgba(255,255,255,0.12)" : "transparent",
                      color: !showAlertTimesOnCharts ? "var(--foreground)" : "var(--muted)",
                    }}
                  >
                    OFF
                  </span>
                </button>
                <button
                  onClick={() => { setAlertsModalView("ativos"); setAlertsModalOpen(true); }}
                  aria-label="Ver alertas do paciente"
                  title="Ver alertas do paciente"
                  className="relative flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
                >
                  <Image src="/monitor.png" alt="" width={24} height={24} />
                  {patientAlertCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                      style={{ background: "var(--status-critical)", color: "#fff" }}
                    >
                      {patientAlertCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            </Fragment>
          );
        })}

        {isAntonio && tab === "sinais-vitais" && view === "graficos" && (
          <div className="flex items-center gap-0.5 rounded-lg p-0.5 ml-auto" style={{ background: "rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => {
                setChartLayout("linha");
                setSlotMin(CHART_LAYOUT_DEFAULTS.linha.slotMin);
                setWindowMs(CHART_LAYOUT_DEFAULTS.linha.windowMs);
              }}
              aria-label="Ver gráficos em linha"
              title="Linha — um gráfico abaixo do outro"
              className="flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{
                background: chartLayout === "linha" ? "var(--accent)" : "transparent",
                color: chartLayout === "linha" ? "#fff" : "var(--muted)",
              }}
            >
              <Icon name="list" size={14} color="currentColor" />
            </button>
            <button
              onClick={() => {
                setChartLayout("matriz");
                setSlotMin(CHART_LAYOUT_DEFAULTS.matriz.slotMin);
                setWindowMs(CHART_LAYOUT_DEFAULTS.matriz.windowMs);
              }}
              aria-label="Ver gráficos em matriz"
              title="Matriz — gráficos em grade, ajustados à tela"
              className="flex items-center justify-center w-6 h-6 rounded transition-colors"
              style={{
                background: chartLayout === "matriz" ? "var(--accent)" : "transparent",
                color: chartLayout === "matriz" ? "#fff" : "var(--muted)",
              }}
            >
              <Icon name="layout-grid" size={14} color="currentColor" />
            </button>
          </div>
        )}
      </div>

      {/* ── Shared controls (view toggle + slot + window + legenda) ── */}
      {tab !== "lesao-pele" && tab !== "medicamento" && (
        <ControlsBar
          slotMin={slotMin}
          setSlotMin={setSlotMin}
          windowMs={windowMs}
          setWindowMs={setWindowMs}
          view={view}
          setView={setView}
          showViewToggle={tab === "sinais-vitais"}
          legend={tab === "sinais-vitais" ? (
            <div className="flex items-center gap-4">
              {[
                { color: "#888888", label: "Normal" },
                { color: "#eab308", label: "Atenção" },
                { color: "#ef4444", label: "Crítico" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                  {label}
                </span>
              ))}
              {isAntonio && (
                <button
                  onClick={() => setCardsVisible((v) => !v)}
                  aria-label={cardsVisible ? "Ocultar cartões" : "Mostrar cartões"}
                  title={cardsVisible ? "Ocultar cartões" : "Mostrar cartões"}
                  className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-white/5"
                  style={{ color: "var(--muted)" }}
                >
                  <Icon name={cardsVisible ? "eye" : "eye-off"} size={15} color="currentColor" />
                </button>
              )}
            </div>
          ) : undefined}
        />
      )}

      {/* ── Tab content + painel de Exames/Prontuário (contexto lado a lado) ──
          Único trecho que rola: cabeçalho, abas e filtros ficam congelados acima. */}
      <div className={`flex-1 min-h-0 overflow-y-auto flex items-start gap-4 px-6 pb-6 min-w-0 ${tab === "sinais-vitais" ? "pt-2" : "pt-6"}`}>
        <div className="flex-1 min-w-0">
          {tab === "sinais-vitais" && (
            <SinaisVitaisTab
              internacao={internacao}
              slotMin={slotMin}
              windowMs={windowMs}
              view={view}
              cardsVisible={cardsVisible}
              chartLayout={chartLayout}
              alerts={patientAlerts}
              showAlertTimesOnCharts={isAntonio && showAlertTimesOnCharts}
            />
          )}
          {tab === "ews" && (
            <EWSTab internacao={internacao} />
          )}
          {tab === "lesao-pele" && <SkinLesionTab />}
          {tab === "medicamento" && <MedicationTab />}
          {tab === "internacao" && (
            <InternacaoTab internacao={internacao} />
          )}
        </div>

        {recordPanel && (
          <PatientRecordPanel
            mode={recordPanel}
            patientName={internacao.patient.name}
            onClose={() => setRecordPanel(null)}
          />
        )}
      </div>

      {/* ── Alerts panel (header compacto do Antonio) ── */}
      {isAntonio && panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setPanelOpen(false)}
          />
          <AlertsPanel onClose={() => setPanelOpen(false)} unitFilter={internacao.unit} />
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const fullscreen = useSidebarStore((s) => s.fullscreen);
  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            marginLeft: fullscreen ? 0 : collapsed ? 56 : 224,
            transition: "margin-left 200ms ease",
            height: "100vh",
          }}
        >
          {!isAntonio && <TopBar />}
          <PatientContent id={id} />
        </main>
      </div>
    </AuthGuard>
  );
}
