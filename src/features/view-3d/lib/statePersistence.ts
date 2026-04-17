import LZString from "lz-string";
import type { Metric, MetricPaletteKey, MetricPaletteOverrides } from "@/lib/metrics";
import type { SerializedDockview } from "dockview";
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_CAMERA_STATE,
  DEFAULT_EXPANDED_SCALE_STATE,
  DEFAULT_SLICE_RANGES,
  DEFAULT_THRESHOLDS,
  type ExpandedScaleState,
  type ThresholdState,
} from "@/state/viewStore";
import type { useViewStoreRaw } from "@/state";

const STATE_VERSION = 1;

const AUTO_SAVE_KEY = "visuals_auto_save";
const PRESETS_KEY = "visuals_presets";
const LAST_URL_STATE_KEY = "visuals_last_url_state";
const SAVE_PROFILES_KEY = "visuals_save_profiles_v2";
const ACTIVE_PROFILE_KEY = "visuals_active_profile_v2";
export const PROFILES_UPDATED_EVENT = "visuals:profiles-updated";

export const SYSTEM_PROFILE_DEFAULT_ID = "system-default";
export const SYSTEM_PROFILE_FLOOR_TORSION_ID = "system-floor-torsion";
export const SYSTEM_PROFILE_DRIFT_ANALYSIS_ID = "system-drift-analysis";
export const SYSTEM_PROFILE_ACCELERATION_REVIEW_ID = "system-acceleration-review";
export const SYSTEM_PROFILE_DAMAGE_SCREENING_ID = "system-damage-screening";
export const EPHEMERAL_SHARE_PROFILE_ID = "ephemeral-share-session";

export interface CameraState {
  isOrthographic: boolean;
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
}

export interface CanvasPanelState {
  camera: CameraState;
  expandedScale?: {
    expansionEnabled: boolean;
    displacementEnabled: boolean;
    xExpansion: number;
    yExpansion: number;
    zExpansion: number;
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
  selectedKeys: (
    | "x"
    | "y"
    | "z"
    | "magnitude"
    | "avgDisplacementX"
    | "avgDisplacementY"
    | "avgDisplacementZ"
    | "avgDisplacementMag"
    | "avgVelocityX"
    | "avgVelocityY"
    | "avgVelocityZ"
    | "avgVelocityMag"
    | "avgAccelerationX"
    | "avgAccelerationY"
    | "avgAccelerationZ"
    | "avgAccelerationMag"
    | "avgRotationX"
    | "avgRotationY"
    | "avgRotationZ"
    | "avgRotationMag"
  )[];
}

export interface StoryDriftHeatmapPanelState {
  selectedCorners: string[];
  resolution: number;
}

export interface InterstoryDriftChartPanelState {
  visibleCorners: string[];
}

export interface VelocityTimeChartPanelState {
  selectedKeys: ("x" | "y" | "z" | "magnitude")[];
}

export interface RotationTimeChartPanelState {
  selectedKeys: ("rx" | "ry" | "rz" | "magnitude")[];
}

export interface HistogramChartPanelState {
  positionAxis: "x" | "y" | "z";
  valueType: string;
}

export interface DataTablePanelState {
  page: number;
}

export interface PeakValuesPanelState {
  sortKey: "node" | "x" | "y" | "z" | "magnitude";
  sortDir: "asc" | "desc";
}

export interface DataExplorerPanelState {
  query: string;
  page: number;
  sortKey: string;
  sortDir: "asc" | "desc";
}

export interface HingeDistributionPanelState {
  stepType: string;
  binCount: number;
  logScale: boolean;
  clipPercentile: number;
}

export interface HingeHotspotsPanelState {
  stepType: string;
}

export type PanelState =
  | { type: "canvas"; state: CanvasPanelState; panelId: string }
  | { type: "timeline"; state: TimelinePanelState; panelId: string }
  | { type: "storyDriftHeatmap"; state: StoryDriftHeatmapPanelState; panelId: string }
  | { type: "interstoryDriftChart"; state: InterstoryDriftChartPanelState; panelId: string }
  | { type: "velocityTimeChart"; state: VelocityTimeChartPanelState; panelId: string }
  | { type: "rotationTimeChart"; state: RotationTimeChartPanelState; panelId: string }
  | { type: "histogramChart"; state: HistogramChartPanelState; panelId: string }
  | { type: "dataTable"; state: DataTablePanelState; panelId: string }
  | { type: "peakValues"; state: PeakValuesPanelState; panelId: string }
  | { type: "dataExplorer"; state: DataExplorerPanelState; panelId: string }
  | { type: "hingeDistribution"; state: HingeDistributionPanelState; panelId: string }
  | { type: "hingeHotspots"; state: HingeHotspotsPanelState; panelId: string }
  | { type: "unknown"; state: Record<string, unknown>; panelId: string };

export interface AppState {
  version: number;
  timestamp: number;
  frameIndex: number;
  currentMetric: Metric;
  metricPaletteOverrides: MetricPaletteOverrides;
  thresholdHighlighting: boolean;
  thresholds: ThresholdState;
  visibleFloors: string[];
  selectedNodeIds: number[];
  hiddenNodeIds: number[];
  hideSelectedNodes: boolean;
  expandedScale: ExpandedScaleState;
  sliceEnabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  camera: CameraState;
  backgroundColor: string;
  layout: SerializedDockview | null;
  panelStates: Record<string, PanelState>;
  dataSelection?: DataSelection;

  // Render Modes
  renderNodes?: boolean;
  renderFloorSlabs?: boolean;
  renderXCrossSectionSlabs?: boolean;
  renderYCrossSectionSlabs?: boolean;
  showCornersOnly?: boolean;
  renderVerticalConnections?: boolean;
  renderHorizontalConnections?: boolean;
}

export interface DataSelection {
  building: string;
  simulation: string;
  optionalLoads?: Partial<OptionalDataLoadOptions>;
}

export interface OptionalDataLoadOptions {
  beamData: boolean;
  hingeData: boolean;
  displacementRot: boolean;
  velocityLin: boolean;
  velocityRot: boolean;
  accelerationLin: boolean;
  accelerationRot: boolean;
}

export const OPTIONAL_DATA_LOAD_OPTION_KEYS = [
  "beamData",
  "hingeData",
  "displacementRot",
  "velocityLin",
  "velocityRot",
  "accelerationLin",
  "accelerationRot",
] as const satisfies readonly (keyof OptionalDataLoadOptions)[];

export type SaveProfileKind = "system" | "user" | "ephemeral";

export interface SaveProfile {
  id: string;
  name: string;
  kind: SaveProfileKind;
  createdAt: number;
  updatedAt: number;
  defaultState: AppState;
  currentState: AppState;
}

export interface NamedPreset {
  name: string;
  state: AppState;
  createdAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAppStateLike(value: unknown): value is AppState {
  if (!isRecord(value)) return false;
  const dataSelection = value.dataSelection;
  if (dataSelection !== undefined) {
    if (
      !isRecord(dataSelection) ||
      typeof dataSelection.building !== "string" ||
      typeof dataSelection.simulation !== "string"
    ) {
      return false;
    }
    if (dataSelection.optionalLoads !== undefined) {
      if (!isRecord(dataSelection.optionalLoads)) return false;
      for (const key of OPTIONAL_DATA_LOAD_OPTION_KEYS) {
        const maybeValue = dataSelection.optionalLoads[key];
        if (maybeValue !== undefined && typeof maybeValue !== "boolean") {
          return false;
        }
      }
    }
  }
  return (
    typeof value.version === "number" &&
    typeof value.timestamp === "number" &&
    typeof value.frameIndex === "number" &&
    typeof value.currentMetric === "string"
  );
}

function cloneAppState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getMetricPaletteOverridesPatch(value: unknown): MetricPaletteOverrides {
  if (!isRecord(value)) return {};

  const patch: MetricPaletteOverrides = {};
  for (const [metric, palette] of Object.entries(value)) {
    if (typeof palette === "string") {
      patch[metric as Metric] = palette as MetricPaletteKey;
    }
  }
  return patch;
}

function getExpandedScalePatch(value: unknown): Partial<ExpandedScaleState> {
  if (!isRecord(value)) return {};

  const patch: Partial<ExpandedScaleState> = {};

  if (isBoolean(value.expansionEnabled)) patch.expansionEnabled = value.expansionEnabled;
  else if (isBoolean(value.explodedEnabled)) patch.expansionEnabled = value.explodedEnabled;

  if (isBoolean(value.displacementEnabled)) patch.displacementEnabled = value.displacementEnabled;

  if (isNumber(value.xExpansion)) patch.xExpansion = value.xExpansion;
  else if (isNumber(value.xExplosion)) patch.xExpansion = value.xExplosion;

  if (isNumber(value.yExpansion)) patch.yExpansion = value.yExpansion;
  else if (isNumber(value.yExplosion)) patch.yExpansion = value.yExplosion;

  if (isNumber(value.zExpansion)) patch.zExpansion = value.zExpansion;
  else if (isNumber(value.zExplosion)) patch.zExpansion = value.zExplosion;

  if (isNumber(value.xzDisplacementScale)) patch.xzDisplacementScale = value.xzDisplacementScale;
  if (isNumber(value.zDisplacementScale)) patch.zDisplacementScale = value.zDisplacementScale;

  return patch;
}

function normalizeState(state: AppState): AppState {
  const stateWithLegacy = state as AppState & { explodedView?: unknown };
  const { explodedView: _legacyExplodedView, ...stateWithoutLegacy } = stateWithLegacy;
  const legacySelectedAsHidden =
    (!Array.isArray(state.hiddenNodeIds) || state.hiddenNodeIds.length === 0) && state.hideSelectedNodes
      ? [...state.selectedNodeIds]
      : [];
  const expandedScale = {
    ...DEFAULT_EXPANDED_SCALE_STATE,
    ...getExpandedScalePatch(stateWithLegacy.explodedView),
    ...getExpandedScalePatch(state.expandedScale),
  };

  return {
    ...stateWithoutLegacy,
    metricPaletteOverrides: getMetricPaletteOverridesPatch(state.metricPaletteOverrides),
    expandedScale,
    hiddenNodeIds: Array.isArray(state.hiddenNodeIds) ? state.hiddenNodeIds : legacySelectedAsHidden,
    version: STATE_VERSION,
    timestamp: Date.now(),
  };
}

function sanitizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function generateUserProfileId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `user-${slug || "profile"}-${Date.now()}`;
}

function createProfile(params: {
  id: string;
  name: string;
  kind: SaveProfileKind;
  defaultState: AppState;
  currentState?: AppState;
  createdAt?: number;
  updatedAt?: number;
}): SaveProfile {
  const now = Date.now();
  const defaultState = normalizeState(cloneAppState(params.defaultState));
  const currentState = normalizeState(cloneAppState(params.currentState ?? params.defaultState));

  return {
    id: params.id,
    name: sanitizeProfileName(params.name),
    kind: params.kind,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
    defaultState,
    currentState,
  };
}

function getFloorTorsionDefaultState(layout?: SerializedDockview | null): AppState {
  const base = getDefaultAppState(layout);
  return {
    ...base,
    currentMetric: "rotationZ",
    camera: {
      isOrthographic: true,
      position: [0, 120, 0],
      target: [0, 0, 0],
      zoom: 45,
    },
  };
}

function getDriftAnalysisDefaultState(layout?: SerializedDockview | null): AppState {
  const base = getDefaultAppState(layout);
  const camera: CameraState = {
    isOrthographic: true,
    position: [85, 110, 85],
    target: [0, 0, 0],
    zoom: 42,
  };
  const canvasPanel = getDefaultCanvasPanelState();

  const panelStates: Record<string, PanelState> = {
    "main-canvas": {
      type: "canvas",
      panelId: "main-canvas",
      state: {
        ...canvasPanel,
        camera,
      },
    },
    timeline: {
      type: "timeline",
      panelId: "timeline",
      state: {
        selectedKeys: ["avgDisplacementX", "avgDisplacementY", "avgDisplacementMag", "avgRotationZ"],
      },
    },
    "interstory-drift-chart": {
      type: "interstoryDriftChart",
      panelId: "interstory-drift-chart",
      state: {
        visibleCorners: ["NW", "NE", "SW", "SE"],
      },
    },
  };

  return {
    ...base,
    currentMetric: "interstoryDrift",
    thresholdHighlighting: true,
    thresholds: {
      ...base.thresholds,
      interstoryDrift: 0.35,
    },
    camera,
    panelStates,
  };
}

function getAccelerationReviewDefaultState(layout?: SerializedDockview | null): AppState {
  const base = getDefaultAppState(layout);

  const panelStates: Record<string, PanelState> = {
    timeline: {
      type: "timeline",
      panelId: "timeline",
      state: {
        selectedKeys: ["x", "y", "magnitude", "avgAccelerationX", "avgAccelerationY", "avgAccelerationMag"],
      },
    },
  };

  return {
    ...base,
    currentMetric: "accelerationMag",
    thresholdHighlighting: true,
    thresholds: {
      ...base.thresholds,
      acceleration: 1.5,
    },
    panelStates,
  };
}

function getDamageScreeningDefaultState(layout?: SerializedDockview | null): AppState {
  const base = getDefaultAppState(layout);
  const camera: CameraState = {
    isOrthographic: true,
    position: [120, 90, 0],
    target: [0, 0, 0],
    zoom: 48,
  };
  const canvasPanel = getDefaultCanvasPanelState();
  const canvasExpandedScale = canvasPanel.expandedScale ?? { ...DEFAULT_EXPANDED_SCALE_STATE };

  const panelStates: Record<string, PanelState> = {
    "main-canvas": {
      type: "canvas",
      panelId: "main-canvas",
      state: {
        ...canvasPanel,
        camera,
        expandedScale: {
          ...canvasExpandedScale,
          displacementEnabled: true,
          xzDisplacementScale: 8,
          zDisplacementScale: 4,
        },
      },
    },
    timeline: {
      type: "timeline",
      panelId: "timeline",
      state: {
        selectedKeys: ["avgDisplacementMag", "avgVelocityMag", "avgRotationZ", "avgRotationMag"],
      },
    },
    "interstory-drift-chart": {
      type: "interstoryDriftChart",
      panelId: "interstory-drift-chart",
      state: {
        visibleCorners: ["NW", "NE", "SW", "SE"],
      },
    },
  };

  return {
    ...base,
    currentMetric: "rotationZ",
    thresholdHighlighting: true,
    thresholds: {
      ...base.thresholds,
      rotation: 0.008,
      interstoryDrift: 0.35,
    },
    expandedScale: {
      ...base.expandedScale,
      displacementEnabled: true,
      xzDisplacementScale: 8,
      zDisplacementScale: 4,
    },
    camera,
    panelStates,
  };
}

export function getDefaultCameraState(): CameraState {
  return { ...DEFAULT_CAMERA_STATE };
}

export function getDefaultCanvasPanelState(): CanvasPanelState {
  return {
    camera: getDefaultCameraState(),
    expandedScale: { ...DEFAULT_EXPANDED_SCALE_STATE },
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

export function getDefaultVelocityTimeChartPanelState(): VelocityTimeChartPanelState {
  return {
    selectedKeys: ["magnitude"],
  };
}

export function getDefaultRotationTimeChartPanelState(): RotationTimeChartPanelState {
  return {
    selectedKeys: ["magnitude"],
  };
}

export function getDefaultHistogramChartPanelState(): HistogramChartPanelState {
  return {
    positionAxis: "x",
    valueType: "displacementMag",
  };
}

export function getDefaultDataTablePanelState(): DataTablePanelState {
  return {
    page: 0,
  };
}

export function getDefaultPeakValuesPanelState(): PeakValuesPanelState {
  return {
    sortKey: "magnitude",
    sortDir: "desc",
  };
}

export function getDefaultDataExplorerPanelState(): DataExplorerPanelState {
  return {
    query: "",
    page: 0,
    sortKey: "currentMagnitude",
    sortDir: "desc",
  };
}

export function getDefaultHingeDistributionPanelState(): HingeDistributionPanelState {
  return {
    stepType: "All",
    binCount: 24,
    logScale: false,
    clipPercentile: 95,
  };
}

export function getDefaultHingeHotspotsPanelState(): HingeHotspotsPanelState {
  return {
    stepType: "Max",
  };
}

export function getDefaultAppState(layout?: SerializedDockview | null): AppState {
  return {
    version: STATE_VERSION,
    timestamp: Date.now(),
    frameIndex: 0,
    currentMetric: "interstoryDrift",
    metricPaletteOverrides: {},
    thresholdHighlighting: true,
    thresholds: { ...DEFAULT_THRESHOLDS },
    visibleFloors: [],
    selectedNodeIds: [],
    hiddenNodeIds: [],
    hideSelectedNodes: false,
    expandedScale: { ...DEFAULT_EXPANDED_SCALE_STATE },
    sliceEnabled: false,
    xRange: [...DEFAULT_SLICE_RANGES.x] as [number, number],
    yRange: [...DEFAULT_SLICE_RANGES.y] as [number, number],
    zRange: [...DEFAULT_SLICE_RANGES.z] as [number, number],
    camera: getDefaultCameraState(),
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    layout: layout ?? null,
    panelStates: {},
    dataSelection: undefined,
  };
}

export function getDataSelectionFromUrlSearch(search: string): DataSelection | null {
  const params = new URLSearchParams(search);
  const building = params.get("building");
  const simulation = params.get("simulation");
  if (!building || !simulation) return null;

  const optionalLoads = parseOptionalDataLoadsFromUrlParams(params);
  return optionalLoads ? { building, simulation, optionalLoads } : { building, simulation };
}

export function getDataSelectionFromCurrentUrl(): DataSelection | null {
  if (typeof window === "undefined") return null;
  return getDataSelectionFromUrlSearch(window.location.search);
}

function getSystemDefaultProfiles(layout?: SerializedDockview | null): SaveProfile[] {
  const defaultState = getDefaultAppState(layout);
  const floorTorsionState = getFloorTorsionDefaultState(layout);
  const driftAnalysisState = getDriftAnalysisDefaultState(layout);
  const accelerationReviewState = getAccelerationReviewDefaultState(layout);
  const damageScreeningState = getDamageScreeningDefaultState(layout);

  return [
    createProfile({
      id: SYSTEM_PROFILE_DEFAULT_ID,
      name: "Default View",
      kind: "system",
      defaultState,
    }),
    createProfile({
      id: SYSTEM_PROFILE_FLOOR_TORSION_ID,
      name: "Floor Torsion",
      kind: "system",
      defaultState: floorTorsionState,
    }),
    createProfile({
      id: SYSTEM_PROFILE_DRIFT_ANALYSIS_ID,
      name: "Drift Analysis",
      kind: "system",
      defaultState: driftAnalysisState,
    }),
    createProfile({
      id: SYSTEM_PROFILE_ACCELERATION_REVIEW_ID,
      name: "Acceleration Review",
      kind: "system",
      defaultState: accelerationReviewState,
    }),
    createProfile({
      id: SYSTEM_PROFILE_DAMAGE_SCREENING_ID,
      name: "ISD Screening",
      kind: "system",
      defaultState: damageScreeningState,
    }),
  ];
}

function serializeState(state: AppState): string {
  return JSON.stringify(state);
}

function deserializeState(json: string): AppState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isAppStateLike(parsed)) {
      return null;
    }
    if (parsed.version > STATE_VERSION) {
      console.warn("State version mismatch or invalid");
      return null;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to deserialize state:", e);
    return null;
  }
}

function saveProfiles(profiles: SaveProfile[]): void {
  localStorage.setItem(SAVE_PROFILES_KEY, JSON.stringify(profiles));
}

function parseProfiles(raw: string | null): SaveProfile[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const profiles: SaveProfile[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) continue;

      const { id, name, kind, createdAt, updatedAt, defaultState, currentState } = item;
      if (
        typeof id !== "string" ||
        typeof name !== "string" ||
        (kind !== "system" && kind !== "user" && kind !== "ephemeral") ||
        typeof createdAt !== "number" ||
        typeof updatedAt !== "number" ||
        !isAppStateLike(defaultState) ||
        !isAppStateLike(currentState)
      ) {
        continue;
      }

      profiles.push({
        id,
        name,
        kind,
        createdAt,
        updatedAt,
        defaultState,
        currentState,
      });
    }
    return profiles;
  } catch {
    return [];
  }
}

function parseLegacyNamedPresets(): NamedPreset[] {
  try {
    const json = localStorage.getItem(PRESETS_KEY);
    if (!json) return [];

    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    const presets: NamedPreset[] = [];
    for (const item of parsed) {
      if (!isRecord(item)) continue;
      const { name, state, createdAt } = item;
      if (typeof name === "string" && typeof createdAt === "number" && isAppStateLike(state)) {
        presets.push({ name, state, createdAt });
      }
    }

    return presets;
  } catch {
    return [];
  }
}

function parseLegacyAutoSave(): AppState | null {
  const json = localStorage.getItem(AUTO_SAVE_KEY);
  if (!json) return null;
  return deserializeState(json);
}

function migrateLegacyData(layout?: SerializedDockview | null): SaveProfile[] {
  const systemProfiles = getSystemDefaultProfiles(layout);
  const migratedProfiles = [...systemProfiles];

  const legacyAutoSave = parseLegacyAutoSave();
  if (legacyAutoSave) {
    const defaultProfileIndex = migratedProfiles.findIndex((p) => p.id === SYSTEM_PROFILE_DEFAULT_ID);
    if (defaultProfileIndex >= 0) {
      const defaultProfile = migratedProfiles[defaultProfileIndex];
      migratedProfiles[defaultProfileIndex] = {
        ...defaultProfile,
        currentState: normalizeState(cloneAppState(legacyAutoSave)),
        updatedAt: Date.now(),
      };
    }
  }

  const legacyPresets = parseLegacyNamedPresets();
  for (const preset of legacyPresets) {
    migratedProfiles.push(
      createProfile({
        id: generateUserProfileId(preset.name),
        name: preset.name,
        kind: "user",
        defaultState: preset.state,
        currentState: preset.state,
        createdAt: preset.createdAt,
        updatedAt: preset.state.timestamp,
      })
    );
  }

  localStorage.removeItem(PRESETS_KEY);
  localStorage.removeItem(AUTO_SAVE_KEY);

  return migratedProfiles;
}

function ensureSystemProfiles(profiles: SaveProfile[], layout?: SerializedDockview | null): SaveProfile[] {
  const defaults = getSystemDefaultProfiles(layout);
  const byId = new Map<string, SaveProfile>();

  for (const profile of profiles) {
    byId.set(profile.id, profile);
  }

  for (const defaultProfile of defaults) {
    const existing = byId.get(defaultProfile.id);
    if (!existing) {
      byId.set(defaultProfile.id, defaultProfile);
      continue;
    }

    if (existing.kind !== "system") {
      byId.set(defaultProfile.id, {
        ...defaultProfile,
        currentState: existing.currentState,
        updatedAt: existing.updatedAt,
      });
      continue;
    }

    byId.set(defaultProfile.id, {
      ...existing,
      name: defaultProfile.name,
      defaultState: defaultProfile.defaultState,
    });
  }

  return Array.from(byId.values());
}

export function loadSaveProfiles(layout?: SerializedDockview | null): SaveProfile[] {
  try {
    const existingProfiles = parseProfiles(localStorage.getItem(SAVE_PROFILES_KEY));

    let profiles: SaveProfile[];
    if (existingProfiles.length === 0) {
      profiles = migrateLegacyData(layout);
    } else {
      profiles = ensureSystemProfiles(existingProfiles, layout);
    }

    if (profiles.length === 0) {
      profiles = getSystemDefaultProfiles(layout);
    }

    saveProfiles(profiles);

    const activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const hasValidActive = activeProfileId && profiles.some((p) => p.id === activeProfileId);
    if (!hasValidActive) {
      localStorage.setItem(ACTIVE_PROFILE_KEY, SYSTEM_PROFILE_DEFAULT_ID);
    }

    return profiles;
  } catch {
    const fallback = getSystemDefaultProfiles(layout);
    saveProfiles(fallback);
    localStorage.setItem(ACTIVE_PROFILE_KEY, SYSTEM_PROFILE_DEFAULT_ID);
    return fallback;
  }
}

export function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) ?? SYSTEM_PROFILE_DEFAULT_ID;
}

export function setActiveProfileId(profileId: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function getActiveProfile(layout?: SerializedDockview | null): SaveProfile | null {
  const profiles = loadSaveProfiles(layout);
  const activeId = getActiveProfileId();
  return profiles.find((profile) => profile.id === activeId) ?? null;
}

export function setActiveProfile(profileId: string, layout?: SerializedDockview | null): boolean {
  const profiles = loadSaveProfiles(layout);
  if (!profiles.some((profile) => profile.id === profileId)) return false;
  setActiveProfileId(profileId);
  return true;
}

export function saveStateToActiveProfile(state: AppState): void {
  try {
    const profiles = loadSaveProfiles(state.layout ?? undefined);
    const activeId = getActiveProfileId();
    const normalizedState = normalizeState(cloneAppState(state));

    const updatedProfiles = profiles.map((profile) => {
      if (profile.id !== activeId) return profile;
      return {
        ...profile,
        currentState: normalizedState,
        updatedAt: Date.now(),
      };
    });

    saveProfiles(updatedProfiles);
  } catch (e) {
    console.error("Failed to save state to active profile:", e);
  }
}

export function loadActiveProfileState(layout?: SerializedDockview | null): AppState | null {
  const profile = getActiveProfile(layout);
  return profile ? cloneAppState(profile.currentState) : null;
}

function getEphemeralShareProfileName(selection?: DataSelection): string {
  if (!selection) {
    return "Shared Session";
  }
  return `Shared Session (${selection.building}/${selection.simulation})`;
}

export function activateEphemeralShareProfile(state: AppState): void {
  try {
    const profiles = loadSaveProfiles(state.layout ?? undefined).filter(
      (profile) => profile.id !== EPHEMERAL_SHARE_PROFILE_ID
    );

    const sessionProfile = createProfile({
      id: EPHEMERAL_SHARE_PROFILE_ID,
      name: getEphemeralShareProfileName(state.dataSelection),
      kind: "ephemeral",
      defaultState: state,
      currentState: state,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    saveProfiles([...profiles, sessionProfile]);
    setActiveProfileId(EPHEMERAL_SHARE_PROFILE_ID);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILES_UPDATED_EVENT));
    }
  } catch (e) {
    console.error("Failed to activate ephemeral share profile:", e);
  }
}

export function createUserProfile(name: string, fromState?: AppState): SaveProfile | null {
  const trimmedName = sanitizeProfileName(name);
  if (!trimmedName) return null;

  const profiles = loadSaveProfiles(fromState?.layout ?? undefined);
  const existing = profiles.find((profile) => profile.name.toLowerCase() === trimmedName.toLowerCase());
  const baseState = fromState ?? loadActiveProfileState() ?? getDefaultAppState();

  if (existing && existing.kind === "user") {
    const updated: SaveProfile = {
      ...existing,
      name: trimmedName,
      currentState: normalizeState(cloneAppState(baseState)),
      updatedAt: Date.now(),
    };

    saveProfiles(profiles.map((profile) => (profile.id === existing.id ? updated : profile)));
    return updated;
  }

  const newProfile = createProfile({
    id: generateUserProfileId(trimmedName),
    name: trimmedName,
    kind: "user",
    defaultState: baseState,
    currentState: baseState,
  });

  saveProfiles([...profiles, newProfile]);
  return newProfile;
}

export function renameUserProfile(profileId: string, nextName: string): boolean {
  const trimmedName = sanitizeProfileName(nextName);
  if (!trimmedName) return false;

  const profiles = loadSaveProfiles();
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile || profile.kind !== "user") return false;

  const duplicate = profiles.find(
    (item) => item.id !== profileId && item.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) return false;

  saveProfiles(
    profiles.map((item) =>
      item.id === profileId
        ? {
            ...item,
            name: trimmedName,
            updatedAt: Date.now(),
          }
        : item
    )
  );

  return true;
}

export function deleteUserProfile(profileId: string): boolean {
  const profiles = loadSaveProfiles();
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile || profile.kind !== "user") return false;

  const filtered = profiles.filter((item) => item.id !== profileId);
  saveProfiles(filtered);

  if (getActiveProfileId() === profileId) {
    setActiveProfileId(SYSTEM_PROFILE_DEFAULT_ID);
  }

  return true;
}

export function resetProfileToDefault(profileId: string): boolean {
  const profiles = loadSaveProfiles();
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile || profile.kind !== "system") return false;

  saveProfiles(
    profiles.map((item) =>
      item.id === profileId
        ? {
            ...item,
            currentState: normalizeState(cloneAppState(item.defaultState)),
            updatedAt: Date.now(),
          }
        : item
    )
  );

  return true;
}

export function encodeStateForUrl(state: AppState): string {
  const stateToEncode = state;

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
  saveStateToActiveProfile(state);
}

export function loadFromLocalStorage(): AppState | null {
  return loadActiveProfileState();
}

export function clearLocalStorage(): void {
  const activeProfile = getActiveProfile();
  if (!activeProfile) return;

  if (activeProfile.kind === "system") {
    resetProfileToDefault(activeProfile.id);
    return;
  }

  saveStateToActiveProfile(getDefaultAppState());
}

export function saveNamedPreset(name: string, state: AppState): void {
  createUserProfile(name, state);
}

export function loadNamedPreset(name: string): AppState | null {
  const profile = loadSaveProfiles().find((item) => item.name === name);
  return profile ? profile.currentState : null;
}

export function deleteNamedPreset(name: string): void {
  const profile = loadSaveProfiles().find((item) => item.name === name && item.kind === "user");
  if (!profile) return;
  deleteUserProfile(profile.id);
}

export function loadNamedPresets(): NamedPreset[] {
  return loadSaveProfiles()
    .filter((profile) => profile.kind === "user")
    .map((profile) => ({
      name: profile.name,
      state: profile.currentState,
      createdAt: profile.createdAt,
    }));
}

export function renameNamedPreset(oldName: string, newName: string): void {
  const profile = loadSaveProfiles().find((item) => item.name === oldName && item.kind === "user");
  if (!profile) return;
  renameUserProfile(profile.id, newName);
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

function _lastLayoutKey(): string {
  return "last_view3d_layout";
}

export function clearAllLocalStorage(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [
    AUTO_SAVE_KEY,
    PRESETS_KEY,
    LAST_URL_STATE_KEY,
    SAVE_PROFILES_KEY,
    ACTIVE_PROFILE_KEY,
    _lastLayoutKey(),
  ];
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

interface UrlStateResolution {
  state: AppState | null;
}

const OPTIONAL_LOADS_URL_PARAM = "optionalLoads";

function parseOptionalDataLoadsFromUrlParams(params: URLSearchParams): Partial<OptionalDataLoadOptions> | undefined {
  const encoded = params.get(OPTIONAL_LOADS_URL_PARAM);
  if (!encoded) return undefined;
  if (encoded.length !== OPTIONAL_DATA_LOAD_OPTION_KEYS.length) return undefined;

  const parsed: Partial<OptionalDataLoadOptions> = {};
  for (let i = 0; i < OPTIONAL_DATA_LOAD_OPTION_KEYS.length; i += 1) {
    const char = encoded[i];
    if (char !== "0" && char !== "1") return undefined;
    parsed[OPTIONAL_DATA_LOAD_OPTION_KEYS[i]] = char === "1";
  }
  return parsed;
}

function encodeOptionalDataLoadsForUrl(optionalLoads?: Partial<OptionalDataLoadOptions>): string | null {
  if (!optionalLoads) return null;

  let hasAny = false;
  const bits = OPTIONAL_DATA_LOAD_OPTION_KEYS.map((key) => {
    const value = optionalLoads[key];
    if (typeof value === "boolean") {
      hasAny = true;
      return value ? "1" : "0";
    }
    return "1";
  }).join("");

  return hasAny ? bits : null;
}

function applyDataSelectionToUrlParams(url: URL, selection?: DataSelection): void {
  if (selection) {
    url.searchParams.set("building", selection.building);
    url.searchParams.set("simulation", selection.simulation);
    const encodedOptionalLoads = encodeOptionalDataLoadsForUrl(selection.optionalLoads);
    if (encodedOptionalLoads) {
      url.searchParams.set(OPTIONAL_LOADS_URL_PARAM, encodedOptionalLoads);
    } else {
      url.searchParams.delete(OPTIONAL_LOADS_URL_PARAM);
    }
    return;
  }

  url.searchParams.delete("building");
  url.searchParams.delete("simulation");
  url.searchParams.delete(OPTIONAL_LOADS_URL_PARAM);
}

function mergeDataSelections(
  primary: DataSelection | null | undefined,
  override: DataSelection | null | undefined
): DataSelection | null {
  if (!primary && !override) return null;
  if (!primary) return override ?? null;
  if (!override) return primary;

  return {
    building: override.building,
    simulation: override.simulation,
    optionalLoads: override.optionalLoads ?? primary.optionalLoads,
  };
}

const SHORT_LINK_PATH_REGEX = /^\/s\/([^/]+)$/;
const SHARE_URL_PARAM = "share";
const SHARE_API_BASE = import.meta.env.VITE_SHARE_API_BASE as string | undefined;
let resolvedUrlStatePromise: Promise<UrlStateResolution> | null = null;

function getShareApiBase(): string {
  if (typeof window === "undefined") return "";
  return SHARE_API_BASE?.trim() || window.location.origin;
}

function extractShareIdFromCurrentUrl(url: URL): string | null {
  const queryShareId = url.searchParams.get(SHARE_URL_PARAM);
  if (queryShareId) return queryShareId;
  const pathMatch = url.pathname.match(SHORT_LINK_PATH_REGEX);
  return pathMatch?.[1] ?? null;
}

async function fetchStateFromShareId(shareId: string): Promise<AppState | null> {
  try {
    const shareApiUrl = new URL(`/api/share/${encodeURIComponent(shareId)}`, getShareApiBase());
    const response = await fetch(shareApiUrl.toString());
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { state?: unknown };
    if (!isRecord(payload) || typeof payload.state !== "string") {
      return null;
    }
    return decodeStateFromUrl(payload.state);
  } catch (e) {
    console.error("Failed to load share state:", e);
    return null;
  }
}

async function resolveStateFromCurrentUrlInternal(): Promise<UrlStateResolution> {
  if (typeof window === "undefined") return { state: null };

  const currentUrl = new URL(window.location.href);
  const explicitSelection = getDataSelectionFromUrlSearch(currentUrl.search);
  const encodedState = currentUrl.searchParams.get("state");
  const shareId = extractShareIdFromCurrentUrl(currentUrl);
  const isShortShareRoute = SHORT_LINK_PATH_REGEX.test(currentUrl.pathname);
  let state: AppState | null = null;

  if (encodedState) {
    state = decodeStateFromUrl(encodedState);
  } else if (shareId) {
    state = await fetchStateFromShareId(shareId);
  }

  if (state) {
    const selection = mergeDataSelections(state.dataSelection, explicitSelection);
    if (selection) {
      state.dataSelection = selection;
    }

    activateEphemeralShareProfile(state);
  }

  if (state && isShortShareRoute) {
    const selection = state.dataSelection;
    const nextUrl = new URL(currentUrl.toString());
    nextUrl.pathname = "/";
    nextUrl.searchParams.delete(SHARE_URL_PARAM);
    nextUrl.searchParams.delete("state");
    applyDataSelectionToUrlParams(nextUrl, selection);

    const nextHref = nextUrl.toString();
    if (nextHref !== currentUrl.toString()) {
      window.history.replaceState({}, "", nextHref);
    }
  }

  return { state };
}

async function resolveStateFromCurrentUrl(): Promise<UrlStateResolution> {
  if (resolvedUrlStatePromise === null) {
    resolvedUrlStatePromise = resolveStateFromCurrentUrlInternal();
  }
  return resolvedUrlStatePromise;
}

export async function getStateFromCurrentUrl(): Promise<AppState | null> {
  const resolved = await resolveStateFromCurrentUrl();
  return resolved.state;
}

export async function getSelectionFromCurrentUrlStateOrParams(): Promise<DataSelection | null> {
  const explicitSelection = getDataSelectionFromCurrentUrl();
  const state = await getStateFromCurrentUrl();
  return mergeDataSelections(state?.dataSelection, explicitSelection);
}

export function createShareableUrl(state: AppState): string {
  const url = new URL(window.location.href);
  const encodedState = encodeStateForUrl(state);

  applyDataSelectionToUrlParams(url, state.dataSelection);

  url.searchParams.delete(SHARE_URL_PARAM);

  if (encodedState) {
    url.searchParams.set("state", encodedState);
  }

  return url.toString();
}

async function createShareableShortUrl(state: AppState): Promise<string | null> {
  try {
    const apiUrl = new URL("/api/share", getShareApiBase());
    const encodedState = encodeStateForUrl(state);
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        v: state.version,
        state: encodedState,
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { id?: unknown; url?: unknown };
    if (!isRecord(payload)) {
      return null;
    }

    if (typeof payload.id === "string" && payload.id.length > 0) {
      return `${window.location.origin}/s/${payload.id}`;
    }

    if (typeof payload.url === "string") {
      return payload.url;
    }

    return null;
  } catch (e) {
    console.error("Failed to create short share URL:", e);
    return null;
  }
}

export async function copyShareableUrlToClipboard(store: ReturnType<typeof useViewStoreRaw>): Promise<boolean> {
  const state = getCurrentAppState(store);
  const shareableUrl = await createShareableShortUrl(state);

  if (!shareableUrl) return false;

  try {
    await navigator.clipboard.writeText(shareableUrl);
    return true;
  } catch (e) {
    console.error("Failed to copy URL to clipboard:", e);
    return false;
  }
}

function getCurrentAppState(store: ReturnType<typeof useViewStoreRaw>): AppState {
  const state = store.getState();

  return {
    version: 1,
    timestamp: Date.now(),
    frameIndex: state.frameIndex,
    currentMetric: state.currentMetric,
    metricPaletteOverrides: state.metricPaletteOverrides,
    thresholdHighlighting: state.thresholdHighlighting,
    thresholds: state.thresholds,
    visibleFloors: state.visibleFloors,
    selectedNodeIds: state.selectedNodeIds,
    hiddenNodeIds: state.hiddenNodeIds,
    hideSelectedNodes: state.hideSelectedNodes,
    expandedScale: state.expandedScale,
    sliceEnabled: state.sliceEnabled,
    xRange: state.xRange,
    yRange: state.yRange,
    zRange: state.zRange,
    camera: state.cameraState,
    backgroundColor: state.backgroundColor,
    layout: state.dockviewLayout ?? getDefaultAppState().layout,
    panelStates: state.panelStates,
    dataSelection: getDataSelectionFromCurrentUrl() ?? undefined,

    // Render Modes
    renderNodes: state.renderNodes,
    renderFloorSlabs: state.renderFloorSlabs,
    renderXCrossSectionSlabs: state.renderXCrossSectionSlabs,
    renderYCrossSectionSlabs: state.renderYCrossSectionSlabs,
    showCornersOnly: state.showCornersOnly,
    renderVerticalConnections: state.renderVerticalConnections,
    renderHorizontalConnections: state.renderHorizontalConnections,
  };
}
