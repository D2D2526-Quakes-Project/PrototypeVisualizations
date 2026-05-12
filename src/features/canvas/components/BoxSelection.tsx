import { useCanvasState } from "@/features/3d/contexts/CanvasContext";
import { useNodePositions } from "@/features/3d/contexts/useNodePositions";
import { clampToViewport, performBoxSelection } from "@/lib/utils";
import { appStoreState } from "@/state";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export function BoxSelectionOverlay() {
  const { boxSelection } = useCanvasState();

  const boxStyle = useMemo(() => {
    if (!boxSelection) return null;

    return {
      left: `${Math.min(boxSelection.start.x, boxSelection.end.x) * 100}%`,
      top: `${Math.min(boxSelection.start.y, boxSelection.end.y) * 100}%`,
      width: `${Math.abs(boxSelection.end.x - boxSelection.start.x) * 100}%`,
      height: `${Math.abs(boxSelection.end.y - boxSelection.start.y) * 100}%`,
    };
  }, [boxSelection]);

  if (!boxStyle) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <div className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20" style={boxStyle} />
    </div>
  );
}

interface BoxSelectionHandlerProps {
  nodesMeshRef: React.RefObject<THREE.InstancedMesh | null>;
}

export function BoxSelectionHandler({ nodesMeshRef }: BoxSelectionHandlerProps) {
  const { gl, camera } = useThree();
  const { visibleNodes } = useNodePositions();
  const canvasState = useCanvasState();

  const stateRef = useRef({ visibleNodes, canvasState });
  useLayoutEffect(() => {
    stateRef.current = { visibleNodes, canvasState };
  }, [visibleNodes, canvasState]);

  const drag = useRef({
    isActive: false,
    isShiftHeld: false,
    rect: null as DOMRect | null,
    pendingPoint: null as { x: number; y: number } | null,
    rafId: null as number | null,
  });

  useEffect(() => {
    const domElement = gl.domElement;
    const state = drag.current;

    const clearPendingUpdate = () => {
      state.pendingPoint = null;
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    };

    const toNormalizedPoint = (e: MouseEvent, rect: DOMRect) => ({
      x: clampToViewport((e.clientX - rect.left) / rect.width),
      y: clampToViewport((e.clientY - rect.top) / rect.height),
    });

    const flushPendingUpdate = () => {
      state.rafId = null;
      if (!state.pendingPoint) return;

      const point = state.pendingPoint;
      state.pendingPoint = null;

      stateRef.current.canvasState.updateBoxSelection(point);
    };

    const scheduleBoxUpdate = (point: { x: number; y: number }) => {
      state.pendingPoint = point;
      if (state.rafId === null) {
        state.rafId = requestAnimationFrame(flushPendingUpdate);
      }
    };

    const endDrag = (commitSelection: boolean) => {
      if (!state.isActive) return;
      clearPendingUpdate();

      const store = appStoreState();

      if (commitSelection && stateRef.current.canvasState.boxSelection) {
        const selected = performBoxSelection(
          camera,
          nodesMeshRef,
          stateRef.current.canvasState.boxSelection,
          stateRef.current.visibleNodes
        );

        if (state.isShiftHeld) {
          store.addSelectedNodes(selected);
        } else {
          store.setSelectedNodes(selected);
        }
      }

      stateRef.current.canvasState.endBoxSelection();
      stateRef.current.canvasState.setPanEnabled(true);
      stateRef.current.canvasState.setNodeInteractionEnabled(true);

      state.isActive = false;
      state.isShiftHeld = false;
      state.rect = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!stateRef.current.canvasState.nodeInteractionEnabled) return;
      if (!(e.ctrlKey || e.metaKey) || e.button !== 0) return;

      const rect = domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      state.rect = rect;
      state.isShiftHeld = e.shiftKey;
      state.isActive = true;

      stateRef.current.canvasState.setPanEnabled(false);
      stateRef.current.canvasState.setNodeInteractionEnabled(false);
      stateRef.current.canvasState.startBoxSelection(toNormalizedPoint(e, rect));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isActive) return;

      if (!(e.ctrlKey || e.metaKey)) {
        endDrag(false);
        return;
      }

      const rect = state.rect ?? domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      scheduleBoxUpdate(toNormalizedPoint(e, rect));
    };

    const handleMouseUp = () => endDrag(true);

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!state.isActive) return;
      if (e.key === "Control" || e.key === "Meta") endDrag(false);
    };

    const handleWindowBlur = () => endDrag(false);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") endDrag(false);
    };

    domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearPendingUpdate();
      domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [gl, camera, nodesMeshRef]);

  return null;
}
