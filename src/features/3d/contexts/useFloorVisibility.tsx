import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useProfileStore } from "@/state";

import { useCallback, useMemo } from "react";

export function useFloorVisibility() {
  const { animationData } = useAnimationData();
  const hiddenFloors = useProfileStore((s) => s._hiddenFloors);
  const setHiddenFloors = useProfileStore((s) => s._setHiddenFloors);
  const toggleFloor = useProfileStore((s) => s._toggleFloor);
  const showFloors = useProfileStore((s) => s._showFloors);
  const hideFloors = useProfileStore((s) => s._hideFloors);

  const storyOrder = animationData.metadata.storyOrder;
  const defaultHiddenFloors = animationData.metadata.hiddenFloors;

  const visibleFloors = useMemo(() => {
    if (hiddenFloors.length === 0) return storyOrder;
    return storyOrder.filter((storyId) => !hiddenFloors.includes(storyId));
  }, [hiddenFloors, storyOrder]);

  const showDefaultFloors = useCallback(() => {
    setHiddenFloors(defaultHiddenFloors);
  }, [setHiddenFloors, defaultHiddenFloors]);

  const showAllFloors = useCallback(() => {
    setHiddenFloors([]);
  }, [setHiddenFloors]);

  const hideAllFloors = useCallback(() => {
    setHiddenFloors(storyOrder);
  }, [setHiddenFloors, storyOrder]);

  const isFloorVisible = useCallback((storyId: string) => !hiddenFloors.includes(storyId), [hiddenFloors]);
  const noFloorsVisible = useMemo(() => visibleFloors.length === 0, [visibleFloors]);

  return {
    noFloorsVisible,
    visibleFloors,
    hiddenFloors,
    toggleFloor,
    showFloors,
    hideFloors,
    showAllFloors,
    hideAllFloors,
    showDefaultFloors,
    isFloorVisible,
  };
}
