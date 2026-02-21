import React, { createContext, useContext, useMemo } from "react";
import { useViewStore } from "@/stores";
import type { ThresholdState as TS } from "@/stores/viewStore";
import type { Metric } from "@/lib/metrics";

interface ThresholdContextType {
  thresholds: TS;
  setThreshold: (type: Metric, value: number) => void;
  getThreshold: (type: Metric) => number;
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined);

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  const thresholds = useViewStore((s) => s.thresholds);
  const setThreshold = useViewStore((s) => s.setThreshold);

  const value = useMemo(() => {
    const getThreshold = (type: Metric) => thresholds[type];
    return {
      thresholds,
      setThreshold,
      getThreshold,
    };
  }, [thresholds, setThreshold]);

  return <ThresholdContext.Provider value={value}>{children}</ThresholdContext.Provider>;
}

export function useThresholds() {
  const ctx = useContext(ThresholdContext);
  if (!ctx) {
    throw new Error("useThresholds must be used within ThresholdProvider");
  }
  return ctx;
}
