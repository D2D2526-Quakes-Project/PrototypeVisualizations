import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useProfileStore } from "@/state";
import { useCallback, useMemo } from "react";
import { useRenderModes } from "../lib/useRenderModes";
import { useCanvasState } from "./CanvasContext";
import { useFloorVisibility } from "./useFloorVisibility";
import { useNodeRendering } from "./useNodeRendering";

export function useNodePositions() {
  const { animationData } = useAnimationData();
  const { initialPositions, displacementLin, metadata } = animationData;
  const { nodeCount, nodeToStory, displacementMissingNodeIndices, storyOrder } = metadata;
  const { avgDisplacementPerStory } = animationData.precomputed;
  const storyCount = storyOrder.length;

  const { showCornersOnly } = useRenderModes();
  const { visualInterpolationEnabled } = useNodeRendering();
  const {
    sliceEnabled,
    sliceXRange,
    sliceYRange,
    sliceZRange,
    displacementEnabled,
    xyDisplacementScale,
    zDisplacementScale,
    expansionEnabled,
    xExpansion,
    yExpansion,
    zExpansion,
  } = useCanvasState(true);
  const hiddenNodeIds = useProfileStore((s) => s._hiddenNodeIds);
  const { hiddenFloors } = useFloorVisibility();

  const missingNodeSet = useMemo(() => new Set(displacementMissingNodeIndices), [displacementMissingNodeIndices]);

  const buildingOffset = useMemo(
    () => [
      -animationData.precomputed.boundingBox.center[0],
      -animationData.precomputed.boundingBox.center[1],
      -animationData.precomputed.boundingBox.min[2],
    ],
    [animationData.precomputed.boundingBox]
  );

  /**
   * Corner Nodes
   */
  const cornerNodes = useMemo(() => {
    const cornerSet: number[] = [];
    for (const storyId of metadata.storyOrder) {
      const corners = animationData.metadata.cornerNodes[storyId];
      cornerSet.push(...Object.values(corners));
    }
    return cornerSet;
  }, [animationData.metadata.cornerNodes, metadata.storyOrder]);

  /**
   * Visible Nodes
   */
  const visibleNodes = useMemo(() => {
    let nodes: number[] = showCornersOnly ? cornerNodes : Array.from({ length: nodeCount }, (_, i) => i);

    if (sliceEnabled) {
      nodes = nodes.filter((nodeId) => {
        const pos = initialPositions.at(nodeId);
        const [x, y, z] = pos;

        return (
          x >= sliceXRange[0] &&
          x <= sliceXRange[1] &&
          y >= sliceYRange[0] &&
          y <= sliceYRange[1] &&
          z >= sliceZRange[0] &&
          z <= sliceZRange[1]
        );
      });
    }

    if (hiddenFloors.length > 0) {
      nodes = nodes.filter((nodeId) => {
        const nodeStory = nodeToStory[nodeId];
        if (!nodeStory) return false;
        return !hiddenFloors.includes(nodeStory);
      });
    }

    if (hiddenNodeIds.length > 0) {
      nodes = nodes.filter((nodeId) => !hiddenNodeIds.includes(nodeId));
    }

    return nodes;
  }, [
    cornerNodes,
    showCornersOnly,
    sliceEnabled,
    sliceXRange,
    sliceYRange,
    sliceZRange,
    initialPositions,
    nodeCount,
    nodeToStory,
    hiddenNodeIds,
    hiddenFloors,
  ]);

  /**
   * Visual Displacement Only!
   * Not raw displacement data!
   */
  const getNodeVisualPosition = useCallback(
    (nodeId: number, frameIndex: number): [number, number, number] => {
      let pos = [...initialPositions.at(nodeId)];

      pos = [pos[0] + buildingOffset[0], pos[1] + buildingOffset[1], pos[2] + buildingOffset[2]];

      let disp = [...displacementLin.atFrame(frameIndex).at(nodeId)];

      if (visualInterpolationEnabled && missingNodeSet.has(nodeId)) {
        const story = nodeToStory[nodeId]!;
        console.assert(story !== null, "Story not found for node");
        const storyIndex = storyOrder.indexOf(story);
        console.assert(storyIndex >= 0, "Story index not found");
        const avg = avgDisplacementPerStory[frameIndex * storyCount + storyIndex];
        disp = [avg, avg, avg];
      }

      if (displacementEnabled) {
        disp = [disp[0] * xyDisplacementScale, disp[1] * xyDisplacementScale, disp[2] * zDisplacementScale];
      }

      if (expansionEnabled) {
        pos = [pos[0] * (1 + xExpansion), pos[1] * (1 + yExpansion), pos[2] * (1 + zExpansion)];
      }

      return [pos[0] + disp[0], pos[1] + disp[1], pos[2] + disp[2]];
    },
    [
      initialPositions,
      buildingOffset,
      displacementLin,
      visualInterpolationEnabled,
      missingNodeSet,
      nodeToStory,
      storyOrder,
      avgDisplacementPerStory,
      storyCount,
      xyDisplacementScale,
      zDisplacementScale,
      displacementEnabled,
      expansionEnabled,
      xExpansion,
      yExpansion,
      zExpansion,
    ]
  );

  return {
    visibleNodes,
    cornerNodes,
    getNodeVisualPosition,
    buildingOffset,
  };
}
