import type { BinaryBuilding, BinarySimulation } from "@/lib/types";

export const REQUIRED_DATASET_KEYS = ["building", "displacementLin", "groundMotion"] as const;

export const OPTIONAL_DATASET_KEYS = [
  "hingeData",
  "shearData",
  "displacementRot",
  "velocityLin",
  "velocityRot",
  "accelerationLin",
  "accelerationRot",
] as const;

export const INTERNAL_DATASET_KEYS = ["beamData"] as const;

export const DATASET_KEYS = [...REQUIRED_DATASET_KEYS, ...OPTIONAL_DATASET_KEYS, ...INTERNAL_DATASET_KEYS] as const;

export type RequiredDatasetKey = (typeof REQUIRED_DATASET_KEYS)[number];
export type OptionalDatasetKey = (typeof OPTIONAL_DATASET_KEYS)[number];
export type InternalDatasetKey = (typeof INTERNAL_DATASET_KEYS)[number];
export type DatasetKey = (typeof DATASET_KEYS)[number];

export type DatasetLoadStage = "idle" | "queued" | "fetching" | "parsing" | "ready" | "error";

export interface OptionalDataLoadOptions {
  hingeData: boolean;
  shearData: boolean;
  displacementRot: boolean;
  velocityLin: boolean;
  velocityRot: boolean;
  accelerationLin: boolean;
  accelerationRot: boolean;
}

export interface DatasetLoadState {
  key: DatasetKey;
  label: string;
  required: boolean;
  available: boolean;
  selected: boolean;
  stage: DatasetLoadStage;
  progress: number;
  message: string;
  error: string | null;
}

export const DATASET_LABELS: Record<DatasetKey, string> = {
  building: "Building",
  displacementLin: "Displacement (Translational)",
  groundMotion: "Ground Motion",
  beamData: "Beam Data",
  hingeData: "Hinge Data",
  shearData: "Shear Data",
  displacementRot: "Displacement (Rotational)",
  velocityLin: "Velocity (Translational)",
  velocityRot: "Velocity (Rotational)",
  accelerationLin: "Acceleration (Translational)",
  accelerationRot: "Acceleration (Rotational)",
};

export function isOptionalDatasetKey(key: DatasetKey): key is OptionalDatasetKey {
  return (OPTIONAL_DATASET_KEYS as readonly string[]).includes(key);
}

export function getDatasetAvailability(
  building: BinaryBuilding,
  simulation: BinarySimulation
): Record<DatasetKey, boolean> {
  return {
    building: Boolean(building.building_data),
    displacementLin: Boolean(simulation.displacementLin),
    groundMotion: Boolean(simulation.groundMotion),
    beamData: Boolean(building.beamData),
    hingeData: Boolean(simulation.hingeData),
    shearData: Boolean(simulation.shearData),
    displacementRot: Boolean(simulation.displacementRot),
    velocityLin: Boolean(simulation.velocityLin),
    velocityRot: Boolean(simulation.velocityRot),
    accelerationLin: Boolean(simulation.accelerationLin),
    accelerationRot: Boolean(simulation.accelerationRot),
  };
}
