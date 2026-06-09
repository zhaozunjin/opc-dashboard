"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthCtx {
  token: string | null;
  userId: string | null;
  login: (token: string, userId: string) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthCtx>({
  token: null,
  userId: null,
  login: () => {},
  logout: () => {},
  isReady: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("opc_token");
    const u = localStorage.getItem("opc_user_id");
    if (t) setToken(t);
    if (u) setUserId(u);
    setIsReady(true);
  }, []);

  const login = (t: string, u: string) => {
    localStorage.setItem("opc_token", t);
    localStorage.setItem("opc_user_id", u);
    setToken(t);
    setUserId(u);
  };

  const logout = () => {
    localStorage.removeItem("opc_token");
    localStorage.removeItem("opc_user_id");
    setToken(null);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ token, userId, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
