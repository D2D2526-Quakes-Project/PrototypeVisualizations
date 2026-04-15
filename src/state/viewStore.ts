import type { ViewMode } from "@/features/view-3d/contexts/visualization/ViewModeContext";
import type { Metric, MetricPaletteKey, MetricPaletteOverrides, ThresholdKey } from "@/lib/metrics";
import type { ComputedStats } from "@/lib/types";
import type { PanelState } from "@/features/view-3d/lib/statePersistence";
import type { SerializedDockview } from "dockview";
import type { CameraState } from "@/features/view-3d/lib/statePersistence";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

function isStateDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugState") === "1";
}

export type ThresholdState = Record<ThresholdKey, number>;

export const DEFAULT_THRESHOLDS: ThresholdState = {
  displacement: 0.1,
  velocity: 1,
  acceleration: 2,
  rotation: 0.01,
  rotationVelocity: 0.1,
  rotationAcceleration: 0.5,
  interstoryDrift: 0.5,
};

export interface ExpandedScaleState {
  expansionEnabled: boolean;
  displacementEnabled: boolean;
  xExpansion: number;
  yExpansion: number;
  zExpansion: number;
  xzDisplacementScale: number;
  zDisplacementScale: number;
}

export const DEFAULT_EXPANDED_SCALE_STATE: ExpandedScaleState = {
  expansionEnabled: false,
  displacementEnabled: false,
  xExpansion: 0,
  yExpansion: 0,
  zExpansion: 1,
  xzDisplacementScale: 1,
  zDisplacementScale: 1,
};

export const DEFAULT_SLICE_RANGES = {
  x: [-100, 100] as [number, number],
  y: [-100, 100] as [number, number],
  z: [0, 100] as [number, number],
};

export const DEFAULT_BACKGROUND_COLOR = "#dcdcdc";

export const DEFAULT_CAMERA_STATE: CameraState = {
  isOrthographic: false,
  position: [0, 0, 0],
  target: [0, 0, 0],
  zoom: 50,
};

export interface BoxSelection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export type SliceType = "floor";

export interface SliceSelectionState {
  id: string;
  type: SliceType;
  value: string | number;
  nodeIds: number[];
  label: string;
  storyId?: string;
}

export interface ViewState {
  // Playback
  frameIndex: number;
  playing: boolean;
  fps: number;
  skippedPerFrame: number;
  totalFrames: number;
  setFrameIndex: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  setFps: (fps: number) => void;
  setSkippedPerFrame: (frames: number) => void;
  handlePlayPause: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;
  setTotalFrames: (frames: number) => void;

  // View Mode
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  cornersOnly: boolean;
  setCornersOnly: (value: boolean) => void;

  // Thresholds
  thresholds: ThresholdState;
  defaultThresholds: ThresholdState;
  setThreshold: (type: ThresholdKey, value: number) => void;
  resetThresholds: () => void;
  setThresholdsFromPrecomputed: (precomputed: ComputedStats) => void;

  // Color
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;

  // Floor Visibility - initialized later with actual story order
  visibleFloors: string[];
  setVisibleFloors: (floors: string[]) => void;
  toggleFloor: (storyId: string) => void;
  showAllFloors: (storyOrder: string[]) => void;
  hideAllFloors: () => void;

  // Expanded Scale
  expandedScale: ExpandedScaleState;
  setExpandedScale: (view: ExpandedScaleState) => void;
  toggleExpansion: () => void;
  toggleDisplacement: () => void;
  setExpansion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
  resetExpandedScale: () => void;

  // Slice
  sliceEnabled: boolean;
  setSliceEnabled: (enabled: boolean) => void;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
  setSliceRanges: (x: [number, number], y: [number, number], z: [number, number]) => void;

  // Background Color
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;

  // Node Visibility / Selection
  // Global selection state shared across scene and panels.
  selectedNodeIds: number[];
  // Node IDs that currently have an open node details panel.
  openedNodePanelIds: number[];
  hiddenNodeIds: number[];
  boxSelection: BoxSelection | null;
  boxSelectionPanelId: string | null;
  isBoxSelecting: boolean;
  hideSelectedNodes: boolean;
  setSelectedNodes: (nodes: number[]) => void;
  setHiddenNodeIds: (nodes: number[]) => void;
  removeSelectedNode: (nodeId: number) => void;
  addSelectedNodes: (nodes: number[]) => void;
  hideNodes: (nodes: number[]) => void;
  showNodes: (nodes: number[]) => void;
  showAllNodes: () => void;
  setHideSelectedNodes: (hide: boolean) => void;
  toggleHideSelectedNodes: () => void;
  addOpenedNodePanel: (nodeId: number) => void;
  removeOpenedNodePanel: (nodeId: number) => void;
  clearSelection: () => void;
  startBoxSelection: (start: { x: number; y: number }, panelId?: string) => void;
  updateBoxSelection: (end: { x: number; y: number }, panelId?: string) => void;
  endBoxSelection: (panelId?: string) => void;
  hoveredNodeId: number | null;
  setHoveredNodeId: (nodeId: number | null) => void;

  // Dockview Layout
  dockviewLayout: SerializedDockview | null;
  setDockviewLayout: (layout: SerializedDockview) => void;

  // Camera State
  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;

  // Per-panel state
  panelStates: Record<string, PanelState>;
  setPanelState: <T extends PanelState["type"]>(
    panelId: string,
    panelType: T,
    panelState: Extract<PanelState, { type: T }>["state"]
  ) => void;
  removePanelState: (panelId: string) => void;
  setPanelStates: (panelStates: Record<string, PanelState>) => void;

  // Slice interaction
  selectedSlice: SliceSelectionState | null;
  hoveredSlice: SliceSelectionState | null;
  selectSlice: (slice: SliceSelectionState) => void;
  deselectSlice: () => void;
  setHoveredSlice: (slice: SliceSelectionState | null) => void;

  // Node Panel Graph Visibility
  nodePanelGraphVisibility: Record<string, boolean>;
  toggleNodePanelGraph: (graphKey: string) => void;

  // Node Display
  nodeScale: number;
  nodeOpacity: number;
  belowThresholdNodeScale: number;
  belowThresholdNodeOpacity: number;
  setNodeScale: (scale: number) => void;
  setNodeOpacity: (opacity: number) => void;
  setBelowThresholdNodeScale: (scale: number) => void;
  setBelowThresholdNodeOpacity: (opacity: number) => void;
}

export const createViewStore = () =>
  createStore<ViewState>()(
    subscribeWithSelector((set) => ({
      // Playback - defaults
      frameIndex: 0,
      playing: false,
      fps: 0,
      skippedPerFrame: 0,
      totalFrames: 100,
      setFrameIndex: (frameIndex) =>
        set((state) => {
          if (isStateDebugEnabled() && state.frameIndex !== frameIndex) {
            console.debug("[state] frameIndex update", {
              from: state.frameIndex,
              to: frameIndex,
              totalFrames: state.totalFrames,
              playing: state.playing,
              stack: new Error().stack,
            });
          }
          return { frameIndex };
        }),
      setPlaying: (playing) => set({ playing }),
      setFps: (fps) => set({ fps }),
      setSkippedPerFrame: (skippedPerFrame) => set({ skippedPerFrame }),
      handlePlayPause: () => set((state) => ({ playing: !state.playing })),
      skipToStart: () => set({ frameIndex: 0 }),
      skipToEnd: () => set((state) => ({ frameIndex: state.totalFrames - 1 })),
      setTotalFrames: (totalFrames) => set({ totalFrames }),

      // View Mode
      mode: "all-nodes" as ViewMode,
      setMode: (mode) => set({ mode }),
      cornersOnly: false,
      setCornersOnly: (cornersOnly) => set({ cornersOnly }),

      // Thresholds
      thresholds: { ...DEFAULT_THRESHOLDS },
      defaultThresholds: { ...DEFAULT_THRESHOLDS },
      setThreshold: (type, value) =>
        set((state) => ({
          thresholds: { ...state.thresholds, [type]: value },
        })),
      resetThresholds: () =>
        set((state) => ({
          thresholds: { ...state.defaultThresholds },
        })),
      setThresholdsFromPrecomputed: (precomputed) =>
        set((state) => {
          const nextDefaults: ThresholdState = {
            ...state.defaultThresholds,
            displacement: precomputed.maxDisplacement / 4,
            velocity: (precomputed.maxVelocity ?? 10) / 4,
            acceleration: (precomputed.maxAcceleration ?? 20) / 4,
            rotation: (precomputed.maxRotation ?? 0.05) / 4,
            rotationVelocity: (precomputed.maxRotationVelocity ?? 0.5) / 4,
            rotationAcceleration: (precomputed.maxRotationAcceleration ?? 2) / 4,
            interstoryDrift: precomputed.maxStoryDrift / 4,
          };

          return {
            defaultThresholds: nextDefaults,
            thresholds: nextDefaults,
          };
        }),

      // Color
      currentMetric: "interstoryDrift",
      setColorMetric: (currentMetric) => set({ currentMetric }),
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
      thresholdHighlighting: false,
      setThresholdHighlighting: (thresholdHighlighting) => set({ thresholdHighlighting }),

      // Floor Visibility
      visibleFloors: [],
      setVisibleFloors: (visibleFloors) => set({ visibleFloors }),
      toggleFloor: (storyId) =>
        set((state) => {
          const floors = new Set(state.visibleFloors);
          if (floors.has(storyId)) {
            floors.delete(storyId);
          } else {
            floors.add(storyId);
          }
          return { visibleFloors: Array.from(floors) };
        }),
      showAllFloors: (storyOrder) => set({ visibleFloors: storyOrder }),
      hideAllFloors: () => set({ visibleFloors: [] }),

      // Expanded Scale
      expandedScale: { ...DEFAULT_EXPANDED_SCALE_STATE },
      setExpandedScale: (expandedScale) => set({ expandedScale }),
      toggleExpansion: () =>
        set((state) => ({
          expandedScale: { ...state.expandedScale, expansionEnabled: !state.expandedScale.expansionEnabled },
        })),
      toggleDisplacement: () =>
        set((state) => ({
          expandedScale: { ...state.expandedScale, displacementEnabled: !state.expandedScale.displacementEnabled },
        })),
      setExpansion: (axis, factor) =>
        set((state) => ({
          expandedScale: { ...state.expandedScale, [`${axis}Expansion`]: factor },
        })),
      setDisplacementScale: (axis, factor) =>
        set((state) => ({
          expandedScale: {
            ...state.expandedScale,
            [axis === "xz" ? "xzDisplacementScale" : "zDisplacementScale"]: factor,
          },
        })),
      resetExpandedScale: () => set({ expandedScale: { ...DEFAULT_EXPANDED_SCALE_STATE } }),

      // Slice
      sliceEnabled: false,
      setSliceEnabled: (sliceEnabled) => set({ sliceEnabled }),
      xRange: [...DEFAULT_SLICE_RANGES.x] as [number, number],
      yRange: [...DEFAULT_SLICE_RANGES.y] as [number, number],
      zRange: [...DEFAULT_SLICE_RANGES.z] as [number, number],
      setXRange: (xRange) => set({ xRange }),
      setYRange: (yRange) => set({ yRange }),
      setZRange: (zRange) => set({ zRange }),
      setSliceRanges: (x, y, z) => set({ xRange: x, yRange: y, zRange: z }),

      // Background Color
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      setBackgroundColor: (backgroundColor) => set({ backgroundColor }),

      // Node Visibility / Selection
      selectedNodeIds: [],
      openedNodePanelIds: [],
      hiddenNodeIds: [],
      boxSelection: null,
      boxSelectionPanelId: null,
      isBoxSelecting: false,
      hideSelectedNodes: false,
      setSelectedNodes: (selectedNodeIds) => set({ selectedNodeIds }),
      setHiddenNodeIds: (hiddenNodeIds) => set({ hiddenNodeIds }),
      removeSelectedNode: (nodeId) =>
        set((state) => ({
          selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
        })),
      addSelectedNodes: (nodes) =>
        set((state) => ({
          selectedNodeIds: [...new Set([...state.selectedNodeIds, ...nodes])],
        })),
      hideNodes: (nodes) =>
        set((state) => ({
          hiddenNodeIds: [...new Set([...state.hiddenNodeIds, ...nodes])],
          selectedNodeIds: [],
        })),
      showNodes: (nodes) =>
        set((state) => {
          const nodesToShow = new Set(nodes);
          return {
            hiddenNodeIds: state.hiddenNodeIds.filter((id) => !nodesToShow.has(id)),
          };
        }),
      showAllNodes: () => set({ hiddenNodeIds: [] }),
      setHideSelectedNodes: (hideSelectedNodes) => set({ hideSelectedNodes }),
      toggleHideSelectedNodes: () => set((state) => ({ hideSelectedNodes: !state.hideSelectedNodes })),
      addOpenedNodePanel: (nodeId) =>
        set((state) => ({
          openedNodePanelIds: [...new Set([...state.openedNodePanelIds, nodeId])],
        })),
      removeOpenedNodePanel: (nodeId) =>
        set((state) => ({
          openedNodePanelIds: state.openedNodePanelIds.filter((id) => id !== nodeId),
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
      setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),

      // Dockview Layout
      dockviewLayout: null,
      setDockviewLayout: (dockviewLayout) => set({ dockviewLayout }),

      // Camera State
      cameraState: { ...DEFAULT_CAMERA_STATE },
      setCameraState: (cameraState) => set({ cameraState }),

      panelStates: {},
      setPanelState: (panelId, panelType, panelState) =>
        set((state) => ({
          panelStates: {
            ...state.panelStates,
            [panelId]: {
              panelId,
              type: panelType,
              state: panelState,
            } as PanelState,
          },
        })),
      removePanelState: (panelId) =>
        set((state) => {
          const { [panelId]: _removed, ...rest } = state.panelStates;
          return { panelStates: rest };
        }),
      setPanelStates: (panelStates) => set({ panelStates }),

      selectedSlice: null,
      hoveredSlice: null,
      selectSlice: (selectedSlice) => set({ selectedSlice }),
      deselectSlice: () => set({ selectedSlice: null }),
      setHoveredSlice: (hoveredSlice) => set({ hoveredSlice }),

      nodePanelGraphVisibility: { dispX: true, dispY: true, drift: true },
      toggleNodePanelGraph: (graphKey) =>
        set((state) => {
          return {
            nodePanelGraphVisibility: {
              ...state.nodePanelGraphVisibility,
              [graphKey]: !state.nodePanelGraphVisibility[graphKey],
            },
          };
        }),

      nodeScale: 1,
      nodeOpacity: 1,
      belowThresholdNodeScale: 0.3,
      belowThresholdNodeOpacity: 0.2,
      setNodeScale: (nodeScale) => set({ nodeScale }),
      setNodeOpacity: (nodeOpacity) => set({ nodeOpacity }),
      setBelowThresholdNodeScale: (belowThresholdNodeScale) => set({ belowThresholdNodeScale }),
      setBelowThresholdNodeOpacity: (belowThresholdNodeOpacity) => set({ belowThresholdNodeOpacity }),
    }))
  );

export type ViewStore = ReturnType<typeof createViewStore>;
