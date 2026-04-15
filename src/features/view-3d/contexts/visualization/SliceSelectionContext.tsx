import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

interface SliceSelectionContextType {
  sliceEnabled: boolean;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
  toggleSliceEnabled: () => void;
  setXRange: (range: [number, number]) => void;
  setYRange: (range: [number, number]) => void;
  setZRange: (range: [number, number]) => void;
}

const SliceSelectionContext = createContext<SliceSelectionContextType | undefined>(undefined);

export function useSliceSelection() {
  const context = useContext(SliceSelectionContext);
  if (!context) {
    throw new Error("useSliceSelection must be used within SliceSelectionProvider");
  }
  return context;
}

export function SliceSelectionProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();

  const sliceEnabled = useViewStore((s) => s.sliceEnabled);
  const setSliceEnabled = useViewStore((s) => s.setSliceEnabled);
  const xRange = useViewStore((s) => s.xRange);
  const yRange = useViewStore((s) => s.yRange);
  const zRange = useViewStore((s) => s.zRange);
  const setXRange = useViewStore((s) => s.setXRange);
  const setYRange = useViewStore((s) => s.setYRange);
  const setZRange = useViewStore((s) => s.setZRange);

  useEffect(() => {
    if (!animationData?.precomputed?.boundingBox) return;

    setXRange([
      Math.floor(animationData.precomputed.boundingBox.min[0]),
      Math.ceil(animationData.precomputed.boundingBox.max[0]),
    ]);
    setYRange([
      Math.floor(animationData.precomputed.boundingBox.min[1]),
      Math.ceil(animationData.precomputed.boundingBox.max[1]),
    ]);
    setZRange([
      Math.floor(animationData.precomputed.boundingBox.min[2]),
      Math.ceil(animationData.precomputed.boundingBox.max[2]),
    ]);
  }, [animationData, setXRange, setYRange, setZRange]);

  const toggleSliceEnabled = useCallback(() => {
    setSliceEnabled(!sliceEnabled);
  }, [sliceEnabled, setSliceEnabled]);

  const value = useMemo<SliceSelectionContextType>(
    () => ({
      sliceEnabled,
      xRange,
      yRange,
      zRange,
      toggleSliceEnabled,
      setXRange,
      setYRange,
      setZRange,
    }),
    [sliceEnabled, xRange, yRange, zRange, toggleSliceEnabled, setXRange, setYRange, setZRange]
  );

  return <SliceSelectionContext.Provider value={value}>{children}</SliceSelectionContext.Provider>;
}
