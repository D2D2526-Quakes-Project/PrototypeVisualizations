import { useViewStore } from "@/state";
import type { ThresholdState as TS } from "@/state/viewStore";
import type { Metric } from "@/lib/metrics";

interface ThresholdContextType {
  thresholds: TS;
  setThreshold: (type: Metric, value: number) => void;
  resetThresholds: () => void;
  getThreshold: (type: Metric) => number;
}

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useThresholds(): ThresholdContextType {
  const thresholds = useViewStore((s) => s.thresholds);
  const setThreshold = useViewStore((s) => s.setThreshold);
  const resetThresholds = useViewStore((s) => s.resetThresholds);

  const getThreshold = (type: Metric) => thresholds[type];

  return {
    thresholds,
    setThreshold,
    resetThresholds,
    getThreshold,
  };
}
