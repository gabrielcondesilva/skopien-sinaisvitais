"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useAlertStore } from "@/store/alerts";
import { useSimulationStore } from "@/store/simulation";
import { AlertsPanel } from "./AlertsPanel";
import { Icon } from "./ui/Icon";
import type { UnitId, UtiTipo } from "@/lib/simulation/types";
import { UNIT_LABELS, UTI_TIPO_LABELS } from "@/lib/units";

const UTI_TIPO_OPTIONS: Array<{ value: UtiTipo | "todos"; label: string }> = [
  { value: "todos", label: "Todos" },
  ...(Object.entries(UTI_TIPO_LABELS) as Array<[UtiTipo, string]>).map(([value, label]) => ({ value, label })),
];

const HOSPITAL_NAME = "Hospital Demo Skopien";

const PROFILE_LABELS: Record<string, string> = {
  assistencial: "Profissional Assistencial",
  gestor: "Gestor",
  executivo: "Executivo",
};

function formatDate(): string {
  const str = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopBar() {
  const logout = useAuthStore((s) => s.logout);
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useAlertStore((s) => s.active);
  const internacoes = useSimulationStore((s) => s.internacoes);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dateStr, setDateStr] = useState("");

  const unitFilter = useMemo((): UnitId | null => {
    const unitMatch = pathname.match(/^\/units\/([^/]+)/);
    if (unitMatch) return unitMatch[1] as UnitId;
    const patientMatch = pathname.match(/^\/patients\/([^/]+)/);
    if (patientMatch) return internacoes[patientMatch[1]]?.unit ?? null;
    return null;
  }, [pathname, internacoes]);

  // Só nas páginas de unidade (Leitos) o header substitui o nome do hospital
  // pelo nome da página — libera espaço vertical que antes ia pro <h1> da página.
  const unitPageMatch = pathname.match(/^\/units\/([^/]+)/);
  const currentUnit = unitPageMatch ? (unitPageMatch[1] as UnitId) : null;
  const headerTitle = currentUnit ? (UNIT_LABELS[currentUnit] ?? currentUnit) : HOSPITAL_NAME;

  const utiTipoValue = searchParams.get("utiTipo") ?? "todos";

  function handleUtiTipoChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todos") params.delete("utiTipo");
    else params.set("utiTipo", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeCount = unitFilter
    ? active.filter((a) => a.unit === unitFilter).length
    : active.length;

  useEffect(() => {
    setDateStr(formatDate());
  }, []);

  const profileLabel = profile ? (PROFILE_LABELS[profile] ?? profile) : "";
  const isAntonio = useAuthStore((s) => s.email === "antonio@hospital.com");

  return (
    <>
      <div
        className="flex items-center justify-between px-6 h-14 shrink-0"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: hospital name / unit title + date */}
        <div className="flex items-center gap-4">
          <span className={currentUnit ? "font-bold text-xl tracking-tight" : "font-semibold text-sm"}>
            {headerTitle}
          </span>
          {currentUnit === "uti" && (
            <select
              value={utiTipoValue}
              onChange={(e) => handleUtiTipoChange(e.target.value)}
              aria-label="Filtrar por tipo de UTI"
              className="text-xs rounded-md px-2 py-1 outline-none cursor-pointer"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
              }}
            >
              {UTI_TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          {dateStr && !isAntonio && (
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {dateStr}
            </span>
          )}
        </div>

        {/* Right: profile + alerts + logout */}
        <div className="flex items-center gap-0.5">
          {/* Profile */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 text-sm"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="user-circle" size={15} color="currentColor" />
            <span className="text-xs">{profileLabel}</span>
          </div>

          {/* Alerts bell */}
          <button
            onClick={() => setPanelOpen(true)}
            aria-label="Abrir painel de alertas"
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              activeCount > 0 ? "sk-alert-blink" : "hover:bg-white/5"
            }`}
            style={{
              color: activeCount > 0 ? "var(--status-critical)" : "var(--muted)",
            }}
          >
            <Icon name="bell-ringing" size={17} color="currentColor" />
            {activeCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1"
                style={{ background: "var(--status-critical)", color: "#fff" }}
              >
                {activeCount > 99 ? "99+" : activeCount}
              </span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            aria-label="Sair da sessão"
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--muted)" }}
          >
            <Icon name="logout" size={17} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Alert panel overlay */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setPanelOpen(false)}
          />
          <AlertsPanel onClose={() => setPanelOpen(false)} unitFilter={unitFilter} />
        </>
      )}
    </>
  );
}
