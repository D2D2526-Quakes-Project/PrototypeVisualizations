import { useAnimationData } from "@/lib/useAnimationData";
import { useProfileStore } from "@/state";

import { useCallback, useEffect, useMemo, useRef } from "react";

export function useFloorVisibility() {
  const { animationData } = useAnimationData();
  const visibleFloorsArray = useProfileStore((s) => s.visibleFloors);
  const toggleFloorStore = useProfileStore((s) => s.toggleFloor);
  const showAllFloorsStore = useProfileStore((s) => s.showAllFloors);
  const hideAllFloorsStore = useProfileStore((s) => s.hideAllFloors);
  const initializedStoryOrderKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const storyOrder = animationData.metadata.storyOrder;
    if (storyOrder.length === 0) return;

    const storyOrderKey = storyOrder.join("|");
    if (initializedStoryOrderKeyRef.current === storyOrderKey) return;

    // if (visibleFloorsArray.length === 0) {
    //   const hiddenFloorsSet = new Set(animationData.metadata.hiddenFloors ?? []);
    //   const visible = storyOrder.filter((story) => !hiddenFloorsSet.has(story));
    //   showAllFloorsStore(visible);
    // }
    initializedStoryOrderKeyRef.current = storyOrderKey;
  }, [
    animationData.metadata.storyOrder,
    animationData.metadata.hiddenFloors,
    visibleFloorsArray.length,
    showAllFloorsStore,
  ]);

  const actualVisibleFloors = useMemo(() => {
    return new Set(visibleFloorsArray);
  }, [visibleFloorsArray]);

  const toggleFloor = useCallback(
    (storyId: string) => {
      toggleFloorStore(storyId);
    },
    [toggleFloorStore]
  );

  const setFloorVisible = useCallback(
    (storyId: string, visible: boolean) => {
      const currentlyVisible = actualVisibleFloors.has(storyId);
      if (currentlyVisible !== visible) {
        toggleFloorStore(storyId);
      }
    },
    [actualVisibleFloors, toggleFloorStore]
  );

  const showAllDefaultFloors = useCallback(() => {
    const hiddenFloorsSet = new Set(animationData.metadata.hiddenFloors ?? []);
    const storyOrder = animationData.metadata.storyOrder;
    const visible = storyOrder.filter((story) => !hiddenFloorsSet.has(story));
    showAllFloorsStore(visible);
  }, [animationData.metadata.storyOrder, showAllFloorsStore, animationData.metadata.hiddenFloors]);

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
    [actualVisibleFloors]
  );

  return {
    visibleFloors: actualVisibleFloors,
    toggleFloor,
    setFloorVisible,
    showAllDefaultFloors,
    showAllFloors,
    hideAllFloors,
    isFloorVisible,
  };
}
