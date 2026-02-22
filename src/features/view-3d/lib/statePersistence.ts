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
} from "@/state/viewStore";

const STATE_VERSION = 1;

const AUTO_SAVE_KEY = "visuals_auto_save";
const PRESETS_KEY = "visuals_presets";
const LAST_URL_STATE_KEY = "visuals_last_url_state";
const SAVE_PROFILES_KEY = "visuals_save_profiles_v2";
const ACTIVE_PROFILE_KEY = "visuals_active_profile_v2";

export const SYSTEM_PROFILE_DEFAULT_ID = "system-default";
export const SYSTEM_PROFILE_FLOOR_TORSION_ID = "system-floor-torsion";

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

export type SaveProfileKind = "system" | "user";

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

function normalizeState(state: AppState): AppState {
  return {
    ...state,
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

function getSystemDefaultProfiles(layout?: SerializedDockview | null): SaveProfile[] {
  const defaultState = getDefaultAppState(layout);
  const floorTorsionState = getFloorTorsionDefaultState(layout);

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
        (kind !== "system" && kind !== "user") ||
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
      }),
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
    (item) => item.id !== profileId && item.name.toLowerCase() === trimmedName.toLowerCase(),
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
        : item,
    ),
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
        : item,
    ),
  );

  return true;
}

export function encodeStateForUrl(state: AppState, includePanelStates: boolean = false): string {
  const stateToEncode = includePanelStates ? state : { ...state, panelStates: {}, layout: state.layout };

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
  includePanelStates: boolean = false,
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
  includePanelStates: boolean = false,
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
