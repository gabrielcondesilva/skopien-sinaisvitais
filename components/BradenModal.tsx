"use client";

import { useState } from "react";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

type LesionType =
  | "Pressão"
  | "Prevenção"
  | "Feridas"
  | "Dispositivos Médicos"
  | "Skin Tears"
  | "D.A.I."
  | "Pé Diabético";

export const LESION_COLORS: Record<LesionType, string> = {
  "Pressão":              "#ef4444",
  "Prevenção":            "#f97316",
  "Feridas":              "#eab308",
  "Dispositivos Médicos": "#06b6d4",
  "Skin Tears":           "#ec4899",
  "D.A.I.":               "#a78bfa",
  "Pé Diabético":         "#22c55e",
};

interface ExamEntry {
  date: string;
  time: string;
  stage: string;
  note: string;
  dims: { perimetro: string; altura: string; largura: string; area: string };
}

interface Lesion {
  id: number;
  local: string;
  type: LesionType;
  side: "front" | "back";
  cx: number;
  cy: number;
  surgiu: string;
  diasDesde: number;
  ultimoExame: string;
  proximoExame: string;
  examHistory: ExamEntry[];
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_LESIONS: Lesion[] = [
  {
    id: 1,
    local: "Calcâneo Esquerdo",
    type: "Prevenção",
    side: "back",
    cx: 38, cy: 229,
    surgiu: "09/02/2026", diasDesde: 109,
    ultimoExame: "06/05/2026 15:30",
    proximoExame: "13/05/2026 15:30",
    examHistory: [
      { date: "09/02/2026", time: "09:00", stage: "Estágio I",
        note: "Hiperemia não branqueável, sem perda de pele. Reposicionamento iniciado.",
        dims: { perimetro: "2,8 cm", altura: "1,4 cm", largura: "2,0 cm", area: "2,1 cm²" } },
      { date: "22/03/2026", time: "14:30", stage: "Estágio I",
        note: "Sem evolução de estágio. Curativo de espuma mantido.",
        dims: { perimetro: "3,1 cm", altura: "1,6 cm", largura: "2,2 cm", area: "2,6 cm²" } },
      { date: "15/04/2026", time: "10:15", stage: "Estágio II",
        note: "Flictena rompida, perda parcial da epiderme. Cobertura trocada.",
        dims: { perimetro: "4,2 cm", altura: "2,1 cm", largura: "3,0 cm", area: "4,6 cm²" } },
      { date: "06/05/2026", time: "15:30", stage: "Estágio II",
        note: "Evolução estável. Bordas limpas, exsudato seroso reduzido.",
        dims: { perimetro: "3,8 cm", altura: "1,9 cm", largura: "2,7 cm", area: "3,9 cm²" } },
    ],
  },
  {
    id: 2,
    local: "Calcâneo Direito",
    type: "Prevenção",
    side: "back",
    cx: 62, cy: 229,
    surgiu: "10/03/2026", diasDesde: 83,
    ultimoExame: "06/05/2026 15:30",
    proximoExame: "13/05/2026 15:30",
    examHistory: [
      { date: "10/03/2026", time: "11:00", stage: "Estágio I",
        note: "Eritema localizado. Pele íntegra, área de risco por pressão.",
        dims: { perimetro: "2,2 cm", altura: "1,1 cm", largura: "1,7 cm", area: "1,4 cm²" } },
      { date: "28/04/2026", time: "16:00", stage: "Estágio I",
        note: "Sem evolução. Reposicionamento a cada 2h mantido.",
        dims: { perimetro: "2,4 cm", altura: "1,2 cm", largura: "1,8 cm", area: "1,6 cm²" } },
      { date: "06/05/2026", time: "15:30", stage: "Estágio I",
        note: "Melhora parcial. Hiperemia reduzida, protocolo de alívio mantido.",
        dims: { perimetro: "2,0 cm", altura: "1,0 cm", largura: "1,6 cm", area: "1,2 cm²" } },
    ],
  },
  {
    id: 3,
    local: "Orelha Esquerda",
    type: "Dispositivos Médicos",
    side: "front",
    cx: 38, cy: 15,
    surgiu: "07/03/2026", diasDesde: 86,
    ultimoExame: "05/05/2026 09:14",
    proximoExame: "12/05/2026 09:00",
    examHistory: [
      { date: "07/03/2026", time: "13:03", stage: "N/A",
        note: "Primeiro registro. Pressão por máscara O₂. Troca de fixação realizada.",
        dims: { perimetro: "0,1 cm", altura: "0,5 cm", largura: "0,8 cm", area: "0,3 cm²" } },
      { date: "07/03/2026", time: "17:49", stage: "N/A",
        note: "Eritema leve sem solução de continuidade. Coxim protetor instalado.",
        dims: { perimetro: "0,2 cm", altura: "0,6 cm", largura: "0,9 cm", area: "0,4 cm²" } },
      { date: "14/03/2026", time: "16:44", stage: "Estágio I",
        note: "Progressão leve. Pele íntegra, hiperemia persistente.",
        dims: { perimetro: "0,5 cm", altura: "0,8 cm", largura: "1,1 cm", area: "0,7 cm²" } },
      { date: "27/04/2026", time: "16:24", stage: "Estágio I",
        note: "Estável. Sem sinais de infecção. Curativo mantido.",
        dims: { perimetro: "0,4 cm", altura: "0,7 cm", largura: "1,0 cm", area: "0,5 cm²" } },
      { date: "05/05/2026", time: "09:14", stage: "Estágio I",
        note: "Evolução favorável. Manutenção do protocolo de proteção.",
        dims: { perimetro: "0,3 cm", altura: "0,6 cm", largura: "0,9 cm", area: "0,4 cm²" } },
    ],
  },
  {
    id: 4,
    local: "Occipital",
    type: "Prevenção",
    side: "back",
    cx: 50, cy: 7,
    surgiu: "23/01/2026", diasDesde: 127,
    ultimoExame: "09/05/2026 12:08",
    proximoExame: "16/05/2026 12:08",
    examHistory: [
      { date: "23/01/2026", time: "08:30", stage: "Estágio I",
        note: "Hiperemia difusa região occipital. Superfície íntegra.",
        dims: { perimetro: "3,5 cm", altura: "1,8 cm", largura: "2,5 cm", area: "3,4 cm²" } },
      { date: "10/02/2026", time: "14:00", stage: "Estágio II",
        note: "Flictena íntegra com exsudato seroso. Cobertura de hidrocoloide.",
        dims: { perimetro: "4,8 cm", altura: "2,4 cm", largura: "3,4 cm", area: "5,9 cm²" } },
      { date: "08/03/2026", time: "09:45", stage: "Estágio II",
        note: "Estável. Granulação incipiente nas bordas.",
        dims: { perimetro: "5,2 cm", altura: "2,6 cm", largura: "3,7 cm", area: "7,0 cm²" } },
      { date: "15/04/2026", time: "11:30", stage: "Estágio II",
        note: "Cicatrização em curso. Bordas aproximadas, epitelização visível.",
        dims: { perimetro: "4,4 cm", altura: "2,2 cm", largura: "3,2 cm", area: "5,4 cm²" } },
      { date: "09/05/2026", time: "12:08", stage: "Estágio I",
        note: "Regressão de estágio. Boa evolução, protocolo de manutenção.",
        dims: { perimetro: "3,2 cm", altura: "1,6 cm", largura: "2,3 cm", area: "2,8 cm²" } },
    ],
  },
];

// ── Body SVG ──────────────────────────────────────────────────────────────────

const F = "rgba(255,255,255,0.18)";

function BodySilhouette({
  lesions,
  side,
  selectedId,
  onSelect,
  w = 140,
  h = 350,
}: {
  lesions: Lesion[];
  side: "front" | "back";
  selectedId: number | null;
  onSelect: (id: number) => void;
  w?: number;
  h?: number;
}) {
  const visible = lesions.filter((l) => l.side === side);
  return (
    <svg viewBox="0 0 100 250" width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <ellipse cx="50" cy="15" rx="12" ry="13" fill={F} />
      <rect x="45" y="26" width="10" height="8" rx="2" fill={F} />
      <path d="M24 33 C20 34 20 38 20 42 L21 106 L79 106 L80 42 C80 38 80 34 76 33 C70 32 57 30 50 30 C43 30 30 32 24 33 Z" fill={F} />
      <rect x="8" y="36" width="13" height="42" rx="6" fill={F} />
      <rect x="7" y="76" width="12" height="34" rx="5" fill={F} />
      <ellipse cx="13" cy="115" rx="7" ry="9" fill={F} />
      <rect x="79" y="36" width="13" height="42" rx="6" fill={F} />
      <rect x="81" y="76" width="12" height="34" rx="5" fill={F} />
      <ellipse cx="87" cy="115" rx="7" ry="9" fill={F} />
      <path d="M21 104 L79 104 L81 132 L19 132 Z" fill={F} />
      <rect x="20" y="129" width="24" height="62" rx="9" fill={F} />
      <rect x="21" y="189" width="21" height="46" rx="7" fill={F} />
      <ellipse cx="31" cy="238" rx="14" ry="6" fill={F} />
      <rect x="56" y="129" width="24" height="62" rx="9" fill={F} />
      <rect x="58" y="189" width="21" height="46" rx="7" fill={F} />
      <ellipse cx="69" cy="238" rx="14" ry="6" fill={F} />
      {visible.map((l) => {
        const color = LESION_COLORS[l.type];
        const sel = selectedId === l.id;
        return (
          <g key={l.id} onClick={() => onSelect(l.id)} style={{ cursor: "pointer" }}>
            {sel && <circle cx={l.cx} cy={l.cy} r={13} fill={color} opacity={0.18} />}
            <circle cx={l.cx} cy={l.cy} r={7} fill={color} />
            {sel && <circle cx={l.cx} cy={l.cy} r={7} fill="none" stroke="#fff" strokeWidth={1.5} />}
          </g>
        );
      })}
    </svg>
  );
}

// ── Wound image placeholder ───────────────────────────────────────────────────

function WoundPlaceholder() {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{ background: "#0d1520" }}
    >
      <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>Foto</span>
    </div>
  );
}

// ── Lesion detail panel ───────────────────────────────────────────────────────

function LesionDetailPanel({ lesion, onBack }: { lesion: Lesion; onBack: () => void }) {
  const [examIdx, setExamIdx] = useState(lesion.examHistory.length - 1);
  const color = LESION_COLORS[lesion.type];
  const exam = lesion.examHistory[examIdx];
  const total = lesion.examHistory.length;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Back + title */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          ← Voltar
        </button>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold truncate">{lesion.local}</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
          style={{ background: color + "22", color }}
        >
          {lesion.type}
        </span>
      </div>

      {/* Two columns: image info | cronologia */}
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

        {/* Left: image + dimensions + AI */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-0 overflow-y-auto">

          {/* Image viewer */}
          <div
            className="relative rounded-xl overflow-hidden shrink-0"
            style={{ height: 170, background: "#0d1520" }}
          >
            <WoundPlaceholder />
            {examIdx > 0 && (
              <button
                onClick={() => setExamIdx(i => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-base transition-colors hover:bg-white/20"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                ‹
              </button>
            )}
            {examIdx < total - 1 && (
              <button
                onClick={() => setExamIdx(i => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-base transition-colors hover:bg-white/20"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
              >
                ›
              </button>
            )}
            <div
              className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.65)" }}
            >
              {examIdx + 1}/{total}
            </div>
            <div
              className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.65)", color: "rgba(255,255,255,0.55)" }}
            >
              {exam.date} — {exam.time}
            </div>
          </div>

          {/* Dimensions */}
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl px-3 py-2.5 shrink-0"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {[
              { label: "Perímetro", value: exam.dims.perimetro },
              { label: "Altura",    value: exam.dims.altura },
              { label: "Largura",   value: exam.dims.largura },
              { label: "Área",      value: exam.dims.area },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.32)" }}>{label}</p>
                <p className="text-xs font-semibold">{value}</p>
              </div>
            ))}
          </div>

          {/* Análise de IA */}
          <div
            className="rounded-xl px-3 py-2.5 shrink-0"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              Análise de IA
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
              {exam.note}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.32)" }}>Estágio</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: color + "22", color }}
              >
                {exam.stage}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Cronologia */}
        <div className="flex flex-col shrink-0 overflow-y-auto" style={{ width: 148 }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1 shrink-0"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            Cronologia
          </p>
          <p className="text-xs font-semibold mb-3 shrink-0">{lesion.local}</p>

          <div className="relative flex flex-col">
            {lesion.examHistory.map((e, i) => {
              const isActive = i === examIdx;
              return (
                <div
                  key={i}
                  onClick={() => setExamIdx(i)}
                  className="flex gap-2 cursor-pointer pb-4 relative"
                >
                  {/* Vertical line */}
                  {i < total - 1 && (
                    <div
                      className="absolute"
                      style={{
                        left: 5,
                        top: 14,
                        bottom: 0,
                        width: 1,
                        background: "rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                  {/* Dot */}
                  <div
                    className="w-3 h-3 rounded-full shrink-0 relative z-10 transition-all mt-0.5"
                    style={{
                      background: isActive ? color : "rgba(255,255,255,0.15)",
                      boxShadow: isActive ? `0 0 0 2px ${color}44` : "none",
                    }}
                  />
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-medium leading-tight"
                      style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}
                    >
                      {e.date}
                    </p>
                    <p
                      className="text-[10px] leading-tight"
                      style={{ color: "rgba(255,255,255,0.28)" }}
                    >
                      {e.time}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 leading-tight font-medium"
                      style={{ color: isActive ? color : "rgba(255,255,255,0.32)" }}
                    >
                      Estágio: {e.stage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BradenModal ───────────────────────────────────────────────────────────────

export function BradenModal({ onClose }: { onClose: () => void }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipping, setFlipping] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function flip() {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setSide((s) => (s === "front" ? "back" : "front"));
      setFlipping(false);
    }, 150);
  }

  const selectedLesion = MOCK_LESIONS.find((l) => l.id === selectedId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl"
        style={{
          width: "min(820px, 100%)",
          maxHeight: "min(660px, 92vh)",
          background: "#131823",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 72px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Image src="/skinone.png" alt="skinOne" width={88} height={24} />
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-sm hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ✕
          </button>
        </div>

        {/* ── Patient summary bar ── */}
        <div
          className="flex items-center gap-4 px-6 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.3)" }}
          >
            FC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Francisco das Chagas Moreira</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
              Leito UTI-01 · UTI · Dias Internação: 120
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Card: Lesões Cicatrizadas */}
            <div
              className="flex flex-col items-center justify-between px-4 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", width: 96, height: 76 }}
            >
              <p className="text-[10px] text-center leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>
                Lesões Cicatrizadas
              </p>
              <p className="text-2xl font-bold leading-none">2</p>
              <span />
            </div>
            {/* Card: Braden */}
            <div
              className="flex flex-col items-center justify-between px-4 py-2 rounded-xl"
              style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)", width: 96, height: 76 }}
            >
              <p className="text-[10px] text-center leading-tight" style={{ color: "rgba(56,189,248,0.6)" }}>
                Braden
              </p>
              <p className="text-2xl font-bold leading-none" style={{ color: "#38bdf8" }}>10</p>
              <p className="text-[10px] font-semibold" style={{ color: "#38bdf8" }}>Alto Risco</p>
            </div>
          </div>
        </div>

        {/* ── Body + main panel ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: body column — bigger silhouette, no legend */}
          <div
            className="flex flex-col items-center gap-3 py-4 px-3 shrink-0 overflow-hidden"
            style={{ width: 250, borderRight: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Flip button */}
            <button
              onClick={flip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all hover:bg-white/10"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {side === "front" ? "Frente" : "Costas"}
            </button>

            {/* Bigger silhouette */}
            <div style={{ transform: flipping ? "scaleX(0)" : "scaleX(1)", transition: "transform 150ms ease-in-out" }}>
              <BodySilhouette
                lesions={MOCK_LESIONS}
                side={side}
                selectedId={selectedId}
                onSelect={setSelectedId}
                w={160}
                h={390}
              />
            </div>
          </div>

          {/* Right: lesion list OR detail view */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedLesion ? (
              <LesionDetailPanel
                lesion={selectedLesion}
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <div style={{ maxWidth: 340, marginLeft: "auto" }}>
                {/* Legend above cards */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {(Object.entries(LESION_COLORS) as [LesionType, string][]).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-[10px] leading-none" style={{ color: "rgba(255,255,255,0.45)" }}>{type}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                {MOCK_LESIONS.map((l) => {
                  const color = LESION_COLORS[l.type];
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedId(l.id)}
                      className="rounded-xl p-4 cursor-pointer transition-all hover:bg-white/5"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: color }} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold leading-snug">{l.local}</p>
                          <p className="text-xs mt-0.5" style={{ color }}>{l.type}</p>
                        </div>
                      </div>
                      <div className="pl-5 space-y-1">
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
                          Surgiu em: {l.surgiu} ({l.diasDesde} dias)
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
                          Último exame: {l.ultimoExame}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
                          Próximo exame: {l.proximoExame}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
