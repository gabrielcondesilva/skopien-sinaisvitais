"use client";

import { useState } from "react";
import type { SlotReading } from "@/lib/simulation/types";
import { VitalChartCard, VITALS_CFG } from "./VitalsChart";
import { EWSScoreChart } from "./EWSScoreChart";
import { Icon } from "./ui/Icon";

type ChartId = "ews" | (typeof VITALS_CFG)[number]["key"];

const DEFAULT_ORDER: ChartId[] = ["ews", ...VITALS_CFG.map((v) => v.key)];

const VITAL_BY_KEY = Object.fromEntries(VITALS_CFG.map((v) => [v.key, v])) as Record<
  (typeof VITALS_CFG)[number]["key"],
  (typeof VITALS_CFG)[number]
>;

function DragHandle() {
  return (
    <span
      className="flex items-center justify-center w-5 h-5 rounded shrink-0"
      style={{ color: "var(--muted)", cursor: "grab" }}
      title="Arraste para reordenar"
    >
      <Icon name="grip-vertical" size={14} color="currentColor" />
    </span>
  );
}

interface Props {
  slots: SlotReading[];
  syncId?: string;
}

// Permite arrastar e reordenar os gráficos de Sinais Vitais (EWS + 5 vitais) —
// só faz sentido no Pronto Socorro e na UTI, onde cada gráfico ocupa a largura
// toda; na Enfermaria (Antonio) o layout já é fixo em grid 2x3.
export function ReorderableVitalsCharts({ slots, syncId }: Props) {
  const [order, setOrder] = useState<ChartId[]>(DEFAULT_ORDER);
  const [draggedId, setDraggedId] = useState<ChartId | null>(null);
  const [dragOverId, setDragOverId] = useState<ChartId | null>(null);

  function handleDrop(targetId: ChartId) {
    setOrder((prev) => {
      if (!draggedId || draggedId === targetId) return prev;
      const next = [...prev];
      const from = next.indexOf(draggedId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedId);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {order.map((id) => {
        const isDragging = draggedId === id;
        const isDragOver = dragOverId === id && draggedId !== null && draggedId !== id;

        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDraggedId(id)}
            onDragOver={(e) => { e.preventDefault(); setDragOverId(id); }}
            onDragLeave={() => setDragOverId((cur) => (cur === id ? null : cur))}
            onDrop={(e) => { e.preventDefault(); handleDrop(id); }}
            onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
            style={{
              opacity: isDragging ? 0.4 : 1,
              outline: isDragOver ? "2px solid var(--accent)" : "2px solid transparent",
              outlineOffset: 2,
              borderRadius: 8,
              cursor: "grab",
              transition: "opacity 120ms ease, outline-color 120ms ease",
            }}
          >
            {id === "ews" ? (
              <EWSScoreChart slots={slots} syncId={syncId} headerExtra={<DragHandle />} />
            ) : (
              <VitalChartCard vital={VITAL_BY_KEY[id]} slots={slots} syncId={syncId} headerExtra={<DragHandle />} />
            )}
          </div>
        );
      })}
    </div>
  );
}
