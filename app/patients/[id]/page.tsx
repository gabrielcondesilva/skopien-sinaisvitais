"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { VitalCard } from "@/components/VitalCard";
import { VitalsChart } from "@/components/VitalsChart";
import { VitalsHeatmap } from "@/components/VitalsHeatmap";
import { ReorderableVitalsCharts } from "@/components/ReorderableVitalsCharts";
import { EWSForecastChart } from "@/components/EWSForecastChart";
import { EWSScoreChart } from "@/components/EWSScoreChart";
import { CameraPlayer } from "@/components/CameraPlayer";
import { FloatingCameraWindow } from "@/components/FloatingCameraWindow";
import { SkinLesionTab, LESION_COUNT } from "@/components/SkinLesionTab";
import { MedicationTab, MEDICATION_ALERT_COUNT } from "@/components/MedicationTab";
import { PatientRecordPanel } from "@/components/PatientRecordPanel";
import { ScorePill, BRADEN_COLOR } from "@/components/BedCard";
import { AlertsPanel } from "@/components/AlertsPanel";
import { Icon } from "@/components/ui/Icon";
import { useSimulationStore } from "@/store/simulation";
import { useSidebarStore } from "@/store/sidebar";
import { useAlertStore } from "@/store/alerts";
import { useAuthStore } from "@/store/auth";
import { computeSlots, currentSlotValues } from "@/lib/simulation/vitals";
import { calculateEWS } from "@/lib/ews";
import { vitalSeverity } from "@/lib/vitalSeverity";
import type { Internacao, SurgicalInternacao, NivelConsciencia } from "@/lib/simulation/types";

const NC_OPTIONS: readonly NivelConsciencia[] = ["Alerta", "Confuso", "Responde à Dor", "Inconsciente"];

// ─── Shared config ────────────────────────────────────────────────────────────

const UNIT_LABELS: Record<string, string> = {
  "pronto-socorro":    "Pronto Socorro",
  "enfermaria":        "Enfermaria",
  "uti":               "UTI",
  "centro-cirurgico":  "Centro Cirúrgico",
};

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

const SLOT_OPTS = [
  { label: "5min", min: 5 },
  { label: "15min", min: 15 },
  { label: "30min", min: 30 },
  { label: "1h", min: 60 },
  { label: "2h", min: 120 },
  { label: "4h", min: 240 },
] as const;
const WINDOW_OPTS = [
  { label: "1h",  ms:  3_600_000 },
  { label: "3h",  ms: 10_800_000 },
  { label: "6h",  ms: 21_600_000 },
  { label: "12h", ms: 43_200_000 },
  { label: "24h", ms: 86_400_000 },
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

  const EXTENDED_WINDOW_MS = [36, 48, 62].map((h) => h * 3_600_000);
  const isExtended = EXTENDED_WINDOW_MS.includes(windowMs);

  const isCustomSlot = !SLOT_OPTS.some((o) => o.min === slotMin);

  return (
    <div
      className="flex items-center gap-5 px-6 py-3 flex-wrap"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      {showViewToggle && (
        <div className="flex items-center gap-1.5">
          <SelBtn active={view === "graficos"} onClick={() => setView("graficos")}>Gráficos</SelBtn>
          <SelBtn active={view === "heatmap"}  onClick={() => setView("heatmap")}>Heatmap</SelBtn>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "var(--muted)" }}>Slot</span>
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
            {isCustomSlot ? `${slotMin >= 60 ? `${slotMin / 60}h` : `${slotMin}min`}` : "Escolher Slot"}
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
                Slot temporal (hora em hora)
              </div>
              {Array.from({ length: 24 }, (_, i) => {
                const hVal = i + 1;
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

      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: "var(--muted)" }}>Janela</span>
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
              {[36, 48, 62].map((h) => {
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

function SinaisVitaisTab({ internacao, slotMin, windowMs, view, cardsVisible }: {
  internacao: Internacao | SurgicalInternacao;
  slotMin: number;
  windowMs: number;
  view: "graficos" | "heatmap";
  cardsVisible: boolean;
}) {
  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");
  const setNivelConsciencia = useSimulationStore((s) => s.setNivelConsciencia);

  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const slots = computeSlots(rawHistory, slotMin, windowMs, Date.now());
  // Cartão sempre reflete o último ponto do gráfico (mesmo slot em andamento) — nunca uma leitura bruta à parte
  const current = slots[slots.length - 1] ?? currentSlotValues(rawHistory, slotMin, Date.now());
  const ews     = calculateEWS(current);

  const minMax = Object.fromEntries(
    VITALS.map((v) => {
      if (v.key === "nc") return [v.key, undefined];
      const vals = slots.map((s) => s[v.key]).filter((x) => x != null) as number[];
      return [v.key, vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : undefined];
    })
  ) as Record<string, { min: number; max: number } | undefined>;

  const isEnfermariaCompact = isAntonio && internacao.unit === "enfermaria";
  const isReorderable = internacao.unit === "pronto-socorro" || internacao.unit === "uti";

  return (
    <div className={isEnfermariaCompact ? "flex flex-col gap-2" : "flex flex-col gap-5"}>
      {/* Vital cards */}
      {(!isAntonio || cardsVisible) && (
        <div className={isEnfermariaCompact ? "flex gap-2" : "flex gap-3"}>
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
              compact={isEnfermariaCompact}
            />
          ))}
        </div>
      )}

      {/* Enfermaria (Antonio): EWS primeiro (mais importante) + 5 gráficos de vitais, 2x3, sem scroll */}
      {isEnfermariaCompact && view === "graficos" ? (
        <div className="grid grid-cols-2 gap-2">
          <EWSScoreChart slots={slots} syncId={`vitals-${internacao.id}`} compact collapsible={false} highlight />
          <VitalsChart slots={slots} syncId={`vitals-${internacao.id}`} compact />
        </div>
      ) : isReorderable && view === "graficos" ? (
        /* Pronto Socorro / UTI: gráficos podem ser arrastados e reordenados */
        <ReorderableVitalsCharts slots={slots} syncId={`vitals-${internacao.id}`} />
      ) : (
        <>
          {/* Escore EWS — mostra por que o escore está no valor atual */}
          <EWSScoreChart slots={slots} syncId={`vitals-${internacao.id}`} />

          {view === "graficos"
            ? <VitalsChart slots={slots} syncId={`vitals-${internacao.id}`} />
            : <VitalsHeatmap slots={slots} />}
        </>
      )}
    </div>
  );
}

// ─── Tab: Predição EWS ───────────────────────────────────────────────────────

const EWS_FORECAST_WINDOW_MS = 3 * 3_600_000; // esta aba é sempre 3h histórico + 3h previsão

function EWSTab({ internacao, slotMin }: {
  internacao: Internacao | SurgicalInternacao;
  slotMin: number;
}) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const slots = computeSlots(rawHistory, slotMin, EWS_FORECAST_WINDOW_MS, Date.now());

  return (
    <EWSForecastChart
      internacao={internacao}
      slots={slots}
    />
  );
}

// ─── Tab: Predição de Internação ─────────────────────────────────────────────

function InternacaoTab({ internacao, slotMin }: {
  internacao: Internacao | SurgicalInternacao;
  slotMin: number;
}) {
  const rawHistory = useSimulationStore((s) => s.internacoes[internacao.id]?.rawHistory ?? []);
  const current = currentSlotValues(rawHistory, slotMin, Date.now());
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

  const internacao = useSimulationStore((s) => s.internacoes[id] ?? null);
  const bed = useSimulationStore((s) => s.beds.find((b) => b.internacaoId === id) ?? null);

  // Enfermaria (Antonio): Janela de 24h fica muito embolada nos gráficos compactos — default 12h
  const isEnfermariaCompact = isAntonio && internacao?.unit === "enfermaria";

  const [tab, setTab]                 = useState<Tab>("sinais-vitais");
  const [slotMin, setSlotMin]         = useState(60);
  const [windowMs, setWindowMs]       = useState(() => isEnfermariaCompact ? 43_200_000 : 86_400_000);
  const [view, setView]               = useState<"graficos" | "heatmap">("graficos");
  const [cardsVisible, setCardsVisible] = useState(true);
  const [camOpen, setCamOpen]         = useState(false);
  const [camFullscreen, setCamFullscreen] = useState(false);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [recordPanel, setRecordPanel] = useState<null | "exames" | "prontuario">(null);

  if (!internacao) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: "var(--muted)" }}>Internação não encontrada.</p>
      </div>
    );
  }

  // Mesma base de cálculo do gráfico da aba Sinais Vitais (mediana do Slot Temporal
  // selecionado) — evita que o valor ao lado do nome divirja do que o gráfico mostra.
  const slots   = computeSlots(internacao.rawHistory, slotMin, windowMs, Date.now());
  const current = slots[slots.length - 1] ?? currentSlotValues(internacao.rawHistory, slotMin, Date.now());
  const ews     = calculateEWS(current);

  const statusColor = STATUS_COLOR[ews.status] ?? "var(--muted)";
  const proxyUrl = process.env.NEXT_PUBLIC_CAMERA_PROXY_URL;
  const isLiveCamera = bed?.label === "UTI-01" && !!proxyUrl;
  const streamUrl = `${proxyUrl}/stream/index.m3u8`;
  const activeAlertCount = active.filter((a) => a.unit === internacao.unit).length;

  const metaItems = [
    `${internacao.patient.age} anos`,
    internacao.patient.gender === "M" ? "Masculino" : "Feminino",
    internacao.patient.admissionReason,
    `Admissão: ${formatAdmissionDate(internacao.patient.admittedAt)}`,
  ];
  const ADMISSION_REASON_INDEX = 2;

  return (
    <div className="flex flex-col min-h-0" style={{ background: "var(--background)" }}>

      {isAntonio ? (
        /* ── Antonio: header compacto (sem TopBar) — ganha espaço vertical de tela ── */
        <div className="px-6 pt-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Linha 1: identidade do paciente + controles de perfil */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
              <div className="flex items-center gap-3 ml-20">
                <ScorePill text={`EWS ${ews.total} - ${ews.status}`} color={statusColor} size="lg" />

                {/* Braden — apenas para UTI-01 */}
                {bed?.label === "UTI-01" && (
                  <ScorePill
                    text="Braden 10 - Alto"
                    color={BRADEN_COLOR["Alto"]}
                    onClick={() => setTab("lesao-pele")}
                    size="lg"
                  />
                )}
              </div>
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

          {/* Linha 2: metadados + Exames / Prontuário / Câmera */}
          <div className="flex items-center justify-between gap-3 flex-wrap mt-1.5 pl-6">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm" style={{ color: "var(--muted)" }}>
              {metaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span>·</span>}
                  <span
                    className={i === ADMISSION_REASON_INDEX ? "text-base" : undefined}
                    style={i === ADMISSION_REASON_INDEX ? { color: "var(--accent)", fontWeight: 700 } : undefined}
                  >
                    {item}
                  </span>
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
              <ScorePill text={`EWS ${ews.total} - ${ews.status}`} color={statusColor} size="lg" />

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
      <div className="flex px-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {(Object.keys(TAB_LABELS) as Tab[])
          .filter((t) => t !== "internacao" || internacao.unit === "pronto-socorro")
          .map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
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
          );
        })}
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

      {/* ── Tab content + painel de Exames/Prontuário (contexto lado a lado) ── */}
      <div className={`flex-1 flex items-start gap-4 px-6 pb-6 min-w-0 ${tab === "sinais-vitais" ? "pt-2" : "pt-6"}`}>
        <div className="flex-1 min-w-0">
          {tab === "sinais-vitais" && (
            <SinaisVitaisTab internacao={internacao} slotMin={slotMin} windowMs={windowMs} view={view} cardsVisible={cardsVisible} />
          )}
          {tab === "ews" && (
            <EWSTab internacao={internacao} slotMin={slotMin} />
          )}
          {tab === "lesao-pele" && <SkinLesionTab />}
          {tab === "medicamento" && <MedicationTab />}
          {tab === "internacao" && (
            <InternacaoTab internacao={internacao} slotMin={slotMin} />
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
          className="flex-1 overflow-y-auto flex flex-col"
          style={{
            marginLeft: fullscreen ? 0 : collapsed ? 56 : 224,
            transition: "margin-left 200ms ease",
            minHeight: "100vh",
          }}
        >
          {!isAntonio && <TopBar />}
          <PatientContent id={id} />
        </main>
      </div>
    </AuthGuard>
  );
}
