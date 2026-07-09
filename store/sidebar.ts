import { create } from "zustand";

interface SidebarStore {
  collapsed: boolean;
  fullscreen: boolean;
  toggle: () => void;
  setFullscreen: (fullscreen: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()((set) => ({
  collapsed: false,
  fullscreen: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  setFullscreen: (fullscreen) => set({ fullscreen }),
}));
