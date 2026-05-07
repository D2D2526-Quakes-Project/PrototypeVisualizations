import { getThresholdKey, THRESHOLD_CONFIGS, type Metric, type ThresholdKey } from "@/lib/metrics";
import { useProfileStore } from "@/state";

export function useThresholds() {
  const thresholds = useProfileStore((s) => s.thresholds);
  const setThreshold = useProfileStore((s) => s.setThreshold);
  const resetThresholds = useProfileStore((s) => s.resetThresholds);

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
