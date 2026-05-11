import {
  type DatasetKey,
  type DatasetLoadState,
  type OptionalDataLoadOptions,
  type OptionalDatasetKey,
} from "@/features/animation-data/data-loading/loadingTypes";
import type { BinaryBuilding, BinarySimulation, BuildingAnimationData } from "@/lib/types";
import { createContext, useContext } from "react";

export type AnimationDataContextType = {
  animationData: BuildingAnimationData;
  loading: boolean;
  startupReady: boolean;
  startupDismissed: boolean;
  startupError: string | null;
  currentBuilding: BinaryBuilding;
  currentSimulation: BinarySimulation;
  optionalLoadOptions: OptionalDataLoadOptions;
  datasetStates: Record<DatasetKey, DatasetLoadState>;
  loadSelection: (
    building: BinaryBuilding,
    simulation: BinarySimulation,
    options?: Partial<OptionalDataLoadOptions>
  ) => void;
  clearSelection: () => void;
  dismissStartupOverlay: () => void;
  requestDatasetLoad: (key: OptionalDatasetKey) => void;
  retryDatasetLoad: (key: OptionalDatasetKey) => void;
};

export const AnimationDataContext = createContext<AnimationDataContextType>(undefined!);

export function useAnimationData() {
  const ctx = useContext(AnimationDataContext);
  if (!ctx) {
    throw new Error("useAnimationData must be used within AnimationDataProvider");
  }
  return ctx;
}
