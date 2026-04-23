import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { useExportRenderMode } from "@/features/export/renderMode";
import { SmallPlaybackControls } from "@/features/playback/PlaybackControls";
import { useCamera } from "@/features/view-3d/contexts/CameraContext";
import { getDefaultCanvasPanelState } from "@/features/view-3d/lib/statePersistence";
import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore, useViewStoreRaw } from "@/state";
import { AlertTriangle } from "lucide-react";

import { BoxSelectionOverlay } from "./CanvasWithControls/BoxSelectionOverlay";
import { CameraManager } from "./CanvasWithControls/CameraManager";
import { OrientationCube } from "./CanvasWithControls/OrientationCube";
import { ViewControls } from "./CanvasWithControls/ViewControls";

import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useFloorVisibility } from "../contexts/visualization";

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
  const [isControlsDocked, setIsControlsDocked] = useState(false);
  const [cameraModeOverride, setCameraModeOverride] = useState<{ panelId: string; value: boolean } | null>(null);
  const hasWrittenCameraModeRef = useRef(false);
  const hasPersistedCameraModeRef = useRef(false);
  const { orbitControlsRef, getCameraState } = useCamera();
  const { animationData } = useAnimationData();
  const exportRenderMode = useExportRenderMode();
  const backgroundColor = useViewStore((s) => s.backgroundColor);
  const visibleFloorCount = useViewStore((s) => s.visibleFloors.length);
  const { showAllDefaultFloors } = useFloorVisibility();

  const isOrthographic =
    cameraModeOverride?.panelId === panelId
      ? cameraModeOverride.value
      : savedPanelState?.type === "canvas"
        ? savedPanelState.state.camera.isOrthographic
        : false;

  const getCurrentPanelState = useCallback(() => {
    const panelState = store.getState().panelStates[panelId];
    if (panelState?.type === "canvas") {
      return panelState.state;
    }
    return getDefaultCanvasPanelState();
  }, [panelId, store]);

  const persistCameraState = useCallback(
    (expectedIsOrthographic?: boolean) => {
      // Avoid overwriting saved camera data with fallback defaults before controls are mounted.
      if (!orbitControlsRef.current) return false;
      const cameraState = getCameraState();
      if (typeof expectedIsOrthographic === "boolean" && cameraState.isOrthographic !== expectedIsOrthographic) {
        return false;
      }
      const nextCameraState =
        typeof expectedIsOrthographic === "boolean"
          ? { ...cameraState, isOrthographic: expectedIsOrthographic }
          : cameraState;
      const panelState = getCurrentPanelState();
      setPanelState(panelId, "canvas", {
        ...panelState,
        camera: nextCameraState,
      });
      store.getState().setCameraState(nextCameraState);
      return true;
    },
    [getCameraState, getCurrentPanelState, orbitControlsRef, panelId, setPanelState, store]
  );

  const handleSetIsOrthographic = useCallback(
    (value: boolean) => {
      setCameraModeOverride({ panelId, value });
    },
    [panelId]
  );

  const getDockedState = useCallback((nextContainerWidth: number, nextControlsWidth: number, expanded: boolean) => {
    setIsControlsDocked((current) => {
      if (!expanded || nextControlsWidth <= 0) return false;
      const dockThreshold = nextControlsWidth * 2;
      const hysteresis = 32;
      return current
        ? nextContainerWidth >= dockThreshold - hysteresis
        : nextContainerWidth >= dockThreshold + hysteresis;
    });
  }, []);

  useEffect(() => {
    hasWrittenCameraModeRef.current = false;
    hasPersistedCameraModeRef.current = false;
  }, [panelId]);

  useEffect(() => {
    if (!hasWrittenCameraModeRef.current) {
      hasWrittenCameraModeRef.current = true;
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
        savedPanelState.state.camera.position[2]
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
        savedPanelState.state.camera.target[2]
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
    if (!hasPersistedCameraModeRef.current) {
      hasPersistedCameraModeRef.current = true;
      return;
    }

    let rafId: number | null = null;
    let cancelled = false;

    const persistWhenCameraMatchesMode = () => {
      if (cancelled) return;
      if (persistCameraState(isOrthographic)) return;
      rafId = requestAnimationFrame(persistWhenCameraMatchesMode);
    };

    persistWhenCameraMatchesMode();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isOrthographic, persistCameraState]);

  useEffect(() => {
    let saveTimeout: number | null = null;
    let rafId: number | null = null;
    let controls: OrbitControlsImpl | null = null;
    let cancelled = false;

    const handleChange = () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = window.setTimeout(persistCameraState, 200);
    };

    const handleInteractionEnd = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      persistCameraState();
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
      persistCameraState();
    };
  }, [orbitControlsRef, persistCameraState]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateContainerWidth = (width: number) => {
      setContainerWidth(width);
      getDockedState(width, controlsWidth, isViewControlsExpanded);
    };

    updateContainerWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
        updateContainerWidth(borderBoxSize?.inlineSize ?? element.getBoundingClientRect().width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [controlsWidth, getDockedState, isViewControlsExpanded]);

  const handleSetIsViewControlsExpanded = useCallback(
    (expanded: boolean) => {
      setIsViewControlsExpanded(expanded);
      getDockedState(containerWidth, controlsWidth, expanded);
    },
    [containerWidth, controlsWidth, getDockedState]
  );

  const handleExpandedWidthChange = useCallback(
    (width: number) => {
      setControlsWidth(width);
      getDockedState(containerWidth, width, isViewControlsExpanded);
    },
    [containerWidth, getDockedState, isViewControlsExpanded]
  );

  const rightPadding = isControlsDocked ? controlsWidth : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full flex-col"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}>
      <div
        className="relative min-h-0 flex-1"
        style={rightPadding > 0 ? { paddingRight: `${rightPadding}px` } : undefined}>
        <Canvas
          linear
          flat
          onCreated={({ scene }) => {
            scene.fog = null;
          }}>
          <color attach="background" args={[backgroundColor]} />
          {children}
          <CameraManager isOrthographic={isOrthographic} enableSmoothing={false} enablePan />
          <OrientationCube />
        </Canvas>
        <BoxSelectionOverlay panelId={panelId} />
        {showPlaybackControls && !(exportRenderMode.active && exportRenderMode.hideTransientUi) && (
          <div className="absolute bottom-2 left-2 z-50" data-export-hide="transient">
            <div className="flex items-start gap-1">
              <SmallPlaybackControls />
              {animationData.metadata.storyOrder.length > 0 && visibleFloorCount === 0 && (
                <button
                  type="button"
                  onClick={() => showAllDefaultFloors()}
                  className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-1 text-[10px] font-medium text-amber-800 shadow-sm hover:bg-amber-100"
                  title="All floors are hidden. Show all floors.">
                  <AlertTriangle size={10} />
                  No floors
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {!(exportRenderMode.active && exportRenderMode.hideTransientUi) && (
        <div data-export-hide="transient">
          <ViewControls
            orbitControlsRef={orbitControlsRef}
            isOrthographic={isOrthographic}
            setIsOrthographic={handleSetIsOrthographic}
            isExpanded={isViewControlsExpanded}
            setIsExpanded={handleSetIsViewControlsExpanded}
            onExpandedWidthChange={handleExpandedWidthChange}
            docked={isControlsDocked}
          />
        </div>
      )}
      {exportRenderMode.active && exportRenderMode.blockInteractions ? (
        <div data-export-hide="transient" className="absolute inset-0 z-[180] bg-transparent" />
      ) : null}
      {/* <SelectionShortcuts showPlayback={Boolean(showPlaybackControls)} /> */}
    </div>
  );
}

export { ViewControls } from "./CanvasWithControls/ViewControls";
