import { createContext, useContext, type ReactNode } from "react";
import { useMyDb } from "./useMyDb";

type MyDbApi = ReturnType<typeof useMyDb>;

const MyDbCtx = createContext<MyDbApi | null>(null);

export function MyDbProvider({ children }: { children: ReactNode }) {
  const api = useMyDb();
  return <MyDbCtx.Provider value={api}>{children}</MyDbCtx.Provider>;
}

export function useMyDbContext(): MyDbApi {
  const ctx = useContext(MyDbCtx);
  if (!ctx) throw new Error("useMyDbContext must be used within MyDbProvider");
  return ctx;
}
