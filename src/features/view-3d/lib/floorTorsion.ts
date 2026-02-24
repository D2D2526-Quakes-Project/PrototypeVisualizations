import type { BuildingAnimationData } from "@/lib/types";

export type FloorPlanBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export type FloorTorsionSnapshot = {
  storyId: string;
  nodeCount: number;
  rotationRad: number;
  polygon: Array<[number, number]>;
  referencePolygon: Array<[number, number]>;
  bounds: FloorPlanBounds;
};

function getPlanBounds(points: Array<[number, number]>): FloorPlanBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1, width: 1, height: 1 };
  }

  const width = Math.max(maxX - minX, 1e-6);
  const height = Math.max(maxY - minY, 1e-6);

  return { minX, maxX, minY, maxY, width, height };
}

function getStoryCornerNodeIds(animationData: BuildingAnimationData, storyId: string): number[] {
  const corners = animationData.precomputed.cornerNodes[storyId];
  if (!corners) return [];

  const ids = [corners.NW, corners.NE, corners.SE, corners.SW].filter((id): id is number => id != null);
  if (ids.length < 3) return ids;

  let cx = 0;
  let cy = 0;
  for (const nodeId of ids) {
    const initial = animationData.initialPositions.at(nodeId);
    cx += initial[0];
    cy += initial[1];
  }
  cx /= ids.length;
  cy /= ids.length;

  // Order by rest-state angle so polygon winding is consistent across frames.
  return ids
    .slice()
    .sort((a, b) => {
      const pa = animationData.initialPositions.at(a);
      const pb = animationData.initialPositions.at(b);
      return Math.atan2(pa[1] - cy, pa[0] - cx) - Math.atan2(pb[1] - cy, pb[0] - cx);
    });
}

function getStoryCornerPolygon(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number,
): Array<[number, number]> {
  const cornerNodeIds = getStoryCornerNodeIds(animationData, storyId);
  if (cornerNodeIds.length === 0) return [];
  const frameDisp = animationData.displacementLin.atFrame(frameIndex);
  return cornerNodeIds.map((nodeId) => {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    return [initial[0] + disp[0], initial[1] + disp[1]] as [number, number];
  });
}

function getStoryCornerReferencePolygon(animationData: BuildingAnimationData, storyId: string): Array<[number, number]> {
  const cornerNodeIds = getStoryCornerNodeIds(animationData, storyId);
  if (cornerNodeIds.length === 0) return [];

  return cornerNodeIds.map((nodeId) => {
    const initial = animationData.initialPositions.at(nodeId);
    return [initial[0], initial[1]] as [number, number];
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
    points.push([initial[0] + disp[0], initial[1] + disp[1]]);
  }

  const bounds = getPlanBounds(points);
  return [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
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
  let pMeanY = 0;
  let qMeanX = 0;
  let qMeanY = 0;

  for (const nodeId of nodeIds) {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    pMeanX += initial[0];
    pMeanY += initial[1];
    qMeanX += initial[0] + disp[0];
    qMeanY += initial[1] + disp[1];
  }

  const count = nodeIds.length;
  pMeanX /= count;
  pMeanY /= count;
  qMeanX /= count;
  qMeanY /= count;

  let cross = 0;
  let dot = 0;

  for (const nodeId of nodeIds) {
    const initial = animationData.initialPositions.at(nodeId);
    const disp = frameDisp.at(nodeId);
    const px = initial[0] - pMeanX;
    const py = initial[1] - pMeanY;
    const qx = initial[0] + disp[0] - qMeanX;
    const qy = initial[1] + disp[1] - qMeanY;

    cross += px * qy - py * qx;
    dot += px * qx + py * qy;
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

  const referencePolygon = getStoryCornerReferencePolygon(animationData, storyId);
  const polygon = getStoryCornerPolygon(animationData, storyId, frameIndex);

  const finalReferencePolygon =
    referencePolygon.length >= 3 ? referencePolygon : getFallbackBoundingPolygon(animationData, storyId, 0);
  let finalPolygon = polygon.length >= 3 ? polygon : getFallbackBoundingPolygon(animationData, storyId, frameIndex);

  // Remove rigid translation for display so the floor preview shows rotation/deformation without jumping.
  if (finalPolygon.length >= 3 && finalReferencePolygon.length === finalPolygon.length) {
    let refCx = 0;
    let refCy = 0;
    let curCx = 0;
    let curCy = 0;
    for (let i = 0; i < finalPolygon.length; i++) {
      refCx += finalReferencePolygon[i][0];
      refCy += finalReferencePolygon[i][1];
      curCx += finalPolygon[i][0];
      curCy += finalPolygon[i][1];
    }
    refCx /= finalPolygon.length;
    refCy /= finalPolygon.length;
    curCx /= finalPolygon.length;
    curCy /= finalPolygon.length;

    finalPolygon = finalPolygon.map(([x, y]) => [x - curCx + refCx, y - curCy + refCy]);
  }

  // Use stable bounds based on rest-state footprint to avoid scale jitter frame-to-frame.
  const refBounds = getPlanBounds(finalReferencePolygon);
  const curBounds = getPlanBounds(finalPolygon);
  const cx = (refBounds.minX + refBounds.maxX) / 2;
  const cy = (refBounds.minY + refBounds.maxY) / 2;
  const halfW = Math.max(refBounds.width, curBounds.width) * 0.55;
  const halfH = Math.max(refBounds.height, curBounds.height) * 0.55;
  const bounds = {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - halfH,
    maxY: cy + halfH,
    width: Math.max(halfW * 2, 1e-6),
    height: Math.max(halfH * 2, 1e-6),
  };

  return {
    storyId,
    nodeCount,
    rotationRad: computeStoryPlanRotationRad(animationData, storyId, frameIndex),
    polygon: finalPolygon,
    referencePolygon: finalReferencePolygon,
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
