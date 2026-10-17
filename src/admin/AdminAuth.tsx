import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminApi, onUnauthorized, type AdminUser } from "@/admin/api";

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: AdminUser };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user for the admin UI. This only shapes what the screen shows.
 * Every API call is still checked on the server, so a tampered client gains nothing.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    adminApi
      .me()
      .then(({ user }) => alive && setState({ status: "authenticated", user }))
      .catch(() => alive && setState({ status: "anonymous" }));
    // Any 401 from the API means the session ended elsewhere (timeout, sign-out in another tab, password change).
    const off = onUnauthorized(() => setState({ status: "anonymous" }));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await adminApi.login(email, password);
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout().catch(() => undefined);
    setState({ status: "anonymous" });
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
