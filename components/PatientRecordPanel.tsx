"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

// ─── Mock data ──────────────────────────────────────────────────────────────
// Demonstrativo — sem backend real, ver CLAUDE.md.

interface ExamEntry {
  id: string;
  name: string;
  requestedAt: string;
  status: "realizado" | "pendente";
  resultAt?: string;
  resultSummary?: string;
}

const MOCK_EXAMS: ExamEntry[] = [
  { id: "1", name: "Hemograma Completo",     requestedAt: "10/07 07:40", status: "realizado", resultAt: "10/07 08:55", resultSummary: "Leucocitose leve (12.400/mm³). Demais parâmetros dentro da normalidade." },
  { id: "2", name: "Raio-X de Tórax",        requestedAt: "10/07 07:45", status: "realizado", resultAt: "10/07 08:20", resultSummary: "Sem sinais de fratura ou derrame pleural. Campos pulmonares livres." },
  { id: "3", name: "Tomografia de Crânio",   requestedAt: "10/07 08:10", status: "realizado", resultAt: "10/07 09:30", resultSummary: "Sem sinais de sangramento intracraniano agudo." },
  { id: "4", name: "Gasometria Arterial",    requestedAt: "10/07 08:15", status: "pendente" },
  { id: "5", name: "Eletrocardiograma",      requestedAt: "10/07 09:05", status: "pendente" },
  { id: "6", name: "Ureia e Creatinina",     requestedAt: "10/07 09:10", status: "pendente" },
];

interface EvolucaoEntry { time: string; author: string; text: string }
interface ProcedimentoEntry { name: string; time: string; status: string }

const PRONTUARIO = {
  anamnese:
    "Paciente masculino, 81 anos, trazido ao PS após queda da própria altura em domicílio, com trauma em região occipital e escoriações em membro superior direito. Nega perda de consciência presenciada. Familiar relata confusão leve pós-queda, resolvida espontaneamente. Nega uso de anticoagulantes. Hipertenso em uso de Losartana 50mg/dia.",
  exameFisico: [
    { label: "Estado geral",         value: "Regular, orientado em tempo e espaço" },
    { label: "Ausculta cardíaca",    value: "Bulhas rítmicas normofonéticas, sem sopros" },
    { label: "Ausculta pulmonar",    value: "Murmúrio vesicular presente bilateralmente, sem ruídos adventícios" },
    { label: "Abdome",               value: "Plano, flácido, indolor à palpação" },
    { label: "Neurológico",          value: "Glasgow 15, pupilas isocóricas e fotorreagentes" },
    { label: "Pele/Extremidades",    value: "Escoriação em cotovelo direito, sem sangramento ativo" },
  ] satisfies { label: string; value: string }[],
  evolucao: [
    { time: "10/07 07:35", author: "Enf. Marcia Souza",  text: "Paciente admitido no PS, vitais estáveis, avaliação inicial de trauma realizada." },
    { time: "10/07 08:00", author: "Dr. Ricardo Alves",  text: "Solicitados exames de imagem. Analgesia prescrita para dor em cotovelo." },
    { time: "10/07 09:35", author: "Dr. Ricardo Alves",  text: "TC de crânio sem alterações agudas. Mantida observação clínica." },
  ] satisfies EvolucaoEntry[],
  procedimentos: [
    { name: "Curativo em escoriação — cotovelo D",  time: "10/07 08:05", status: "Realizado" },
    { name: "Analgesia EV — Dipirona 1g",           time: "10/07 08:10", status: "Realizado" },
    { name: "Reavaliação neurológica seriada",      time: "10/07 09:00", status: "Em andamento" },
  ] satisfies ProcedimentoEntry[],
};

// ─── Shared bits ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}

// ─── Exames ─────────────────────────────────────────────────────────────────

function ExamesContent() {
  const [filter, setFilter] = useState<"realizado" | "pendente">("realizado");
  const realizados = MOCK_EXAMS.filter((e) => e.status === "realizado");
  const pendentes  = MOCK_EXAMS.filter((e) => e.status === "pendente");
  const list = filter === "realizado" ? realizados : pendentes;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
        {([
          { key: "realizado" as const, label: `Realizados (${realizados.length})` },
          { key: "pendente"  as const, label: `Pendentes (${pendentes.length})` },
        ]).map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className="flex-1 text-xs py-1.5 rounded-md transition-colors"
            style={{
              background: filter === opt.key ? "var(--surface)" : "transparent",
              color: filter === opt.key ? "var(--foreground)" : "var(--muted)",
              fontWeight: filter === opt.key ? 600 : 400,
              border: filter === opt.key ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: "var(--muted)" }}>Nenhum exame nesta lista</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((exam) => (
            <div
              key={exam.id}
              className="rounded-lg p-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold leading-snug">{exam.name}</p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                  style={{
                    background: exam.status === "realizado" ? "rgba(47,158,68,0.15)" : "rgba(245,159,0,0.15)",
                    color: exam.status === "realizado" ? "var(--status-stable)" : "var(--status-attention)",
                  }}
                >
                  {exam.status === "realizado" ? "Realizado" : "Pendente"}
                </span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                Solicitado {exam.requestedAt}
              </p>
              {exam.status === "realizado" && (
                <>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                    Resultado {exam.resultAt}
                  </p>
                  {exam.resultSummary && (
                    <p className="text-xs mt-1.5 leading-snug" style={{ color: "var(--sk-text-secondary)" }}>
                      {exam.resultSummary}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Prontuário ─────────────────────────────────────────────────────────────

const PRONTUARIO_TABS = ["Anamnese", "Exame Físico", "Evolução Clínica", "Procedimentos"] as const;
type ProntuarioTab = (typeof PRONTUARIO_TABS)[number];

function ProntuarioContent() {
  const [tab, setTab] = useState<ProntuarioTab>("Anamnese");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRONTUARIO_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            style={{
              background: tab === t ? "var(--accent)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#fff" : "var(--muted)",
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Anamnese" && (
        <div className="rounded-lg p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <SectionLabel>Relato / História Clínica</SectionLabel>
          <p className="text-xs leading-relaxed" style={{ color: "var(--sk-text-secondary)" }}>
            {PRONTUARIO.anamnese}
          </p>
        </div>
      )}

      {tab === "Exame Físico" && (
        <div className="flex flex-col gap-2">
          {PRONTUARIO.exameFisico.map((item) => (
            <div
              key={item.label}
              className="rounded-lg p-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                {item.label}
              </p>
              <p className="text-xs mt-1 leading-snug" style={{ color: "var(--sk-text-secondary)" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "Evolução Clínica" && (
        <div className="relative flex flex-col">
          {PRONTUARIO.evolucao.map((e, i) => (
            <div key={i} className="flex gap-2.5 pb-4 relative">
              {i < PRONTUARIO.evolucao.length - 1 && (
                <div
                  className="absolute"
                  style={{ left: 4, top: 12, bottom: 0, width: 1, background: "var(--border)" }}
                />
              )}
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 relative z-10 mt-1"
                style={{ background: "var(--accent)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold" style={{ color: "var(--foreground)" }}>{e.time}</span>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>· {e.author}</span>
                </div>
                <p className="text-xs mt-1 leading-snug" style={{ color: "var(--sk-text-secondary)" }}>
                  {e.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Procedimentos" && (
        <div className="flex flex-col gap-2">
          {PRONTUARIO.procedimentos.map((p, i) => (
            <div
              key={i}
              className="rounded-lg p-3 flex items-center justify-between gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium leading-snug">{p.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>{p.time}</p>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                style={{
                  background: p.status === "Realizado" ? "rgba(47,158,68,0.15)" : "rgba(245,159,0,0.15)",
                  color: p.status === "Realizado" ? "var(--status-stable)" : "var(--status-attention)",
                }}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel shell ────────────────────────────────────────────────────────────

interface Props {
  mode: "exames" | "prontuario";
  patientName: string;
  onClose: () => void;
}

export function PatientRecordPanel({ mode, patientName, onClose }: Props) {
  return (
    <div
      className="sticky top-6 shrink-0 flex flex-col rounded-lg overflow-hidden"
      style={{
        width: 380,
        maxHeight: "calc(100vh - 96px)",
        background: "var(--background)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon name={mode === "exames" ? "flask" : "file-text"} size={15} color="var(--muted)" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {mode === "exames" ? "Exames" : "Prontuário"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{patientName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar painel"
          className="flex items-center justify-center w-6 h-6 rounded transition-colors hover:bg-white/10 shrink-0"
          style={{ color: "var(--muted)" }}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {mode === "exames" ? <ExamesContent /> : <ProntuarioContent />}
      </div>
    </div>
  );
}
