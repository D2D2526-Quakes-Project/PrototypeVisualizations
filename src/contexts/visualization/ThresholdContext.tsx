import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type ThresholdType =
  | "displacement"
  | "displacementX"
  | "displacementY"
  | "displacementZ"
  | "displacementMag"
  | "velocity"
  | "velocityX"
  | "velocityY"
  | "velocityZ"
  | "velocityMag"
  | "acceleration"
  | "accelerationX"
  | "accelerationY"
  | "accelerationZ"
  | "accelerationMag"
  | "rotation"
  | "rotationX"
  | "rotationY"
  | "rotationZ"
  | "rotationMag"
  | "rotationVelocity"
  | "rotationVelocityX"
  | "rotationVelocityY"
  | "rotationVelocityZ"
  | "rotationVelocityMag"
  | "rotationAcceleration"
  | "rotationAccelerationX"
  | "rotationAccelerationY"
  | "rotationAccelerationZ"
  | "rotationAccelerationMag"
  | "interstoryDrift"
  | "interstoryDriftAvg";

export type ThresholdCategory =
  | "displacement"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "interstoryDrift";

interface ThresholdState {
  // Displacement (in)
  displacement: number;
  displacementX: number;
  displacementY: number;
  displacementZ: number;
  displacementMag: number;
  // Velocity (in/s)
  velocity: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  velocityMag: number;
  // Acceleration (in/s²)
  acceleration: number;
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  accelerationMag: number;
  // Rotation (rad)
  rotation: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  rotationMag: number;
  // Rotation Velocity (rad/s)
  rotationVelocity: number;
  rotationVelocityX: number;
  rotationVelocityY: number;
  rotationVelocityZ: number;
  rotationVelocityMag: number;
  // Rotation Acceleration (rad/s²)
  rotationAcceleration: number;
  rotationAccelerationX: number;
  rotationAccelerationY: number;
  rotationAccelerationZ: number;
  rotationAccelerationMag: number;
  // Interstory Drift (%)
  interstoryDrift: number;
  interstoryDriftAvg: number;
}

interface ThresholdContextType {
  thresholds: ThresholdState;
  setThreshold: (type: ThresholdType, value: number) => void;
  getThreshold: (type: ThresholdType) => number;
  thresholdUnits: Record<ThresholdType, string>;
  thresholdCategories: ThresholdCategory[];
  getThresholdsByCategory: (category: ThresholdCategory) => { key: ThresholdType; value: number; unit: string }[];
}

const DEFAULT_THRESHOLDS: ThresholdState = {
  displacement: 0.1,
  displacementX: 0.1,
  displacementY: 0.1,
  displacementZ: 0.1,
  displacementMag: 0.1,
  velocity: 1,
  velocityX: 1,
  velocityY: 1,
  velocityZ: 1,
  velocityMag: 1,
  acceleration: 2,
  accelerationX: 2,
  accelerationY: 2,
  accelerationZ: 2,
  accelerationMag: 2,
  rotation: 0.005,
  rotationX: 0.005,
  rotationY: 0.01,
  rotationZ: 0.01,
  rotationMag: 0.01,
  rotationVelocity: 0.1,
  rotationVelocityX: 0.1,
  rotationVelocityY: 0.1,
  rotationVelocityZ: 0.1,
  rotationVelocityMag: 0.1,
  rotationAcceleration: 0.5,
  rotationAccelerationX: 0.5,
  rotationAccelerationY: 0.5,
  rotationAccelerationZ: 0.5,
  rotationAccelerationMag: 0.5,
  interstoryDrift: 0.5,
  interstoryDriftAvg: 0.5,
};

const THRESHOLD_UNITS: Record<ThresholdType, string> = {
  displacement: "in",
  displacementX: "in",
  displacementY: "in",
  displacementZ: "in",
  displacementMag: "in",
  velocity: "in/s",
  velocityX: "in/s",
  velocityY: "in/s",
  velocityZ: "in/s",
  velocityMag: "in/s",
  acceleration: "in/s²",
  accelerationX: "in/s²",
  accelerationY: "in/s²",
  accelerationZ: "in/s²",
  accelerationMag: "in/s²",
  rotation: "rad",
  rotationX: "rad",
  rotationY: "rad",
  rotationZ: "rad",
  rotationMag: "rad",
  rotationVelocity: "rad/s",
  rotationVelocityX: "rad/s",
  rotationVelocityY: "rad/s",
  rotationVelocityZ: "rad/s",
  rotationVelocityMag: "rad/s",
  rotationAcceleration: "rad/s²",
  rotationAccelerationX: "rad/s²",
  rotationAccelerationY: "rad/s²",
  rotationAccelerationZ: "rad/s²",
  rotationAccelerationMag: "rad/s²",
  interstoryDrift: "%",
  interstoryDriftAvg: "%",
};

const THRESHOLD_CATEGORIES: ThresholdCategory[] = [
  "displacement",
  "velocity",
  "acceleration",
  "rotation",
  "rotationVelocity",
  "rotationAcceleration",
  "interstoryDrift",
];

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

  const getThresholdsByCategory = useCallback(
    (category: ThresholdCategory) => {
      const categoryMap: Record<ThresholdCategory, ThresholdType[]> = {
        displacement: ["displacement", "displacementX", "displacementY", "displacementZ", "displacementMag"],
        velocity: ["velocity", "velocityX", "velocityY", "velocityZ", "velocityMag"],
        acceleration: ["acceleration", "accelerationX", "accelerationY", "accelerationZ", "accelerationMag"],
        rotation: ["rotation", "rotationX", "rotationY", "rotationZ", "rotationMag"],
        rotationVelocity: ["rotationVelocity", "rotationVelocityX", "rotationVelocityY", "rotationVelocityZ", "rotationVelocityMag"],
        rotationAcceleration: ["rotationAcceleration", "rotationAccelerationX", "rotationAccelerationY", "rotationAccelerationZ", "rotationAccelerationMag"],
        interstoryDrift: ["interstoryDrift", "interstoryDriftAvg"],
      };
      const keys = categoryMap[category];
      return keys.map((key) => ({
        key,
        value: thresholds[key],
        unit: THRESHOLD_UNITS[key],
      }));
    },
    [thresholds],
  );

  const value = useMemo(
    () => ({
      thresholds,
      setThreshold,
      getThreshold,
      thresholdUnits: THRESHOLD_UNITS,
      thresholdCategories: THRESHOLD_CATEGORIES,
      getThresholdsByCategory,
    }),
    [thresholds, setThreshold, getThreshold, getThresholdsByCategory],
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
