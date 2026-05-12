import { useProfileStore } from "@/state";

export function useNodeRendering() {
  const nodeScale = useProfileStore((s) => s.nodeScale);
  const nodeOpacity = useProfileStore((s) => s.nodeOpacity);
  const floorOpacity = useProfileStore((s) => s.floorOpacity);
  const belowThresholdNodeScale = useProfileStore((s) => s.belowThresholdNodeScale);
  const connectionLineWidth = useProfileStore((s) => s.connectionLineWidth);
  const connectionLineOpacity = useProfileStore((s) => s.connectionLineOpacity);
  const hingeNodeScale = useProfileStore((s) => s.hingeNodeScale);
  const belowThresholdHingeScale = useProfileStore((s) => s.belowThresholdHingeScale);
  const visualInterpolationEnabled = useProfileStore((s) => s.visualInterpolationEnabled);
  const setHingeNodeScale = useProfileStore((s) => s.setHingeNodeScale);
  const setBelowThresholdHingeScale = useProfileStore((s) => s.setBelowThresholdHingeScale);
  const setVisualInterpolationEnabled = useProfileStore((s) => s.setVisualInterpolationEnabled);
  const setNodeScale = useProfileStore((s) => s.setNodeScale);
  const setNodeOpacity = useProfileStore((s) => s.setNodeOpacity);
  const setBelowThresholdNodeScale = useProfileStore((s) => s.setBelowThresholdNodeScale);
  const setFloorOpacity = useProfileStore((s) => s.setFloorOpacity);
  const setConnectionLineWidth = useProfileStore((s) => s.setConnectionLineWidth);
  const setConnectionLineOpacity = useProfileStore((s) => s.setConnectionLineOpacity);

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
