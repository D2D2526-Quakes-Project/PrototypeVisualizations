import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AnimationMetadata } from "@/lib/types";

interface ExplodedViewState {
  explodedEnabled: boolean;
  displacementEnabled: boolean;
  xExplosion: number;
  yExplosion: number;
  zExplosion: number;
  xzDisplacementScale: number;
  zDisplacementScale: number;
}

interface ExplodedViewContextType {
  state: ExplodedViewState;
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

const DEFAULT_STATE: ExplodedViewState = {
  explodedEnabled: false,
  displacementEnabled: false,
  xExplosion: 0,
  yExplosion: 0,
  zExplosion: 1,
  xzDisplacementScale: 1,
  zDisplacementScale: 1,
};

export function ExplodedViewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExplodedViewState>(DEFAULT_STATE);

  const toggleExploded = useCallback(() => {
    setState((prev) => ({ ...prev, explodedEnabled: !prev.explodedEnabled }));
  }, []);

  const toggleDisplacement = useCallback(() => {
    setState((prev) => ({ ...prev, displacementEnabled: !prev.displacementEnabled }));
  }, []);

  const setExplosion = useCallback((axis: "x" | "y" | "z", factor: number) => {
    setState((prev) => ({ ...prev, [`${axis}Explosion`]: factor }));
  }, []);

  const setDisplacementScale = useCallback((axis: "xz" | "z", factor: number) => {
    setState((prev) => ({
      ...prev,
      [axis === "xz" ? "xzDisplacementScale" : "zDisplacementScale"]: factor,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

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

      const scaledDispX = state.displacementEnabled ? dispX * state.xzDisplacementScale : dispX;
      const scaledDispY = state.displacementEnabled ? dispY * state.xzDisplacementScale : dispY;
      const scaledDispZ = state.displacementEnabled ? dispZ * state.zDisplacementScale : dispZ;

      if (!state.explodedEnabled) {
        return [initX + scaledDispX, initY + scaledDispY, initZ + scaledDispZ] as [number, number, number];
      }

      const [offsetX, offsetY, offsetZ] = offset;

      const posAfterDisp = [
        (initX + offsetX) * (1 + state.xExplosion) + scaledDispX - offsetX,
        (initY + offsetY) * (1 + state.yExplosion) + scaledDispY - offsetY,
        (initZ + offsetZ) * (1 + state.zExplosion) + scaledDispZ - offsetZ,
      ] as [number, number, number];

      return posAfterDisp;
    },
    [state],
  );

  const value: ExplodedViewContextType = {
    state,
    toggleExploded,
    toggleDisplacement,
    setExplosion,
    setDisplacementScale,
    reset,
    getExplodedPosition,
  };

  return <ExplodedViewContext.Provider value={value}>{children}</ExplodedViewContext.Provider>;
}
