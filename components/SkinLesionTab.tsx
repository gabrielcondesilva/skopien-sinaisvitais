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
  image?: string;
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
    cx: 44, cy: 195,
    surgiu: "09/02/2026", diasDesde: 109,
    ultimoExame: "06/05/2026 15:30",
    proximoExame: "13/05/2026 15:30",
    examHistory: [
      { date: "09/02/2026", time: "09:00", stage: "Estágio III",
        note: "Perda total da espessura da pele com tecido subcutâneo visível. Bordas irregulares, exsudato purulento. Desbridamento iniciado.",
        dims: { perimetro: "6,2 cm", altura: "3,1 cm", largura: "4,4 cm", area: "9,8 cm²" },
        image: "/lesions/lesao-2-exam-1.jpg.png" },
      { date: "22/03/2026", time: "14:30", stage: "Estágio II",
        note: "Redução do exsudato. Perda parcial da espessura da pele, flictena rompida. Cobertura de hidrocoloide aplicada.",
        dims: { perimetro: "4,8 cm", altura: "2,4 cm", largura: "3,4 cm", area: "5,9 cm²" },
        image: "/lesions/lesao-2-exam-2.jpg.png" },
      { date: "15/04/2026", time: "10:15", stage: "Estágio I",
        note: "Hiperemia residual sem perda de pele. Granulação visível nas bordas. Protocolo de reposicionamento mantido.",
        dims: { perimetro: "3,1 cm", altura: "1,6 cm", largura: "2,2 cm", area: "2,6 cm²" },
        image: "/lesions/lesao-2-exam-3.jpg.png" },
      { date: "06/05/2026", time: "15:30", stage: "Estágio I",
        note: "Hiperemia leve residual. Pele praticamente íntegra, sem exsudato. Manutenção preventiva do curativo.",
        dims: { perimetro: "1,2 cm", altura: "0,6 cm", largura: "0,9 cm", area: "0,4 cm²" },
        image: "/lesions/lesao-2-exam-4.jpg.png" },
    ],
  },
  {
    id: 2,
    local: "Calcâneo Direito",
    type: "Pressão",
    side: "back",
    cx: 71, cy: 195,
    surgiu: "10/03/2026", diasDesde: 83,
    ultimoExame: "06/05/2026 15:30",
    proximoExame: "13/05/2026 15:30",
    examHistory: [
      { date: "10/03/2026", time: "11:00", stage: "Estágio I",
        note: "Eritema localizado. Pele íntegra, área de risco por pressão.",
        dims: { perimetro: "2,2 cm", altura: "1,1 cm", largura: "1,7 cm", area: "1,4 cm²" },
        image: "/lesions/lesao-3-exam-1.jpg.png" },
      { date: "06/05/2026", time: "15:30", stage: "Estágio III",
        note: "Piora significativa. Perda total da espessura da pele, tecido subcutâneo visível. Desbridamento iniciado.",
        dims: { perimetro: "5,8 cm", altura: "2,9 cm", largura: "4,1 cm", area: "8,7 cm²" },
        image: "/lesions/lesao-3-exam-2.jpg.png" },
    ],
  },
  {
    id: 3,
    local: "Orelha Esquerda",
    type: "Dispositivos Médicos",
    side: "front",
    cx: 44, cy: 13,
    surgiu: "07/03/2026", diasDesde: 86,
    ultimoExame: "27/04/2026 16:24",
    proximoExame: "12/05/2026 09:00",
    examHistory: [
      { date: "07/03/2026", time: "13:03", stage: "N/A",
        note: "Primeiro registro. Pressão por máscara O₂. Troca de fixação realizada.",
        dims: { perimetro: "0,1 cm", altura: "0,5 cm", largura: "0,8 cm", area: "0,3 cm²" },
        image: "/lesions/lesao-1-exam-1.jpg.png" },
      { date: "14/03/2026", time: "16:44", stage: "Estágio I",
        note: "Progressão leve. Pele íntegra, hiperemia persistente.",
        dims: { perimetro: "0,5 cm", altura: "0,8 cm", largura: "1,1 cm", area: "0,7 cm²" },
        image: "/lesions/lesao-1-exam-2.jpg.png" },
      { date: "27/04/2026", time: "16:24", stage: "Estágio I",
        note: "Estável. Sem sinais de infecção. Curativo mantido.",
        dims: { perimetro: "0,4 cm", altura: "0,7 cm", largura: "1,0 cm", area: "0,5 cm²" },
        image: "/lesions/lesao-1-exam-3.jpg.png" },
    ],
  },
  {
    id: 4,
    local: "Ombro Direito",
    type: "Pressão",
    side: "back",
    cx: 25, cy: 34,
    surgiu: "23/01/2026", diasDesde: 127,
    ultimoExame: "09/05/2026 12:08",
    proximoExame: "16/05/2026 12:08",
    examHistory: [
      { date: "23/01/2026", time: "08:30", stage: "Estágio I",
        note: "Hiperemia não branqueável na região do ombro direito. Pele íntegra, sem perda tecidual. Reposicionamento iniciado.",
        dims: { perimetro: "3,0 cm", altura: "1,5 cm", largura: "2,2 cm", area: "2,4 cm²" },
        image: "/lesions/lesao-4-exam-1.jpg.png" },
      { date: "09/05/2026", time: "12:08", stage: "Estágio II",
        note: "Flictena íntegra com exsudato seroso. Perda parcial da espessura da pele. Cobertura de hidrocoloide aplicada.",
        dims: { perimetro: "4,6 cm", altura: "2,3 cm", largura: "3,3 cm", area: "5,5 cm²" },
        image: "/lesions/lesao-4-exam-2.jpg.png" },
    ],
  },
];

export const LESION_COUNT = MOCK_LESIONS.length;

// ── Healed lesions (Cicatrizadas) ───────────────────────────────────────────────

interface LesionComment {
  author: string;
  date: string;
  time: string;
  text: string;
}

interface HealedLesion {
  id: number;
  local: string;
  type: LesionType;
  dataAbertura: string;
  dataCicatrizacao: string;
  estadiamento: string;
  materiais: string;
  trocaProposta: string;
  evolucao: string;
  estado: string;
  comments: LesionComment[];
}

const MOCK_HEALED_LESIONS: HealedLesion[] = [
  {
    id: 1,
    local: "Sacra",
    type: "Pressão",
    dataAbertura: "19/03/2026 09:25",
    dataCicatrizacao: "07/06/2026 16:05",
    estadiamento: "Estágio II",
    materiais: "Hidrocoloide",
    trocaProposta: "48 em 48 horas",
    evolucao: "Cicatrizada",
    estado: "Resolvida",
    comments: [
      { author: "Antônio Benchimol", date: "07/06/2026", time: "16:05", text: "" },
      { author: "Soraia Rizzo", date: "07/06/2026", time: "15:59", text: "Área totalmente reepitelizada, sem sinais de recidiva." },
      { author: "Antônio Benchimol", date: "28/05/2026", time: "16:10", text: "" },
    ],
  },
  {
    id: 2,
    local: "Trocânter Direito",
    type: "Prevenção",
    dataAbertura: "02/02/2026 08:40",
    dataCicatrizacao: "20/04/2026 11:15",
    estadiamento: "Estágio I",
    materiais: "Espuma de Poliuretano",
    trocaProposta: "72 em 72 horas",
    evolucao: "Cicatrizada",
    estado: "Resolvida",
    comments: [
      { author: "Antônio Benchimol", date: "20/04/2026", time: "11:15", text: "Alta do protocolo de prevenção. Pele íntegra." },
    ],
  },
];

export const HEALED_LESION_COUNT = MOCK_HEALED_LESIONS.length;

const HEALED_ACCENT = "#2dd4bf";

// ── Body SVG ──────────────────────────────────────────────────────────────────

function BodySilhouette({
  lesions,
  side,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  w = 140,
  h = 350,
}: {
  lesions: Lesion[];
  side: "front" | "back";
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
  w?: number;
  h?: number;
}) {
  const visible = lesions.filter((l) => l.side === side);
  return (
    <svg viewBox="0 0 115 213" width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {/* Body image — exact image dimensions as viewBox, flipped for back view */}
      <image
        href={side === "front" ? "/lesions/frente.png" : "/lesions/costas.png"}
        x="0" y="0"
        width="115" height="213"
        preserveAspectRatio="none"
        opacity={0.85}
      />
      {visible.map((l) => {
        const color = LESION_COLORS[l.type];
        const sel = selectedId === l.id;
        const hov = hoveredId === l.id;
        return (
          <g
            key={l.id}
            onClick={() => onSelect(l.id)}
            onMouseEnter={() => onHover(l.id)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            {(sel || hov) && (
              <circle cx={l.cx} cy={l.cy} r={13} fill={color} opacity={hov && !sel ? 0.25 : 0.18} />
            )}
            <circle
              cx={l.cx} cy={l.cy} r={hov && !sel ? 8.5 : 7}
              fill={color}
              style={{ transition: "r 120ms ease" }}
            />
            {(sel || hov) && (
              <circle
                cx={l.cx} cy={l.cy} r={hov && !sel ? 8.5 : 7}
                fill="none"
                stroke="#fff"
                strokeWidth={sel ? 1.5 : 1}
                opacity={sel ? 1 : 0.7}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Wound image placeholder ───────────────────────────────────────────────────

function WoundPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ background: "#0d1520" }}>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="text-[9px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>Sem foto</span>
    </div>
  );
}

// ── Lesion detail panel (aparece abaixo da lista, não substitui) ───────────────

function LesionDetailPanel({ lesion, onClose }: { lesion: Lesion; onClose: () => void }) {
  const [examIdx, setExamIdx] = useState(lesion.examHistory.length - 1);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);
  const color = LESION_COLORS[lesion.type];
  const exam = lesion.examHistory[examIdx];
  const total = lesion.examHistory.length;

  return (
    <>
    {expandedImg && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.9)" }}
        onClick={() => setExpandedImg(null)}
      >
        <div
          className="relative rounded-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={expandedImg}
            alt="Lesão ampliada"
            style={{ maxWidth: "min(760px, 88vw)", maxHeight: "78vh", display: "block", objectFit: "contain" }}
          />
          <button
            onClick={() => setExpandedImg(null)}
            className="absolute top-3 right-3 rounded-full w-8 h-8 flex items-center justify-center text-sm transition-opacity hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
          >
            ✕
          </button>
        </div>
      </div>
    )}
    <div className="flex flex-col gap-3">
      {/* Title + fechar */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm font-semibold truncate">{lesion.local}</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
          style={{ background: color + "22", color }}
        >
          {lesion.type}
        </span>
        <button
          onClick={onClose}
          className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          ✕ Fechar
        </button>
      </div>

      {/* Two columns: image+info | cronologia */}
      <div className="flex gap-4 flex-wrap lg:flex-nowrap">

        {/* Left: image + dimensions + AI */}
        <div className="flex flex-col gap-2.5 flex-1 min-w-[280px]">

          {/* Image viewer */}
          <div
            className="relative rounded-xl overflow-hidden shrink-0"
            style={{ height: 220, background: "#0d1520" }}
          >
            {exam.image
              ? <>
                  <img src={exam.image} alt={`${lesion.local} — ${exam.date}`} className="w-full h-full object-contain bg-black" />
                  <button
                    onClick={() => setExpandedImg(exam.image!)}
                    className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                    style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
                  >
                    ⛶ Expandir
                  </button>
                </>
              : <WoundPlaceholder />
            }
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
              className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full"
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
            className="grid grid-cols-4 gap-2 rounded-xl px-3 py-2.5 shrink-0"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {[
              { label: "Perímetro", value: exam.dims.perimetro },
              { label: "Altura",    value: exam.dims.altura },
              { label: "Largura",   value: exam.dims.largura },
              { label: "Área",      value: exam.dims.area },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.32)" }}>{label}</p>
                <p className="text-xs font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Análise de IA + Estágio */}
          <div
            className="rounded-xl px-3 py-2.5 shrink-0"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.32)" }}
              >
                Análise de IA
              </p>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: color + "22", color }}
              >
                {exam.stage}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.58)" }}>
              {exam.note}
            </p>
          </div>
        </div>

        {/* Right: Cronologia */}
        <div className="flex flex-col shrink-0" style={{ width: 200 }}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              Cronologia
            </p>
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.28)" }}>{total} exames</span>
          </div>

          <div className="relative flex flex-col">
            {lesion.examHistory.map((e, i) => {
              const isActive = i === examIdx;
              return (
                <div
                  key={i}
                  onClick={() => setExamIdx(i)}
                  className="flex gap-2 cursor-pointer pb-4 relative"
                >
                  {i < total - 1 && (
                    <div
                      className="absolute"
                      style={{
                        left: 5, top: 14, bottom: 0, width: 1,
                        background: "rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                  <div
                    className="w-3 h-3 rounded-full shrink-0 relative z-10 transition-all mt-0.5"
                    style={{
                      background: isActive ? color : "rgba(255,255,255,0.15)",
                      boxShadow: isActive ? `0 0 0 2px ${color}44` : "none",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-medium leading-tight"
                      style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)" }}
                    >
                      {e.date}
                    </p>
                    <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.28)" }}>
                      {e.time}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 leading-tight font-medium"
                      style={{ color: isActive ? color : "rgba(255,255,255,0.32)" }}
                    >
                      {e.stage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Lesion list (ativas) ─────────────────────────────────────────────────────

function LesionListView({
  lesions,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  lesions: Lesion[];
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 shrink-0">
        {(Object.entries(LESION_COLORS) as [LesionType, string][]).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-xs font-medium" style={{ color }}>{type}</span>
          </div>
        ))}
      </div>

      {/* Cards list — 1 coluna, largura cheia */}
      <div className="flex flex-col gap-2.5">
        {lesions.map((l) => {
          const color = LESION_COLORS[l.type];
          const lastExam = l.examHistory[l.examHistory.length - 1];
          const isSelected = selectedId === l.id;
          const isHovered = hoveredId === l.id;
          return (
            <div
              key={l.id}
              onClick={() => onSelect(l.id)}
              onMouseEnter={() => onHover(l.id)}
              onMouseLeave={() => onHover(null)}
              className="rounded-xl px-4 py-3.5 cursor-pointer transition-all hover:bg-white/[0.06] active:scale-[0.99] flex items-center gap-4"
              style={{
                background: isSelected ? `${color}14` : isHovered ? `${color}0d` : "rgba(255,255,255,0.025)",
                border: `1px solid ${isSelected ? color : isHovered ? color + "66" : "rgba(255,255,255,0.07)"}`,
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              {/* Badge: cor do tipo + número de exames */}
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: color, color: "#0d1520" }}
              >
                {l.examHistory.length}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-[13px] font-semibold leading-snug truncate">{l.local}</p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: color + "1a", color }}
                  >
                    {lastExam.stage}
                  </span>
                </div>
                <p className="text-[11px] font-medium" style={{ color }}>{l.type}</p>
                <div
                  className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <span>Surgiu em: <span style={{ color: "rgba(255,255,255,0.68)" }}>{l.surgiu}</span> ({l.diasDesde}d)</span>
                  <span>Último exame: <span style={{ color: "rgba(255,255,255,0.68)" }}>{l.ultimoExame}</span></span>
                  <span>Próximo exame: <span style={{ color: "rgba(255,255,255,0.68)" }}>{l.proximoExame}</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Healed lesion list (cicatrizadas) ───────────────────────────────────────────

function HealedLesionListView({
  lesions,
  onSelect,
  onBack,
}: {
  lesions: HealedLesion[];
  onSelect: (id: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/10 self-start"
        style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        ← Voltar
      </button>

      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.32)" }}
      >
        Lesões Cicatrizadas
      </p>

      <div className="flex flex-col gap-2.5">
        {lesions.map((l) => {
          const color = LESION_COLORS[l.type];
          return (
            <div
              key={l.id}
              onClick={() => onSelect(l.id)}
              className="rounded-xl px-4 py-3.5 cursor-pointer transition-all hover:bg-white/[0.06] active:scale-[0.99] flex items-center gap-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-snug truncate">{l.local}</p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color }}>{l.type}</p>
              </div>
              <span className="text-[11px] shrink-0" style={{ color: "rgba(255,255,255,0.45)" }}>
                Cicatrizada em {l.dataCicatrizacao}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Healed lesion detail ("Dados da Lesão") ─────────────────────────────────────

function HealedLesionDetailPanel({ lesion, onClose }: { lesion: HealedLesion; onClose: () => void }) {
  const fields: { label: string; value: string }[] = [
    { label: "Tipo da lesão", value: lesion.type },
    { label: "Local da lesão", value: lesion.local },
    { label: "Data de Abertura", value: lesion.dataAbertura },
    { label: "Data de Cicatrização", value: lesion.dataCicatrizacao },
    { label: "Estadiamento", value: lesion.estadiamento },
    { label: "Materiais", value: lesion.materiais },
    { label: "Troca Proposta", value: lesion.trocaProposta },
    { label: "Evolução", value: lesion.evolucao },
    { label: "Estado", value: lesion.estado },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Dados da Lesão <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>({lesion.dataAbertura})</span>
        </p>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          ✕ Fechar
        </button>
      </div>

      <div
        className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl px-4 py-3.5"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: HEALED_ACCENT }}>
              {f.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>{f.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: "rgba(255,255,255,0.32)" }}
        >
          Comentários da Lesão
        </p>
        <div className="flex flex-col gap-2">
          {lesion.comments.map((c, i) => (
            <div
              key={i}
              className="rounded-xl px-3.5 py-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <p className="text-xs" style={{ color: c.text ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.32)" }}>
                {c.text || "Sem comentários"}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.32)" }}>
                Por {c.author} em {c.date} {c.time}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── SkinLesionTab ─────────────────────────────────────────────────────────────
// Conteúdo mock da aba "Lesão de Pele" — sem backend real, ver CLAUDE.md.

type View = "ativas" | "cicatrizadas" | "cicatrizada-detalhe";

export function SkinLesionTab() {
  const [side, setSide] = useState<"front" | "back">("front");
  const [flipping, setFlipping] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [view, setView] = useState<View>("ativas");
  const [selectedHealedId, setSelectedHealedId] = useState<number | null>(null);

  function flip() {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => {
      setSide((s) => (s === "front" ? "back" : "front"));
      setFlipping(false);
    }, 150);
  }

  const selectedLesion = MOCK_LESIONS.find((l) => l.id === selectedId) ?? null;
  const selectedHealedLesion = MOCK_HEALED_LESIONS.find((l) => l.id === selectedHealedId) ?? null;
  const frontCount = MOCK_LESIONS.filter(l => l.side === "front").length;
  const backCount = MOCK_LESIONS.filter(l => l.side === "back").length;

  return (
    <div
      className="flex flex-col rounded-2xl"
      style={{
        background: "#131823",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center px-6 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Image src="/skinone.png" alt="skinOne" width={80} height={22} />
      </div>

      {/* ── Summary bar ── */}
      <div
        className="flex items-center justify-start gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
      >
        <button
          onClick={() => setView("ativas")}
          className="flex flex-col items-center justify-between px-5 py-3 rounded-xl transition-colors hover:bg-white/[0.06]"
          style={{
            background: view === "ativas" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            width: 128, height: 92,
          }}
        >
          <p className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>Lesões Ativas</p>
          <p className="text-3xl font-bold leading-none">{LESION_COUNT}</p>
          <span />
        </button>
        <button
          onClick={() => { setView("cicatrizadas"); setSelectedHealedId(null); }}
          className="flex flex-col items-center justify-between px-5 py-3 rounded-xl transition-colors hover:bg-white/[0.06]"
          style={{
            background: view !== "ativas" ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            width: 128, height: 92,
          }}
        >
          <p className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.38)" }}>Cicatrizadas</p>
          <p className="text-3xl font-bold leading-none">{HEALED_LESION_COUNT}</p>
          <span />
        </button>
        <div
          className="flex flex-col items-center justify-between px-5 py-3 rounded-xl"
          style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)", width: 128, height: 92 }}
        >
          <p className="text-xs text-center leading-tight" style={{ color: "rgba(56,189,248,0.6)" }}>Braden</p>
          <p className="text-3xl font-bold leading-none" style={{ color: "#38bdf8" }}>10</p>
          <p className="text-[10px] font-semibold" style={{ color: "#38bdf8" }}>Alto Risco</p>
        </div>
      </div>

      {view === "ativas" && (
        <>
          {/* ── Body + lista de lesões ativas ── */}
          <div className="flex">
            {/* Left: silhouette column — largura alinhada com o bloco de cards do resumo (Braden) */}
            <div
              className="flex flex-col items-center gap-3 py-4 px-3 shrink-0"
              style={{ width: 420, borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Flip button with counts */}
              <div className="flex items-center gap-2 w-full justify-center">
                <span
                  className="text-sm tabular-nums"
                  style={{ color: side === "front" ? "#fff" : "rgba(255,255,255,0.65)" }}
                >
                  {frontCount} frente
                </span>
                <button
                  onClick={flip}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Virar
                </button>
                <span
                  className="text-sm tabular-nums"
                  style={{ color: side === "back" ? "#fff" : "rgba(255,255,255,0.65)" }}
                >
                  {backCount} costas
                </span>
              </div>

              {/* Side label */}
              <p className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
                {side === "front" ? "Vista Frontal" : "Vista Posterior"}
              </p>

              {/* Silhouette */}
              <div
                className="flex items-center justify-center w-full"
                style={{ transform: flipping ? "scaleX(0)" : "scaleX(1)", transition: "transform 150ms ease-in-out" }}
              >
                <BodySilhouette
                  lesions={MOCK_LESIONS}
                  side={side}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={setSelectedId}
                  onHover={setHoveredId}
                  w={190}
                  h={440}
                />
              </div>

              {/* Hint */}
              <p className="text-xs text-center leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
                Toque nos marcadores<br />para ver detalhes
              </p>
            </div>

            {/* Right: lesion list */}
            <div className="flex-1 p-4 min-w-0">
              <LesionListView
                lesions={MOCK_LESIONS}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={setSelectedId}
                onHover={setHoveredId}
              />
            </div>
          </div>

          {/* ── Detalhe da lesão selecionada: empilhado abaixo, não substitui a lista ── */}
          {selectedLesion && (
            <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <LesionDetailPanel
                key={selectedLesion.id}
                lesion={selectedLesion}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </>
      )}

      {view === "cicatrizadas" && (
        <div className="p-4">
          <HealedLesionListView
            lesions={MOCK_HEALED_LESIONS}
            onSelect={(id) => { setSelectedHealedId(id); setView("cicatrizada-detalhe"); }}
            onBack={() => setView("ativas")}
          />
        </div>
      )}

      {view === "cicatrizada-detalhe" && selectedHealedLesion && (
        <div className="p-4">
          <HealedLesionDetailPanel
            lesion={selectedHealedLesion}
            onClose={() => setView("cicatrizadas")}
          />
        </div>
      )}
    </div>
  );
}
