import { useEffect } from "react";

import { isEditableTarget } from "@/lib/utils";
import { useCanvasState } from "../3d/contexts/CanvasContext";

export function KeyboardZoomHandler({ isActive }: { isActive: boolean }) {
  const { orthographic, cameraZoom, setCameraZoom, cameraPosition, setCameraPosition, cameraTarget } = useCanvasState();

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      if (key === "=" || key === "+") {
        e.preventDefault();
        if (orthographic) {
          if (cameraZoom !== undefined) {
            setCameraZoom(cameraZoom * 1.05);
          }
        } else {
          const dx = cameraPosition[0] - cameraTarget[0];
          const dy = cameraPosition[1] - cameraTarget[1];
          const dz = cameraPosition[2] - cameraTarget[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const scale = 0.9;
          const newDistance = distance * scale;
          const dirX = dx / distance;
          const dirY = dy / distance;
          const dirZ = dz / distance;
          setCameraPosition([
            cameraTarget[0] + dirX * newDistance,
            cameraTarget[1] + dirY * newDistance,
            cameraTarget[2] + dirZ * newDistance,
          ]);
        }
        return;
      }
      if (key === "-") {
        e.preventDefault();
        if (orthographic) {
          if (cameraZoom !== undefined) {
            setCameraZoom(cameraZoom * 0.95);
          }
        } else {
          const dx = cameraPosition[0] - cameraTarget[0];
          const dy = cameraPosition[1] - cameraTarget[1];
          const dz = cameraPosition[2] - cameraTarget[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const scale = 1.1;
          const newDistance = distance * scale;
          const dirX = dx / distance;
          const dirY = dy / distance;
          const dirZ = dz / distance;
          setCameraPosition([
            cameraTarget[0] + dirX * newDistance,
            cameraTarget[1] + dirY * newDistance,
            cameraTarget[2] + dirZ * newDistance,
          ]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, orthographic, cameraZoom, setCameraZoom, cameraPosition, cameraTarget, setCameraPosition]);

  return null;
}
