import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { createGlobalSlice, type GlobalState } from "./globalState";
import { createLiveSlice, LIVE_STATE_KEYS, type LiveState } from "./liveState";
import { createProfileSlice, type ProfileData, type ProfileState, type ProfileStateSetters } from "./profileState";
import { createDefaultProfiles, DEFAULT_PROFILE, type BuiltInProfileId } from "./default";
import { createDebouncedJSONStorage } from "zustand-debounce";
import { flushAllPanels } from "@/features/dockview/panelSavingStore";

export type AppState = ProfileStateSetters & LiveState & GlobalState;

let _storeSaving = false;
const _storeSavingListeners = new Set<() => void>();

function setStoreSaving(saving: boolean) {
  if (_storeSaving === saving) return;
  _storeSaving = saving;
  _storeSavingListeners.forEach((l) => l());
}

export function useStoreSaving(): boolean {
  return useSyncExternalStore(
    (cb) => {
      _storeSavingListeners.add(cb);
      return () => _storeSavingListeners.delete(cb);
    },
    () => _storeSaving,
    () => _storeSaving
  );
}

const useAppStore = create<AppState>()(
  persist(
    immer((...a) => ({
      ...createGlobalSlice(...a),
      ...createProfileSlice(...a),
      ...createLiveSlice(...a),
    })),
    {
      name: "app-storage",
      partialize: partializeState,
      storage: createDebouncedJSONStorage("localStorage", {
        debounceTime: 1000,
        onWrite: () => setStoreSaving(true),
        onSave: () => setStoreSaving(false),
      }),
    }
  )
);

export function useGlobalStore<T>(selector: (state: GlobalState) => T): T {
  return useAppStore(selector);
}
export function useLiveStore<T>(selector: (state: LiveState) => T): T {
  return useAppStore(selector);
}
export function appStoreState(): AppState {
  return useAppStore.getState();
}

export function profileStoreStateForBuilding(buildingId: string): ProfileData {
  const state = useAppStore.getState();
  const activeProfId = state.activeProfileIds[buildingId] ?? DEFAULT_PROFILE;
  const profile = state.profiles[buildingId]?.[activeProfId];

  if (profile) return profile;

  return createDefaultProfiles()[DEFAULT_PROFILE];
}

export function useProfileIds(): BuiltInProfileId[] {
  const { currentBuilding, loading } = useAnimationData();
  const currentBuildingId = currentBuilding?.folder; // Optional chaining for safety

  return useAppStore(
    useShallow((state) => {
      if (!currentBuildingId || loading) return [];
      const buildingProfiles = state.profiles[currentBuildingId];

      // FIX: Prevent Object.keys crash if buildingProfiles is undefined
      return buildingProfiles ? (Object.keys(buildingProfiles) as BuiltInProfileId[]) : [DEFAULT_PROFILE];
    })
  );
}

export function useProfileData<T>(selector: (state: ProfileData) => T): T {
  const { currentBuilding, loading, animationData } = useAnimationData();
  const currentBuildingId = currentBuilding.folder;
  const defaultHiddenFloors = animationData.metadata.hiddenFloors;

  const fallbackProfile = useMemo(
    () => createDefaultProfiles(defaultHiddenFloors)[DEFAULT_PROFILE],
    [defaultHiddenFloors]
  );

  useEffect(() => {
    if (!currentBuildingId || loading) return;

    const state = useAppStore.getState();
    const hasProfiles = state.profiles[currentBuildingId];

    if (!hasProfiles) {
      useAppStore.setState((draft) => {
        if (!draft.profiles[currentBuildingId]) {
          draft.profiles[currentBuildingId] = createDefaultProfiles(defaultHiddenFloors);
          draft.activeProfileIds[currentBuildingId] = DEFAULT_PROFILE;
        }
      });
    }
  }, [currentBuildingId, loading, defaultHiddenFloors]);

  return useAppStore((state) => {
    if (!currentBuildingId || loading) return selector(fallbackProfile);

    const buildingProfiles = state.profiles[currentBuildingId];
    const activeProfId = state.activeProfileIds[currentBuildingId] ?? DEFAULT_PROFILE;

    const activeProfile = buildingProfiles?.[activeProfId] ?? fallbackProfile;

    return selector(activeProfile);
  });
}

function partializeState(state: AppState): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).filter(([key]) => {
      if (key === "profileActions") return false;
      return !LIVE_STATE_KEYS.includes(key as keyof LiveState);
    })
  );
}

export function useFlushOnUnload() {
  useEffect(() => {
    function flush() {
      flushAllPanels();
      const state = useAppStore.getState();
      const partialized = {
        state: partializeState(state),
        version: 0,
      };
      localStorage.setItem("app-storage", JSON.stringify(partialized));
    }

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}

export function useProfileActions(): ProfileState["profileActions"] {
  const { currentBuilding, loading } = useAnimationData();
  const currentBuildingId = currentBuilding.folder;

  // Programmatically wrap all actions.
  const boundActions = useMemo(() => {
    if (loading) return {} as ProfileState["profileActions"];
    const rawActions = useAppStore.getState().profileActions;

    function bindAndAssign<K extends keyof ProfileStateSetters["profileActions"]>(
      key: K,
      fn: ProfileStateSetters["profileActions"][K],
      target: ProfileState["profileActions"]
    ) {
      (target as Record<K, (...args: Parameters<ProfileState["profileActions"][K]>) => void>)[key] = (
        ...args: Parameters<ProfileState["profileActions"][K]>
      ) => {
        if (!currentBuildingId || loading) return;
        (fn as (buildingId: string, ...args: unknown[]) => void)(currentBuildingId, ...args);
      };
    }

    const actions = {} as ProfileState["profileActions"];
    for (const keykey in rawActions) {
      const key = keykey as keyof ProfileStateSetters["profileActions"];
      bindAndAssign(key, rawActions[key], actions);
    }

    return actions;
  }, [currentBuildingId, loading]);

  return boundActions;
}
