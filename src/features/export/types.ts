export type ExportMode = "workspace" | "separate-panels";
export type ExportStatus = "idle" | "loading" | "ready" | "recording" | "processing" | "complete" | "error";
export type ExportFps = "variable" | 10 | 15 | 24 | 30 | 60;
export type ExportScale = 1 | 1.5 | 2 | 3;

export interface ExportPanelSelection {
  panelId: string;
  title: string;
  enabled: boolean;
}

export interface PanelCaptureTarget {
  panelId: string;
  title: string;
  element: HTMLElement;
  width: number;
  height: number;
}

export interface ExportConfig {
  mode: ExportMode;
  startFrame: number;
  endFrame: number;
  fps: ExportFps;
  scale: ExportScale;
  outputFormat: string;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
}

export interface ExportContextValue {
  openExportPanel: () => void;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  frameloop: "always" | "demand";
  exportStatus: ExportStatus;
  exportProgress: number;
  exportStatusLabel: string;
}
