import type { BinaryBuilding, BinarySimulation } from "@/lib/types";
import type { OptionalDataLoadOptions } from "./loadingTypes";

export const DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS: OptionalDataLoadOptions = {
  beamData: true,
  hingeData: false,
  shearData: false,
  displacementRot: false,
  velocityLin: false,
  velocityRot: false,
  accelerationLin: false,
  accelerationRot: false,
};

export function normalizeOptionalDataLoadOptions(options?: Partial<OptionalDataLoadOptions>): OptionalDataLoadOptions {
  return {
    ...DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS,
    ...options,
  };
}

export function getAvailableOptionalDataLoadOptions(
  building: BinaryBuilding,
  simulation: BinarySimulation
): OptionalDataLoadOptions {
  return {
    beamData: Boolean(building.beamData),
    hingeData: Boolean(simulation.hingeData) && Boolean(building.beamData),
    shearData: Boolean(simulation.shearData),
    displacementRot: Boolean(simulation.displacementRot),
    velocityLin: Boolean(simulation.velocityLin),
    velocityRot: Boolean(simulation.velocityRot),
    accelerationLin: Boolean(simulation.accelerationLin),
    accelerationRot: Boolean(simulation.accelerationRot),
  };
}

export function getEffectiveOptionalDataLoadOptions(
  building: BinaryBuilding,
  simulation: BinarySimulation,
  requested?: Partial<OptionalDataLoadOptions>
): OptionalDataLoadOptions {
  const normalized = normalizeOptionalDataLoadOptions(requested);
  const available = getAvailableOptionalDataLoadOptions(building, simulation);

  return {
    beamData: normalized.beamData && available.beamData,
    hingeData: normalized.hingeData && available.hingeData,
    shearData: normalized.shearData && available.shearData,
    displacementRot: normalized.displacementRot && available.displacementRot,
    velocityLin: normalized.velocityLin && available.velocityLin,
    velocityRot: normalized.velocityRot && available.velocityRot,
    accelerationLin: normalized.accelerationLin && available.accelerationLin,
    accelerationRot: normalized.accelerationRot && available.accelerationRot,
  };
}
