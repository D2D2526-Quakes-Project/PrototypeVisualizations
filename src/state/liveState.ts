import { type StateCreator } from "zustand";
import type { AppState } from ".";

export interface LiveState {
  playing: boolean;
  fps: number;
  skippedPerFrame: number;

  setPlaying: (playing: boolean) => void;
  setFps: (fps: number) => void;
  setSkippedPerFrame: (frames: number) => void;
  handlePlayPause: () => void;

  autoRotate: boolean;
  setAutoRotate: (autoRotate: boolean) => void;

  // Selection
  selectedNodeIds: number[];
  boxSelection: BoxSelection | null;
  boxSelectionPanelId: string | null;
  isBoxSelecting: boolean;
  setSelectedNodes: (nodes: number[]) => void;
  removeSelectedNode: (nodeId: number) => void;
  addSelectedNodes: (nodes: number[]) => void;

  clearSelection: () => void;
  startBoxSelection: (start: { x: number; y: number }, panelId?: string) => void;
  updateBoxSelection: (end: { x: number; y: number }, panelId?: string) => void;
  endBoxSelection: (panelId?: string) => void;

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
  playing: false,
  setPlaying: (playing) => set({ playing }),
  fps: 0,
  setFps: (fps) => set({ fps }),
  skippedPerFrame: 0,
  setSkippedPerFrame: (skippedPerFrame) => set({ skippedPerFrame }),
  handlePlayPause: () => set((state) => ({ playing: !state.playing })),

  autoRotate: false,
  setAutoRotate: (autoRotate) => set({ autoRotate }),

  // Node Visibility / Selection
  selectedNodeIds: [],
  openedNodePanelIds: [],
  hiddenNodeIds: [],
  boxSelection: null,
  boxSelectionPanelId: null,
  isBoxSelecting: false,
  setSelectedNodes: (selectedNodeIds) => set({ selectedNodeIds }),
  removeSelectedNode: (nodeId) =>
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    })),
  addSelectedNodes: (nodes) =>
    set((state) => ({
      selectedNodeIds: [...new Set([...state.selectedNodeIds, ...nodes])],
    })),
  clearSelection: () =>
    set({ selectedNodeIds: [], boxSelection: null, boxSelectionPanelId: null, isBoxSelecting: false }),
  startBoxSelection: (start, panelId) =>
    set({
      boxSelection: { start, end: start },
      boxSelectionPanelId: panelId ?? null,
      isBoxSelecting: true,
    }),
  updateBoxSelection: (end, panelId) =>
    set((state) => {
      if (!state.boxSelection) {
        return state;
      }
      if (panelId && state.boxSelectionPanelId !== panelId) {
        return state;
      }
      const currentEnd = state.boxSelection.end;
      if (currentEnd.x === end.x && currentEnd.y === end.y) {
        return state;
      }
      return {
        boxSelection: { ...state.boxSelection, end },
      };
    }),
  endBoxSelection: (panelId) =>
    set((state) => {
      if (panelId && state.boxSelectionPanelId && state.boxSelectionPanelId !== panelId) {
        return state;
      }
      return { isBoxSelecting: false, boxSelection: null, boxSelectionPanelId: null };
    }),
  hoveredNodeId: null,
  hoveredNodeScreenPos: null,
  setHoveredNodeId: (nodeId, screenPos) => set({ hoveredNodeId: nodeId, hoveredNodeScreenPos: screenPos ?? null }),

  selectedCrossSection: null,
  hoveredCrossSection: null,
  selectCrossSection: (selectedCrossSection) => set({ selectedCrossSection }),
  deselectCrossSection: () => set({ selectedCrossSection: null }),
  setHoveredCrossSection: (hoveredCrossSection) => set({ hoveredCrossSection }),
});

export interface BoxSelection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

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
  "playing",
  "fps",
  "skippedPerFrame",
  "setPlaying",
  "setFps",
  "setSkippedPerFrame",
  "handlePlayPause",
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
