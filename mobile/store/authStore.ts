import { create } from "zustand";
import type { AuthSession, AuthUser } from "@/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  isHydrating: boolean;
  isSigningIn: boolean;
  setHydrated: (value: boolean) => void;
  setHydrating: (value: boolean) => void;
  setSigningIn: (value: boolean) => void;
  setSession: (session: AuthSession) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,
  isHydrating: false,
  isSigningIn: false,
  setHydrated: (value) => set({ isHydrated: value }),
  setHydrating: (value) => set({ isHydrating: value }),
  setSigningIn: (value) => set({ isSigningIn: value }),
  setSession: (session) =>
    set({
      token: session.token,
      user: session.user
    }),
  updateUser: (user) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : state.user
    })),
  clearSession: () =>
    set({
      token: null,
      user: null
    })
}));
