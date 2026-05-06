import type { CameraState, PanelState } from "@/features/view-3d/lib/statePersistence";
import type { Metric, MetricPaletteKey, MetricPaletteOverrides, ThresholdKey } from "@/lib/metrics";
import type { SerializedDockview } from "dockview";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

function isStateDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugState") === "1";
}

export type ThresholdState = Record<ThresholdKey, number>;

export const DEFAULT_THRESHOLDS: ThresholdState = {
  displacement: 30,
  velocity: 10,
  acceleration: 10,
  rotation: 0.01,
  rotationVelocity: 0.1,
  rotationAcceleration: 0.5,
  interstoryDrift: 2,
  hingeRotation: 0.06,
  shear: 1000,
  inf: 0,
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

export interface ColorTheme {
  label: string;
  background: string;
  connectionLines: string;
  tickMarks: string;
  grid: string;
  directionLabels: string;
}

export const DEFAULT_COLOR_THEMES: ColorTheme[] = [
  {
    label: "Gray",
    background: "#dcdcdc",
    connectionLines: "#aaaaaa",
    tickMarks: "#aaaaaa",
    grid: "#888888",
    directionLabels: "#aaaaaa",
  },
  {
    label: "White",
    connectionLines: "#000000",
    tickMarks: "#666666",
    grid: "#888888",
    background: "#ffffff",
    directionLabels: "#000000",
  },
  {
    label: "Black",
    background: "#1a1a1a",
    connectionLines: "#ffffff",
    tickMarks: "#999999",
    grid: "#666666",
    directionLabels: "#ffffff",
  },
  {
    label: "Dark Blue",

    background: "#1e3a5f",
    connectionLines: "#ffffff",
    tickMarks: "#888888",
    grid: "#555555",
    directionLabels: "#ffffff",
  },
];

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
  renderNodes: boolean;
  setRenderNodes: (value: boolean) => void;
  renderFloorSlabs: boolean;
  setRenderFloorSlabs: (value: boolean) => void;
  renderXCrossSectionSlabs: boolean;
  setRenderXCrossSectionSlabs: (value: boolean) => void;
  renderYCrossSectionSlabs: boolean;
  setRenderYCrossSectionSlabs: (value: boolean) => void;
  showCornersOnly: boolean;
  setShowCornersOnly: (value: boolean) => void;
  visualInterpolationEnabled: boolean;
  setVisualInterpolationEnabled: (value: boolean) => void;
  renderVerticalConnections: boolean;
  setRenderVerticalConnections: (value: boolean) => void;
  renderHorizontalConnections: boolean;
  setRenderHorizontalConnections: (value: boolean) => void;

  // Thresholds
  thresholds: ThresholdState;
  defaultThresholds: ThresholdState;
  setThreshold: (type: ThresholdKey, value: number) => void;
  resetThresholds: () => void;

  // Color
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  metricPaletteOverrides: MetricPaletteOverrides;
  setMetricPalette: (metric: Metric, palette: MetricPaletteKey | null) => void;
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
  showHiddenMetrics: boolean;
  setShowHiddenMetrics: (enabled: boolean) => void;

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

  // Background Colors
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;

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
  hoveredNodeScreenPos: { x: number; y: number } | null;
  setHoveredNodeId: (nodeId: number | null, screenPos?: { x: number; y: number }) => void;

  // Dockview Layout
  dockviewLayout: SerializedDockview | null;
  setDockviewLayout: (layout: SerializedDockview) => void;

  // Camera State
  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;

  // Per-panel state
  panelStates: Partial<Record<string, PanelState>>;
  setPanelState: <T extends PanelState["type"]>(
    panelId: string,
    panelType: T,
    panelState: Extract<PanelState, { type: T }>["state"]
  ) => void;
  removePanelState: (panelId: string) => void;
  setPanelStates: (panelStates: Record<string, PanelState>) => void;

  // CrossSection interaction
  selectedCrossSection: CrossSectionSelectionState | null;
  hoveredCrossSection: CrossSectionSelectionState | null;
  selectCrossSection: (crossSection: CrossSectionSelectionState) => void;
  deselectCrossSection: () => void;
  setHoveredCrossSection: (crossSection: CrossSectionSelectionState | null) => void;

  // Node Panel Graph Visibility
  nodePanelGraphVisibility: Record<string, boolean>;
  toggleNodePanelGraph: (graphKey: string) => void;

  // Node Display
  nodeScale: number;
  nodeOpacity: number;
  belowThresholdNodeScale: number;
  belowThresholdNodeOpacity: number;
  floorOpacity: number;
  hingeNodeScale: number;
  belowThresholdHingeScale: number;
  connectionLineWidth: number;
  connectionLineOpacity: number;
  setNodeScale: (scale: number) => void;
  setNodeOpacity: (opacity: number) => void;
  setBelowThresholdNodeScale: (scale: number) => void;
  setBelowThresholdNodeOpacity: (opacity: number) => void;
  setHingeNodeScale: (scale: number) => void;
  setBelowThresholdHingeScale: (scale: number) => void;
  setFloorOpacity: (opacity: number) => void;
  setConnectionLineWidth: (width: number) => void;
  setConnectionLineOpacity: (opacity: number) => void;
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
      renderNodes: true,
      setRenderNodes: (renderNodes) => set({ renderNodes }),
      renderFloorSlabs: true,
      setRenderFloorSlabs: (renderFloorSlabs) => set({ renderFloorSlabs }),
      renderXCrossSectionSlabs: false,
      setRenderXCrossSectionSlabs: (renderXCrossSectionSlabs) => set({ renderXCrossSectionSlabs }),
      renderYCrossSectionSlabs: false,
      setRenderYCrossSectionSlabs: (renderYCrossSectionSlabs) => set({ renderYCrossSectionSlabs }),
      showCornersOnly: false,
      setShowCornersOnly: (showCornersOnly) => set({ showCornersOnly }),
      visualInterpolationEnabled: false,
      setVisualInterpolationEnabled: (visualInterpolationEnabled) => set({ visualInterpolationEnabled }),
      renderVerticalConnections: false,
      setRenderVerticalConnections: (renderVerticalConnections) => set({ renderVerticalConnections }),
      renderHorizontalConnections: false,
      setRenderHorizontalConnections: (renderHorizontalConnections) => set({ renderHorizontalConnections }),

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
      thresholdHighlighting: true,
      setThresholdHighlighting: (thresholdHighlighting) => set({ thresholdHighlighting }),
      showHiddenMetrics: false,
      setShowHiddenMetrics: (showHiddenMetrics) => set({ showHiddenMetrics }),

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

      // Background Colors
      colorTheme: DEFAULT_COLOR_THEMES[0],
      setColorTheme: (theme) => set({ colorTheme: theme }),

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
      hideNodes: (nodes: number[]) =>
        set((state) => ({
          hiddenNodeIds: [...new Set([...state.hiddenNodeIds, ...nodes])],
          selectedNodeIds: [],
        })),
      showNodes: (nodes: number[]) =>
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
      hoveredNodeScreenPos: null,
      setHoveredNodeId: (nodeId, screenPos) => set({ hoveredNodeId: nodeId, hoveredNodeScreenPos: screenPos ?? null }),

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

      selectedCrossSection: null,
      hoveredCrossSection: null,
      selectCrossSection: (selectedCrossSection) => set({ selectedCrossSection }),
      deselectCrossSection: () => set({ selectedCrossSection: null }),
      setHoveredCrossSection: (hoveredCrossSection) => set({ hoveredCrossSection }),

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
      belowThresholdNodeScale: 0.5,
      belowThresholdNodeOpacity: 0.2,
      floorOpacity: 0.2,
      hingeNodeScale: 1,
      belowThresholdHingeScale: 0.5,
      connectionLineWidth: 2,
      connectionLineOpacity: 0.6,
      setNodeScale: (nodeScale) => set({ nodeScale }),
      setNodeOpacity: (nodeOpacity) => set({ nodeOpacity }),
      setBelowThresholdNodeScale: (belowThresholdNodeScale) => set({ belowThresholdNodeScale }),
      setBelowThresholdNodeOpacity: (belowThresholdNodeOpacity) => set({ belowThresholdNodeOpacity }),
      setHingeNodeScale: (hingeNodeScale) => set({ hingeNodeScale }),
      setBelowThresholdHingeScale: (belowThresholdHingeScale) => set({ belowThresholdHingeScale }),
      setFloorOpacity: (floorOpacity) => set({ floorOpacity }),
      setConnectionLineWidth: (connectionLineWidth) => set({ connectionLineWidth }),
      setConnectionLineOpacity: (connectionLineOpacity) => set({ connectionLineOpacity }),
    }))
  );

export type ViewStore = ReturnType<typeof createViewStore>;
