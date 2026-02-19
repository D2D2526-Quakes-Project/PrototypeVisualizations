import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";

interface FloorVisibilityContextType {
  visibleFloors: Set<string>;
  toggleFloor: (storyId: string) => void;
  setFloorVisible: (storyId: string, visible: boolean) => void;
  showAllFloors: () => void;
  hideAllFloors: () => void;
  isFloorVisible: (storyId: string) => boolean;
  getVisibleStoryOrder: () => string[];
}

const FloorVisibilityContext = createContext<FloorVisibilityContextType | undefined>(undefined);

export function FloorVisibilityProvider({ children }: { children: React.ReactNode }) {
  const { animationData } = useAnimationData();
  const [visibleFloors, setVisibleFloors] = useState<Set<string> | null>(null);

  const actualVisibleFloors = useMemo(() => {
    if (visibleFloors === null) {
      return new Set(animationData.metadata.storyOrder);
    }
    return visibleFloors;
  }, [visibleFloors, animationData.metadata.storyOrder]);

  const toggleFloor = useCallback((storyId: string) => {
    setVisibleFloors((prev) => {
      const current = prev ?? new Set(animationData.metadata.storyOrder);
      const next = new Set(current);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  }, [animationData.metadata.storyOrder]);

  const setFloorVisible = useCallback((storyId: string, visible: boolean) => {
    setVisibleFloors((prev) => {
      const current = prev ?? new Set(animationData.metadata.storyOrder);
      const next = new Set(current);
      if (visible) {
        next.add(storyId);
      } else {
        next.delete(storyId);
      }
      return next;
    });
  }, [animationData.metadata.storyOrder]);

  const showAllFloors = useCallback(() => {
    setVisibleFloors(new Set(animationData.metadata.storyOrder));
  }, [animationData.metadata.storyOrder]);

  const hideAllFloors = useCallback(() => {
    setVisibleFloors(new Set());
  }, []);

  const isFloorVisible = useCallback(
    (storyId: string) => {
      return actualVisibleFloors.has(storyId);
    },
    [actualVisibleFloors],
  );

  const getVisibleStoryOrder = useCallback(() => {
    return animationData.metadata.storyOrder.filter((id) => actualVisibleFloors.has(id));
  }, [animationData.metadata.storyOrder, actualVisibleFloors]);

  const value = useMemo(
    () => ({
      visibleFloors: actualVisibleFloors,
      toggleFloor,
      setFloorVisible,
      showAllFloors,
      hideAllFloors,
      isFloorVisible,
      getVisibleStoryOrder,
    }),
    [actualVisibleFloors, toggleFloor, setFloorVisible, showAllFloors, hideAllFloors, isFloorVisible, getVisibleStoryOrder],
  );

  return <FloorVisibilityContext.Provider value={value}>{children}</FloorVisibilityContext.Provider>;
}

export function useFloorVisibility() {
  const ctx = useContext(FloorVisibilityContext);
  if (!ctx) {
    throw new Error("useFloorVisibility must be used within FloorVisibilityProvider");
  }
  return ctx;
}
