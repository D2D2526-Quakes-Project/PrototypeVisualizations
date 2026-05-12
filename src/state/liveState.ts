import { type StateCreator } from "zustand";
import type { AppState } from ".";

export interface LiveState {
  _playing: boolean;
  _fps: number;
  _skippedPerFrame: number;

  _setPlaying: (playing: boolean) => void;
  _setFps: (fps: number) => void;
  _setSkippedPerFrame: (frames: number) => void;

  autoRotate: boolean;
  setAutoRotate: (autoRotate: boolean) => void;

  // Selection
  selectedNodeIds: number[];
  setSelectedNodes: (nodes: number[]) => void;
  removeSelectedNode: (nodeId: number) => void;
  addSelectedNodes: (nodes: number[]) => void;
  clearSelection: () => void;

  // Hover
  hoveredNodeId: number | null;
  hoveredNodeScreenPos: { x: number; y: number } | null;
  setHoveredNodeId: (nodeId: number | null, screenPos?: { x: number; y: number }) => void;

  // CrossSection interaction
  selectedCrossSection: CrossSectionSelectionState | null;
  hoveredCrossSection: CrossSectionSelectionState | null;
  selectCrossSection: (crossSection: CrossSectionSelectionState) => void;
  deselectCrossSection: () => void;
  setHoveredCrossSection: (crossSection: CrossSectionSelectionState | null) => void;
}

export const createLiveSlice: StateCreator<AppState, [], [], LiveState> = (set) => ({
  // Playback
  _playing: false,
  _setPlaying: (_playing) => set({ _playing }),
  _fps: 0,
  _setFps: (_fps) => set({ _fps }),
  _skippedPerFrame: 0,
  _setSkippedPerFrame: (_skippedPerFrame) => set({ _skippedPerFrame }),

  autoRotate: false,
  setAutoRotate: (autoRotate) => set({ autoRotate }),

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

  hoveredNodeId: null,
  hoveredNodeScreenPos: null,
  setHoveredNodeId: (nodeId, screenPos) => set({ hoveredNodeId: nodeId, hoveredNodeScreenPos: screenPos ?? null }),

  selectedCrossSection: null,
  hoveredCrossSection: null,
  selectCrossSection: (selectedCrossSection) => set({ selectedCrossSection }),
  deselectCrossSection: () => set({ selectedCrossSection: null }),
  setHoveredCrossSection: (hoveredCrossSection) => set({ hoveredCrossSection }),
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

export const LIVE_STATE_KEYS = [
  "_playing",
  "_fps",
  "_skippedPerFrame",
  "_setPlaying",
  "_setFps",
  "_setSkippedPerFrame",
  "autoRotate",
  "setAutoRotate",
  "selectedNodeIds",
  "boxSelection",
  "boxSelectionPanelId",
  "isBoxSelecting",
  "setSelectedNodes",
  "removeSelectedNode",
  "addSelectedNodes",
  "clearSelection",
  "startBoxSelection",
  "updateBoxSelection",
  "endBoxSelection",
  "hoveredNodeId",
  "hoveredNodeScreenPos",
  "setHoveredNodeId",
  "selectedCrossSection",
  "hoveredCrossSection",
  "selectCrossSection",
  "deselectCrossSection",
  "setHoveredCrossSection",
] as const;

type ValidateExactTuple<T extends readonly string[], U extends string> =
  Exclude<U, T[number]> extends never
    ? Exclude<T[number], U> extends never
      ? T
      : ["Extra keys:", Exclude<T[number], U>]
    : ["Missing keys:", Exclude<U, T[number]>];

export const _checked: ValidateExactTuple<typeof LIVE_STATE_KEYS, keyof LiveState> = LIVE_STATE_KEYS;
