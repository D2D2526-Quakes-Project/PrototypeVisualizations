import { useLiveStore } from "@/state";
import type { HoverItem } from "@/state/liveState";
import { useCallback, useMemo } from "react";

export function useHover() {
  const hoveredItem = useLiveStore((s) => s.hoveredItem);
  const setHoveredItem = useLiveStore((s) => s.setHoveredItem);

  const hoveredNode = useMemo(() => {
    if (hoveredItem && hoveredItem.type === "node") return hoveredItem;
    return null;
  }, [hoveredItem]);

  const hoveredCrossSection = useMemo(() => {
    if (hoveredItem && hoveredItem.type === "crossSection") return hoveredItem;
    return null;
  }, [hoveredItem]);

  const hoveredFloor = useMemo(() => {
    if (hoveredItem && hoveredItem.type === "floor") return hoveredItem;
    return null;
  }, [hoveredItem]);

  const setHoveredNode = useCallback(
    (hoverItem: HoverItem | null) => {
      if (hoverItem === null && hoveredItem !== null && hoveredItem.type !== "node") return;
      setHoveredItem(hoverItem);
    },
    [hoveredItem, setHoveredItem]
  );

  const setHoveredCrossSection = useCallback(
    (hoverItem: HoverItem | null) => {
      if (hoverItem === null && hoveredItem !== null && hoveredItem.type !== "crossSection") return;
      setHoveredItem(hoverItem);
    },
    [hoveredItem, setHoveredItem]
  );

  const setHoveredFloor = useCallback(
    (hoverItem: HoverItem | null) => {
      if (hoverItem === null && hoveredItem !== null && hoveredItem.type !== "floor") return;
      setHoveredItem(hoverItem);
    },
    [hoveredItem, setHoveredItem]
  );

  return {
    hoveredItem,
    hoveredNode,
    hoveredCrossSection,
    hoveredFloor,
    setHoveredItem,
    setHoveredNode,
    setHoveredCrossSection,
    setHoveredFloor,
  };
}
