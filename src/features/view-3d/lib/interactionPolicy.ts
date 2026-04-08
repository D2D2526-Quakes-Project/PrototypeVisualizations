import type { ViewMode } from "@/features/view-3d/contexts/visualization/ViewModeContext";

export function isNodeInteractionMode(mode: ViewMode): boolean {
  return mode === "all-nodes";
}

export function isSlabInteractionMode(mode: ViewMode): boolean {
  return mode === "floor-slabs";
}
