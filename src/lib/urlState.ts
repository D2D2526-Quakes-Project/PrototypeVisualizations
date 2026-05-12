import {
  OPTIONAL_DATASET_KEYS,
  type OptionalDataLoadOptions,
} from "../features/animation-data/data-loading/loadingTypes";

export interface DataSelection {
  building: string;
  simulation: string;
  optionalLoads?: Partial<OptionalDataLoadOptions>;
}

export async function getSelectionFromCurrentUrl(): Promise<DataSelection | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const building = params.get("building");
  const simulation = params.get("simulation");
  if (!building || !simulation) return null;

  const encoded = params.get("optionalLoads");
  let optionalLoads: Partial<OptionalDataLoadOptions> | undefined;
  if (!encoded || encoded.length !== OPTIONAL_DATASET_KEYS.length) {
    optionalLoads = undefined;
  } else {
    const parsed: Partial<OptionalDataLoadOptions> = {};
    for (let index = 0; index < OPTIONAL_DATASET_KEYS.length; index += 1) {
      const char = encoded[index];
      if (char !== "0" && char !== "1") break;
      parsed[OPTIONAL_DATASET_KEYS[index]] = char === "1";
    }
    optionalLoads = parsed;
  }

  const explicitSelection = optionalLoads ? { building, simulation, optionalLoads } : { building, simulation };

  return explicitSelection;
}
