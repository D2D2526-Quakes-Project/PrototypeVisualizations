import LZString from "lz-string";
import type { Metric } from "@/lib/metrics";
import type { SerializedDockview } from "dockview";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_CAMERA_STATE,
  DEFAULT_EXPLODED_STATE,
  DEFAULT_SLICE_RANGES,
  DEFAULT_THRESHOLDS,
  type ExplodedViewState,
  type ThresholdState,
} from "@/stores/viewStore";

const STATE_VERSION = 1;

const AUTO_SAVE_KEY = "visuals_auto_save";
const PRESETS_KEY = "visuals_presets";
const LAST_URL_STATE_KEY = "visuals_last_url_state";

export interface CameraState {
  isOrthographic: boolean;
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
}

export interface CanvasPanelState {
  camera: CameraState;
  explodedView?: {
    explodedEnabled: boolean;
    displacementEnabled: boolean;
    xExplosion: number;
    yExplosion: number;
    zExplosion: number;
    xzDisplacementScale: number;
    zDisplacementScale: number;
  };
  sliceView?: {
    sliceEnabled: boolean;
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
  };
}

export interface TimelinePanelState {
  selectedKeys: ("x" | "y" | "z" | "magnitude")[];
}

export interface StoryDriftHeatmapPanelState {
  selectedCorners: string[];
  resolution: number;
}

export interface InterstoryDriftChartPanelState {
  visibleCorners: string[];
}

export type PanelState =
  | { type: "canvas"; state: CanvasPanelState; panelId: string }
  | { type: "timeline"; state: TimelinePanelState; panelId: string }
  | { type: "storyDriftHeatmap"; state: StoryDriftHeatmapPanelState; panelId: string }
  | { type: "interstoryDriftChart"; state: InterstoryDriftChartPanelState; panelId: string }
  | { type: "unknown"; state: Record<string, unknown>; panelId: string };

export interface AppState {
  version: number;
  timestamp: number;
  frameIndex: number;
  currentMetric: Metric;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  visibleFloors: string[];
  selectedNodeIds: number[];
  hideSelectedNodes: boolean;
  explodedView: ExplodedViewState;
  sliceEnabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  camera: CameraState;
  backgroundColor: string;
  layout: SerializedDockview | null;
  panelStates: Record<string, PanelState>;
}

export interface NamedPreset {
  name: string;
  state: AppState;
  createdAt: number;
}

export function getDefaultCameraState(): CameraState {
  return { ...DEFAULT_CAMERA_STATE };
}

export function getDefaultCanvasPanelState(): CanvasPanelState {
  return {
    camera: getDefaultCameraState(),
    explodedView: { ...DEFAULT_EXPLODED_STATE },
    sliceView: {
      sliceEnabled: false,
      xRange: [...DEFAULT_SLICE_RANGES.x] as [number, number],
      yRange: [...DEFAULT_SLICE_RANGES.y] as [number, number],
      zRange: [...DEFAULT_SLICE_RANGES.z] as [number, number],
    },
  };
}

export function getDefaultTimelinePanelState(): TimelinePanelState {
  return {
    selectedKeys: ["x", "y"],
  };
}

export function getDefaultStoryDriftHeatmapPanelState(): StoryDriftHeatmapPanelState {
  return {
    selectedCorners: ["NE"],
    resolution: 50,
  };
}

export function getDefaultInterstoryDriftChartPanelState(): InterstoryDriftChartPanelState {
  return {
    visibleCorners: ["NW", "NE", "SW", "SE"],
  };
}

export function getDefaultAppState(layout?: SerializedDockview | null): AppState {
  return {
    version: STATE_VERSION,
    timestamp: Date.now(),
    frameIndex: 0,
    currentMetric: "displacementMag",
    thresholdHighlighting: false,
    thresholds: { ...DEFAULT_THRESHOLDS },
    visibleFloors: [],
    selectedNodeIds: [],
    hideSelectedNodes: false,
    explodedView: { ...DEFAULT_EXPLODED_STATE },
    sliceEnabled: false,
    xRange: [...DEFAULT_SLICE_RANGES.x] as [number, number],
    yRange: [...DEFAULT_SLICE_RANGES.y] as [number, number],
    zRange: [...DEFAULT_SLICE_RANGES.z] as [number, number],
    camera: getDefaultCameraState(),
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    layout: layout ?? null,
    panelStates: {},
  };
}

function serializeState(state: AppState): string {
  return JSON.stringify(state);
}

function deserializeState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed.version !== "number" || parsed.version > STATE_VERSION) {
      console.warn("State version mismatch or invalid");
      return null;
    }
    return parsed as AppState;
  } catch (e) {
    console.error("Failed to deserialize state:", e);
    return null;
  }
}

export function encodeStateForUrl(state: AppState, includePanelStates: boolean = false): string {
  const stateToEncode = includePanelStates
    ? state
    : { ...state, panelStates: {}, layout: state.layout };

  const json = serializeState(stateToEncode);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeStateFromUrl(encoded: string): AppState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return deserializeState(json);
  } catch (e) {
    console.error("Failed to decode state from URL:", e);
    return null;
  }
}

export function saveToLocalStorage(state: AppState): void {
  try {
    const stateWithTimestamp = { ...state, timestamp: Date.now() };
    const json = serializeState(stateWithTimestamp);
    localStorage.setItem(AUTO_SAVE_KEY, json);
  } catch (e) {
    console.error("Failed to save state to localStorage:", e);
  }
}

export function loadFromLocalStorage(): AppState | null {
  try {
    const json = localStorage.getItem(AUTO_SAVE_KEY);
    if (!json) return null;
    return deserializeState(json);
  } catch (e) {
    console.error("Failed to load state from localStorage:", e);
    return null;
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
}

export function saveNamedPreset(name: string, state: AppState): void {
  try {
    const presets = loadNamedPresets();
    const newPreset: NamedPreset = {
      name,
      state: { ...state, timestamp: Date.now() },
      createdAt: Date.now(),
    };

    const existingIndex = presets.findIndex((p) => p.name === name);
    if (existingIndex >= 0) {
      presets[existingIndex] = newPreset;
    } else {
      presets.push(newPreset);
    }

    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error("Failed to save named preset:", e);
  }
}

export function loadNamedPreset(name: string): AppState | null {
  const presets = loadNamedPresets();
  const preset = presets.find((p) => p.name === name);
  return preset?.state ?? null;
}

export function deleteNamedPreset(name: string): void {
  try {
    const presets = loadNamedPresets();
    const filtered = presets.filter((p) => p.name !== name);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete named preset:", e);
  }
}

export function loadNamedPresets(): NamedPreset[] {
  try {
    const json = localStorage.getItem(PRESETS_KEY);
    if (!json) return [];
    return JSON.parse(json) as NamedPreset[];
  } catch {
    return [];
  }
}

export function renameNamedPreset(oldName: string, newName: string): void {
  try {
    const presets = loadNamedPresets();
    const preset = presets.find((p) => p.name === oldName);
    if (preset) {
      preset.name = newName;
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    }
  } catch (e) {
    console.error("Failed to rename preset:", e);
  }
}

export function saveUrlState(state: AppState): void {
  try {
    const json = serializeState(state);
    localStorage.setItem(LAST_URL_STATE_KEY, json);
  } catch (e) {
    console.error("Failed to save URL state:", e);
  }
}

export function loadUrlState(): AppState | null {
  try {
    const json = localStorage.getItem(LAST_URL_STATE_KEY);
    if (!json) return null;
    return deserializeState(json);
  } catch (e) {
    console.error("Failed to load URL state:", e);
    return null;
  }
}

export function clearUrlState(): void {
  localStorage.removeItem(LAST_URL_STATE_KEY);
}

export function getStateFromCurrentUrl(): AppState | null {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const encodedState = urlParams.get("state");

  if (encodedState) {
    return decodeStateFromUrl(encodedState);
  }

  return null;
}

export function createShareableUrl(state: AppState, includePanelStates: boolean = false): string {
  const url = new URL(window.location.href);
  const encodedState = encodeStateForUrl(state, includePanelStates);

  if (encodedState) {
    url.searchParams.set("state", encodedState);
  }

  return url.toString();
}

export function copyShareableUrlToClipboard(
  state: AppState,
  includePanelStates: boolean = false
): Promise<boolean> {
  const shareableUrl = createShareableUrl(state, includePanelStates);

  return navigator.clipboard
    .writeText(shareableUrl)
    .then(() => true)
    .catch((e) => {
      console.error("Failed to copy URL to clipboard:", e);
      return false;
    });
}

export function getStateForUrlWithDefaults(
  state: Partial<AppState>,
  defaults: AppState,
  includePanelStates: boolean = false
): AppState {
  const mergedState: AppState = {
    ...defaults,
    ...state,
    thresholds: { ...defaults.thresholds, ...(state.thresholds ?? {}) },
    explodedView: { ...defaults.explodedView, ...(state.explodedView ?? {}) },
    camera: { ...defaults.camera, ...(state.camera ?? {}) },
    panelStates: includePanelStates ? (state.panelStates ?? {}) : {},
    hideSelectedNodes: state.hideSelectedNodes ?? defaults.hideSelectedNodes,
  };

  return mergedState;
}
