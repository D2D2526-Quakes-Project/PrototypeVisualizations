import type { AnimationMetadata } from "@/lib/types";

export function detectSliceAtPosition(
  position: [number, number, number],
  metadata: AnimationMetadata,
  tolerance: number = 1.0
): { type: "floor"; storyId: string; nodeIds: number[] } | null {
  const z = position[2];

  for (const storyId of metadata.storyOrder) {
    const storyNodes = metadata.stories[storyId];
    if (!storyNodes || storyNodes.length === 0) continue;

    const storyZ = getStoryZ(storyId, metadata);
    if (Math.abs(z - storyZ) <= tolerance) {
      return {
        type: "floor",
        storyId,
        nodeIds: storyNodes,
      };
    }
  }

  return null;
}

export type PositionGetter = (nodeId: number) => [number, number, number] | undefined;

export function detectXZPlaneSlice(
  y: number,
  getPosition: PositionGetter,
  metadata: AnimationMetadata,
  tolerance: number = 10.0
): { type: "xz-plane"; value: number; nodeIds: number[] } | null {
  const nodeIds: number[] = [];

  for (let i = 0; i < metadata.nodeCount; i++) {
    const pos = getPosition(i);
    if (pos && Math.abs(pos[1] - y) <= tolerance) {
      nodeIds.push(i);
    }
  }

  if (nodeIds.length === 0) return null;

  return {
    type: "xz-plane",
    value: y,
    nodeIds,
  };
}

export function detectYZPlaneSlice(
  x: number,
  getPosition: PositionGetter,
  metadata: AnimationMetadata,
  tolerance: number = 10.0
): { type: "yz-plane"; value: number; nodeIds: number[] } | null {
  const nodeIds: number[] = [];

  for (let i = 0; i < metadata.nodeCount; i++) {
    const pos = getPosition(i);
    if (pos && Math.abs(pos[0] - x) <= tolerance) {
      nodeIds.push(i);
    }
  }

  if (nodeIds.length === 0) return null;

  return {
    type: "yz-plane",
    value: x,
    nodeIds,
  };
}

export function detectXYPlaneSlice(
  z: number,
  getPosition: PositionGetter,
  metadata: AnimationMetadata,
  tolerance: number = 10.0
): { type: "xy-plane"; value: number; nodeIds: number[] } | null {
  const nodeIds: number[] = [];

  for (let i = 0; i < metadata.nodeCount; i++) {
    const pos = getPosition(i);
    if (pos && Math.abs(pos[2] - z) <= tolerance) {
      nodeIds.push(i);
    }
  }

  if (nodeIds.length === 0) return null;

  return {
    type: "xy-plane",
    value: z,
    nodeIds,
  };
}

function getStoryZ(storyId: string, metadata: AnimationMetadata): number {
  let totalHeight = 0;
  const storyOrder = metadata.storyOrder;
  const storyIndex = storyOrder.indexOf(storyId);

  for (let i = 0; i <= storyIndex; i++) {
    const currentStoryId = storyOrder[i];
    totalHeight += metadata.storyHeights[currentStoryId] || 0;
  }

  return totalHeight;
}

export function findNearestStory(z: number, metadata: AnimationMetadata, tolerance: number = 50): string | null {
  let nearestStory: string | null = null;
  let minDiff = Infinity;

  for (const storyId of metadata.storyOrder) {
    const storyZ = getStoryZ(storyId, metadata);
    const diff = Math.abs(z - storyZ);
    if (diff < minDiff && diff <= tolerance) {
      minDiff = diff;
      nearestStory = storyId;
    }
  }

  return nearestStory;
}
