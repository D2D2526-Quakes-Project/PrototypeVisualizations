import type { ViewMode } from "@/contexts/visualization/ViewModeContext";

export function isNodeInteractionMode(mode: ViewMode): boolean {
  return (
    mode === "all-nodes" ||
    mode === "corners-only" ||
    mode === "exterior-only" ||
    mode === "vertical-connections"
  );
}

export function isSlabInteractionMode(mode: ViewMode): boolean {
  return mode === "floor-slabs";
}
