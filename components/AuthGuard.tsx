"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { PROFILE_HOME, canAccess } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const email = useAuthStore((s) => s.email);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!canAccess(profile, pathname, email)) {
      router.replace(PROFILE_HOME[profile]);
    }
  }, [profile, email, pathname, router]);

  if (!profile) return null;
  if (!canAccess(profile, pathname, email)) return null;

  return <>{children}</>;
}
