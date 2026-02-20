import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { COLOR_SCALES, type ColorMetric, createInterpolator, interpolateColor } from "@/lib/colors";
import { useThresholds, type ThresholdType } from "./ThresholdContext";
import { formatHex, interpolate, rgb } from "culori";
import * as THREE from "three";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;

const interpolateBlue900Blue600 = interpolate([blue900, blue600], "oklab");
const interpolateBlue400White = interpolate([blue400, white], "oklab");
const inerpolateWhiteRed400 = interpolate([white, red400], "oklab");
const interpolateRed600Red900 = interpolate([red600, red900], "oklab");

const colorMap = (t: number, thresholdRatio: number) => {
  // console.log(t);
  const x = Math.max(0, Math.min(1, t));
  const th = Math.max(0, Math.min(1, thresholdRatio));

  const mid = 0.5;

  const blue400Pos = (1 - th) * 0.5;
  const red400Pos = mid + th * 0.5;

  // ---- Left extreme: deep blue → blue600 ----
  if (x <= blue400Pos) {
    const local = x / blue400Pos;
    return interpolateBlue900Blue600(local);
  }

  // ---- blue400 → white (toward center) ----
  if (x <= mid) {
    const local = (x - blue400Pos) / (mid - blue400Pos);
    return interpolateBlue400White(local);
  }

  // ---- white → red400 ----
  if (x <= red400Pos) {
    const local = (x - mid) / (red400Pos - mid);
    // console.log(local);
    return inerpolateWhiteRed400(local);
  }

  // ---- red600 → red900 ----
  const local = (x - red400Pos) / (1 - red400Pos);
  return interpolateRed600Red900(local);
};

function getThresholdAwareColor(value: number, maxValue: number, threshold: number): [number, number, number] {
  if (maxValue <= 0 || threshold <= 0) {
    return [0.5, 0.5, 0.5]; // gray
  }

  const thresholdRatio = threshold / maxValue;
  const normalized = value / maxValue;

  const oklab = colorMap(normalized, thresholdRatio);
  const rgbC = rgb(oklab);
  return [rgbC.r, rgbC.g, rgbC.b];
}

const metricToThresholdKey: Partial<Record<ColorMetric, ThresholdType>> = {
  displacement: "displacementMag",
  "displacement-x": "displacementX",
  "displacement-y": "displacementY",
  "displacement-z": "displacementZ",
  velocity: "velocityMag",
  "velocity-x": "velocityX",
  "velocity-y": "velocityY",
  "velocity-z": "velocityZ",
  acceleration: "accelerationMag",
  "acceleration-x": "accelerationX",
  "acceleration-y": "accelerationY",
  "acceleration-z": "accelerationZ",
  "story-drift": "interstoryDrift",
};

interface ColorContextType {
  currentMetric: ColorMetric;
  setColorMetric: (metric: ColorMetric) => void;
  getNodeColor: (nodeId: number, frameIndex: number) => THREE.Color;
  getColorScale: () => (typeof COLOR_SCALES)[ColorMetric];
  isMetricAvailable: (metric: ColorMetric) => boolean;
  availableMetrics: ColorMetric[];
  thresholdHighlighting: boolean;
  setThresholdHighlighting: (enabled: boolean) => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function useColor() {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useColor must be used within ColorProvider");
  }
  return context;
}

export function ColorProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();
  const { thresholds } = useThresholds();
  const [currentMetric, setCurrentMetric] = useState<ColorMetric>("displacement");
  const [thresholdHighlighting, setThresholdHighlighting] = useState<boolean>(false);

  const interpolator = useMemo(() => {
    const scale = COLOR_SCALES[currentMetric];
    return createInterpolator(scale.colorStops);
  }, [currentMetric]);

  const maxValues = useMemo(() => {
    const result: Record<ColorMetric, number> = {
      displacement: animationData.precomputed.maxDisplacement,
      "displacement-x": animationData.precomputed.maxDisplacementX,
      "displacement-y": animationData.precomputed.maxDisplacementY,
      "displacement-z": animationData.precomputed.maxDisplacementZ,
      velocity: animationData.precomputed.maxVelocity ?? 0,
      "velocity-x": animationData.precomputed.maxVelocityX ?? 0,
      "velocity-y": animationData.precomputed.maxVelocityY ?? 0,
      "velocity-z": animationData.precomputed.maxVelocityZ ?? 0,
      acceleration: animationData.precomputed.maxAcceleration ?? 0,
      "acceleration-x": animationData.precomputed.maxAccelerationX ?? 0,
      "acceleration-y": animationData.precomputed.maxAccelerationY ?? 0,
      "acceleration-z": animationData.precomputed.maxAccelerationZ ?? 0,
      "story-drift": animationData.precomputed.maxStoryDrift,
    };
    return result;
  }, [animationData.precomputed]);

  const getMaxValue = useCallback(
    (metric: ColorMetric): number => {
      return maxValues[metric];
    },
    [maxValues],
  );

  const getNodeColor = useCallback(
    (nodeId: number, frameIndex: number): THREE.Color => {
      const maxValue = getMaxValue(currentMetric);
      if (maxValue === 0) return new THREE.Color(1, 0, 0);

      let value = 0;

      switch (currentMetric) {
        case "displacement": {
          const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
          value = Math.hypot(disp[0], disp[1], disp[2]);
          break;
        }
        case "displacement-x": {
          const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(disp[0]);
          break;
        }
        case "displacement-y": {
          const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(disp[1]);
          break;
        }
        case "displacement-z": {
          const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(disp[2]);
          break;
        }
        case "velocity": {
          if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
          const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
          value = Math.hypot(vel[0], vel[1], vel[2]);
          break;
        }
        case "velocity-x": {
          if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
          const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(vel[0]);
          break;
        }
        case "velocity-y": {
          if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
          const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(vel[1]);
          break;
        }
        case "velocity-z": {
          if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
          const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(vel[2]);
          break;
        }
        case "acceleration": {
          if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
          const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
          value = Math.hypot(acc[0], acc[1], acc[2]);
          break;
        }
        case "acceleration-x": {
          if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
          const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(acc[0]);
          break;
        }
        case "acceleration-y": {
          if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
          const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(acc[1]);
          break;
        }
        case "acceleration-z": {
          if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
          const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
          value = Math.abs(acc[2]);
          break;
        }
        case "story-drift": {
          const storyOrder = animationData.metadata.storyOrder;
          let foundStoryIndex = -1;
          for (let i = 0; i < storyOrder.length; i++) {
            const storyNodes = animationData.metadata.stories[storyOrder[i]];
            if (storyNodes.includes(nodeId)) {
              foundStoryIndex = i;
              break;
            }
          }
          if (foundStoryIndex <= 0) return new THREE.Color(0.5, 0.5, 0.5);

          const cornerInfo = getCornerForNode(nodeId, animationData);
          if (!cornerInfo) return new THREE.Color(0.5, 0.5, 0.5);

          const { storyIndex, cornerIndex } = cornerInfo;
          const drifts = animationData.precomputed.storyDrift.getStoryDrift(storyIndex, frameIndex);
          value = Math.abs(drifts[cornerIndex]);
          break;
        }
      }

      // Use threshold-aware coloring if enabled
      if (thresholdHighlighting) {
        const thresholdKey = metricToThresholdKey[currentMetric];
        const thresholdValue = thresholdKey ? thresholds[thresholdKey] : undefined;

        // if (frameIndex === 0 && nodeId < 5) {
        //   console.log(
        //     `[DEBUG COLOR] nodeId=${nodeId}, currentMetric=${currentMetric}, thresholdKey=${thresholdKey}, thresholdValue=${thresholdValue}, maxValue=${maxValue.toFixed(4)}, value=${value.toFixed(4)}`,
        //   );
        // }

        if (thresholdKey && thresholdValue !== undefined && thresholdValue > 0 && maxValue > 0) {
          const rgb = getThresholdAwareColor(value, maxValue, thresholdValue);

          // if (frameIndex === 0 && nodeId < 5) {
          //   console.log(`[DEBUG COLOR] -> RGB=[${rgb[0].toFixed(3)}, ${rgb[1].toFixed(3)}, ${rgb[2].toFixed(3)}]`);
          // }

          return new THREE.Color(rgb[0], rgb[1], rgb[2]);
        }
      }

      const normalizedValue = Math.min(value / maxValue, 1);
      const rgbColor = interpolateColor(interpolator, normalizedValue);
      return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
    },
    [animationData, currentMetric, getMaxValue, interpolator, thresholdHighlighting],
  );

  const isMetricAvailable = useCallback(
    (metric: ColorMetric): boolean => {
      if (
        metric === "displacement" ||
        metric === "displacement-x" ||
        metric === "displacement-y" ||
        metric === "displacement-z"
      ) {
        return true;
      }
      if (metric === "velocity" || metric === "velocity-x" || metric === "velocity-y" || metric === "velocity-z") {
        return !!animationData.velocityLin;
      }
      if (
        metric === "acceleration" ||
        metric === "acceleration-x" ||
        metric === "acceleration-y" ||
        metric === "acceleration-z"
      ) {
        return !!animationData.accelerationLin;
      }
      if (metric === "story-drift") {
        return !!animationData.precomputed.storyDrift;
      }
      return false;
    },
    [animationData],
  );

  const availableMetrics = useMemo((): ColorMetric[] => {
    return (Object.keys(COLOR_SCALES) as ColorMetric[]).filter(isMetricAvailable);
  }, [isMetricAvailable]);

  const getColorScale = useCallback(() => {
    return COLOR_SCALES[currentMetric];
  }, [currentMetric]);

  const value: ColorContextType = {
    currentMetric,
    setColorMetric: setCurrentMetric,
    getNodeColor,
    getColorScale,
    isMetricAvailable,
    availableMetrics,
    thresholdHighlighting,
    setThresholdHighlighting,
  };

  return <ColorContext.Provider value={value}>{children}</ColorContext.Provider>;
}

function getCornerForNode(nodeId: number, animationData: ReturnType<typeof useAnimationData>["animationData"]) {
  const cornerOrder = ["NW", "NE", "SW", "SE"] as const;
  const storyOrder = animationData.metadata.storyOrder;

  for (let storyIndex = 0; storyIndex < storyOrder.length; storyIndex++) {
    const storyId = storyOrder[storyIndex];
    const corners = animationData.precomputed.cornerNodes[storyId];
    if (!corners) continue;

    for (let cornerIndex = 0; cornerIndex < cornerOrder.length; cornerIndex++) {
      const corner = cornerOrder[cornerIndex];
      if (corners[corner] === nodeId) {
        return { storyIndex, cornerIndex };
      }
    }
  }
  return null;
}
