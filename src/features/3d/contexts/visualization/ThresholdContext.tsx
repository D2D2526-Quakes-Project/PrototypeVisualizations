import type { ThresholdState as TS } from "@/state/profileState";
import { getThresholdKey, THRESHOLD_CONFIGS, type Metric, type ThresholdKey } from "@/lib/metrics";

interface ThresholdContextType {
  thresholds: TS;
  setThreshold: (type: ThresholdKey, value: number) => void;
  resetThresholds: () => void;
  getThreshold: (type: Metric | ThresholdKey) => number;
}

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useThresholds(): ThresholdContextType {
  const thresholds = useViewStore((s) => s.thresholds);
  const setThreshold = useViewStore((s) => s.setThreshold);
  const resetThresholds = useViewStore((s) => s.resetThresholds);

  const getThreshold = (type: Metric | ThresholdKey) => {
    const thresholdKey = type in THRESHOLD_CONFIGS ? (type as ThresholdKey) : getThresholdKey(type as Metric);
    return thresholds[thresholdKey];
  };

  return {
    thresholds,
    setThreshold,
    resetThresholds,
    getThreshold,
  };
}
