import { useViewStore } from "@/state";
import type { AnimationMetadata, IndexAccessor } from "@/lib/types";
import { useAnimationData } from "@/lib/useAnimationData";
import { useCallback } from "react";

export type ViewMode = "all-nodes" | "floor-slabs";

interface ViewModeContextType {
  getVisibleNodes: (
    nodeCount: number,
    metadata: AnimationMetadata,
    initialPositions?: IndexAccessor,
    xRange?: [number, number],
    yRange?: [number, number],
    zRange?: [number, number],
    sliceEnabled?: boolean
  ) => number[];
}

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useViewMode(): ViewModeContextType {
  const showNodes = useViewStore((s) => s.renderNodes);
  const showCornersOnly = useViewStore((s) => s.showCornersOnly);
  const sliceEnabled = useViewStore((s) => s.sliceEnabled);
  const xRange = useViewStore((s) => s.xRange);
  const yRange = useViewStore((s) => s.yRange);
  const zRange = useViewStore((s) => s.zRange);
  const { animationData } = useAnimationData();

  const getVisibleNodes = useCallback(
    (
      nodeCount: number,
      metadata: AnimationMetadata,
      initialPositions?: IndexAccessor,
      _xRange?: [number, number],
      _yRange?: [number, number],
      _zRange?: [number, number],
      _sliceEnabled?: boolean
    ): number[] => {
      let nodes: number[] = Array.from({ length: nodeCount }, (_, i) => i);

      if (showCornersOnly && animationData) {
        const cornerSet = new Set<number>();
        for (const storyId of metadata.storyOrder) {
          const corners = animationData.metadata.cornerNodes[storyId];
          if (corners) {
            Object.values(corners).forEach((id) => {
              if (typeof id === "number" && id >= 0) cornerSet.add(id);
            });
          }
        }
        nodes = nodes.filter((id) => cornerSet.has(id));
      }

      const useXRange = _xRange ?? xRange;
      const useYRange = _yRange ?? yRange;
      const useZRange = _zRange ?? zRange;
      const useSliceEnabled = _sliceEnabled ?? sliceEnabled;

      if (useSliceEnabled && initialPositions) {
        nodes = nodes.filter((nodeId) => {
          const pos = initialPositions.at(nodeId);
          if (!pos) return false;
          const [x, y, z] = pos;

          return (
            x >= (useXRange[0] ?? -1000) &&
            x <= (useXRange[1] ?? 1000) &&
            y >= (useYRange[0] ?? -1000) &&
            y <= (useYRange[1] ?? 1000) &&
            z >= (useZRange[0] ?? 0) &&
            z <= (useZRange[1] ?? 1000)
          );
        });
      }

      return nodes;
    },
    [showNodes, showCornersOnly, animationData, sliceEnabled, xRange, yRange, zRange]
  );

  return {
    getVisibleNodes,
  };
}
