import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type ThresholdType =
  | "displacement"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "interstoryDrift";

interface ThresholdState {
  displacement: number;
  velocity: number;
  acceleration: number;
  rotation: number;
  rotationVelocity: number;
  rotationAcceleration: number;
  interstoryDrift: number;
}

interface ThresholdContextType {
  thresholds: ThresholdState;
  setThreshold: (type: ThresholdType, value: number) => void;
  getThreshold: (type: ThresholdType) => number;
  thresholdUnits: Record<ThresholdType, string>;
}

const DEFAULT_THRESHOLDS: ThresholdState = {
  displacement: 0.5,
  velocity: 5,
  acceleration: 10,
  rotation: 0.01,
  rotationVelocity: 0.1,
  rotationAcceleration: 0.5,
  interstoryDrift: 0.5,
};

const THRESHOLD_UNITS: Record<ThresholdType, string> = {
  displacement: "in",
  velocity: "in/s",
  acceleration: "in/s²",
  rotation: "rad",
  rotationVelocity: "rad/s",
  rotationAcceleration: "rad/s²",
  interstoryDrift: "%",
};

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined);

export function ThresholdProvider({ children }: { children: React.ReactNode }) {
  const [thresholds, setThresholds] = useState<ThresholdState>(DEFAULT_THRESHOLDS);

  const setThreshold = useCallback((type: ThresholdType, value: number) => {
    setThresholds((prev) => ({ ...prev, [type]: value }));
  }, []);

  const getThreshold = useCallback(
    (type: ThresholdType) => {
      return thresholds[type];
    },
    [thresholds],
  );

  const value = useMemo(
    () => ({
      thresholds,
      setThreshold,
      getThreshold,
      thresholdUnits: THRESHOLD_UNITS,
    }),
    [thresholds, setThreshold, getThreshold],
  );

  return <ThresholdContext.Provider value={value}>{children}</ThresholdContext.Provider>;
}

export function useThresholds() {
  const ctx = useContext(ThresholdContext);
  if (!ctx) {
    throw new Error("useThresholds must be used within ThresholdProvider");
  }
  return ctx;
}
