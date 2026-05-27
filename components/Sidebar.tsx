"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useAlertStore } from "@/store/alerts";
import { useAdminStore, ADMIN_TABS } from "@/store/admin";
import { useSimulationStore } from "@/store/simulation";
import { AlertsPanel } from "./AlertsPanel";
import type { UserProfile } from "@/store/auth";

const UNITS = [
  { id: "pronto-socorro",   label: "Pronto Socorro",  abbr: "PS"  },
  { id: "enfermaria",       label: "Enfermaria",       abbr: "ENF" },
  { id: "uti",              label: "UTI",              abbr: "UTI" },
  { id: "centro-cirurgico", label: "Centro Cirúrgico", abbr: "CC"  },
] as const;

const ADMIN_PROFILES: UserProfile[] = ["gestor", "executivo"];

function NavItem({
  abbr, label, active, onClick,
}: {
  abbr: string; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors w-full text-left"
      style={{
        background: active ? "rgba(59,130,246,0.08)" : "transparent",
        color: active ? "var(--accent)" : "var(--foreground)",
        borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <span
        className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
        style={{
          background: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
          color: active ? "#fff" : "var(--muted)",
        }}
      >
        {abbr}
      </span>
      {label}
    </button>
  );
}

export function Sidebar() {
  const pathname    = usePathname();
  const logout      = useAuthStore((s) => s.logout);
  const profile     = useAuthStore((s) => s.profile);
  const router      = useRouter();
  const activeCount  = useAlertStore((s) => s.activeCount);
  const lastUpdated  = useSimulationStore((s) => s.lastUpdated);
  const adminTab    = useAdminStore((s) => s.tab);
  const setAdminTab = useAdminStore((s) => s.setTab);
  const [panelOpen, setPanelOpen] = useState(false);

  const isExecutivo = profile === "executivo";
  const showAdmin   = profile !== null && ADMIN_PROFILES.includes(profile);

  return (
    <>
      <aside
        className="fixed top-0 left-0 h-full w-56 flex flex-col z-30"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-bold tracking-widest" style={{ color: "var(--accent)" }}>
            SKOPIEN
          </span>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {isExecutivo ? (
            /* ── Executivo: show only admin dashboards ── */
            <>
              <p className="px-5 pb-1 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Visão Administrativa
              </p>
              {ADMIN_TABS.map((t) => (
                <NavItem
                  key={t.id}
                  abbr={t.abbr}
                  label={t.label}
                  active={pathname.startsWith("/admin") && adminTab === t.id}
                  onClick={() => {
                    setAdminTab(t.id);
                    if (!pathname.startsWith("/admin")) router.push("/admin");
                  }}
                />
              ))}
            </>
          ) : (
            /* ── Other profiles: show clinical units ── */
            <>
              <p className="px-5 pb-1 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Unidades
              </p>
              {UNITS.map((u) => {
                const active = pathname.startsWith(`/units/${u.id}`);
                return (
                  <Link
                    key={u.id}
                    href={`/units/${u.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
                    style={{
                      background: active ? "rgba(59,130,246,0.08)" : "transparent",
                      color: active ? "var(--accent)" : "var(--foreground)",
                      borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <span
                      className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
                      style={{
                        background: active ? "var(--accent)" : "rgba(255,255,255,0.06)",
                        color: active ? "#fff" : "var(--muted)",
                      }}
                    >
                      {u.abbr}
                    </span>
                    {u.label}
                  </Link>
                );
              })}

              {/* Admin link for gestor */}
              {showAdmin && (
                <>
                  <div className="mx-5 mt-2" style={{ borderTop: "1px solid var(--border)" }} />
                  <p className="px-5 pt-3 pb-1 text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Gestão
                  </p>
                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
                    style={{
                      background: pathname.startsWith("/admin") ? "rgba(59,130,246,0.08)" : "transparent",
                      color: pathname.startsWith("/admin") ? "var(--accent)" : "var(--foreground)",
                      borderLeft: pathname.startsWith("/admin") ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    <span
                      className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
                      style={{
                        background: pathname.startsWith("/admin") ? "var(--accent)" : "rgba(255,255,255,0.06)",
                        color: pathname.startsWith("/admin") ? "#fff" : "var(--muted)",
                      }}
                    >
                      ADM
                    </span>
                    Vis. Admin.
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div className="shrink-0 p-4 flex flex-col gap-1" style={{ borderTop: "1px solid var(--border)" }}>
          {/* Alerts bell */}
          <button
            onClick={() => setPanelOpen(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors hover:bg-white/5 w-full text-left"
            style={{ color: activeCount > 0 ? "var(--status-critical)" : "var(--muted)" }}
          >
            <span className="text-base leading-none">🔔</span>
            <span>Alertas</span>
            {activeCount > 0 && (
              <span
                className="ml-auto text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold"
                style={{ background: "var(--status-critical)", color: "#fff" }}
              >
                {activeCount > 9 ? "9+" : activeCount}
              </span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout(); router.replace("/login"); }}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors hover:bg-white/5 w-full text-left"
            style={{ color: "var(--muted)" }}
          >
            <span className="text-base leading-none">↩</span>
            <span>Sair</span>
          </button>
        </div>

        {/* Last updated indicator */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--status-stable)" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ background: "var(--status-stable)" }}
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Tempo real
            </span>
            <span className="text-[11px] font-mono" style={{ color: "var(--foreground)" }}>
              {new Date(lastUpdated).toLocaleTimeString("pt-BR")}
            </span>
          </div>
        </div>
      </aside>

      {/* Alert panel overlay */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={() => setPanelOpen(false)}
          />
          <AlertsPanel onClose={() => setPanelOpen(false)} />
        </>
      )}
    </>
  );
}
