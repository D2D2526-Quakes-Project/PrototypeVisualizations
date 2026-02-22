import { useAnimationData } from "@/hooks/nodeDataHook";
import { useViewStore } from "@/stores";
import { useCallback, useEffect, useMemo } from "react";

interface FloorVisibilityContextType {
  visibleFloors: Set<string>;
  toggleFloor: (storyId: string) => void;
  setFloorVisible: (storyId: string, visible: boolean) => void;
  showAllFloors: () => void;
  hideAllFloors: () => void;
  isFloorVisible: (storyId: string) => boolean;
  getVisibleStoryOrder: () => string[];
}

export function FloorVisibilityProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useFloorVisibility(): FloorVisibilityContextType {
  const { animationData } = useAnimationData();
  const visibleFloorsArray = useViewStore((s) => s.visibleFloors);
  const toggleFloorStore = useViewStore((s) => s.toggleFloor);
  const showAllFloorsStore = useViewStore((s) => s.showAllFloors);
  const hideAllFloorsStore = useViewStore((s) => s.hideAllFloors);

  useEffect(() => {
    if (animationData?.metadata?.storyOrder && visibleFloorsArray.length === 0) {
      showAllFloorsStore(animationData.metadata.storyOrder);
    }
  }, [animationData?.metadata?.storyOrder, visibleFloorsArray.length, showAllFloorsStore]);

  const actualVisibleFloors = useMemo(() => {
    return new Set(visibleFloorsArray.length > 0 ? visibleFloorsArray : animationData.metadata.storyOrder);
  }, [visibleFloorsArray, animationData.metadata.storyOrder]);

  const toggleFloor = useCallback(
    (storyId: string) => {
      toggleFloorStore(storyId);
    },
    [toggleFloorStore],
  );

  const setFloorVisible = useCallback(
    (storyId: string, visible: boolean) => {
      const currentlyVisible = actualVisibleFloors.has(storyId);
      if (currentlyVisible !== visible) {
        toggleFloorStore(storyId);
      }
    },
    [actualVisibleFloors, toggleFloorStore],
  );

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

  return {
    visibleFloors: actualVisibleFloors,
    toggleFloor,
    setFloorVisible,
    showAllFloors,
    hideAllFloors,
    isFloorVisible,
    getVisibleStoryOrder,
  };
}
