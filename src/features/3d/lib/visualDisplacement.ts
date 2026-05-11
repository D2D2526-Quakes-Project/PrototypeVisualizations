import type { IndexAccessor, TimeIndexAccessor } from "@/lib/types";
import { useAnimationData } from "@/features/animation-data/useAnimationData";

import { useCallback, useMemo } from "react";
import * as THREE from "three";

const GRAY_COLOR = new THREE.Color(0.5, 0.5, 0.5);

function makeAccessor(data: Float32Array, stride: number): IndexAccessor {
  return {
    data,
    stride,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    xAt(idx: number) {
      return data[idx * stride] ?? 0;
    },
    yAt(idx: number) {
      return data[idx * stride + 1] ?? 0;
    },
    zAt(idx: number) {
      return data[idx * stride + 2] ?? 0;
    },
  };
}

export function useVisualDisplacement() {
  const { animationData } = useAnimationData();
  const visualInterpolationEnabled = useViewStore((s) => s.visualInterpolationEnabled);

  const missingNodeIndices = useMemo(
    () => animationData.metadata.displacementMissingNodeIndices ?? [],
    [animationData.metadata.displacementMissingNodeIndices]
  );
  const rawDisplacement = animationData.displacementLin;
  const nodeCount = animationData.metadata.nodeCount;

  const missingNodeSet = useMemo(() => new Set(missingNodeIndices), [missingNodeIndices]);
  const storyIndexByNode = useMemo(() => {
    const indices = new Int32Array(nodeCount).fill(-1);
    animationData.metadata.storyOrder.forEach((storyId, storyIndex) => {
      const nodeIds = animationData.metadata.stories[storyId] ?? [];
      for (const nodeId of nodeIds) {
        indices[nodeId] = storyIndex;
      }
    });
    return indices;
  }, [animationData.metadata.stories, animationData.metadata.storyOrder, nodeCount]);

  const interpolationActive = visualInterpolationEnabled && missingNodeSet.size > 0;
  const displacement = useMemo<TimeIndexAccessor>(() => {
    if (!interpolationActive) {
      return rawDisplacement;
    }

    const frameCache = new Map<number, IndexAccessor>();

    return {
      data: rawDisplacement.data,
      stride: rawDisplacement.stride,
      atFrame(frameIdx: number) {
        const cached = frameCache.get(frameIdx);
        if (cached) {
          return cached;
        }

        const rawFrame = rawDisplacement.atFrame(frameIdx);
        const interpolated = new Float32Array(rawFrame.data);
        const storyCount = animationData.metadata.storyOrder.length;
        const sums = new Float32Array(storyCount * 3);
        const counts = new Uint32Array(storyCount);

        for (let nodeId = 0; nodeId < nodeCount; nodeId++) {
          if (missingNodeSet.has(nodeId)) continue;

          const storyIndex = storyIndexByNode[nodeId];
          if (storyIndex < 0) continue;

          const base = nodeId * 3;
          sums[storyIndex * 3] += rawFrame.data[base] ?? 0;
          sums[storyIndex * 3 + 1] += rawFrame.data[base + 1] ?? 0;
          sums[storyIndex * 3 + 2] += rawFrame.data[base + 2] ?? 0;
          counts[storyIndex] += 1;
        }

        for (const nodeId of missingNodeIndices) {
          const storyIndex = storyIndexByNode[nodeId];
          if (storyIndex < 0 || counts[storyIndex] === 0) continue;

          const base = nodeId * 3;
          interpolated[base] = sums[storyIndex * 3] / counts[storyIndex];
          interpolated[base + 1] = sums[storyIndex * 3 + 1] / counts[storyIndex];
          interpolated[base + 2] = sums[storyIndex * 3 + 2] / counts[storyIndex];
        }

        const accessor = makeAccessor(interpolated, 3);
        frameCache.set(frameIdx, accessor);
        return accessor;
      },
    };
  }, [
    animationData.metadata.storyOrder.length,
    interpolationActive,
    missingNodeIndices,
    missingNodeSet,
    nodeCount,
    rawDisplacement,
    storyIndexByNode,
  ]);

  const isNodeInterpolated = useCallback((nodeId: number) => missingNodeSet.has(nodeId), [missingNodeSet]);

  const getNodeColor = useCallback(
    (nodeId: number, frameIndex: number, fallback: (nodeId: number, frameIndex: number) => THREE.Color) => {
      if (isNodeInterpolated(nodeId)) return GRAY_COLOR;
      return fallback(nodeId, frameIndex);
    },
    [isNodeInterpolated]
  );

  return {
    displacement,
    interpolationActive,
    isNodeInterpolated,
    getNodeColor,
  };
}
