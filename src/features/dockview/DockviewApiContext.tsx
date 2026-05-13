import type { DockviewApi } from "dockview";
import { createContext, useContext, type ReactNode } from "react";

const DockviewApiContext = createContext<DockviewApi | null>(null);

export function DockviewApiProvider({ api, children }: { api: DockviewApi; children: ReactNode }) {
  return <DockviewApiContext.Provider value={api}>{children}</DockviewApiContext.Provider>;
}

export function useDockviewApi(): DockviewApi | null {
  return useContext(DockviewApiContext);
}
