import type { BuildingAnimationData } from "@/lib/types";

type CornerName = "NW" | "NE" | "SE" | "SW";

export type FloorPlanBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  height: number;
};

export type FloorTorsionSnapshot = {
  storyId: string;
  nodeCount: number;
  rotationRad: number;
  polygon: Array<[number, number]>;
  bounds: FloorPlanBounds;
};

function getPlanBounds(points: Array<[number, number]>): FloorPlanBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const [x, z] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) {
    return { minX: 0, maxX: 1, minZ: 0, maxZ: 1, width: 1, height: 1 };
  }

  const width = Math.max(maxX - minX, 1e-6);
  const height = Math.max(maxZ - minZ, 1e-6);

  return { minX, maxX, minZ, maxZ, width, height };
}

function getStoryCornerPolygon(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number,
): Array<[number, number]> {
  const corners = animationData.precomputed.cornerNodes[storyId];
  if (!corners) return [];

  const frameDisp = animationData.displacementLin.atFrame(frameIndex);
  const orderedCorners: CornerName[] = ["NW", "NE", "SE", "SW"];

  return orderedCorners.flatMap((cornerName) => {
    const nodeId = corners[cornerName];
    if (nodeId == null) return [];

    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    return [[initial[0] + disp[0], initial[2] + disp[2]] as [number, number]];
  });
}

function getFallbackBoundingPolygon(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number,
): Array<[number, number]> {
  const nodeIds = animationData.metadata.stories[storyId] ?? [];
  if (nodeIds.length === 0) return [];

  const frameDisp = animationData.displacementLin.atFrame(frameIndex);
  const points: Array<[number, number]> = [];

  for (const nodeId of nodeIds) {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    points.push([initial[0] + disp[0], initial[2] + disp[2]]);
  }

  const bounds = getPlanBounds(points);
  return [
    [bounds.minX, bounds.minZ],
    [bounds.maxX, bounds.minZ],
    [bounds.maxX, bounds.maxZ],
    [bounds.minX, bounds.maxZ],
  ];
}

export function computeStoryPlanRotationRad(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number,
): number {
  const nodeIds = animationData.metadata.stories[storyId] ?? [];
  if (nodeIds.length < 2) return 0;

  const frameDisp = animationData.displacementLin.atFrame(frameIndex);

  let pMeanX = 0;
  let pMeanZ = 0;
  let qMeanX = 0;
  let qMeanZ = 0;

  for (const nodeId of nodeIds) {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    pMeanX += initial[0];
    pMeanZ += initial[2];
    qMeanX += initial[0] + disp[0];
    qMeanZ += initial[2] + disp[2];
  }

  const count = nodeIds.length;
  pMeanX /= count;
  pMeanZ /= count;
  qMeanX /= count;
  qMeanZ /= count;

  let cross = 0;
  let dot = 0;

  for (const nodeId of nodeIds) {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    const px = initial[0] - pMeanX;
    const pz = initial[2] - pMeanZ;
    const qx = initial[0] + disp[0] - qMeanX;
    const qz = initial[2] + disp[2] - qMeanZ;

    cross += px * qz - pz * qx;
    dot += px * qx + pz * qz;
  }

  return Math.atan2(cross, dot);
}

export function buildFloorTorsionSnapshot(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number,
): FloorTorsionSnapshot | null {
  const nodeCount = animationData.metadata.stories[storyId]?.length ?? 0;
  if (nodeCount === 0) return null;

  const polygon = getStoryCornerPolygon(animationData, storyId, frameIndex);
  const finalPolygon = polygon.length >= 3 ? polygon : getFallbackBoundingPolygon(animationData, storyId, frameIndex);
  const bounds = getPlanBounds(finalPolygon);

  return {
    storyId,
    nodeCount,
    rotationRad: computeStoryPlanRotationRad(animationData, storyId, frameIndex),
    polygon: finalPolygon,
    bounds,
  };
}

export function computeStoryPlanRotationPeak(
  animationData: BuildingAnimationData,
  storyId: string,
): { peakAbsRad: number; peakSignedRad: number; peakFrameIndex: number } {
  let peakAbsRad = 0;
  let peakSignedRad = 0;
  let peakFrameIndex = 0;

  for (let frameIndex = 0; frameIndex < animationData.metadata.frameCount; frameIndex++) {
    const rotationRad = computeStoryPlanRotationRad(animationData, storyId, frameIndex);
    if (Math.abs(rotationRad) > Math.abs(peakAbsRad)) {
      peakAbsRad = Math.abs(rotationRad);
      peakSignedRad = rotationRad;
      peakFrameIndex = frameIndex;
    }
  }

  return { peakAbsRad, peakSignedRad, peakFrameIndex };
}
