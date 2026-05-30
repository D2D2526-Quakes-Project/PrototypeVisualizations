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
  // State
  status: ExportStatus;
  progress: number;
  statusLabel: string;
  etaSeconds: number | null;
  error: string | null;
  downloadUrl: string | null;
  downloadName: string;
  mode: ExportMode;
  startFrame: number;
  endFrame: number;
  fps: ExportFps;
  scale: ExportScale;
  outputFormat: string;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  rangeValue: [number, number];
  panelSelections: ExportPanelSelection[];
  isRecording: boolean;
  isExporting: boolean;
  requiresFfmpeg: boolean;
  ffmpegReady: boolean;
  ffmpegLoadLabel: string;
  ffmpegLoadProgress: number;
  
  // Derived
  sourceFps: number;
  fixedFps: number;
  isVariableFps: boolean;
  sourceDurationSeconds: number;
  sampledFrames: number[];
  durationSeconds: number;
  baseDownloadName: string;
  maxTime: number;
  startSeconds: number;
  endSeconds: number;

  // Actions
  openExportPanel: () => void;
  handleSheetOpenChange: (open: boolean) => void;
  handleRangeChange: (value: number[]) => void;
  handleStartRecording: () => void;
  handleStopNow: () => void;
  handleCancel: () => void;
  setMode: (mode: ExportMode) => void;
  setFps: (fps: ExportFps) => void;
  setScale: (scale: ExportScale) => void;
  setOutputFormat: (format: string) => void;
  setShowTransientUi: (show: boolean) => void;
  setShowPanelHeaders: (show: boolean) => void;
  setPanelSelections: (selections: ExportPanelSelection[]) => void;
}
