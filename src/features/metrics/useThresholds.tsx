import { getThresholdKey, THRESHOLD_CONFIGS, type Metric, type ThresholdKey } from "@/features/metrics/metrics";
import { useProfileActions, useProfileData } from "@/state";

export function useThresholds() {
  const thresholds = useProfileData((s) => s._thresholds);
  const { setThreshold, resetThresholds } = useProfileActions();

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
