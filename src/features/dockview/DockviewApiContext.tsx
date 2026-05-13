// @refresh reset
/* eslint-disable react-refresh/only-export-components */

import type { DockviewApi } from "dockview-react";
import { createContext, useContext, type ReactNode } from "react";

const DockviewApiContext = createContext<DockviewApi | null>(null);

export function DockviewApiProvider({ api, children }: { api: DockviewApi; children: ReactNode }) {
  return <DockviewApiContext.Provider value={api}>{children}</DockviewApiContext.Provider>;
}

export function useDockviewApi(): DockviewApi | null {
  return useContext(DockviewApiContext);
}
