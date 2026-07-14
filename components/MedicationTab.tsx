"use client";

import { useState } from "react";

// Conteúdo mock da aba "Medicamento" — sem backend real, ver CLAUDE.md.

interface Prescription {
  id: string;
  name: string;
  dose: string;
  route: string;
  scheduledAt: string;
  status: "administrado" | "atrasado" | "pendente";
  administeredAt?: string;
}

const MOCK_PRESCRIPTIONS: Prescription[] = [
  { id: "1", name: "Dipirona 1g",            dose: "1g",     route: "EV",  scheduledAt: "10/07 08:00", status: "administrado", administeredAt: "10/07 08:05" },
  { id: "2", name: "Losartana 50mg",         dose: "50mg",   route: "VO",  scheduledAt: "10/07 08:00", status: "administrado", administeredAt: "10/07 08:10" },
  { id: "3", name: "Omeprazol 40mg",         dose: "40mg",   route: "EV",  scheduledAt: "10/07 09:00", status: "administrado", administeredAt: "10/07 09:02" },
  { id: "4", name: "Ceftriaxona 1g",         dose: "1g",     route: "EV",  scheduledAt: "10/07 12:00", status: "atrasado" },
  { id: "5", name: "Enoxaparina 40mg",       dose: "40mg",   route: "SC",  scheduledAt: "10/07 20:00", status: "pendente" },
  { id: "6", name: "Paracetamol 750mg",      dose: "750mg",  route: "VO",  scheduledAt: "10/07 14:00", status: "pendente" },
];

const STATUS_LABEL: Record<Prescription["status"], string> = {
  administrado: "Administrado",
  atrasado:     "Atrasado",
  pendente:     "Pendente",
};

const STATUS_COLOR: Record<Prescription["status"], string> = {
  administrado: "var(--status-stable)",
  atrasado:     "var(--status-critical)",
  pendente:     "var(--status-attention)",
};

export const MEDICATION_ALERT_COUNT = MOCK_PRESCRIPTIONS.filter((p) => p.status === "atrasado").length;

const FILTERS = ["todos", "administrado", "atrasado", "pendente"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  todos:         "Todos",
  administrado:  "Administrados",
  atrasado:      "Atrasados",
  pendente:      "Pendentes",
};

export function MedicationTab() {
  const [filter, setFilter] = useState<Filter>("todos");

  const list = filter === "todos"
    ? MOCK_PRESCRIPTIONS
    : MOCK_PRESCRIPTIONS.filter((p) => p.status === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 p-1 rounded-lg flex-wrap" style={{ background: "rgba(255,255,255,0.04)" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3 py-1.5 rounded-md transition-colors"
            style={{
              background: filter === f ? "var(--surface)" : "transparent",
              color: filter === f ? "var(--foreground)" : "var(--muted)",
              fontWeight: filter === f ? 600 : 400,
              border: filter === f ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: "var(--muted)" }}>Nenhuma prescrição nesta lista</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((p) => (
            <div
              key={p.id}
              className="rounded-lg p-3 flex items-center justify-between gap-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug">{p.name}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                  {p.route} · Horário previsto {p.scheduledAt}
                  {p.status === "administrado" && p.administeredAt && ` · Administrado ${p.administeredAt}`}
                </p>
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium"
                style={{
                  background: `${STATUS_COLOR[p.status]}22`,
                  color: STATUS_COLOR[p.status],
                }}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
