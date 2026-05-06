import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { Canvas, useThree } from "@react-three/fiber";

import { useExportRenderMode } from "@/features/export/renderMode";
import { SmallPlaybackControls } from "@/features/playback/PlaybackControls";
import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
import { AlertTriangle } from "lucide-react";

import { BoxSelectionOverlay } from "./CanvasWithControls/BoxSelectionOverlay";
import { CameraManager } from "./CanvasWithControls/CameraManager";
import { OrientationCube } from "./CanvasWithControls/OrientationCube";
import { ViewControls } from "./CanvasWithControls/ViewControls";

import { CameraProvider } from "../contexts/CameraContext";
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
  const sideControlsRef = useRef<HTMLDivElement>(null);
  const panelId = initialPanelId ?? "main-canvas";
  const [containerWidth, setContainerWidth] = useState(0);
  const [controlsWidth, setControlsWidth] = useState(0);
  const [isViewControlsExpanded, setIsViewControlsExpanded] = useState(false);
  const [isControlsDocked, setIsControlsDocked] = useState(false);
  const { animationData } = useAnimationData();
  const exportRenderMode = useExportRenderMode();
  const colorTheme = useViewStore((s) => s.colorTheme);
  const visibleFloorCount = useViewStore((s) => s.visibleFloors.length);
  const { showAllDefaultFloors } = useFloorVisibility();

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
    const element = containerRef.current;
    if (!element) return;
    const sideControls = sideControlsRef.current;
    if (!sideControls) return;

    const updateContainerWidth = (width: number) => {
      setContainerWidth(width);
      getDockedState(width, controlsWidth, isViewControlsExpanded);
    };

    updateContainerWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const elementEntry = entries.find((entry) => entry.target === element);
      const sideControlsEntry = entries.find((entry) => entry.target === sideControls);
      if (elementEntry) {
        const borderBoxSize = Array.isArray(elementEntry.borderBoxSize)
          ? elementEntry.borderBoxSize[0]
          : elementEntry.borderBoxSize;
        updateContainerWidth(borderBoxSize?.inlineSize ?? element.getBoundingClientRect().width);
      }
      if (sideControlsEntry) {
        const borderBoxSize = Array.isArray(sideControlsEntry.borderBoxSize)
          ? sideControlsEntry.borderBoxSize[0]
          : sideControlsEntry.borderBoxSize;
        setControlsWidth(borderBoxSize?.inlineSize ?? sideControls.getBoundingClientRect().width);
      }
    });
    observer.observe(element);
    observer.observe(sideControls);

    return () => observer.disconnect();
  }, [getDockedState, isViewControlsExpanded, setContainerWidth, controlsWidth]);

  const handleSetIsViewControlsExpanded = useCallback(
    (expanded: boolean) => {
      setIsViewControlsExpanded(expanded);
      getDockedState(containerWidth, controlsWidth, expanded);
    },
    [containerWidth, controlsWidth, getDockedState]
  );

  return (
    <CameraProvider>
      <div
        ref={containerRef}
        className="relative flex h-full min-h-0 w-full"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}>
        <div className="min-h-0 max-w-full flex-1">
          <Canvas
            frameloop="demand"
            linear
            flat
            onCreated={({ scene }) => {
              scene.fog = null;
            }}>
            <LayoutSizeSync />
            <color attach="background" args={[colorTheme.background]} />
            {children}
            <CameraManager />
            <OrientationCube />
          </Canvas>
          <BoxSelectionOverlay panelId={panelId} />

          {showPlaybackControls && exportRenderMode.showTransientUi && (
            <div className="absolute bottom-2 left-2 z-50">
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
        {exportRenderMode.showTransientUi && (
          <div ref={sideControlsRef}>
            <ViewControls
              // onExpandedWidthChange={handleExpandedWidthChange}
              docked={isControlsDocked}
              isExpanded={isViewControlsExpanded}
              setIsExpanded={handleSetIsViewControlsExpanded}
            />
          </div>
        )}
      </div>
    </CameraProvider>
  );
}

function LayoutSizeSync() {
  const { setSize, gl } = useThree();

  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement;

    const handleResize = () => {
      if (parent) setSize(parent.offsetWidth, parent.offsetHeight);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(parent!);

    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
    };
  }, [setSize, gl]);

  return null;
}

export { ViewControls } from "./CanvasWithControls/ViewControls";
