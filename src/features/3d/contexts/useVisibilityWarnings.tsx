import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useProfileStore } from "@/state";
import { useMemo } from "react";
import { useRenderModes } from "../lib/useRenderModes";
import { useFloorVisibility } from "./useFloorVisibility";

export function useVisibilityWarnings() {
  const { animationData } = useAnimationData();
  const { visibleFloors, showDefaultFloors } = useFloorVisibility();
  const hiddenNodes = useProfileStore((s) => s._hiddenNodeIds);
  const nodeCount = animationData.metadata.nodeCount;
  const showAllNodes = useProfileStore((s) => s.showAllNodes);

  const {
    setRenderNodes,
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
  } = useRenderModes();
  const { isCurrentMetricHinge: renderHingeNodes } = useMetrics();

  const allFloorsHiddenWarning = useMemo(() => {
    if (visibleFloors.length > 0) return null;
    return showDefaultFloors;
  }, [visibleFloors, showDefaultFloors]);

  const mostNodesHiddenWarning = useMemo(() => {
    if (hiddenNodes.length < nodeCount * 0.8) return null;
    return showAllNodes;
  }, [nodeCount, hiddenNodes, showAllNodes]);

  const allVisibilityHiddenWarning = useMemo(() => {
    if (
      renderNodes ||
      renderFloorSlabs ||
      renderXCrossSectionSlabs ||
      renderYCrossSectionSlabs ||
      renderVerticalConnections ||
      renderHorizontalConnections ||
      renderHingeNodes
    )
      return null;
    return () => setRenderNodes(true);
  }, [
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    setRenderNodes,
    renderVerticalConnections,
    renderHorizontalConnections,
    renderHingeNodes,
  ]);

  return {
    allFloorsHiddenWarning,
    mostNodesHiddenWarning,
    allVisibilityHiddenWarning,
  };
}
