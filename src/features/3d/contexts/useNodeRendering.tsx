import { useProfileActions, useProfileData } from "@/state";

export function useNodeRendering() {
  const nodeScale = useProfileData((s) => s.nodeScale);
  const nodeOpacity = useProfileData((s) => s.nodeOpacity);
  const floorOpacity = useProfileData((s) => s.floorOpacity);
  const belowThresholdNodeScale = useProfileData((s) => s.belowThresholdNodeScale);
  const connectionLineWidth = useProfileData((s) => s.connectionLineWidth);
  const connectionLineOpacity = useProfileData((s) => s.connectionLineOpacity);
  const hingeNodeScale = useProfileData((s) => s.hingeNodeScale);
  const belowThresholdHingeScale = useProfileData((s) => s.belowThresholdHingeScale);
  const visualInterpolationEnabled = useProfileData((s) => s.visualInterpolationEnabled);

  const {
    setNodeScale,
    setNodeOpacity,
    setBelowThresholdNodeScale,
    setFloorOpacity,
    setConnectionLineWidth,
    setConnectionLineOpacity,
    setHingeNodeScale,
    setBelowThresholdHingeScale,
    setVisualInterpolationEnabled,
  } = useProfileActions();

  return {
    nodeScale,
    nodeOpacity,
    floorOpacity,
    belowThresholdNodeScale,
    connectionLineWidth,
    connectionLineOpacity,
    hingeNodeScale,
    belowThresholdHingeScale,
    visualInterpolationEnabled,
    setHingeNodeScale,
    setBelowThresholdHingeScale,
    setVisualInterpolationEnabled,
    setNodeScale,
    setNodeOpacity,
    setBelowThresholdNodeScale,
    setFloorOpacity,
    setConnectionLineWidth,
    setConnectionLineOpacity,
  };
}
