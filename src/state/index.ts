import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createGlobalSlice, type GlobalState } from "./globalState";
import { createLiveSlice, LIVE_STATE_KEYS, type LiveState } from "./liveState";
import {
  createProfileSlice,
  type ProfileData,
  type ProfileState,
  type ProfileStateAPI,
  type ProfileStateSetters,
} from "./profileState";

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
        Object.fromEntries(Object.entries(state).filter(([key]) => !LIVE_STATE_KEYS.includes(key as keyof LiveState))),
    }
  )
);

export function useGlobalStore<T>(selector: (state: GlobalState) => T): T {
  return useAppStore(selector);
}
export function useLiveStore<T>(selector: (state: LiveState) => T): T {
  return useAppStore(selector);
}

export function useProfileStore<T>(selector: (state: ProfileStateAPI) => T): T {
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

  return useAppStore((state) => {
    const buildingProfiles = currentBuildingId ? state.profiles[currentBuildingId] : undefined;
    const activeProfId = currentBuildingId ? state.activeProfileIds[currentBuildingId] : undefined;

    const activeProfile =
      buildingProfiles && activeProfId && buildingProfiles[activeProfId]
        ? buildingProfiles[activeProfId]
        : ({} as ProfileData);

    const projectedState = Object.assign({}, activeProfile, boundActions) as ProfileStateAPI;

    return selector(projectedState);
  });
}
