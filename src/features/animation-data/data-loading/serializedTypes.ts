import type { DatasetKey, OptionalDatasetKey } from "./loadingTypes";
import type { AnimationMetadata, BeamDataMetadata, BrbMetadata, ComputedStats, HingeMetadata, ShearMetadata, SimulationMetadata } from "@/lib/types";

export const PROCESSED_CACHE_VERSION = 7;

export interface SerializedStoryDrift {
  data: Float32Array;
  storyCount: number;
  frameCount: number;
  cornerCount: number;
}

export interface SerializedBoundingGeometry {
  vertices: Float32Array;
  triangleIndices: Uint32Array;
}

export interface SerializedBoundingGeometries {
  zAxis: SerializedBoundingGeometry;
  yAxis: SerializedBoundingGeometry;
  xAxis: SerializedBoundingGeometry;
}

export interface SerializedComputedStatsCore {
  boundingBox: ComputedStats["boundingBox"];
  storyElevations: Record<string, number>;
  maxDisplacement: number;
  maxDisplacementX: number;
  maxDisplacementY: number;
  maxDisplacementZ: number;
  maxStoryDrift: number;
  groundMotion: {
    min: [number, number, number];
    max: [number, number, number];
    magnitude: Float32Array;
    maxMagnitude: number;
    minMagnitude: number;
  };
  peakNodeDisplacement: Float32Array;
  peakNodeDisplacementFrame: Uint32Array;
  peakNodeDisplacementX: Float32Array;
  peakNodeDisplacementY: Float32Array;
  peakNodeDisplacementZ: Float32Array;
  peakStoryDrift: Float32Array;
  peakStoryDriftFrame: Float32Array;
  avgStoryDriftPerFrame: Float32Array;
  avgStoryDriftPerStory: Float32Array;
  avgDisplacementPerFrame: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgDisplacementPerStory: Float32Array;
  numCrossSectionsX: number;
  numCrossSectionsY: number;
  boundingGeometries?: SerializedBoundingGeometries;
}

export interface SerializedRequiredAnimationData {
  metadata: AnimationMetadata;
  precomputed: SerializedComputedStatsCore;
  initialPositions: Float32Array;
  displacementLin: Float32Array;
  groundMotion: Float32Array;
  storyDrift: Float32Array;
}

export interface OptionalStatsDelta {
  maxVelocity?: number;
  maxVelocityX?: number;
  maxVelocityY?: number;
  maxVelocityZ?: number;
  maxAcceleration?: number;
  maxAccelerationX?: number;
  maxAccelerationY?: number;
  maxAccelerationZ?: number;
  maxRotation?: number;
  maxRotationX?: number;
  maxRotationY?: number;
  maxRotationZ?: number;
  maxRotationVelocity?: number;
  maxRotationVelocityX?: number;
  maxRotationVelocityY?: number;
  maxRotationVelocityZ?: number;
  maxRotationAcceleration?: number;
  maxRotationAccelerationX?: number;
  maxRotationAccelerationY?: number;
  maxRotationAccelerationZ?: number;
  peakNodeVelocity?: Float32Array;
  peakNodeAcceleration?: Float32Array;
  avgVelocityPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgAccelerationPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgVelocityPerStory?: Float32Array;
  avgAccelerationPerStory?: Float32Array;
  avgRotationPerStory?: Float32Array;
  avgRotationVelocityPerStory?: Float32Array;
  avgRotationAccelerationPerStory?: Float32Array;
  hinge?: undefined;
  maxshearXMax?: number;
  maxShearXMin?: number;
  maxShearXAbs?: number;
  maxShearYMax?: number;
  maxShearYMin?: number;
  maxShearYAbs?: number;
  maxBrbTensionRatio?: number;
  maxBrbCompressionRatio?: number;
  maxBrbRatioAbs?: number;
}

export interface SerializedOptionalDatasetResult {
  key: OptionalDatasetKey | "beamData";
  kind: "timeSeries" | "beamData" | "hingeData" | "shearData" | "brbData";
  metadata: SimulationMetadata | BeamDataMetadata | HingeMetadata | ShearMetadata | BrbMetadata;
  data: Float32Array;
  statsDelta: OptionalStatsDelta;
}

export interface OptionalWorkerRequest {
  key: OptionalDatasetKey | "beamData";
  rawBuffer: ArrayBuffer;
  baseMetadata: AnimationMetadata;
}

export interface OptionalWorkerResponse {
  result: SerializedOptionalDatasetResult;
}

export interface ProcessedCacheRecord<TPayload> {
  version: number;
  cacheKey: string;
  createdAt: number;
  payload: TPayload;
}

export function createCoreProcessedCacheKey(selectionKey: string, sourceFingerprint: string) {
  return `core:${PROCESSED_CACHE_VERSION}:${selectionKey}:${sourceFingerprint}`;
}

export function createOptionalProcessedCacheKey(
  selectionKey: string,
  datasetKey: DatasetKey,
  sourceFingerprint: string
) {
  return `optional:${PROCESSED_CACHE_VERSION}:${selectionKey}:${datasetKey}:${sourceFingerprint}`;
}
