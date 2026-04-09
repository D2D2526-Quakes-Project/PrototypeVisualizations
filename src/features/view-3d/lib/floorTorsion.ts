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

type Point2 = [number, number];

type StoryPlanStatic = {
  storyId: string;
  nodeIds: number[];
  nodeCount: number;
  cornerNodeIds: number[];
  referencePolygon: Point2[];
  referenceCentroid: { x: number; y: number };
  bounds: FloorPlanBounds;
  rotationCenteredCoords: Float32Array; // [px, py, px, py, ...] for each node in nodeIds order
};

type FloorTorsionStaticCache = {
  byStoryId: Map<string, StoryPlanStatic>;
};

const floorTorsionStaticCache = new WeakMap<BuildingAnimationData, FloorTorsionStaticCache>();

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

function getInitialXY(animationData: BuildingAnimationData, nodeId: number): Point2 {
  const initialData = animationData.initialPositions.data;
  const base = nodeId * animationData.initialPositions.stride;
  return [initialData[base] ?? 0, initialData[base + 1] ?? 0];
}

function getStoryCornerNodeIds(animationData: BuildingAnimationData, storyId: string): number[] {
  const corners = animationData.metadata.cornerNodes[storyId];
  if (!corners) return [];

  const ids = [corners.NW, corners.NE, corners.SE, corners.SW].filter((id): id is number => id != null && id >= 0);
  if (ids.length < 3) return ids;

  let cx = 0;
  let cy = 0;
  for (const nodeId of ids) {
    const [x, y] = getInitialXY(animationData, nodeId);
    cx += x;
    cy += y;
  }
  cx /= ids.length;
  cy /= ids.length;

  // Order by rest-state angle so polygon winding is consistent across frames.
  return ids.slice().sort((a, b) => {
    const [ax, ay] = getInitialXY(animationData, a);
    const [bx, by] = getInitialXY(animationData, b);
    return Math.atan2(ay - cy, ax - cx) - Math.atan2(by - cy, bx - cx);
  });
}

function boundsToRectPolygon(bounds: FloorPlanBounds): Point2[] {
  return [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
  ];
}

function computeDisplayBounds(referencePolygon: Point2[]): FloorPlanBounds {
  const refBounds = getPlanBounds(referencePolygon);
  const cx = (refBounds.minX + refBounds.maxX) / 2;
  const cy = (refBounds.minY + refBounds.maxY) / 2;
  const halfW = Math.max(refBounds.width, 1e-6) * 0.55;
  const halfH = Math.max(refBounds.height, 1e-6) * 0.55;
  return {
    minX: cx - halfW,
    maxX: cx + halfW,
    minY: cy - halfH,
    maxY: cy + halfH,
    width: Math.max(halfW * 2, 1e-6),
    height: Math.max(halfH * 2, 1e-6),
  };
}

function buildStoryPlanStatic(animationData: BuildingAnimationData, storyId: string): StoryPlanStatic | null {
  const nodeIds = animationData.metadata.stories[storyId] ?? [];
  const nodeCount = nodeIds.length;
  if (nodeCount === 0) return null;

  const initialData = animationData.initialPositions.data;
  const initialStride = animationData.initialPositions.stride;
  const cornerNodeIds = getStoryCornerNodeIds(animationData, storyId);

  let referencePolygon: Point2[] =
    cornerNodeIds.length >= 3
      ? cornerNodeIds.map((nodeId) => {
          const base = nodeId * initialStride;
          return [initialData[base] ?? 0, initialData[base + 1] ?? 0];
        })
      : [];

  if (referencePolygon.length < 3) {
    const restPoints: Point2[] = new Array(nodeCount);
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = nodeIds[i];
      const base = nodeId * initialStride;
      restPoints[i] = [initialData[base] ?? 0, initialData[base + 1] ?? 0];
    }
    referencePolygon = boundsToRectPolygon(getPlanBounds(restPoints));
  }

  let refCx = 0;
  let refCy = 0;
  for (const [x, y] of referencePolygon) {
    refCx += x;
    refCy += y;
  }
  refCx /= referencePolygon.length || 1;
  refCy /= referencePolygon.length || 1;

  let meanX = 0;
  let meanY = 0;
  for (const nodeId of nodeIds) {
    const base = nodeId * initialStride;
    meanX += initialData[base] ?? 0;
    meanY += initialData[base + 1] ?? 0;
  }
  meanX /= nodeCount;
  meanY /= nodeCount;

  const rotationCenteredCoords = new Float32Array(nodeCount * 2);
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = nodeIds[i];
    const base = nodeId * initialStride;
    rotationCenteredCoords[i * 2] = (initialData[base] ?? 0) - meanX;
    rotationCenteredCoords[i * 2 + 1] = (initialData[base + 1] ?? 0) - meanY;
  }

  return {
    storyId,
    nodeIds,
    nodeCount,
    cornerNodeIds,
    referencePolygon,
    referenceCentroid: { x: refCx, y: refCy },
    bounds: computeDisplayBounds(referencePolygon),
    rotationCenteredCoords,
  };
}

function getFloorTorsionStaticCache(animationData: BuildingAnimationData): FloorTorsionStaticCache {
  const cached = floorTorsionStaticCache.get(animationData);
  if (cached) return cached;

  const next: FloorTorsionStaticCache = { byStoryId: new Map() };
  floorTorsionStaticCache.set(animationData, next);
  return next;
}

function getStoryPlanStatic(animationData: BuildingAnimationData, storyId: string): StoryPlanStatic | null {
  const cache = getFloorTorsionStaticCache(animationData);
  if (cache.byStoryId.has(storyId)) {
    return cache.byStoryId.get(storyId) ?? null;
  }
  const built = buildStoryPlanStatic(animationData, storyId);
  if (built) {
    cache.byStoryId.set(storyId, built);
  }
  return built;
}

function getFrameBaseOffset(animationData: BuildingAnimationData, frameIndex: number): number {
  return frameIndex * animationData.displacementLin.stride;
}

function computeStoryPlanRotationRadFromStatic(
  animationData: BuildingAnimationData,
  storyStatic: StoryPlanStatic,
  frameIndex: number
): number {
  if (storyStatic.nodeCount < 2) return 0;

  const dispData = animationData.displacementLin.data;
  const dispStride = animationData.displacementLin.stride;
  const frameBase = frameIndex * dispStride;
  const dispNodeStride = 3;
  const nodeCount = storyStatic.nodeCount;

  let meanDispX = 0;
  let meanDispY = 0;
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = storyStatic.nodeIds[i];
    const base = frameBase + nodeId * dispNodeStride;
    meanDispX += dispData[base] ?? 0;
    meanDispY += dispData[base + 1] ?? 0;
  }
  meanDispX /= nodeCount;
  meanDispY /= nodeCount;

  let cross = 0;
  let dot = 0;
  for (let i = 0; i < nodeCount; i++) {
    const px = storyStatic.rotationCenteredCoords[i * 2];
    const py = storyStatic.rotationCenteredCoords[i * 2 + 1];
    const nodeId = storyStatic.nodeIds[i];
    const base = frameBase + nodeId * dispNodeStride;
    const qx = px + (dispData[base] ?? 0) - meanDispX;
    const qy = py + (dispData[base + 1] ?? 0) - meanDispY;
    cross += px * qy - py * qx;
    dot += px * qx + py * qy;
  }

  return Math.atan2(cross, dot);
}

function buildCurrentPolygon(
  animationData: BuildingAnimationData,
  storyStatic: StoryPlanStatic,
  frameIndex: number
): Point2[] {
  const initialData = animationData.initialPositions.data;
  const initialStride = animationData.initialPositions.stride;
  const dispData = animationData.displacementLin.data;
  const frameBase = getFrameBaseOffset(animationData, frameIndex);

  if (storyStatic.cornerNodeIds.length >= 3) {
    const polygon: Point2[] = new Array(storyStatic.cornerNodeIds.length);
    let curCx = 0;
    let curCy = 0;

    for (let i = 0; i < storyStatic.cornerNodeIds.length; i++) {
      const nodeId = storyStatic.cornerNodeIds[i];
      const initialBase = nodeId * initialStride;
      const dispBase = frameBase + nodeId * 3;
      const x = (initialData[initialBase] ?? 0) + (dispData[dispBase] ?? 0);
      const y = (initialData[initialBase + 1] ?? 0) + (dispData[dispBase + 1] ?? 0);
      polygon[i] = [x, y];
      curCx += x;
      curCy += y;
    }

    curCx /= polygon.length;
    curCy /= polygon.length;

    const dx = storyStatic.referenceCentroid.x - curCx;
    const dy = storyStatic.referenceCentroid.y - curCy;
    if (dx !== 0 || dy !== 0) {
      for (let i = 0; i < polygon.length; i++) {
        polygon[i] = [polygon[i][0] + dx, polygon[i][1] + dy];
      }
    }
    return polygon;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const nodeId of storyStatic.nodeIds) {
    const initialBase = nodeId * initialStride;
    const dispBase = frameBase + nodeId * 3;
    const x = (initialData[initialBase] ?? 0) + (dispData[dispBase] ?? 0);
    const y = (initialData[initialBase + 1] ?? 0) + (dispData[dispBase + 1] ?? 0);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const bounds =
    Number.isFinite(minX) && Number.isFinite(minY)
      ? { minX, maxX, minY, maxY, width: Math.max(maxX - minX, 1e-6), height: Math.max(maxY - minY, 1e-6) }
      : { minX: 0, maxX: 1, minY: 0, maxY: 1, width: 1, height: 1 };
  return boundsToRectPolygon(bounds);
}

export function computeStoryPlanRotationRad(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number
): number {
  const storyStatic = getStoryPlanStatic(animationData, storyId);
  if (!storyStatic) return 0;
  return computeStoryPlanRotationRadFromStatic(animationData, storyStatic, frameIndex);
}

export function buildFloorTorsionSnapshot(
  animationData: BuildingAnimationData,
  storyId: string,
  frameIndex: number
): FloorTorsionSnapshot | null {
  const storyStatic = getStoryPlanStatic(animationData, storyId);
  if (!storyStatic) return null;

  return {
    storyId,
    nodeCount: storyStatic.nodeCount,
    rotationRad: computeStoryPlanRotationRadFromStatic(animationData, storyStatic, frameIndex),
    polygon: buildCurrentPolygon(animationData, storyStatic, frameIndex),
    referencePolygon: storyStatic.referencePolygon,
    bounds: storyStatic.bounds,
  };
}

export function computeStoryPlanRotationPeak(
  animationData: BuildingAnimationData,
  storyId: string
): { peakAbsRad: number; peakSignedRad: number; peakFrameIndex: number } {
  const storyStatic = getStoryPlanStatic(animationData, storyId);
  if (!storyStatic) return { peakAbsRad: 0, peakSignedRad: 0, peakFrameIndex: 0 };

  let peakAbsRad = 0;
  let peakSignedRad = 0;
  let peakFrameIndex = 0;

  for (let frameIndex = 0; frameIndex < animationData.metadata.frameCount; frameIndex++) {
    const rotationRad = computeStoryPlanRotationRadFromStatic(animationData, storyStatic, frameIndex);
    if (Math.abs(rotationRad) > Math.abs(peakAbsRad)) {
      peakAbsRad = Math.abs(rotationRad);
      peakSignedRad = rotationRad;
      peakFrameIndex = frameIndex;
    }
  }

  return { peakAbsRad, peakSignedRad, peakFrameIndex };
}
