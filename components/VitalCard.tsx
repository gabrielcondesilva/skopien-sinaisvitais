"use client";

import { useEffect, useRef, useState } from "react";
import { VITAL_SEVERITY_COLOR } from "@/lib/vitalSeverity";
import { Icon } from "@/components/ui/Icon";

interface Props {
  label: string;
  unit: string;
  value: number | string;
  score: number;
  min?: number;
  max?: number;
  editOptions?: readonly string[];
  onEdit?: (value: string) => void;
}

export function VitalCard({ label, unit, value, score, min, max, editOptions, onEdit }: Props) {
  const color = VITAL_SEVERITY_COLOR[Math.min(score, 2)] ?? VITAL_SEVERITY_COLOR[0];
  const editable = !!editOptions && !!onEdit;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative rounded-lg p-3 flex flex-col gap-1 flex-1 min-w-0"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
        {editable && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`Editar ${label}`}
            title={`Editar ${label}`}
            className="flex items-center justify-center w-5 h-5 -mr-1 rounded transition-colors hover:bg-white/10"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="pencil" size={12} color="currentColor" />
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{unit}</span>
      </div>
      {min !== undefined && max !== undefined && (
        <div className="flex gap-2 mt-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            Mín&nbsp;<span className="font-semibold tabular-nums" style={{ color: "var(--sk-text-secondary)" }}>{min}</span>
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            Máx&nbsp;<span className="font-semibold tabular-nums" style={{ color: "var(--sk-text-secondary)" }}>{max}</span>
          </span>
        </div>
      )}

      {editable && open && (
        <div
          className="absolute left-0 top-full mt-1 z-20 rounded-lg overflow-hidden py-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", minWidth: 170, boxShadow: "0 12px 24px rgba(0,0,0,0.35)" }}
        >
          {editOptions!.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onEdit!(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{
                color: opt === value ? "var(--foreground)" : "var(--muted)",
                fontWeight: opt === value ? 600 : 400,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
