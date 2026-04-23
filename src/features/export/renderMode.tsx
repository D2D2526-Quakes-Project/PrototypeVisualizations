import { createContext, useContext, type ReactNode } from "react";

export interface ExportRenderModeValue {
  showTransientUi: boolean;
  showPanelHeaders: boolean;
}

const DEFAULT_EXPORT_RENDER_MODE: ExportRenderModeValue = {
  showTransientUi: false,
  showPanelHeaders: false,
};

const ExportRenderModeContext = createContext<ExportRenderModeValue>(DEFAULT_EXPORT_RENDER_MODE);

export function ExportRenderModeProvider({ children, value }: { children: ReactNode; value: ExportRenderModeValue }) {
  return <ExportRenderModeContext.Provider value={value}>{children}</ExportRenderModeContext.Provider>;
}

export function useExportRenderMode() {
  return useContext(ExportRenderModeContext);
}
