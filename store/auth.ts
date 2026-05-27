import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserProfile = "assistencial" | "gestor" | "executivo" | "paineis";

interface AuthState {
  profile: UserProfile | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const PROFILE_MAP: Record<string, UserProfile> = {
  "assistencial@hospital.com": "assistencial",
  "gestor@hospital.com": "gestor",
  "executivo@hospital.com": "executivo",
  "dashboards@hospital.com": "paineis",
};

const PASSWORD = "skopien123";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      login: (email, password) => {
        const profile = PROFILE_MAP[email.toLowerCase()];
        if (!profile || password !== PASSWORD) return false;
        set({ profile });
        return true;
      },
      logout: () => set({ profile: null }),
    }),
    { name: "skopien-auth" }
  )
);
