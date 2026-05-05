"use client";
import { createContext, useContext, ReactNode } from "react";

type EnvConfig = {
  apiUrl: string;
};

const ConfigContext = createContext<EnvConfig | null>(null);

export function ConfigProvider({ children, config }: { children: ReactNode; config: EnvConfig }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useEnv() {
  const context = useContext(ConfigContext);
  if (!context) throw new Error("useEnv should be used inside a ConfigProvider");
  return context;
}
