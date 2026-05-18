import { useMetrics } from "@/features/metrics/useMetrics";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useRenderModes } from "./useRenderModes";
import { useGlobalStore } from "@/state";
import { usePlayback } from "@/features/playback/usePlayback";
import { useNodeRendering } from "../contexts/useNodeRendering";
import { useNodePositions } from "../contexts/useNodePositions";
import { useThresholds } from "@/features/metrics/useThresholds";
import { useHover } from "./useHover";

export function SceneInvalidators() {
  const { invalidate } = useThree();
  const { frameIndex } = usePlayback();
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  const { currentMetric, thresholdHighlighting } = useMetrics();
  const {
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
  } = useRenderModes();

  const {
    belowThresholdHingeScale,
    hingeNodeScale,
    belowThresholdNodeScale,
    nodeScale,
    nodeOpacity,
    floorOpacity,
    connectionLineWidth,
    connectionLineOpacity,
    visualInterpolationEnabled,
  } = useNodeRendering();

  const { visibleNodes } = useNodePositions();

  const { thresholds } = useThresholds();
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);

  const { hoveredItem } = useHover();

  useEffect(() => {
    invalidate();
  }, [
    invalidate,
    frameIndex,
    renderNodes,
    renderFloorSlabs,
    renderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    renderVerticalConnections,
    renderHorizontalConnections,
    currentMetric,
    colorTheme,
    thresholdHighlighting,
    belowThresholdHingeScale,
    hingeNodeScale,
    belowThresholdNodeScale,
    nodeScale,
    nodeOpacity,
    floorOpacity,
    connectionLineWidth,
    connectionLineOpacity,
    visualInterpolationEnabled,
    visibleNodes,
    thresholds,
    metricPaletteOverrides,
    hoveredItem,
  ]);

  return null;
}
