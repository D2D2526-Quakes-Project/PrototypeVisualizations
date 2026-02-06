import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo } from "react";

export function useStoryDriftData() {
  const { animationData } = useAnimationData();
  const { corners, stories, storyHeights, storyOrder } = animationData.metadata;

  const cornerSets = {
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  };

  const cornerNodes = new Map<
    string,
    {
      NW: number;
      NE: number;
      SW: number;
      SE: number;
    }
  >();

  // story elevations
  const storyElevations = useMemo(() => {
    const storyElevations = new Map<string, number>();
    storyOrder.forEach((storyId, index) => {
      const nodeIndices = stories[storyId];

      const corners = {
        NW: nodeIndices.find((n) => cornerSets.NW.has(n))!,
        NE: nodeIndices.find((n) => cornerSets.NE.has(n))!,
        SW: nodeIndices.find((n) => cornerSets.SW.has(n))!,
        SE: nodeIndices.find((n) => cornerSets.SE.has(n))!,
      };
      cornerNodes.set(storyId, corners);

      if (index > 0) {
        let elevation = storyHeights[storyId];
        storyOrder.forEach((storyId2, index2) => {
          if (index2 < index) elevation += storyHeights[storyId2];
        });
        storyElevations.set(storyId, elevation);
      }
    });
    return storyElevations;
  }, [animationData]);

  const storyDrift = useMemo(() => {
    const storyDrift = new Map<
      string,
      {
        NW: (frame: number) => number;
        NE: (frame: number) => number;
        SW: (frame: number) => number;
        SE: (frame: number) => number;
      }
    >();

    for (let i = 1; i < storyOrder.length; i++) {
      const storyId = storyOrder[i];
      const belowId = storyOrder[i - 1];

      const height = storyElevations.get(storyId)!;
      const corners = cornerNodes.get(storyId)!;
      const belowCorners = cornerNodes.get(belowId)!;

      const makeStoryDriftAccessor = (height: number, nodeIdx: number, belowNodeIdx: number) => {
        return (frame: number) => {
          const frameData = animationData.displacement.at(frame);
          const current = frameData.at(nodeIdx);
          const below = frameData.at(belowNodeIdx);

          const driftMag = Math.hypot(current[0], current[1], current[2]);
          const belowDriftMag = Math.hypot(below[0], below[1], below[2]);

          return ((driftMag - belowDriftMag) / height) * 100;
        };
      };

      storyDrift.set(storyId, {
        NE: makeStoryDriftAccessor(height, corners.NE, belowCorners.NE),
        NW: makeStoryDriftAccessor(height, corners.NW, belowCorners.NW),
        SW: makeStoryDriftAccessor(height, corners.SW, belowCorners.SW),
        SE: makeStoryDriftAccessor(height, corners.SE, belowCorners.SE),
      });
    }
    return storyDrift;
  }, [storyOrder, animationData, storyElevations]);

  const peakStoryDrift = useMemo(() => {
    const peakStoryDrift = new Map<
      string,
      {
        NW: number;
        NE: number;
        SW: number;
        SE: number;
      }
    >();
    for (const [storyId, corners] of storyDrift) {
      const max = {
        NE: -Infinity,
        NW: -Infinity,
        SW: -Infinity,
        SE: -Infinity,
      };

      for (let i = 0; i < animationData.metadata.frameCount; i++) {
        const cornerNE = corners.NE(i);
        max.NE = Math.max(max.NE, cornerNE);
        const cornerNW = corners.NW(i);
        max.NW = Math.max(max.NW, cornerNW);
        const cornerSW = corners.SW(i);
        max.SW = Math.max(max.SW, cornerSW);
        const cornerSE = corners.SE(i);
        max.SE = Math.max(max.SE, cornerSE);
      }
      peakStoryDrift.set(storyId, max);
    }
    return peakStoryDrift;
  }, [animationData, storyDrift]);

  return {
    storyDrift,
    peakStoryDrift,
    storyElevations,
    cornerNodes,
  };
}
