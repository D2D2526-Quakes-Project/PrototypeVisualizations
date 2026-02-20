import React, { createContext, useContext, useMemo } from "react";
import { useViewStore } from "@/stores";
import type { ThresholdType, ThresholdState as TS } from "@/stores/viewStore";

export type ThresholdCategory =
  | "displacement"
  | "velocity"
  | "acceleration"
  | "rotation"
  | "rotationVelocity"
  | "rotationAcceleration"
  | "interstoryDrift";

interface ThresholdContextType {
  thresholds: TS;
  setThreshold: (type: ThresholdType, value: number) => void;
  getThreshold: (type: ThresholdType) => number;
  thresholdUnits: Record<ThresholdType, string>;
  thresholdCategories: ThresholdCategory[];
  getThresholdsByCategory: (category: ThresholdCategory) => { key: ThresholdType; value: number; unit: string }[];
}

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
  const thresholds = useViewStore((s) => s.thresholds);
  const setThreshold = useViewStore((s) => s.setThreshold);

  const value = useMemo(
    () => {
      const getThreshold = (type: ThresholdType) => thresholds[type];
      const getThresholdsByCategory = (category: ThresholdCategory) => {
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
      };
      return {
        thresholds,
        setThreshold,
        getThreshold,
        thresholdUnits: THRESHOLD_UNITS,
        thresholdCategories: THRESHOLD_CATEGORIES,
        getThresholdsByCategory,
      };
    },
    [thresholds, setThreshold],
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
