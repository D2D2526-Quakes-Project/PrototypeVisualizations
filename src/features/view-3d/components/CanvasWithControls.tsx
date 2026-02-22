import { Switch } from "@/components/ui/switch";
import { useCamera } from "@/features/view-3d/contexts/CameraContext";
import {
  useColor,
  useExplodedView,
  useFloorVisibility,
  useNodeVisibility,
  useSliceSelection,
  useThresholds,
  useViewMode,
} from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import { getDefaultCanvasPanelState } from "@/features/view-3d/lib/statePersistence";
import { UNIT_SCALE } from "@/lib/utils";
import { useViewStore, useViewStoreRaw } from "@/state";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BoxSelect,
  ChevronDown,
  ChevronLeftIcon,
  Grid3X3,
  ScanEye,
  EyeOff,
  Eye,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

// Import new panel components directly
import { ColorPanel } from "./CanvasWithControls/control-panels/ColorPanel";
import { ExplodedViewPanel } from "./CanvasWithControls/control-panels/ExplodedViewPanel";
import { SliceViewPanel } from "./CanvasWithControls/control-panels/SliceViewPanel";
import { FloorsPanel, ThresholdPanel } from "./CanvasWithControls/control-panels/ThresholdPanel";
import { ViewModeSelect } from "./CanvasWithControls/control-panels/ViewModeSelect";
import { ViewsPanel } from "./CanvasWithControls/control-panels/ViewsPanel";

import { getMetricConfig } from "@/lib/metrics";
import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { ColorScaleBar } from "./CanvasWithControls/ColorScaleBar";
import { SmallPlaybackControls } from "@/features/playback/PlaybackControls";
import { ShortcutsBar } from "./ShortcutsBar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function CameraManager({
  isOrthographic,
  enableSmoothing,
  enablePan,
}: {
  isOrthographic: boolean;
  enableSmoothing: boolean;
  enablePan: boolean;
}) {
  const { orbitControlsRef } = useCamera();
  const perspectiveCamRef = useRef<PerspectiveCameraImpl>(null);
  const orthoCamRef = useRef<OrthographicCameraImpl>(null);
  const { animationData } = useAnimationData();

  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
  const cameraDistance = animationData.precomputed.boundingBox.radius * UNIT_SCALE;
  const previousIsOrthographicRef = useRef(isOrthographic);

  const stableTarget = useMemo(() => new Vector3(0, 0, buildingVerticalCenter), [buildingVerticalCenter]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      controls.enablePan = enablePan;
    }
  }, [enablePan, orbitControlsRef]);

  useEffect(() => {
    const perspective = perspectiveCamRef.current;
    const ortho = orthoCamRef.current;
    const controls = orbitControlsRef.current;

    if (!perspective || !ortho || !controls) return;
    const wasOrthographic = previousIsOrthographicRef.current;
    previousIsOrthographicRef.current = isOrthographic;
    if (wasOrthographic === isOrthographic) return;

    const savedTarget = controls.target.clone();

    if (isOrthographic) {
      const distanceToTarget = Math.max(controls.object.position.distanceTo(savedTarget), 1e-6);
      ortho.position.copy(perspective.position);
      ortho.zoom = (cameraDistance / distanceToTarget) * 8;
      ortho.updateProjectionMatrix();
    } else {
      perspective.position.copy(ortho.position);
    }

    controls.target.copy(savedTarget);
    controls.update();
  }, [isOrthographic, cameraDistance, orbitControlsRef]);

  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      stableTarget.copy(controls.target);
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={perspectiveCamRef}
        makeDefault={!isOrthographic}
        position={[cameraDistance, cameraDistance, buildingVerticalCenter + cameraDistance]}
        fov={75}
        up={[0, 0, 1]}
      />
      <OrthographicCamera
        ref={orthoCamRef}
        makeDefault={isOrthographic}
        position={[cameraDistance, cameraDistance, buildingVerticalCenter + cameraDistance]}
        zoom={50}
        up={[0, 0, 1]}
      />
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} target={stableTarget} />
    </>
  );
}

export function CanvasWithControls({
  children,
  showPlaybackControls,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  panelId: initialPanelId,
}: {
  children: React.ReactNode;
  showPlaybackControls?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  panelId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = initialPanelId ?? "main-canvas";
  const setPanelState = useViewStore((s) => s.setPanelState);
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const store = useViewStoreRaw();
  const [containerWidth, setContainerWidth] = useState(0);
  const [controlsWidth, setControlsWidth] = useState(0);
  const [isViewControlsExpanded, setIsViewControlsExpanded] = useState(false);
  const [isControlsDocked, setIsControlsDocked] = useState(false);

  // Initialize isOrthographic from saved state
  const [isOrthographic, setIsOrthographic] = useState(() => {
    if (savedPanelState?.type !== "canvas") {
      return false;
    }
    return savedPanelState.state.camera.isOrthographic;
  });
  const [enableSmoothing, setEnableSmoothing] = useState(false);
  const [enablePan, _setEnablePan] = useState(true);
  const hasHydratedPanelRef = useRef(false);
  const { orbitControlsRef, getCameraState } = useCamera();
  const backgroundColor = useViewStore((s) => s.backgroundColor);
  const { selectedNodeIds, isBoxSelecting, boxSelection, boxSelectionPanelId } = useNodeVisibility();

  const getCurrentPanelState = useCallback(() => {
    const panelState = store.getState().panelStates[panelId];
    if (panelState?.type === "canvas") {
      return panelState.state;
    }
    return getDefaultCanvasPanelState();
  }, [panelId, store]);

  // Save isOrthographic when it changes
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

  // Expose setEnablePan to children via a ref or context if needed
  // For now, we use useEffect to update the camera when enablePan changes
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      controls.enablePan = enablePan;
    }
  }, [enablePan, orbitControlsRef]);

  // Restore camera position from saved panel state on mount
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

  // Save camera state periodically and on unmount
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

  // Calculate box overlay styles
  const showBoxSelectionOverlay = isBoxSelecting && boxSelectionPanelId === panelId;
  const boxStyle = boxSelection
    ? {
        left: `${Math.min(boxSelection.start.x, boxSelection.end.x) * 100}%`,
        top: `${Math.min(boxSelection.start.y, boxSelection.end.y) * 100}%`,
        width: `${Math.abs(boxSelection.end.x - boxSelection.start.x) * 100}%`,
        height: `${Math.abs(boxSelection.end.y - boxSelection.start.y) * 100}%`,
      }
    : null;

  function NoFog() {
    const { scene } = useThree();
    scene.fog = null;
    return null;
  }

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

  useEffect(() => {
    if (!isViewControlsExpanded || controlsWidth <= 0) {
      setIsControlsDocked(false);
      return;
    }

    const dockEnterWidth = controlsWidth * 3;
    const dockExitWidth = controlsWidth * 2.8;

    setIsControlsDocked((current) => {
      if (current) {
        return containerWidth >= dockExitWidth;
      }
      return containerWidth >= dockEnterWidth;
    });
  }, [containerWidth, controlsWidth, isViewControlsExpanded]);

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
        <Canvas linear flat>
          <NoFog />
          <color attach="background" args={[backgroundColor]} />
          {children}
          <CameraManager isOrthographic={isOrthographic} enableSmoothing={enableSmoothing} enablePan={enablePan} />
        </Canvas>
        {showBoxSelectionOverlay && boxStyle && (
          <div className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none" style={boxStyle} />
        )}
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
      <ShortcutsBar
        isBoxSelecting={isBoxSelecting}
        hasSelection={selectedNodeIds.size > 0}
        showPlayback={!!showPlaybackControls}
      />
    </div>
  );
}

export function ViewControls({
  orbitControlsRef,
  isOrthographic,
  setIsOrthographic,
  enableSmoothing,
  setEnableSmoothing,
  isExpanded,
  setIsExpanded,
  onExpandedWidthChange,
  docked,
}: {
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  isOrthographic: boolean;
  setIsOrthographic: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onExpandedWidthChange: (width: number) => void;
  docked: boolean;
}) {
  const { animationData } = useAnimationData();
  const { currentMetric, setColorMetric, availableMetrics, thresholdHighlighting, setThresholdHighlighting } =
    useColor();
  const { mode, setMode } = useViewMode();
  const {
    state: explodedState,
    toggleExploded,
    toggleDisplacement,
    setExplosion,
    setDisplacementScale,
  } = useExplodedView();
  const { sliceEnabled, xRange, yRange, zRange, toggleSliceEnabled, setXRange, setYRange, setZRange } =
    useSliceSelection();
  const { selectedNodeIds, hiddenNodeIds, clearSelection, hideNodes, showNodes, showAllNodes } = useNodeVisibility();
  const { thresholds, setThreshold } = useThresholds();
  const { visibleFloors, toggleFloor, showAllFloors, hideAllFloors } = useFloorVisibility();
  const backgroundColor = useViewStore((s) => s.backgroundColor);
  const setBackgroundColor = useViewStore((s) => s.setBackgroundColor);
  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  const config = getMetricConfig(currentMetric);
  const maxValue = config.getPrecomputedMax(animationData.precomputed);
  const unit = config.unit;
  const positiveOnly = config.positiveOnly;
  const thresholdValue = thresholds[currentMetric] ?? 0;

  const resetView = (viewType: "top" | "bottom" | "left" | "right" | "front" | "back") => {
    if (orbitControlsRef?.current) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const target = controls.target;

      if (camera && target) {
        const viewPositions = {
          top: [target.x, target.y, target.z + cameraDistance],
          bottom: [target.x, target.y, target.z - cameraDistance],
          left: [target.x - cameraDistance, target.y, target.z],
          right: [target.x + cameraDistance, target.y, target.z],
          front: [target.x, target.y + cameraDistance, target.z],
          back: [target.x, target.y - cameraDistance, target.z],
        };

        const position = viewPositions[viewType];
        camera.position.set(position[0], position[1], position[2]);
      }

      controls.update();
    }
  };

  const toggleCameraType = () => {
    setIsOrthographic(!isOrthographic);
  };

  const viewButtons = [
    { view: "front" as const, label: "North" },
    { view: "right" as const, label: "East" },
    { view: "back" as const, label: "South" },
    { view: "left" as const, label: "West" },
    { view: "top" as const, label: "Top" },
    { view: "bottom" as const, label: "Bottom" },
  ];

  const childVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  };

  const selectedIds = useMemo(() => Array.from(selectedNodeIds), [selectedNodeIds]);
  const hiddenIds = useMemo(() => Array.from(hiddenNodeIds), [hiddenNodeIds]);
  const selectedCount = selectedIds.length;
  const hiddenCount = hiddenIds.length;
  const hiddenSelectedCount = selectedIds.filter((nodeId) => hiddenNodeIds.has(nodeId)).length;
  const visibleSelectedCount = selectedCount - hiddenSelectedCount;
  const showNodeVisibilityMenu = selectedCount > 0 || hiddenCount > 0;

  useEffect(() => {
    if (!isExpanded) {
      onExpandedWidthChange(0);
      return;
    }

    const element = expandedPanelRef.current;
    if (!element) return;

    onExpandedWidthChange(element.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
        onExpandedWidthChange(borderBoxSize?.inlineSize ?? element.getBoundingClientRect().width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [isExpanded, onExpandedWidthChange]);

  return (
    <div
      className={`absolute flex z-50 ${docked ? "top-0 right-0 bottom-0" : "top-2 right-2 max-h-[calc(100%-1rem)]"}`}>
      <div className={`flex flex-col max-h-full overflow-hidden ${docked ? "items-stretch" : "items-end gap-0.5"}`}>
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            <>
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 flex items-center gap-0.5 origin-right">
                {viewButtons.map(({ view, label }) => (
                  <Tooltip key={view} disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => resetView(view)}
                        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center">
                        {label.charAt(0)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      {label} View
                    </TooltipContent>
                  </Tooltip>
                ))}
                <div className="w-px h-4 bg-neutral-300 mx-0.5" />
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleCameraType}
                      className={`p-1 rounded transition-colors ${
                        isOrthographic ? "bg-blue-100 text-blue-700" : "hover:bg-neutral-200 text-neutral-700"
                      }`}>
                      {isOrthographic ? <BoxSelect size={14} /> : <ScanEye size={14} />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    {isOrthographic ? "Orthographic" : "Perspective"}
                  </TooltipContent>
                </Tooltip>
                <div className="w-px h-4 bg-neutral-300 mx-0.5" />

                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsExpanded(true)}
                      className="p-1 rounded transition-colors hover:bg-neutral-200 text-neutral-700">
                      <ChevronLeftIcon size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    More options
                  </TooltipContent>
                </Tooltip>
              </motion.div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    key="collapsed-colorbar"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 gap-0.5 w-full">
                    <ColorScaleBar
                      currentMetric={currentMetric}
                      thresholdHighlighting={thresholdHighlighting}
                      thresholds={thresholds}
                      animationData={animationData}
                      noLabel
                    />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={8}>
                  <div className="font-semibold mb-1">{config.label}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <span className="text-neutral-400">Max:</span>
                    <span>
                      {positiveOnly ? maxValue.toFixed(2) : `+${maxValue.toFixed(2)}`} {unit.abbr}
                    </span>
                    <span className="text-neutral-400">Min:</span>
                    <span>
                      {positiveOnly ? "0" : `-${maxValue.toFixed(2)}`} {unit.abbr}
                    </span>
                    {thresholdHighlighting && thresholdValue > 0 && (
                      <>
                        <span className="text-neutral-400">Threshold:</span>
                        <span>
                          {thresholdValue.toFixed(2)} {unit.abbr}
                        </span>
                      </>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
              {showNodeVisibilityMenu && (
                <motion.div
                  key="node-visibility-menu"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 flex items-center gap-0.5">
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => hideNodes(selectedIds)}
                        disabled={visibleSelectedCount === 0}
                        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        <EyeOff size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      Hide Selected ({visibleSelectedCount})
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => showNodes(selectedIds)}
                        disabled={hiddenSelectedCount === 0}
                        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        <Eye size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      Show Selected ({hiddenSelectedCount})
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={showAllNodes}
                        disabled={hiddenCount === 0}
                        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed">
                        <RotateCcw size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      Show All Nodes ({hiddenCount})
                    </TooltipContent>
                  </Tooltip>
                  <div className="w-px h-4 bg-neutral-300 mx-0.5" />
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={clearSelection}
                        disabled={selectedCount === 0}
                        className="p-1 rounded hover:bg-red-100 transition-colors text-red-600 disabled:opacity-30 disabled:cursor-not-allowed">
                        <XCircle size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8}>
                      Clear Selection ({selectedCount})
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              ref={expandedPanelRef}
              key="expanded"
              variants={{
                initial: { opacity: 0, scale: 0.95, x: 10 },
                animate: { opacity: 1, scale: 1, x: 0, transition: { delayChildren: stagger(0.03) } },
                exit: { opacity: 0, scale: 0.95, x: 10 },
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.15, delayChildren: stagger(0.05) }}
              className={`p-2 min-w-40 max-h-full overflow-hidden flex flex-col min-h-0 ${
                docked
                  ? "h-full bg-white border-l border-neutral-200 origin-top-right"
                  : "bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 origin-top-right"
              }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs font-semibold text-neutral-700">Views</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500"
                  title="Collapse">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
              </div>
              <div className="overflow-y-auto min-h-0 pr-1">
                <motion.div className="grid grid-cols-2 gap-1 mb-2" variants={childVariants}>
                  <ViewsPanel resetView={resetView} />
                </motion.div>
                {showNodeVisibilityMenu && (
                  <div className="pt-1 border-t border-neutral-200">
                    <div className="text-xs font-medium text-neutral-700 mb-1">Selection</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => hideNodes(selectedIds)}
                        disabled={visibleSelectedCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed">
                        <EyeOff size={10} />
                        Hide ({visibleSelectedCount})
                      </button>
                      <button
                        onClick={showAllNodes}
                        disabled={hiddenCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed">
                        <RotateCcw size={10} />
                        Show All ({hiddenCount})
                      </button>
                    </div>
                    <button
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                      className="mt-1 w-full inline-flex items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-1 text-[10px] text-red-600 transition-colors hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <XCircle size={10} />
                      Clear Selection ({selectedCount})
                    </button>
                  </div>
                )}
                <motion.div
                  className="flex items-center gap-2 pt-1 border-t border-neutral-200"
                  variants={childVariants}>
                  <span className="text-xs font-medium text-neutral-700">Persp</span>
                  <Switch size="sm" checked={isOrthographic} onCheckedChange={setIsOrthographic} />
                  <span className="text-xs font-medium text-neutral-700">Ortho</span>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 pt-1 border-t border-neutral-200 mt-1"
                  variants={childVariants}>
                  <span className="text-xs font-medium text-neutral-700">Sharp</span>
                  <Switch size="sm" checked={enableSmoothing} onCheckedChange={setEnableSmoothing} />
                  <span className="text-xs font-medium text-neutral-700">Smooth</span>
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <div className="flex items-center gap-1 mb-1">
                    <Grid3X3 size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">View Mode</span>
                  </div>
                  <ViewModeSelect mode={mode} setMode={setMode} />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <ColorPanel
                    currentMetric={currentMetric}
                    setColorMetric={setColorMetric}
                    availableMetrics={availableMetrics}
                    thresholdHighlighting={thresholdHighlighting}
                    setThresholdHighlighting={setThresholdHighlighting}
                    thresholds={thresholds}
                    animationData={animationData}
                  />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <ThresholdPanel
                    animationData={animationData}
                    setThreshold={setThreshold}
                    currentMetric={currentMetric}
                  />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <SliceViewPanel
                    sliceEnabled={sliceEnabled}
                    xRange={xRange}
                    yRange={yRange}
                    zRange={zRange}
                    toggleSliceEnabled={toggleSliceEnabled}
                    setXRange={setXRange}
                    setYRange={setYRange}
                    setZRange={setZRange}
                  />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <ExplodedViewPanel
                    explodedEnabled={explodedState.explodedEnabled}
                    displacementEnabled={explodedState.displacementEnabled}
                    xExplosion={explodedState.xExplosion}
                    yExplosion={explodedState.yExplosion}
                    zExplosion={explodedState.zExplosion}
                    xzDisplacementScale={explodedState.xzDisplacementScale}
                    zDisplacementScale={explodedState.zDisplacementScale}
                    toggleExploded={toggleExploded}
                    toggleDisplacement={toggleDisplacement}
                    setExplosion={setExplosion}
                    setDisplacementScale={setDisplacementScale}
                  />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <FloorsPanel
                    visibleFloors={visibleFloors}
                    toggleFloor={toggleFloor}
                    showAllFloors={showAllFloors}
                    hideAllFloors={hideAllFloors}
                    storyOrder={animationData.metadata.storyOrder}
                  />
                </motion.div>
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-medium text-neutral-700">Background</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { label: "Gray", value: "#dcdcdc" },
                      { label: "White", value: "#ffffff" },
                      { label: "Black", value: "#1a1a1a" },
                      { label: "Dark Blue", value: "#1e3a5f" },
                    ].map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setBackgroundColor(color.value)}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          backgroundColor === color.value
                            ? "border-blue-500 scale-110"
                            : "border-neutral-300 hover:border-neutral-400"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
