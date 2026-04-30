import type { BuildingIndex } from "@/lib/types";
import remoteData from "./index.json";
import localData from "./index.local.json";

const typedData: BuildingIndex = (import.meta.env.VITE_USE_LOCAL_DATA === "true" ? localData : remoteData) as BuildingIndex;

export default typedData;
