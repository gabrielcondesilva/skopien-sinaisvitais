"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useAdminStore, ADMIN_TABS } from "@/store/admin";
import { useSidebarStore } from "@/store/sidebar";
import { useSimulationStore } from "@/store/simulation";
import { Icon } from "./ui/Icon";
import Image from "next/image";
import type { UserProfile } from "@/store/auth";

const UNITS = [
  { id: "pronto-socorro",   label: "Pronto Socorro",  abbr: "PS"  },
  { id: "enfermaria",       label: "Enfermaria",       abbr: "ENF" },
  { id: "uti",              label: "UTI",              abbr: "UTI" },
  { id: "centro-cirurgico", label: "Centro Cirúrgico", abbr: "CC"  },
] as const;

const ADMIN_PROFILES: UserProfile[] = ["gestor", "executivo"];

const EXPANDED_W = 224;
const COLLAPSED_W = 56;

function NavLink({
  href, abbr, label, active, collapsed,
}: {
  href: string; abbr: string; label: string; active: boolean; collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className="flex items-center justify-center py-2 w-full transition-colors"
        style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent" }}
      >
        <span
          className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
          style={{
            background: active ? "var(--sk-g300)" : "rgba(255,255,255,0.06)",
            color: active ? "var(--sk-g900)" : "var(--muted)",
          }}
        >
          {abbr}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
      style={{
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "var(--sk-g100)" : "var(--foreground)",
        borderLeft: active ? "2px solid var(--sk-g300)" : "2px solid transparent",
      }}
    >
      <span
        className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
        style={{
          background: active ? "var(--sk-g300)" : "rgba(255,255,255,0.06)",
          color: active ? "var(--sk-g900)" : "var(--muted)",
        }}
      >
        {abbr}
      </span>
      {label}
    </Link>
  );
}

function NavBtn({
  abbr, label, active, onClick, collapsed,
}: {
  abbr: string; label: string; active: boolean; onClick?: () => void; collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={label}
        className="flex items-center justify-center py-2 w-full transition-colors"
        style={{ background: active ? "rgba(255,255,255,0.06)" : "transparent" }}
      >
        <span
          className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
          style={{
            background: active ? "var(--sk-g300)" : "rgba(255,255,255,0.06)",
            color: active ? "var(--sk-g900)" : "var(--muted)",
          }}
        >
          {abbr}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors w-full text-left"
      style={{
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "var(--sk-g100)" : "var(--foreground)",
        borderLeft: active ? "2px solid var(--sk-g300)" : "2px solid transparent",
      }}
    >
      <span
        className="text-xs font-mono w-9 text-center rounded px-1 py-0.5 shrink-0"
        style={{
          background: active ? "var(--sk-g300)" : "rgba(255,255,255,0.06)",
          color: active ? "var(--sk-g900)" : "var(--muted)",
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
  const profile     = useAuthStore((s) => s.profile);
  const router      = useRouter();
  const adminTab    = useAdminStore((s) => s.tab);
  const setAdminTab = useAdminStore((s) => s.setTab);
  const collapsed    = useSidebarStore((s) => s.collapsed);
  const toggle       = useSidebarStore((s) => s.toggle);
  const internacoes  = useSimulationStore((s) => s.internacoes);

  // Mantém a unidade destacada mesmo dentro de /patients/[id]
  let activeUnit: string | null = null;
  if (pathname.startsWith("/units/")) {
    activeUnit = pathname.split("/")[2] ?? null;
  } else if (pathname.startsWith("/patients/")) {
    const internacaoId = pathname.split("/")[2];
    activeUnit = internacoes[internacaoId]?.unit ?? null;
  }

  const isExecutivo = profile === "executivo";
  const showAdmin   = profile !== null && ADMIN_PROFILES.includes(profile);

  const sidebarW = collapsed ? COLLAPSED_W : EXPANDED_W;

  return (
    <div
      className="fixed top-0 left-0 h-full z-30"
      style={{ width: sidebarW, transition: "width 200ms ease" }}
    >
      <aside
        className="h-full flex flex-col overflow-hidden"
        style={{
          width: "100%",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-center px-3 pt-4 pb-3 shrink-0"
          style={{ minHeight: 72 }}
        >
          {collapsed ? (
            <Image
              src="/logo-circulo.png"
              alt="SKOPIEN"
              width={34}
              height={34}
              priority
            />
          ) : (
            <Image
              src="/logo_branca.png"
              alt="SKOPIEN"
              width={140}
              height={42}
              priority
            />
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          {isExecutivo ? (
            <>
              {!collapsed && (
                <p
                  className="px-5 pb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sk-text-secondary)" }}
                >
                  Visão Administrativa
                </p>
              )}
              {ADMIN_TABS.map((t) => (
                <NavBtn
                  key={t.id}
                  abbr={t.abbr}
                  label={t.label}
                  collapsed={collapsed}
                  active={pathname.startsWith("/admin") && adminTab === t.id}
                  onClick={() => {
                    setAdminTab(t.id);
                    if (!pathname.startsWith("/admin")) router.push("/admin");
                  }}
                />
              ))}
            </>
          ) : (
            <>
              {!collapsed && (
                <p
                  className="px-5 pb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--sk-text-secondary)" }}
                >
                  Unidades
                </p>
              )}
              {UNITS.map((u) => (
                <NavLink
                  key={u.id}
                  href={`/units/${u.id}`}
                  abbr={u.abbr}
                  label={u.label}
                  collapsed={collapsed}
                  active={activeUnit === u.id}
                />
              ))}

              {showAdmin && (
                <>
                  {!collapsed && (
                    <>
                      <div className="mx-5 mt-2" style={{ borderTop: "1px solid var(--border)" }} />
                      <p
                        className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--sk-text-secondary)" }}
                      >
                        Gestão
                      </p>
                    </>
                  )}
                  <NavLink
                    href="/admin"
                    abbr="ADM"
                    label="Vis. Admin."
                    collapsed={collapsed}
                    active={pathname.startsWith("/admin")}
                  />
                </>
              )}
            </>
          )}
        </nav>

        {/* SkinOne integration logo */}
        <div
          className="shrink-0 flex items-center justify-center py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {collapsed ? (
            <Image
              src="/logo-skin.png"
              alt="skinOne"
              width={28}
              height={34}
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--muted)" }}>
                Integrado com
              </span>
              <Image
                src="/skinone.png"
                alt="skinOne"
                width={100}
                height={28}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Toggle button — flutuante na divisa sidebar/conteúdo */}
      <button
        onClick={toggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className="absolute flex items-center justify-center transition-colors"
        style={{
          top: 18,
          right: -10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
          cursor: "pointer",
          zIndex: 1,
        }}
      >
        <Icon
          name={collapsed ? "chevron-right" : "chevron-left"}
          size={11}
          color="currentColor"
        />
      </button>
    </div>
  );
}
