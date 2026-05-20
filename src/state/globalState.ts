import { type StateCreator } from "zustand";
import type { AppState } from ".";
import type { Metric, MetricPaletteKey, MetricPaletteOverrides } from "@/features/metrics/metrics";

export interface GlobalState {
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;

  showHiddenMetrics: boolean;
  setShowHiddenMetrics: (enabled: boolean) => void;

  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

export const createGlobalSlice: StateCreator<AppState, [], [], GlobalState> = (set) => ({
  metricPaletteOverrides: {},
  setMetricPalette: (metric, palette) =>
    set((state) => {
      if (palette === null) {
        const { [metric]: _removed, ...rest } = state.metricPaletteOverrides;
        return { metricPaletteOverrides: rest };
      }

      return {
        metricPaletteOverrides: {
          ...state.metricPaletteOverrides,
          [metric]: palette,
        },
      };
    }),

  showHiddenMetrics: false,
  setShowHiddenMetrics: (showHiddenMetrics) => set({ showHiddenMetrics }),

  colorTheme: DEFAULT_COLOR_THEMES[0],
  setColorTheme: (theme) => set({ colorTheme: theme }),
});

export interface ColorTheme {
  label: string;
  background: string;
  canvasText: string;
  connectionLines: string;
  tickMarks: string;
  grid: string;
  directionLabels: string;
}

export const DEFAULT_COLOR_THEMES: ColorTheme[] = [
  {
    label: "Gray",
    background: "#dcdcdc",
    canvasText: "#333333",
    connectionLines: "#aaaaaa",
    tickMarks: "#aaaaaa",
    grid: "#888888",
    directionLabels: "#aaaaaa",
  },
  {
    label: "White",
    background: "#ffffff",
    canvasText: "#333333",
    connectionLines: "#000000",
    tickMarks: "#666666",
    grid: "#888888",
    directionLabels: "#000000",
  },
  {
    label: "Black",
    background: "#1a1a1a",
    canvasText: "#ffffff",
    connectionLines: "#ffffff",
    tickMarks: "#999999",
    grid: "#666666",
    directionLabels: "#ffffff",
  },
  {
    label: "Dark Blue",
    background: "#1e3a5f",
    canvasText: "#ffffff",
    connectionLines: "#ffffff",
    tickMarks: "#888888",
    grid: "#555555",
    directionLabels: "#ffffff",
  },
];
