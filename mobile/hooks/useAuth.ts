import { useCallback } from "react";
import { ApiClientError } from "@/services/api";
import { fetchCurrentUser, loginWithEmailPassword } from "@/services/auth";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession
} from "@/services/storage";
import { useAuthStore } from "@/store/authStore";
import type { AuthSession } from "@/types";

export function useAuth() {
  const {
    token,
    user,
    isHydrated,
    isHydrating,
    isSigningIn,
    setHydrated,
    setHydrating,
    setSigningIn,
    setSession,
    updateUser,
    clearSession
  } = useAuthStore();

  const hydrateSession = useCallback(async () => {
    if (isHydrated || isHydrating) {
      return;
    }

    setHydrating(true);

    try {
      const session = await loadAuthSession();

      if (!session) {
        clearSession();
        return;
      }

      setSession(session);

      try {
        const freshUser = await fetchCurrentUser();
        updateUser(freshUser);
        await saveAuthSession({
          token: session.token,
          user: {
            ...session.user,
            ...freshUser
          }
        });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          await clearAuthSession();
          clearSession();
        }
      }
    } finally {
      setHydrating(false);
      setHydrated(true);
    }
  }, [
    clearSession,
    isHydrated,
    isHydrating,
    setHydrated,
    setHydrating,
    setSession,
    updateUser
  ]);

  const login = useCallback(
    async (email: string, password: string) => {
      setSigningIn(true);

      try {
        const session = await loginWithEmailPassword(email, password);
        setSession(session);

        const freshUser = await fetchCurrentUser().catch(() => session.user);
        const nextSession = {
          token: session.token,
          user: {
            ...session.user,
            ...freshUser
          }
        };

        setSession(nextSession);
        await saveAuthSession(nextSession);

        return nextSession;
      } finally {
        setSigningIn(false);
      }
    },
    [setSession, setSigningIn]
  );

  const applySession = useCallback(
    async (session: AuthSession) => {
      setSigningIn(true);

      try {
        setSession(session);

        const freshUser = await fetchCurrentUser().catch(() => session.user);
        const nextSession = {
          token: session.token,
          user: {
            ...session.user,
            ...freshUser
          }
        };

        setSession(nextSession);
        await saveAuthSession(nextSession);

        return nextSession;
      } finally {
        setSigningIn(false);
      }
    },
    [setSession, setSigningIn]
  );

  const logout = useCallback(async () => {
    await clearAuthSession();
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const freshUser = await fetchCurrentUser();
    updateUser(freshUser);

    if (token && user) {
      await saveAuthSession({
        token,
        user: {
          ...user,
          ...freshUser
        }
      });
    }

    return freshUser;
  }, [token, updateUser, user]);

  return {
    token,
    user,
    isHydrated,
    isHydrating,
    isSigningIn,
    isAuthenticated: Boolean(token && user),
    hydrateSession,
    login,
    applySession,
    logout,
    refreshUser
  };
}
