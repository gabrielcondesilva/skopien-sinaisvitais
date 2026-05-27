"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { PROFILE_HOME } from "@/lib/auth";

export default function Root() {
  const profile = useAuthStore((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (profile) {
      router.replace(PROFILE_HOME[profile]);
    } else {
      router.replace("/login");
    }
  }, [profile, router]);

  return null;
}
