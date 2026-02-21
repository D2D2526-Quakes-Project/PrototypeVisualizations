import type { ViewMode } from "@/contexts/visualization/ViewModeContext";
import type { Metric } from "@/lib/metrics";
import type { ComputedStats } from "@/lib/types";
import type { SerializedDockview } from "dockview";
import { createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type ThresholdState = Record<Metric, number>;

export const DEFAULT_THRESHOLDS: ThresholdState = {
  displacementX: 0.1,
  displacementY: 0.1,
  displacementZ: 0.1,
  displacementMag: 0.1,
  velocityX: 1,
  velocityY: 1,
  velocityZ: 1,
  velocityMag: 1,
  accelerationX: 2,
  accelerationY: 2,
  accelerationZ: 2,
  accelerationMag: 2,
  rotationX: 0.005,
  rotationY: 0.01,
  rotationZ: 0.01,
  rotationMag: 0.01,
  rotationVelocityX: 0.1,
  rotationVelocityY: 0.1,
  rotationVelocityZ: 0.1,
  rotationVelocityMag: 0.1,
  rotationAccelerationX: 0.5,
  rotationAccelerationY: 0.5,
  rotationAccelerationZ: 0.5,
  rotationAccelerationMag: 0.5,
  interstoryDrift: 0.5,
};

export interface ExplodedViewState {
  explodedEnabled: boolean;
  displacementEnabled: boolean;
  xExplosion: number;
  yExplosion: number;
  zExplosion: number;
  xzDisplacementScale: number;
  zDisplacementScale: number;
}

export const DEFAULT_EXPLODED_STATE: ExplodedViewState = {
  explodedEnabled: false,
  displacementEnabled: false,
  xExplosion: 0,
  yExplosion: 0,
  zExplosion: 1,
  xzDisplacementScale: 1,
  zDisplacementScale: 1,
};

export interface BoxSelection {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface ViewState {
  // Playback
  frameIndex: number;
  playing: boolean;
  fps: number;
  skippedPerFrame: number;
  totalFrames: number;
  setFrameIndex: (frame: number) => void;
  handlePlayPause: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;
  setTotalFrames: (frames: number) => void;

  // View Mode
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;

  // Thresholds
  thresholds: ThresholdState;
  setThreshold: (type: Metric, value: number) => void;
  setThresholdsFromPrecomputed: (precomputed: ComputedStats) => void;

  // Color
  currentMetric: Metric;
  setColorMetric: (metric: Metric) => void;
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;

  // Floor Visibility - initialized later with actual story order
  visibleFloors: string[];
  setVisibleFloors: (floors: string[]) => void;
  toggleFloor: (storyId: string) => void;
  showAllFloors: (storyOrder: string[]) => void;
  hideAllFloors: () => void;

  // Exploded View
  explodedView: ExplodedViewState;
  toggleExploded: () => void;
  toggleDisplacement: () => void;
  setExplosion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
  resetExplodedView: () => void;

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
  selectedNodeIds: number[];
  boxSelection: BoxSelection | null;
  isBoxSelecting: boolean;
  setSelectedNodes: (nodes: number[]) => void;
  addSelectedNodes: (nodes: number[]) => void;
  clearSelection: () => void;
  startBoxSelection: (start: { x: number; y: number }) => void;
  updateBoxSelection: (end: { x: number; y: number }) => void;
  endBoxSelection: () => void;

  // Dockview Layout
  dockviewLayout: SerializedDockview | null;
  setDockviewLayout: (layout: SerializedDockview) => void;
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
      setFrameIndex: (frameIndex) => set({ frameIndex }),
      handlePlayPause: () => set((state) => ({ playing: !state.playing })),
      skipToStart: () => set({ frameIndex: 0 }),
      skipToEnd: () => set((state) => ({ frameIndex: state.totalFrames - 1 })),
      setTotalFrames: (totalFrames) => set({ totalFrames }),

      // View Mode
      mode: "all-nodes" as ViewMode,
      setMode: (mode) => set({ mode }),

      // Thresholds
      thresholds: { ...DEFAULT_THRESHOLDS },
      setThreshold: (type, value) =>
        set((state) => ({
          thresholds: { ...state.thresholds, [type]: value },
        })),
      setThresholdsFromPrecomputed: (precomputed) =>
        set((state) => ({
          thresholds: {
            ...state.thresholds,
            displacement: precomputed.maxDisplacement / 4,
            displacementX: precomputed.maxDisplacementX / 4,
            displacementY: precomputed.maxDisplacementY / 4,
            displacementZ: precomputed.maxDisplacementZ / 4,
            displacementMag: precomputed.maxDisplacement / 4,
            velocity: (precomputed.maxVelocity ?? 10) / 4,
            velocityX: (precomputed.maxVelocityX ?? 10) / 4,
            velocityY: (precomputed.maxVelocityY ?? 10) / 4,
            velocityZ: (precomputed.maxVelocityZ ?? 10) / 4,
            velocityMag: (precomputed.maxVelocity ?? 10) / 4,
            acceleration: (precomputed.maxAcceleration ?? 20) / 4,
            accelerationX: (precomputed.maxAccelerationX ?? 20) / 4,
            accelerationY: (precomputed.maxAccelerationY ?? 20) / 4,
            accelerationZ: (precomputed.maxAccelerationZ ?? 20) / 4,
            accelerationMag: (precomputed.maxAcceleration ?? 20) / 4,
            rotation: (precomputed.maxRotation ?? 0.05) / 4,
            rotationX: (precomputed.maxRotationX ?? 0.05) / 4,
            rotationY: (precomputed.maxRotationY ?? 0.05) / 4,
            rotationZ: (precomputed.maxRotationZ ?? 0.05) / 4,
            rotationMag: (precomputed.maxRotation ?? 0.05) / 4,
            rotationVelocity: (precomputed.maxRotationVelocity ?? 0.5) / 4,
            rotationVelocityX: (precomputed.maxRotationVelocityX ?? 0.5) / 4,
            rotationVelocityY: (precomputed.maxRotationVelocityY ?? 0.5) / 4,
            rotationVelocityZ: (precomputed.maxRotationVelocityZ ?? 0.5) / 4,
            rotationVelocityMag: (precomputed.maxRotationVelocity ?? 0.5) / 4,
            rotationAcceleration: (precomputed.maxRotationAcceleration ?? 2) / 4,
            rotationAccelerationX: (precomputed.maxRotationAccelerationX ?? 2) / 4,
            rotationAccelerationY: (precomputed.maxRotationAccelerationY ?? 2) / 4,
            rotationAccelerationZ: (precomputed.maxRotationAccelerationZ ?? 2) / 4,
            rotationAccelerationMag: (precomputed.maxRotationAcceleration ?? 2) / 4,
            interstoryDrift: precomputed.maxStoryDrift / 4,
            interstoryDriftAvg: precomputed.avgStoryDrift / 4,
          },
        })),

      // Color
      currentMetric: "displacementMag",
      setColorMetric: (currentMetric) => set({ currentMetric }),
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

      // Exploded View
      explodedView: { ...DEFAULT_EXPLODED_STATE },
      toggleExploded: () =>
        set((state) => ({
          explodedView: { ...state.explodedView, explodedEnabled: !state.explodedView.explodedEnabled },
        })),
      toggleDisplacement: () =>
        set((state) => ({
          explodedView: { ...state.explodedView, displacementEnabled: !state.explodedView.displacementEnabled },
        })),
      setExplosion: (axis, factor) =>
        set((state) => ({
          explodedView: { ...state.explodedView, [`${axis}Explosion`]: factor },
        })),
      setDisplacementScale: (axis, factor) =>
        set((state) => ({
          explodedView: {
            ...state.explodedView,
            [axis === "xz" ? "xzDisplacementScale" : "zDisplacementScale"]: factor,
          },
        })),
      resetExplodedView: () => set({ explodedView: { ...DEFAULT_EXPLODED_STATE } }),

      // Slice
      sliceEnabled: false,
      setSliceEnabled: (sliceEnabled) => set({ sliceEnabled }),
      xRange: [-100, 100] as [number, number],
      yRange: [-100, 100] as [number, number],
      zRange: [0, 100] as [number, number],
      setXRange: (xRange) => set({ xRange }),
      setYRange: (yRange) => set({ yRange }),
      setZRange: (zRange) => set({ zRange }),
      setSliceRanges: (x, y, z) => set({ xRange: x, yRange: y, zRange: z }),

      // Background Color
      backgroundColor: "#dcdcdc",
      setBackgroundColor: (backgroundColor) => set({ backgroundColor }),

      // Node Visibility / Selection
      selectedNodeIds: [],
      boxSelection: null,
      isBoxSelecting: false,
      setSelectedNodes: (selectedNodeIds) => set({ selectedNodeIds }),
      addSelectedNodes: (nodes) =>
        set((state) => ({
          selectedNodeIds: [...new Set([...state.selectedNodeIds, ...nodes])],
        })),
      clearSelection: () => set({ selectedNodeIds: [], boxSelection: null, isBoxSelecting: false }),
      startBoxSelection: (start) => set({ boxSelection: { start, end: start }, isBoxSelecting: true }),
      updateBoxSelection: (end) =>
        set((state) => ({
          boxSelection: state.boxSelection ? { ...state.boxSelection, end } : null,
        })),
      endBoxSelection: () => set({ isBoxSelecting: false, boxSelection: null }),

      // Dockview Layout
      dockviewLayout: null,
      setDockviewLayout: (dockviewLayout) => set({ dockviewLayout }),
    })),
  );

export type ViewStore = ReturnType<typeof createViewStore>;
