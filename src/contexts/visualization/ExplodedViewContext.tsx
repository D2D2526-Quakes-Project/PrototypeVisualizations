import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useViewStore } from "@/stores";
import type { AnimationMetadata } from "@/lib/types";
import type { ExplodedViewState as StoredExplodedViewState } from "@/stores/viewStore";

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

const ExplodedViewContext = createContext<ExplodedViewContextType | undefined>(undefined);

export function useExplodedView() {
  const context = useContext(ExplodedViewContext);
  if (!context) {
    throw new Error("useExplodedView must be used within ExplodedViewProvider");
  }
  return context;
}

export function ExplodedViewProvider({ children }: { children: ReactNode }) {
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

      const posAfterDisp = [
        (initX + offsetX) * (1 + explodedView.xExplosion) + scaledDispX - offsetX,
        (initY + offsetY) * (1 + explodedView.yExplosion) + scaledDispY - offsetY,
        (initZ + offsetZ) * (1 + explodedView.zExplosion) + scaledDispZ - offsetZ,
      ] as [number, number, number];

      return posAfterDisp;
    },
    [explodedView],
  );

  const value = useMemo((): ExplodedViewContextType => ({
    state: explodedView,
    toggleExploded,
    toggleDisplacement,
    setExplosion,
    setDisplacementScale,
    reset: resetExplodedView,
    getExplodedPosition,
  }), [explodedView, toggleExploded, toggleDisplacement, setExplosion, setDisplacementScale, resetExplodedView, getExplodedPosition]);

  return <ExplodedViewContext.Provider value={value}>{children}</ExplodedViewContext.Provider>;
}
