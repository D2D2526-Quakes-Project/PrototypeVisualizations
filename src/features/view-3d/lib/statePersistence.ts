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
export const PROFILES_UPDATED_EVENT = "visuals:profiles-updated";

export const SYSTEM_PROFILE_DEFAULT_ID = "system-default";
export const SYSTEM_PROFILE_FLOOR_TORSION_ID = "system-floor-torsion";
export const EPHEMERAL_SHARE_PROFILE_ID = "ephemeral-share-session";

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
  dataSelection?: DataSelection;
}

export interface DataSelection {
  building: string;
  simulation: string;
}

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
    dataSelection: undefined,
  };
}

export function getDataSelectionFromUrlSearch(search: string): DataSelection | null {
  const params = new URLSearchParams(search);
  const building = params.get("building");
  const simulation = params.get("simulation");
  if (!building || !simulation) return null;
  return { building, simulation };
}

export function getDataSelectionFromCurrentUrl(): DataSelection | null {
  if (typeof window === "undefined") return null;
  return getDataSelectionFromUrlSearch(window.location.search);
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

function getEphemeralShareProfileName(selection?: DataSelection): string {
  if (!selection) {
    return "Shared Session";
  }
  return `Shared Session (${selection.building}/${selection.simulation})`;
}

export function activateEphemeralShareProfile(state: AppState): void {
  try {
    const profiles = loadSaveProfiles(state.layout ?? undefined).filter(
      (profile) => profile.id !== EPHEMERAL_SHARE_PROFILE_ID,
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

interface UrlStateResolution {
  state: AppState | null;
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
    const selection = explicitSelection ?? state.dataSelection;
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
    if (selection) {
      nextUrl.searchParams.set("building", selection.building);
      nextUrl.searchParams.set("simulation", selection.simulation);
    } else {
      nextUrl.searchParams.delete("building");
      nextUrl.searchParams.delete("simulation");
    }

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
  if (explicitSelection) return explicitSelection;

  const state = await getStateFromCurrentUrl();
  return state?.dataSelection ?? null;
}

export function createShareableUrl(state: AppState): string {
  const url = new URL(window.location.href);
  const encodedState = encodeStateForUrl(state);

  if (state.dataSelection) {
    url.searchParams.set("building", state.dataSelection.building);
    url.searchParams.set("simulation", state.dataSelection.simulation);
  } else {
    url.searchParams.delete("building");
    url.searchParams.delete("simulation");
  }

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

export async function copyShareableUrlToClipboard(state: AppState): Promise<boolean> {
  const shareableUrl = (await createShareableShortUrl(state)) ?? createShareableUrl(state);

  try {
    await navigator.clipboard.writeText(shareableUrl);
    return true;
  } catch (e) {
    console.error("Failed to copy URL to clipboard:", e);
    return false;
  }
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
