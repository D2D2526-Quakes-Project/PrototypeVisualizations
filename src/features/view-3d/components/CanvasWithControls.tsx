import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { SmallPlaybackControls } from "@/features/playback/PlaybackControls";
import { useCamera } from "@/features/view-3d/contexts/CameraContext";
import { getDefaultCanvasPanelState } from "@/features/view-3d/lib/statePersistence";
import { useViewStore, useViewStoreRaw } from "@/state";

import { BoxSelectionOverlay } from "./CanvasWithControls/BoxSelectionOverlay";
import { CameraManager } from "./CanvasWithControls/CameraManager";
import { SelectionShortcuts } from "./CanvasWithControls/SelectionShortcuts";
import { ViewControls } from "./CanvasWithControls/ViewControls";

import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface CanvasWithControlsProps {
  children: ReactNode;
  showPlaybackControls?: boolean;
  onMouseDown?: (e: ReactMouseEvent) => void;
  onMouseMove?: (e: ReactMouseEvent) => void;
  onMouseUp?: (e: ReactMouseEvent) => void;
  panelId?: string;
}

export function CanvasWithControls({
  children,
  showPlaybackControls,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  panelId: initialPanelId,
}: CanvasWithControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = initialPanelId ?? "main-canvas";
  const setPanelState = useViewStore((s) => s.setPanelState);
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const store = useViewStoreRaw();
  const [containerWidth, setContainerWidth] = useState(0);
  const [controlsWidth, setControlsWidth] = useState(0);
  const [isViewControlsExpanded, setIsViewControlsExpanded] = useState(false);

  const [isOrthographic, setIsOrthographic] = useState(() => {
    if (savedPanelState?.type !== "canvas") {
      return false;
    }
    return savedPanelState.state.camera.isOrthographic;
  });
  const [enableSmoothing, setEnableSmoothing] = useState(false);
  const hasHydratedPanelRef = useRef(false);
  const { orbitControlsRef, getCameraState } = useCamera();
  const backgroundColor = useViewStore((s) => s.backgroundColor);

  const getCurrentPanelState = useCallback(() => {
    const panelState = store.getState().panelStates[panelId];
    if (panelState?.type === "canvas") {
      return panelState.state;
    }
    return getDefaultCanvasPanelState();
  }, [panelId, store]);

  useEffect(() => {
    if (!hasHydratedPanelRef.current) {
      hasHydratedPanelRef.current = true;
      return;
    }
    const panelState = getCurrentPanelState();
    setPanelState(panelId, "canvas", {
      ...panelState,
      camera: {
        ...panelState.camera,
        isOrthographic,
      },
    });
  }, [isOrthographic, panelId, setPanelState, getCurrentPanelState]);

  useEffect(() => {
    if (savedPanelState?.type !== "canvas") return;

    let rafId: number | null = null;
    let cancelled = false;

    const restore = () => {
      if (cancelled) return;
      const controls = orbitControlsRef.current;
      if (!controls) {
        rafId = requestAnimationFrame(restore);
        return;
      }

      const camera = controls.object as THREE.Camera;
      camera.position.set(
        savedPanelState.state.camera.position[0],
        savedPanelState.state.camera.position[1],
        savedPanelState.state.camera.position[2],
      );
      if (
        "isOrthographicCamera" in camera &&
        camera.isOrthographicCamera === true &&
        typeof savedPanelState.state.camera.zoom === "number"
      ) {
        (camera as THREE.OrthographicCamera).zoom = savedPanelState.state.camera.zoom;
        (camera as THREE.OrthographicCamera).updateProjectionMatrix();
      }
      controls.target.set(
        savedPanelState.state.camera.target[0],
        savedPanelState.state.camera.target[1],
        savedPanelState.state.camera.target[2],
      );
      controls.update();
    };

    restore();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [orbitControlsRef, savedPanelState]);

  useEffect(() => {
    let saveTimeout: number | null = null;
    let rafId: number | null = null;
    let controls: OrbitControlsImpl | null = null;
    let cancelled = false;

    const saveCameraState = () => {
      const cameraState = getCameraState();
      const panelState = getCurrentPanelState();
      setPanelState(panelId, "canvas", {
        ...panelState,
        camera: cameraState,
      });
      store.getState().setCameraState(cameraState);
    };

    const handleChange = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = window.setTimeout(saveCameraState, 200);
    };

    const handleInteractionEnd = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      saveCameraState();
    };

    const attach = () => {
      if (cancelled) return;
      controls = orbitControlsRef.current;
      if (!controls) {
        rafId = requestAnimationFrame(attach);
        return;
      }
      controls.addEventListener("change", handleChange);
      controls.addEventListener("end", handleInteractionEnd);
    };

    attach();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (controls) {
        controls.removeEventListener("change", handleChange);
        controls.removeEventListener("end", handleInteractionEnd);
      }
      if (saveTimeout) clearTimeout(saveTimeout);
      saveCameraState();
    };
  }, [orbitControlsRef, getCameraState, panelId, setPanelState, store, getCurrentPanelState]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    setContainerWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
        setContainerWidth(borderBoxSize?.inlineSize ?? element.getBoundingClientRect().width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const isControlsDocked = isViewControlsExpanded && controlsWidth > 0 && containerWidth >= controlsWidth * 3;
  const rightPadding = isControlsDocked ? controlsWidth : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={rightPadding > 0 ? { paddingRight: `${rightPadding}px` } : undefined}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}>
      <div className="relative w-full h-full">
        <Canvas
          linear
          flat
          onCreated={({ scene }) => {
            scene.fog = null;
          }}>
          <color attach="background" args={[backgroundColor]} />
          {children}
          <CameraManager isOrthographic={isOrthographic} enableSmoothing={enableSmoothing} enablePan />
        </Canvas>
        <BoxSelectionOverlay panelId={panelId} />
      </div>
      <ViewControls
        orbitControlsRef={orbitControlsRef}
        isOrthographic={isOrthographic}
        setIsOrthographic={setIsOrthographic}
        enableSmoothing={enableSmoothing}
        setEnableSmoothing={setEnableSmoothing}
        isExpanded={isViewControlsExpanded}
        setIsExpanded={setIsViewControlsExpanded}
        onExpandedWidthChange={setControlsWidth}
        docked={isControlsDocked}
      />
      {showPlaybackControls && (
        <div className="absolute top-2 left-2 z-50">
          <div className="flex items-start gap-0.5">
            <SmallPlaybackControls />
          </div>
        </div>
      )}
      <SelectionShortcuts showPlayback={Boolean(showPlaybackControls)} />
    </div>
  );
}

export { ViewControls } from "./CanvasWithControls/ViewControls";
