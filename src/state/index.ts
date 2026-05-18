import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";
import { createGlobalSlice, type GlobalState } from "./globalState";
import { createLiveSlice, LIVE_STATE_KEYS, type LiveState } from "./liveState";
import {
  createProfileSlice,
  type ProfileData,
  type ProfileState,
  type ProfileStateAPI,
  type ProfileStateSetters,
} from "./profileState";
import { createDefaultProfiles, DEFAULT_PROFILE } from "./default";
import { createDebouncedJSONStorage } from "zustand-debounce";
import { useAnimationData } from "@/features/animation-data/useAnimationData";

export type AppState = ProfileStateSetters & LiveState & GlobalState;

const useAppStore = create<AppState>()(
  persist(
    immer((...a) => ({
      ...createGlobalSlice(...a),
      ...createProfileSlice(...a),
      ...createLiveSlice(...a),
    })),
    {
      name: "app-storage",
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => {
            if (key === "profileActions") return false;
            return !LIVE_STATE_KEYS.includes(key as keyof LiveState);
          })
        ),
      storage: createDebouncedJSONStorage("localStorage", {
        debounceTime: 1000,
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
export function profileStoreStateForBuilding(buildingId: string): ProfileData | undefined {
  const state = useAppStore.getState();
  return state.profiles[buildingId]?.[state.activeProfileIds[buildingId]];
}

export function useProfileIds(): string[] {
  const { currentBuilding, loading } = useAnimationData();
  const currentBuildingId = currentBuilding.name;
  return useAppStore(
    useShallow((state) => {
      if (!currentBuildingId || loading) return [];
      const buildingProfiles = state.profiles[currentBuildingId];
      return Object.keys(buildingProfiles);
    })
  );
}

export function useProfileData<T>(selector: (state: ProfileData) => T): T {
  const { currentBuilding, loading, animationData } = useAnimationData();
  const currentBuildingId = currentBuilding.name;
  const defaultHiddenFloors = animationData.metadata.hiddenFloors;

  useEffect(() => {
    if (!currentBuildingId || loading) return;

    const state = useAppStore.getState();
    const hasProfiles = state.profiles[currentBuildingId];

    if (!hasProfiles) {
      useAppStore.setState((draft) => {
        const defaultProfiles = createDefaultProfiles(defaultHiddenFloors);
        draft.profiles[currentBuildingId] = defaultProfiles;
        draft.activeProfileIds[currentBuildingId] = DEFAULT_PROFILE;
      });
    }
  }, [currentBuildingId, loading, defaultHiddenFloors]);

  const fallbackProfile = useMemo(
    () => createDefaultProfiles(defaultHiddenFloors)[DEFAULT_PROFILE],
    [defaultHiddenFloors]
  );

  return useAppStore((state) => {
    if (!currentBuildingId) return selector({} as ProfileStateAPI);

    const buildingProfiles = state.profiles[currentBuildingId];
    const activeProfId = state.activeProfileIds[currentBuildingId] ?? DEFAULT_PROFILE;

    const activeProfile = buildingProfiles?.[activeProfId] ?? fallbackProfile;

    return selector(activeProfile);
  });
}

export function useProfileActions(): ProfileState["profileActions"] {
  const { currentBuilding, loading } = useAnimationData();
  const currentBuildingId = currentBuilding.name;

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
