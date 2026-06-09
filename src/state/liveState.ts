import { type StateCreator } from "zustand";
import type { AppState } from ".";

export interface LiveState {
  _playing: boolean;
  _fps: number;
  _skippedPerFrame: number;

  _setPlaying: (playing: boolean) => void;
  _setFps: (fps: number) => void;
  _setSkippedPerFrame: (frames: number) => void;

  // Selection
  selectedNodeIds: number[];
  setSelectedNodes: (nodes: number[]) => void;
  removeSelectedNode: (nodeId: number) => void;
  addSelectedNodes: (nodes: number[]) => void;
  clearSelection: () => void;

  // Hover
  hoveredItem: HoverItem | null;
  setHoveredItem: (item: HoverItem | null) => void;

  // CrossSection interaction
  selectedCrossSection: CrossSectionSelectionState | null;
  hoveredCrossSection: CrossSectionSelectionState | null;
  selectCrossSection: (crossSection: CrossSectionSelectionState) => void;
  deselectCrossSection: () => void;
  setHoveredCrossSection: (crossSection: CrossSectionSelectionState | null) => void;

  // Drawers
  helpDrawerOpen: boolean;
  setHelpDrawerOpen: (open: boolean) => void;
  metricColorsDrawerOpen: boolean;
  setMetricColorsDrawerOpen: (open: boolean) => void;
}

export const createLiveSlice: StateCreator<AppState, [], [], LiveState> = (set) => ({
  // Playback
  _playing: false,
  _setPlaying: (_playing) => set({ _playing }),
  _fps: 0,
  _setFps: (_fps) => set({ _fps }),
  _skippedPerFrame: 0,
  _setSkippedPerFrame: (_skippedPerFrame) => set({ _skippedPerFrame }),

  // Node Visibility / Selection
  selectedNodeIds: [],
  openedNodePanelIds: [],
  hiddenNodeIds: [],
  setSelectedNodes: (selectedNodeIds) => set({ selectedNodeIds }),
  removeSelectedNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    })),
  addSelectedNodes: (nodes) =>
    set((state) => ({
      selectedNodeIds: [...new Set([...state.selectedNodeIds, ...nodes])],
    })),
  clearSelection: () => set({ selectedNodeIds: [] }),

  hoveredItem: null,
  setHoveredItem: (item) => set({ hoveredItem: item }),

  selectedCrossSection: null,
  hoveredCrossSection: null,
  selectCrossSection: (selectedCrossSection) => set({ selectedCrossSection }),
  deselectCrossSection: () => set({ selectedCrossSection: null }),
  setHoveredCrossSection: (hoveredCrossSection) => set({ hoveredCrossSection }),

  helpDrawerOpen: false,
  setHelpDrawerOpen: (helpDrawerOpen) => set({ helpDrawerOpen }),
  metricColorsDrawerOpen: false,
  setMetricColorsDrawerOpen: (metricColorsDrawerOpen) => set({ metricColorsDrawerOpen }),
});

export type SliceType = "X" | "Y" | "Z";

export interface CrossSectionSelectionState {
  id: string;
  type: SliceType;
  value: string | number;
  nodeIds: number[];
  label: string;
  storyId?: string;
  screenPos?: { x: number; y: number };
}

export type HoverItem = (
  | {
      type: "node";
      nodeId: number;
    }
  | {
      type: "crossSection";
      crossSectionId: string;
    }
  | {
      type: "floor";
      storyId: string;
    }
  | {
      type: "brb";
      brbIdx: number;
    }
) & { screenPos?: { x: number; y: number }; source: string };

export const LIVE_STATE_KEYS = [
  "_playing",
  "_fps",
  "_skippedPerFrame",
  "_setPlaying",
  "_setFps",
  "_setSkippedPerFrame",
  "selectedNodeIds",
  "setSelectedNodes",
  "removeSelectedNode",
  "addSelectedNodes",
  "clearSelection",
  "hoveredItem",
  "setHoveredItem",
  "selectedCrossSection",
  "hoveredCrossSection",
  "selectCrossSection",
  "deselectCrossSection",
  "setHoveredCrossSection",
  "helpDrawerOpen",
  "setHelpDrawerOpen",
  "metricColorsDrawerOpen",
  "setMetricColorsDrawerOpen",
] as const;

type ValidateExactTuple<T extends readonly string[], U extends string> =
  Exclude<U, T[number]> extends never
    ? Exclude<T[number], U> extends never
      ? T
      : ["Extra keys:", Exclude<T[number], U>]
    : ["Missing keys:", Exclude<U, T[number]>];

export const _checked: ValidateExactTuple<typeof LIVE_STATE_KEYS, keyof LiveState> = LIVE_STATE_KEYS;
