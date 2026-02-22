import { useViewStore } from "@/stores";
import type { ThresholdState as TS } from "@/stores/viewStore";
import type { Metric } from "@/lib/metrics";

interface ThresholdContextType {
  thresholds: TS;
  setThreshold: (type: Metric, value: number) => void;
  getThreshold: (type: Metric) => number;
}

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useThresholds(): ThresholdContextType {
  const thresholds = useViewStore((s) => s.thresholds);
  const setThreshold = useViewStore((s) => s.setThreshold);

  const getThreshold = (type: Metric) => thresholds[type];

  return {
    thresholds,
    setThreshold,
    getThreshold,
  };
}
