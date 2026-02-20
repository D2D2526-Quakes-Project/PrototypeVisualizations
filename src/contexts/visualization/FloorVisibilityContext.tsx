import React, { createContext, useContext, useCallback, useMemo, useEffect } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useViewStore } from "@/stores";

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
  const visibleFloorsArray = useViewStore((s) => s.visibleFloors);
  const toggleFloorStore = useViewStore((s) => s.toggleFloor);
  const showAllFloorsStore = useViewStore((s) => s.showAllFloors);
  const hideAllFloorsStore = useViewStore((s) => s.hideAllFloors);

  // Initialize visible floors from animation data on mount
  useEffect(() => {
    if (animationData?.metadata?.storyOrder && visibleFloorsArray.length === 0) {
      showAllFloorsStore(animationData.metadata.storyOrder);
    }
  }, [animationData?.metadata?.storyOrder, visibleFloorsArray.length, showAllFloorsStore]);

  const actualVisibleFloors = useMemo(() => {
    return new Set(visibleFloorsArray.length > 0 ? visibleFloorsArray : animationData.metadata.storyOrder);
  }, [visibleFloorsArray, animationData.metadata.storyOrder]);

  const toggleFloor = useCallback((storyId: string) => {
    toggleFloorStore(storyId);
  }, [toggleFloorStore]);

  const setFloorVisible = useCallback((storyId: string, visible: boolean) => {
    // Use toggle if state differs from desired
    const currentlyVisible = actualVisibleFloors.has(storyId);
    if (currentlyVisible !== visible) {
      toggleFloorStore(storyId);
    }
  }, [actualVisibleFloors, toggleFloorStore]);

  const showAllFloors = useCallback(() => {
    showAllFloorsStore(animationData.metadata.storyOrder);
  }, [animationData.metadata.storyOrder, showAllFloorsStore]);

  const hideAllFloors = useCallback(() => {
    hideAllFloorsStore();
  }, [hideAllFloorsStore]);

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
