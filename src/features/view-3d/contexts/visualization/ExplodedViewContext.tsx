import { useViewStore } from "@/state";
import type { AnimationMetadata } from "@/lib/types";
import type { ExplodedViewState as StoredExplodedViewState } from "@/state/viewStore";
import { useCallback } from "react";

interface ExplodedViewContextType {
  state: StoredExplodedViewState;
  toggleExploded: () => void;
  toggleDisplacement: () => void;
  setExplosion: (axis: "x" | "y" | "z", factor: number) => void;
  setDisplacementScale: (axis: "xz" | "z", factor: number) => void;
  reset: () => void;
  getExplodedPosition: (
    nodeId: number,
    initialPosition: [number, number, number],
    displacement: [number, number, number],
    offset: [number, number, number],
    metadata: AnimationMetadata,
  ) => [number, number, number];
}

export function ExplodedViewProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useExplodedView(): ExplodedViewContextType {
  const explodedView = useViewStore((s) => s.explodedView);
  const toggleExploded = useViewStore((s) => s.toggleExploded);
  const toggleDisplacement = useViewStore((s) => s.toggleDisplacement);
  const setExplosion = useViewStore((s) => s.setExplosion);
  const setDisplacementScale = useViewStore((s) => s.setDisplacementScale);
  const resetExplodedView = useViewStore((s) => s.resetExplodedView);

  const getExplodedPosition = useCallback(
    (
      _nodeId: number,
      initialPosition: [number, number, number],
      displacement: [number, number, number],
      offset: [number, number, number],
      _metadata: AnimationMetadata,
    ): [number, number, number] => {
      const [initX, initY, initZ] = initialPosition;
      const [dispX, dispY, dispZ] = displacement;

      const scaledDispX = explodedView.displacementEnabled ? dispX * explodedView.xzDisplacementScale : dispX;
      const scaledDispY = explodedView.displacementEnabled ? dispY * explodedView.xzDisplacementScale : dispY;
      const scaledDispZ = explodedView.displacementEnabled ? dispZ * explodedView.zDisplacementScale : dispZ;

      if (!explodedView.explodedEnabled) {
        return [initX + scaledDispX, initY + scaledDispY, initZ + scaledDispZ] as [number, number, number];
      }

      const [offsetX, offsetY, offsetZ] = offset;

      return [
        (initX + offsetX) * (1 + explodedView.xExplosion) + scaledDispX - offsetX,
        (initY + offsetY) * (1 + explodedView.yExplosion) + scaledDispY - offsetY,
        (initZ + offsetZ) * (1 + explodedView.zExplosion) + scaledDispZ - offsetZ,
      ] as [number, number, number];
    },
    [explodedView],
  );

  return {
    state: explodedView,
    toggleExploded,
    toggleDisplacement,
    setExplosion,
    setDisplacementScale,
    reset: resetExplodedView,
    getExplodedPosition,
  };
}
