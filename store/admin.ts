import { create } from "zustand";

export type AdminTab = "ps" | "enf" | "uti" | "cc" | "alertas";

export const ADMIN_TABS: { id: AdminTab; label: string; abbr: string }[] = [
  { id: "uti",     label: "UTI",              abbr: "UTI" },
  { id: "ps",      label: "Pronto Socorro",   abbr: "PS"  },
  { id: "enf",     label: "Enfermaria",       abbr: "ENF" },
  { id: "cc",      label: "Centro Cirúrgico", abbr: "CC"  },
  { id: "alertas", label: "Alertas",          abbr: "ALT" },
];

interface AdminState {
  tab: AdminTab;
  setTab: (tab: AdminTab) => void;
}

export const useAdminStore = create<AdminState>()((set) => ({
  tab: "uti",
  setTab: (tab) => set({ tab }),
}));
