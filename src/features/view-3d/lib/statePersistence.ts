import LZString from "lz-string";

import DataSources from "@/data/index";
import { DEFAULT_TIMELINE_PANEL_STATE, type TimelinePanelState } from "@/features/view-3d/components/Timeline";
import type { Metric, MetricPaletteKey, MetricPaletteOverrides } from "@/lib/metrics";
import type { SerializedDockview } from "dockview";

import {
  DEFAULT_COLOR_THEMES,
  DEFAULT_THRESHOLDS,
  type ColorTheme,
  type SavedPanelState,
  type ThresholdState,
} from "@/state/profileState";
import type { useViewStoreRaw } from "@/state";
import { DEFAULT_CANVAS_PANEL_STATE, type CanvasPanelState } from "../contexts/CameraContext";

export const STATE_VERSION = 3;

const LAST_URL_STATE_KEY = "visuals_last_url_state";
const APP_PREFERENCES_KEY = "visuals_app_preferences_v3";
const BUILDING_PROFILE_SETS_KEY = "visuals_building_profile_sets_v3";
export const PROFILES_UPDATED_EVENT = "visuals:profiles-updated";
export const APPLY_WORKSPACE_STATE_EVENT = "visuals:apply-workspace-state";

export const SYSTEM_PROFILE_DEFAULT_ID = "system-default";
export const SYSTEM_PROFILE_FLOOR_TORSION_ID = "system-floor-torsion";
export const SYSTEM_PROFILE_DRIFT_ANALYSIS_ID = "system-drift-analysis";
export const SYSTEM_PROFILE_ACCELERATION_REVIEW_ID = "system-acceleration-review";
export const SYSTEM_PROFILE_DAMAGE_SCREENING_ID = "system-damage-screening";
export const EPHEMERAL_SHARE_PROFILE_ID = "ephemeral-share-session";

export interface AppPreferences {
  showHiddenMetrics: boolean;
}

export interface WorkspaceState {
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
  colorTheme: ColorTheme;
  layout: SerializedDockview | null;
  panelStates: Partial<Record<string, SavedPanelState>>;
  dataSelection?: DataSelection;
  renderNodes: boolean;
  renderFloorSlabs: boolean;
  renderXCrossSectionSlabs: boolean;
  renderYCrossSectionSlabs: boolean;
  showCornersOnly: boolean;
  visualInterpolationEnabled: boolean;
  renderVerticalConnections: boolean;
  renderHorizontalConnections: boolean;
  nodePanelGraphVisibility: Record<string, boolean>;
}

export interface DataSelection {
  building: string;
  simulation: string;
  optionalLoads?: Partial<OptionalDataLoadOptions>;
}

export interface OptionalDataLoadOptions {
  beamData: boolean;
  hingeData: boolean;
  shearData: boolean;
  displacementRot: boolean;
  velocityLin: boolean;
  velocityRot: boolean;
  accelerationLin: boolean;
  accelerationRot: boolean;
}

export const OPTIONAL_DATA_LOAD_OPTION_KEYS = [
  "beamData",
  "hingeData",
  "shearData",
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
  buildingId: string;
  kind: SaveProfileKind;
  createdAt: number;
  updatedAt: number;
  defaultState: WorkspaceState;
  currentState: WorkspaceState;
}

export interface NamedPreset {
  name: string;
  state: WorkspaceState;
  createdAt: number;
}

interface BuildingProfileSet {
  buildingId: string;
  activeProfileId: string;
  profiles: SaveProfile[];
}

interface StoredBuildingProfileSets {
  version: number;
  lastActiveBuildingId: string | null;
  sets: Record<string, BuildingProfileSet>;
}

interface UrlStateResolution {
  state: WorkspaceState | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOptionalLoads(
  optionalLoads?: Partial<OptionalDataLoadOptions> | null
): Partial<OptionalDataLoadOptions> | undefined {
  if (!optionalLoads || !isRecord(optionalLoads)) return undefined;

  const normalized: Partial<OptionalDataLoadOptions> = {};
  for (const key of OPTIONAL_DATA_LOAD_OPTION_KEYS) {
    const value = optionalLoads[key];
    if (typeof value === "boolean") {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSelection(selection?: DataSelection | null): DataSelection | undefined {
  if (!selection) return undefined;
  if (!selection.building || !selection.simulation) return undefined;
  return {
    building: selection.building,
    simulation: selection.simulation,
    optionalLoads: normalizeOptionalLoads(selection.optionalLoads),
  };
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

function getDefaultBuildingSelection(): DataSelection | undefined {
  const firstBuilding = DataSources.buildings[0];
  const firstSimulation = firstBuilding?.simulations[0];
  if (!firstBuilding || !firstSimulation) return undefined;
  return {
    building: firstBuilding.folder,
    simulation: firstSimulation.folder,
  };
}

function normalizeWorkspaceState(raw: Partial<WorkspaceState> & Record<string, unknown>): WorkspaceState {
  const selection = normalizeSelection(raw.dataSelection as DataSelection | undefined) ?? getDefaultBuildingSelection();
  const thresholds = isRecord(raw.thresholds)
    ? { ...DEFAULT_THRESHOLDS, ...(raw.thresholds as Partial<ThresholdState>) }
    : { ...DEFAULT_THRESHOLDS };

  return {
    version: STATE_VERSION,
    timestamp: Date.now(),
    frameIndex: isNumber(raw.frameIndex) ? raw.frameIndex : 0,
    currentMetric: typeof raw.currentMetric === "string" ? (raw.currentMetric as Metric) : "interstoryDrift",
    metricPaletteOverrides: getMetricPaletteOverridesPatch(raw.metricPaletteOverrides),
    thresholdHighlighting: isBoolean(raw.thresholdHighlighting) ? raw.thresholdHighlighting : true,
    thresholds,
    visibleFloors: Array.isArray(raw.visibleFloors)
      ? raw.visibleFloors.filter((value) => typeof value === "string")
      : [],
    selectedNodeIds: Array.isArray(raw.selectedNodeIds)
      ? raw.selectedNodeIds.filter((value): value is number => typeof value === "number")
      : [],
    hiddenNodeIds: Array.isArray(raw.hiddenNodeIds)
      ? raw.hiddenNodeIds.filter((value): value is number => typeof value === "number")
      : [],
    hideSelectedNodes: isBoolean(raw.hideSelectedNodes) ? raw.hideSelectedNodes : false,
    colorTheme: isRecord(raw.colorTheme)
      ? ({ ...DEFAULT_COLOR_THEMES[0], ...raw.colorTheme } as ColorTheme)
      : DEFAULT_COLOR_THEMES[0],
    layout: (raw.layout as SerializedDockview | null | undefined) ?? null,
    panelStates: isRecord(raw.panelStates) ? (raw.panelStates as Partial<Record<string, SavedPanelState>>) : {},
    dataSelection: selection,
    renderNodes: isBoolean(raw.renderNodes) ? raw.renderNodes : true,
    renderFloorSlabs: isBoolean(raw.renderFloorSlabs) ? raw.renderFloorSlabs : true,
    renderXCrossSectionSlabs: isBoolean(raw.renderXCrossSectionSlabs) ? raw.renderXCrossSectionSlabs : false,
    renderYCrossSectionSlabs: isBoolean(raw.renderYCrossSectionSlabs) ? raw.renderYCrossSectionSlabs : false,
    showCornersOnly: isBoolean(raw.showCornersOnly) ? raw.showCornersOnly : false,
    visualInterpolationEnabled: isBoolean(raw.visualInterpolationEnabled) ? raw.visualInterpolationEnabled : false,
    renderVerticalConnections: isBoolean(raw.renderVerticalConnections) ? raw.renderVerticalConnections : false,
    renderHorizontalConnections: isBoolean(raw.renderHorizontalConnections) ? raw.renderHorizontalConnections : false,
    nodePanelGraphVisibility: isRecord(raw.nodePanelGraphVisibility)
      ? Object.fromEntries(
          Object.entries(raw.nodePanelGraphVisibility).filter(
            (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
          )
        )
      : {},
  };
}

export function getDefaultAppPreferences(): AppPreferences {
  return {
    showHiddenMetrics: false,
  };
}

export function loadAppPreferences(): AppPreferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFERENCES_KEY) ?? "null") as unknown;
    if (!isRecord(parsed)) return getDefaultAppPreferences();
    return {
      showHiddenMetrics: isBoolean(parsed.showHiddenMetrics) ? parsed.showHiddenMetrics : false,
    };
  } catch {
    return getDefaultAppPreferences();
  }
}

export function saveAppPreferences(preferences: AppPreferences): void {
  localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify(preferences));
}

function buildEmptyStorage(): StoredBuildingProfileSets {
  return {
    version: STATE_VERSION,
    lastActiveBuildingId: null,
    sets: {},
  };
}

function readStoredBuildingSets(): StoredBuildingProfileSets {
  try {
    const parsed = JSON.parse(localStorage.getItem(BUILDING_PROFILE_SETS_KEY) ?? "null") as unknown;
    if (!isRecord(parsed) || !isRecord(parsed.sets)) {
      return buildEmptyStorage();
    }

    const sets = Object.fromEntries(
      Object.entries(parsed.sets).filter((entry): entry is [string, BuildingProfileSet] => {
        const value = entry[1];
        return isRecord(value) && typeof value.buildingId === "string" && Array.isArray(value.profiles);
      })
    );

    return {
      version: STATE_VERSION,
      lastActiveBuildingId: typeof parsed.lastActiveBuildingId === "string" ? parsed.lastActiveBuildingId : null,
      sets,
    };
  } catch {
    return buildEmptyStorage();
  }
}

function writeStoredBuildingSets(storage: StoredBuildingProfileSets): void {
  localStorage.setItem(BUILDING_PROFILE_SETS_KEY, JSON.stringify(storage));
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
  buildingId: string;
  kind: SaveProfileKind;
  defaultState: WorkspaceState;
  currentState?: WorkspaceState;
  createdAt?: number;
  updatedAt?: number;
}): SaveProfile {
  const now = Date.now();
  const defaultState = normalizeWorkspaceState(
    cloneState(params.defaultState) as WorkspaceState & Record<string, unknown>
  );
  const currentState = normalizeWorkspaceState(
    cloneState(params.currentState ?? params.defaultState) as WorkspaceState & Record<string, unknown>
  );

  return {
    id: params.id,
    name: sanitizeProfileName(params.name),
    buildingId: params.buildingId,
    kind: params.kind,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
    defaultState,
    currentState,
  };
}

export function getDefaultWorkspaceState(
  layout?: SerializedDockview | null,
  selection?: DataSelection | null
): WorkspaceState {
  return normalizeWorkspaceState({
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
    colorTheme: DEFAULT_COLOR_THEMES[0],
    layout: layout ?? null,
    panelStates: {},
    dataSelection: normalizeSelection(selection) ?? getDefaultBuildingSelection(),
    renderNodes: true,
    renderFloorSlabs: true,
    renderXCrossSectionSlabs: false,
    renderYCrossSectionSlabs: false,
    showCornersOnly: false,
    visualInterpolationEnabled: false,
    renderVerticalConnections: false,
    renderHorizontalConnections: false,
    nodePanelGraphVisibility: {},
  });
}

function withSelection(state: WorkspaceState, selection: DataSelection): WorkspaceState {
  return normalizeWorkspaceState({
    ...cloneState(state),
    dataSelection: selection,
  } as WorkspaceState & Record<string, unknown>);
}

function createCanvasPanelState(overrides?: Partial<CanvasPanelState>): CanvasPanelState {
  return {
    ...DEFAULT_CANVAS_PANEL_STATE,
    ...overrides,
    camera: {
      ...DEFAULT_CANVAS_PANEL_STATE.camera,
      ...overrides?.camera,
    },
    expandedScale: {
      ...DEFAULT_CANVAS_PANEL_STATE.expandedScale,
      ...overrides?.expandedScale,
    },
    sliceView: {
      ...DEFAULT_CANVAS_PANEL_STATE.sliceView,
      ...overrides?.sliceView,
    },
  };
}

function getFloorTorsionDefaultState(selection: DataSelection, layout?: SerializedDockview | null): WorkspaceState {
  return normalizeWorkspaceState({
    ...getDefaultWorkspaceState(layout, selection),
    currentMetric: "rotationZ",
    panelStates: {
      "main-canvas": {
        panelId: "main-canvas",
        type: "canvas",
        state: createCanvasPanelState({
          camera: {
            isOrthographic: true,
            position: [0, 120, 0],
            target: [0, 0, 0],
            zoom: 45,
          },
        }),
      },
    },
  } as WorkspaceState & Record<string, unknown>);
}

function getDriftAnalysisDefaultState(selection: DataSelection, layout?: SerializedDockview | null): WorkspaceState {
  return normalizeWorkspaceState({
    ...getDefaultWorkspaceState(layout, selection),
    currentMetric: "interstoryDrift",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      interstoryDrift: 0.35,
    },
    panelStates: {
      timeline: {
        panelId: "timeline",
        type: "timeline",
        state: {
          ...DEFAULT_TIMELINE_PANEL_STATE,
          selectedKeys: ["avgDisplacementX", "avgDisplacementY", "avgDisplacementMag", "avgRotationZ"],
        } satisfies TimelinePanelState,
      },
      "main-canvas": {
        panelId: "main-canvas",
        type: "canvas",
        state: createCanvasPanelState({
          camera: {
            isOrthographic: true,
            position: [85, 110, 85],
            target: [0, 0, 0],
            zoom: 42,
          },
        }),
      },
    },
  } as WorkspaceState & Record<string, unknown>);
}

function getAccelerationReviewDefaultState(
  selection: DataSelection,
  layout?: SerializedDockview | null
): WorkspaceState {
  return normalizeWorkspaceState({
    ...getDefaultWorkspaceState(layout, selection),
    currentMetric: "accelerationMag",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      acceleration: 1.5,
    },
    panelStates: {
      timeline: {
        panelId: "timeline",
        type: "timeline",
        state: {
          ...DEFAULT_TIMELINE_PANEL_STATE,
          selectedKeys: ["x", "y", "magnitude", "avgAccelerationX", "avgAccelerationY", "avgAccelerationMag"],
        } satisfies TimelinePanelState,
      },
    },
  } as WorkspaceState & Record<string, unknown>);
}

function getDamageScreeningDefaultState(selection: DataSelection, layout?: SerializedDockview | null): WorkspaceState {
  return normalizeWorkspaceState({
    ...getDefaultWorkspaceState(layout, selection),
    currentMetric: "rotationZ",
    thresholds: {
      ...DEFAULT_THRESHOLDS,
      rotation: 0.008,
      interstoryDrift: 0.35,
    },
    panelStates: {
      timeline: {
        panelId: "timeline",
        type: "timeline",
        state: {
          ...DEFAULT_TIMELINE_PANEL_STATE,
          selectedKeys: ["avgDisplacementMag", "avgVelocityMag", "avgRotationZ", "avgRotationMag"],
        } satisfies TimelinePanelState,
      },
      "main-canvas": {
        panelId: "main-canvas",
        type: "canvas",
        state: createCanvasPanelState({
          camera: {
            isOrthographic: true,
            position: [120, 90, 0],
            target: [0, 0, 0],
            zoom: 48,
          },
          expandedScale: {
            expansionEnabled: false,
            displacementEnabled: true,
            xExpansion: 0,
            yExpansion: 0,
            zExpansion: 1,
            xzDisplacementScale: 8,
            zDisplacementScale: 4,
          },
        }),
      },
    },
  } as WorkspaceState & Record<string, unknown>);
}

function createSystemProfilesForBuilding(selection: DataSelection, layout?: SerializedDockview | null): SaveProfile[] {
  return [
    createProfile({
      id: SYSTEM_PROFILE_DEFAULT_ID,
      name: "Default View",
      buildingId: selection.building,
      kind: "system",
      defaultState: getDefaultWorkspaceState(layout, selection),
    }),
    createProfile({
      id: SYSTEM_PROFILE_FLOOR_TORSION_ID,
      name: "Floor Torsion",
      buildingId: selection.building,
      kind: "system",
      defaultState: getFloorTorsionDefaultState(selection, layout),
    }),
    createProfile({
      id: SYSTEM_PROFILE_DRIFT_ANALYSIS_ID,
      name: "Drift Analysis",
      buildingId: selection.building,
      kind: "system",
      defaultState: getDriftAnalysisDefaultState(selection, layout),
    }),
    createProfile({
      id: SYSTEM_PROFILE_ACCELERATION_REVIEW_ID,
      name: "Acceleration Review",
      buildingId: selection.building,
      kind: "system",
      defaultState: getAccelerationReviewDefaultState(selection, layout),
    }),
    createProfile({
      id: SYSTEM_PROFILE_DAMAGE_SCREENING_ID,
      name: "ISD Screening",
      buildingId: selection.building,
      kind: "system",
      defaultState: getDamageScreeningDefaultState(selection, layout),
    }),
  ];
}

function ensureProfileBuildingSelection(profile: SaveProfile, selection: DataSelection): SaveProfile {
  return {
    ...profile,
    defaultState: withSelection(profile.defaultState, selection),
    currentState: withSelection(profile.currentState, selection),
  };
}

function ensureBuildingProfileSet(
  storage: StoredBuildingProfileSets,
  selection: DataSelection,
  layout?: SerializedDockview | null
): BuildingProfileSet {
  const existing = storage.sets[selection.building];
  if (!existing) {
    const created: BuildingProfileSet = {
      buildingId: selection.building,
      activeProfileId: SYSTEM_PROFILE_DEFAULT_ID,
      profiles: createSystemProfilesForBuilding(selection, layout),
    };
    storage.sets[selection.building] = created;
    storage.lastActiveBuildingId = selection.building;
    return created;
  }

  existing.profiles = existing.profiles.map((profile) =>
    ensureProfileBuildingSelection(profile, {
      ...selection,
      simulation: profile.currentState.dataSelection?.simulation ?? selection.simulation,
      optionalLoads: profile.currentState.dataSelection?.optionalLoads ?? selection.optionalLoads,
    })
  );
  storage.lastActiveBuildingId = selection.building;
  return existing;
}

function getActiveProfileFromSet(profileSet: BuildingProfileSet): SaveProfile {
  return (
    profileSet.profiles.find((profile) => profile.id === profileSet.activeProfileId) ??
    profileSet.profiles[0] ??
    createSystemProfilesForBuilding({
      building: profileSet.buildingId,
      simulation: getDefaultBuildingSelection()?.simulation ?? "",
    })[0]
  );
}

function emitProfilesUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILES_UPDATED_EVENT));
  }
}

function getStorage(): StoredBuildingProfileSets {
  return readStoredBuildingSets();
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

function getStoredFallbackSelection(): DataSelection | null {
  const storage = getStorage();
  const lastBuildingId = storage.lastActiveBuildingId;
  if (!lastBuildingId) return getDefaultBuildingSelection() ?? null;

  const profileSet = storage.sets[lastBuildingId];
  if (!profileSet) return getDefaultBuildingSelection() ?? null;

  return getActiveProfileFromSet(profileSet).currentState.dataSelection ?? getDefaultBuildingSelection() ?? null;
}

export function loadSaveProfiles(selection?: DataSelection | null): SaveProfile[] {
  const fallback = selection ?? getStoredFallbackSelection();
  if (!fallback) return [];
  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, fallback);
  writeStoredBuildingSets(storage);
  return profileSet.profiles.map((profile) => cloneState(profile));
}

export function getActiveProfile(selection?: DataSelection | null): SaveProfile | null {
  const fallback = selection ?? getStoredFallbackSelection();
  if (!fallback) return null;
  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, fallback);
  writeStoredBuildingSets(storage);
  return cloneState(getActiveProfileFromSet(profileSet));
}

export function setActiveProfile(profileId: string, selection?: DataSelection | null): boolean {
  const fallback = selection ?? getStoredFallbackSelection();
  if (!fallback) return false;
  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, fallback);
  if (!profileSet.profiles.some((profile) => profile.id === profileId)) return false;
  profileSet.activeProfileId = profileId;
  storage.lastActiveBuildingId = profileSet.buildingId;
  writeStoredBuildingSets(storage);
  emitProfilesUpdated();
  return true;
}

export function createUserProfile(name: string, fromState?: WorkspaceState): SaveProfile | null {
  const trimmedName = sanitizeProfileName(name);
  if (!trimmedName) return null;

  const selection = fromState?.dataSelection ?? getStoredFallbackSelection();
  if (!selection) return null;

  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, selection, fromState?.layout ?? undefined);
  const baseState =
    fromState ?? getActiveProfile(selection)?.currentState ?? getDefaultWorkspaceState(undefined, selection);
  const existing = profileSet.profiles.find(
    (profile) => profile.kind === "user" && profile.name.toLowerCase() === trimmedName.toLowerCase()
  );

  let created: SaveProfile;
  if (existing) {
    created = {
      ...existing,
      currentState: normalizeWorkspaceState(cloneState(baseState) as WorkspaceState & Record<string, unknown>),
      updatedAt: Date.now(),
    };
    profileSet.profiles = profileSet.profiles.map((profile) => (profile.id === existing.id ? created : profile));
  } else {
    created = createProfile({
      id: generateUserProfileId(trimmedName),
      name: trimmedName,
      buildingId: selection.building,
      kind: "user",
      defaultState: baseState,
      currentState: baseState,
    });
    profileSet.profiles.push(created);
  }

  writeStoredBuildingSets(storage);
  emitProfilesUpdated();
  return cloneState(created);
}

export function renameUserProfile(profileId: string, nextName: string): boolean {
  const trimmedName = sanitizeProfileName(nextName);
  if (!trimmedName) return false;

  const storage = getStorage();
  for (const profileSet of Object.values(storage.sets)) {
    const profile = profileSet.profiles.find((item) => item.id === profileId);
    if (!profile || profile.kind !== "user") continue;

    const duplicate = profileSet.profiles.find(
      (item) => item.id !== profileId && item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) return false;

    profile.name = trimmedName;
    profile.updatedAt = Date.now();
    writeStoredBuildingSets(storage);
    emitProfilesUpdated();
    return true;
  }

  return false;
}

export function deleteUserProfile(profileId: string): boolean {
  const storage = getStorage();
  for (const profileSet of Object.values(storage.sets)) {
    const profile = profileSet.profiles.find((item) => item.id === profileId);
    if (!profile || profile.kind !== "user") continue;

    profileSet.profiles = profileSet.profiles.filter((item) => item.id !== profileId);
    if (profileSet.activeProfileId === profileId) {
      profileSet.activeProfileId = SYSTEM_PROFILE_DEFAULT_ID;
    }
    writeStoredBuildingSets(storage);
    emitProfilesUpdated();
    return true;
  }

  return false;
}

export function resetProfileToDefault(profileId: string): boolean {
  const storage = getStorage();
  for (const profileSet of Object.values(storage.sets)) {
    const profile = profileSet.profiles.find((item) => item.id === profileId);
    if (!profile) continue;

    profile.currentState = cloneState(profile.defaultState);
    profile.updatedAt = Date.now();
    writeStoredBuildingSets(storage);
    emitProfilesUpdated();
    return true;
  }

  return false;
}

export function loadFromLocalStorage(selection?: DataSelection | null): WorkspaceState | null {
  const fallback = selection ?? getStoredFallbackSelection();
  if (!fallback) return null;

  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, fallback);
  const activeProfile = getActiveProfileFromSet(profileSet);
  const workspace = cloneState(activeProfile.currentState);

  if (selection) {
    workspace.dataSelection = normalizeSelection(selection);
  }

  writeStoredBuildingSets(storage);
  return workspace;
}

export function saveStateToActiveProfile(state: WorkspaceState): void {
  const selection = normalizeSelection(state.dataSelection) ?? getStoredFallbackSelection();
  if (!selection) return;

  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, selection, state.layout ?? undefined);
  const activeProfile = getActiveProfileFromSet(profileSet);
  const normalizedState = normalizeWorkspaceState(cloneState(state) as WorkspaceState & Record<string, unknown>);

  profileSet.profiles = profileSet.profiles.map((profile) =>
    profile.id === activeProfile.id
      ? {
          ...profile,
          currentState: normalizedState,
          updatedAt: Date.now(),
        }
      : profile
  );

  profileSet.activeProfileId = activeProfile.id;
  storage.lastActiveBuildingId = selection.building;
  writeStoredBuildingSets(storage);
}

export function saveToLocalStorage(state: WorkspaceState): void {
  saveStateToActiveProfile(state);
}

export function clearLocalStorage(): void {
  const activeProfile = getActiveProfile();
  if (!activeProfile) return;

  if (activeProfile.kind === "user") {
    saveStateToActiveProfile(activeProfile.defaultState);
    return;
  }

  resetProfileToDefault(activeProfile.id);
}

export function saveNamedPreset(name: string, state: WorkspaceState): void {
  createUserProfile(name, state);
}

export function loadNamedPreset(name: string): WorkspaceState | null {
  return loadSaveProfiles().find((profile) => profile.name === name)?.currentState ?? null;
}

export function deleteNamedPreset(name: string): void {
  const profile = loadSaveProfiles().find((item) => item.name === name && item.kind === "user");
  if (profile) {
    deleteUserProfile(profile.id);
  }
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
  if (profile) {
    renameUserProfile(profile.id, newName);
  }
}

export function saveUrlState(state: WorkspaceState): void {
  localStorage.setItem(LAST_URL_STATE_KEY, JSON.stringify(state));
}

export function loadUrlState(): WorkspaceState | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_URL_STATE_KEY) ?? "null") as unknown;
    return isRecord(parsed) ? normalizeWorkspaceState(parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function clearUrlState(): void {
  localStorage.removeItem(LAST_URL_STATE_KEY);
}

export function clearAllLocalStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_URL_STATE_KEY);
  localStorage.removeItem(APP_PREFERENCES_KEY);
  localStorage.removeItem(BUILDING_PROFILE_SETS_KEY);
}

export function encodeStateForUrl(state: WorkspaceState): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(state));
}

function deserializeWorkspaceState(json: string): WorkspaceState | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return isRecord(parsed) ? normalizeWorkspaceState(parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function decodeStateFromUrl(encoded: string): WorkspaceState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    return json ? deserializeWorkspaceState(json) : null;
  } catch {
    return null;
  }
}

const OPTIONAL_LOADS_URL_PARAM = "optionalLoads";

function parseOptionalDataLoadsFromUrlParams(params: URLSearchParams): Partial<OptionalDataLoadOptions> | undefined {
  const encoded = params.get(OPTIONAL_LOADS_URL_PARAM);
  if (!encoded || encoded.length !== OPTIONAL_DATA_LOAD_OPTION_KEYS.length) return undefined;

  const parsed: Partial<OptionalDataLoadOptions> = {};
  for (let index = 0; index < OPTIONAL_DATA_LOAD_OPTION_KEYS.length; index += 1) {
    const char = encoded[index];
    if (char !== "0" && char !== "1") return undefined;
    parsed[OPTIONAL_DATA_LOAD_OPTION_KEYS[index]] = char === "1";
  }

  return parsed;
}

function encodeOptionalDataLoadsForUrl(optionalLoads?: Partial<OptionalDataLoadOptions>): string | null {
  const normalized = normalizeOptionalLoads(optionalLoads);
  if (!normalized) return null;

  let hasAny = false;
  const bits = OPTIONAL_DATA_LOAD_OPTION_KEYS.map((key) => {
    const value = normalized[key];
    if (typeof value === "boolean") {
      hasAny = true;
      return value ? "1" : "0";
    }
    return "1";
  }).join("");

  return hasAny ? bits : null;
}

function applyDataSelectionToUrlParams(url: URL, selection?: DataSelection): void {
  if (!selection) {
    url.searchParams.delete("building");
    url.searchParams.delete("simulation");
    url.searchParams.delete(OPTIONAL_LOADS_URL_PARAM);
    return;
  }

  url.searchParams.set("building", selection.building);
  url.searchParams.set("simulation", selection.simulation);
  const encodedOptionalLoads = encodeOptionalDataLoadsForUrl(selection.optionalLoads);
  if (encodedOptionalLoads) {
    url.searchParams.set(OPTIONAL_LOADS_URL_PARAM, encodedOptionalLoads);
  } else {
    url.searchParams.delete(OPTIONAL_LOADS_URL_PARAM);
  }
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
  return url.pathname.match(SHORT_LINK_PATH_REGEX)?.[1] ?? null;
}

async function fetchStateFromShareId(shareId: string): Promise<WorkspaceState | null> {
  try {
    const shareApiUrl = new URL(`/api/share/${encodeURIComponent(shareId)}`, getShareApiBase());
    const response = await fetch(shareApiUrl.toString());
    if (!response.ok) return null;
    const payload = (await response.json()) as { state?: unknown };
    if (!isRecord(payload) || typeof payload.state !== "string") return null;
    return decodeStateFromUrl(payload.state);
  } catch {
    return null;
  }
}

function getEphemeralShareProfileName(selection?: DataSelection): string {
  if (!selection) return "Shared Session";
  return `Shared Session (${selection.building}/${selection.simulation})`;
}

export function activateEphemeralShareProfile(state: WorkspaceState): void {
  const selection = normalizeSelection(state.dataSelection) ?? getDefaultBuildingSelection();
  if (!selection) return;

  const storage = getStorage();
  const profileSet = ensureBuildingProfileSet(storage, selection, state.layout ?? undefined);
  const sessionProfile = createProfile({
    id: EPHEMERAL_SHARE_PROFILE_ID,
    name: getEphemeralShareProfileName(selection),
    buildingId: selection.building,
    kind: "ephemeral",
    defaultState: state,
    currentState: state,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  profileSet.profiles = profileSet.profiles.filter((profile) => profile.id !== EPHEMERAL_SHARE_PROFILE_ID);
  profileSet.profiles.push(sessionProfile);
  profileSet.activeProfileId = EPHEMERAL_SHARE_PROFILE_ID;
  storage.lastActiveBuildingId = selection.building;
  writeStoredBuildingSets(storage);
  emitProfilesUpdated();
}

async function resolveStateFromCurrentUrlInternal(): Promise<UrlStateResolution> {
  if (typeof window === "undefined") return { state: null };

  const currentUrl = new URL(window.location.href);
  const explicitSelection = getDataSelectionFromUrlSearch(currentUrl.search);
  const encodedState = currentUrl.searchParams.get("state");
  const shareId = extractShareIdFromCurrentUrl(currentUrl);
  const isShortShareRoute = SHORT_LINK_PATH_REGEX.test(currentUrl.pathname);

  let state: WorkspaceState | null = null;
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
    const nextUrl = new URL(currentUrl.toString());
    nextUrl.pathname = "/";
    nextUrl.searchParams.delete(SHARE_URL_PARAM);
    nextUrl.searchParams.delete("state");
    applyDataSelectionToUrlParams(nextUrl, state.dataSelection);
    const nextHref = nextUrl.toString();
    if (nextHref !== currentUrl.toString()) {
      window.history.replaceState({}, "", nextHref);
    }
  }

  return { state };
}

async function resolveStateFromCurrentUrl(): Promise<UrlStateResolution> {
  if (!resolvedUrlStatePromise) {
    resolvedUrlStatePromise = resolveStateFromCurrentUrlInternal();
  }
  return resolvedUrlStatePromise;
}

export async function getStateFromCurrentUrl(): Promise<WorkspaceState | null> {
  return (await resolveStateFromCurrentUrl()).state;
}

export async function getSelectionFromCurrentUrlStateOrParams(): Promise<DataSelection | null> {
  const explicitSelection = getDataSelectionFromCurrentUrl();
  const state = await getStateFromCurrentUrl();
  return mergeDataSelections(state?.dataSelection, explicitSelection) ?? getStoredFallbackSelection();
}

export function createShareableUrl(state: WorkspaceState): string {
  const url = new URL(window.location.href);
  const encodedState = encodeStateForUrl(state);
  applyDataSelectionToUrlParams(url, state.dataSelection);
  url.searchParams.delete(SHARE_URL_PARAM);
  if (encodedState) {
    url.searchParams.set("state", encodedState);
  }
  return url.toString();
}

async function createShareableShortUrl(state: WorkspaceState): Promise<string | null> {
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
    if (!isRecord(payload)) return null;
    if (typeof payload.id === "string" && payload.id.length > 0) {
      return `${window.location.origin}/s/${payload.id}`;
    }
    return typeof payload.url === "string" ? payload.url : null;
  } catch {
    return null;
  }
}

export function getCurrentWorkspaceStateSnapshot(store: ReturnType<typeof useViewStoreRaw>): WorkspaceState {
  const state = store.getState();
  return normalizeWorkspaceState({
    version: STATE_VERSION,
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
    colorTheme: state.colorTheme,
    layout: state.dockviewLayout ?? getDefaultWorkspaceState().layout,
    panelStates: state.panelStates,
    dataSelection: getDataSelectionFromCurrentUrl() ?? getStoredFallbackSelection() ?? undefined,
    renderNodes: state.renderNodes,
    renderFloorSlabs: state.renderFloorSlabs,
    renderXCrossSectionSlabs: state.renderXCrossSectionSlabs,
    renderYCrossSectionSlabs: state.renderYCrossSectionSlabs,
    showCornersOnly: state.showCornersOnly,
    visualInterpolationEnabled: state.visualInterpolationEnabled,
    renderVerticalConnections: state.renderVerticalConnections,
    renderHorizontalConnections: state.renderHorizontalConnections,
    nodePanelGraphVisibility: state.nodePanelGraphVisibility,
  } as WorkspaceState & Record<string, unknown>);
}

export function applyWorkspaceState(state: WorkspaceState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WorkspaceState>(APPLY_WORKSPACE_STATE_EVENT, { detail: state }));
}

export async function copyShareableUrlToClipboard(store: ReturnType<typeof useViewStoreRaw>): Promise<boolean> {
  const state = getCurrentWorkspaceStateSnapshot(store);
  const shareableUrl = await createShareableShortUrl(state);
  if (!shareableUrl) return false;

  try {
    await navigator.clipboard.writeText(shareableUrl);
    return true;
  } catch {
    return false;
  }
}
