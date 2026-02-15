import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAnimationData } from '@/hooks/nodeDataHook';
import { usePlayback } from '@/components/playback/PlaybackContext';
import { COLOR_SCALES, type ColorMetric, createInterpolator, interpolateColor } from '@/lib/colors';
import * as THREE from 'three';

interface ColorContextType {
  currentMetric: ColorMetric;
  setColorMetric: (metric: ColorMetric) => void;
  getNodeColor: (nodeId: number) => THREE.Color;
  getColorScale: () => typeof COLOR_SCALES[ColorMetric];
  isMetricAvailable: (metric: ColorMetric) => boolean;
  availableMetrics: ColorMetric[];
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function useColor() {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColor must be used within ColorProvider');
  }
  return context;
}

export function ColorProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const [currentMetric, setCurrentMetric] = useState<ColorMetric>('displacement');

  const interpolator = useMemo(() => {
    const scale = COLOR_SCALES[currentMetric];
    return createInterpolator(scale.colorStops);
  }, [currentMetric]);

  const maxValues = useMemo(() => {
    const result: Record<ColorMetric, number> = {
      displacement: animationData.precomputed.maxDisplacement,
      'displacement-x': animationData.precomputed.maxDisplacement,
      'displacement-y': animationData.precomputed.maxDisplacement,
      'displacement-z': animationData.precomputed.maxDisplacement,
      velocity: animationData.precomputed.maxVelocity ?? 0,
      'velocity-x': animationData.precomputed.maxVelocity ?? 0,
      'velocity-y': animationData.precomputed.maxVelocity ?? 0,
      'velocity-z': animationData.precomputed.maxVelocity ?? 0,
      acceleration: animationData.precomputed.maxAcceleration ?? 0,
      'acceleration-x': animationData.precomputed.maxAcceleration ?? 0,
      'acceleration-y': animationData.precomputed.maxAcceleration ?? 0,
      'acceleration-z': animationData.precomputed.maxAcceleration ?? 0,
      'story-drift': 0,
    };
    return result;
  }, [animationData.precomputed]);

  const getMaxValue = useCallback((metric: ColorMetric): number => {
    if (metric === 'story-drift') {
      let max = 0;
      const { storyDrift } = animationData.precomputed;
      for (let s = 0; s < storyDrift.storyCount; s++) {
        for (let f = 0; f < storyDrift.frameCount; f++) {
          const drifts = storyDrift.getStoryDrift(s, f);
          for (let c = 0; c < drifts.length; c++) {
            max = Math.max(max, Math.abs(drifts[c]));
          }
        }
      }
      return max;
    }
    return maxValues[metric];
  }, [animationData.precomputed, maxValues]);

  const getNodeColor = useCallback((nodeId: number): THREE.Color => {
    const maxValue = getMaxValue(currentMetric);
    if (maxValue === 0) return new THREE.Color(1, 0, 0);

    let value = 0;

    switch (currentMetric) {
      case 'displacement': {
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
        value = Math.hypot(disp[0], disp[1], disp[2]);
        break;
      }
      case 'displacement-x': {
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(disp[0]);
        break;
      }
      case 'displacement-y': {
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(disp[1]);
        break;
      }
      case 'displacement-z': {
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(disp[2]);
        break;
      }
      case 'velocity': {
        if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
        const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
        value = Math.hypot(vel[0], vel[1], vel[2]);
        break;
      }
      case 'velocity-x': {
        if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
        const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(vel[0]);
        break;
      }
      case 'velocity-y': {
        if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
        const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(vel[1]);
        break;
      }
      case 'velocity-z': {
        if (!animationData.velocityLin) return new THREE.Color(0.5, 0.5, 0.5);
        const vel = animationData.velocityLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(vel[2]);
        break;
      }
      case 'acceleration': {
        if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
        const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
        value = Math.hypot(acc[0], acc[1], acc[2]);
        break;
      }
      case 'acceleration-x': {
        if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
        const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(acc[0]);
        break;
      }
      case 'acceleration-y': {
        if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
        const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(acc[1]);
        break;
      }
      case 'acceleration-z': {
        if (!animationData.accelerationLin) return new THREE.Color(0.5, 0.5, 0.5);
        const acc = animationData.accelerationLin.atFrame(frameIndex).at(nodeId);
        value = Math.abs(acc[2]);
        break;
      }
      case 'story-drift': {
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

    const normalizedValue = Math.min(value / maxValue, 1);
    const rgbColor = interpolateColor(interpolator, normalizedValue);
    return new THREE.Color(rgbColor[0], rgbColor[1], rgbColor[2]);
  }, [animationData, frameIndex, currentMetric, getMaxValue, interpolator]);

  const isMetricAvailable = useCallback((metric: ColorMetric): boolean => {
    if (metric === 'displacement' || 
        metric === 'displacement-x' || 
        metric === 'displacement-y' || 
        metric === 'displacement-z') {
      return true;
    }
    if (metric === 'velocity' || 
        metric === 'velocity-x' || 
        metric === 'velocity-y' || 
        metric === 'velocity-z') {
      return !!animationData.velocityLin;
    }
    if (metric === 'acceleration' || 
        metric === 'acceleration-x' || 
        metric === 'acceleration-y' || 
        metric === 'acceleration-z') {
      return !!animationData.accelerationLin;
    }
    if (metric === 'story-drift') {
      return !!animationData.precomputed.storyDrift;
    }
    return false;
  }, [animationData]);

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
    availableMetrics
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
}

function getCornerForNode(nodeId: number, animationData: ReturnType<typeof useAnimationData>['animationData']) {
  const cornerOrder = ['NW', 'NE', 'SW', 'SE'] as const;
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
