"use client";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const isLoggedIn = useAuthStore((s) => s.token !== null && s.user !== null);
  return { isLoggedIn };
}
