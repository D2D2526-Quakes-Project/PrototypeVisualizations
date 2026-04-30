import { useViewStore } from "@/state";
import type { AnimationMetadata } from "@/lib/types";
import type { ExpandedScaleState as StoredExpandedScaleState } from "@/state/viewStore";
import { useCallback } from "react";
import { isStaticMetric } from "@/lib/metrics";

interface ExpandedScaleContextType {
  state: StoredExpandedScaleState;
  toggleExpansion: () => void;
  toggleDisplacement: () => void;
  setExpansion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
  reset: () => void;
  getExpandedPosition: (
    initialPosition: [number, number, number],
    displacement: [number, number, number],
    offset: [number, number, number],
    metadata: AnimationMetadata
  ) => [number, number, number];
}

export function ExpandedScaleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useExpandedScale(): ExpandedScaleContextType {
  const expandedScale = useViewStore((s) => s.expandedScale);
  const currentMetric = useViewStore((s) => s.currentMetric);
  const toggleExpansion = useViewStore((s) => s.toggleExpansion);
  const toggleDisplacement = useViewStore((s) => s.toggleDisplacement);
  const setExpansion = useViewStore((s) => s.setExpansion);
  const setDisplacementScale = useViewStore((s) => s.setDisplacementScale);
  const resetExpandedScale = useViewStore((s) => s.resetExpandedScale);

  const staticMetricMode = isStaticMetric(currentMetric);

  const getExpandedPosition = useCallback(
    (
      initialPosition: [number, number, number],
      displacement: [number, number, number],
      offset: [number, number, number],
      _metadata: AnimationMetadata
    ): [number, number, number] => {
      const [initX, initY, initZ] = initialPosition;
      const [dispX, dispY, dispZ] = displacement;

      const scaledDispX = staticMetricMode
        ? 0
        : expandedScale.displacementEnabled
          ? dispX * expandedScale.xzDisplacementScale
          : dispX;
      const scaledDispY = staticMetricMode
        ? 0
        : expandedScale.displacementEnabled
          ? dispY * expandedScale.xzDisplacementScale
          : dispY;
      const scaledDispZ = staticMetricMode
        ? 0
        : expandedScale.displacementEnabled
          ? dispZ * expandedScale.zDisplacementScale
          : dispZ;

      if (!expandedScale.expansionEnabled) {
        return [initX + scaledDispX, initY + scaledDispY, initZ + scaledDispZ] as [number, number, number];
      }

      const [offsetX, offsetY, offsetZ] = offset;

      return [
        (initX + offsetX) * (1 + expandedScale.xExpansion) + scaledDispX - offsetX,
        (initY + offsetY) * (1 + expandedScale.yExpansion) + scaledDispY - offsetY,
        (initZ + offsetZ) * (1 + expandedScale.zExpansion) + scaledDispZ - offsetZ,
      ] as [number, number, number];
    },
    [expandedScale, staticMetricMode]
  );

  return {
    state: expandedScale,
    toggleExpansion,
    toggleDisplacement,
    setExpansion,
    setDisplacementScale,
    reset: resetExpandedScale,
    getExpandedPosition,
  };
}
