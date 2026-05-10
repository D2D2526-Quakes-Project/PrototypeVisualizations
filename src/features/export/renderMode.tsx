import { createContext, useContext } from "react";

export interface ExportRenderModeValue {
  showTransientUi: boolean;
  showPanelHeaders: boolean;
}

export const ExportRenderModeContext = createContext<ExportRenderModeValue | undefined>(undefined);

export function useExportRenderMode() {
  const context = useContext(ExportRenderModeContext);
  if (!context) {
    throw new Error("useExportRenderMode must be used within ExportRenderModeProvider");
  }
  return context;
}
