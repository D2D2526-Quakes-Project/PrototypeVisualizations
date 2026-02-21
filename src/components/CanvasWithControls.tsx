import { Switch } from "@/components/ui/switch";
import { useCamera } from "@/contexts/CameraContext";
import {
  useColor,
  useExplodedView,
  useFloorVisibility,
  useNodeVisibility,
  useSliceSelection,
  useThresholds,
  useViewMode,
} from "@/contexts/visualization";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { UNIT_SCALE } from "@/lib/utils";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BoxSelect, ChevronDown, Grid3X3, ScanEye } from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

// Import new panel components directly
import { ViewsPanel } from "./CanvasWithControls/control-panels/ViewsPanel";
import { ViewModeSelect } from "./CanvasWithControls/control-panels/ViewModeSelect";
import { ColorPanel } from "./CanvasWithControls/control-panels/ColorPanel";
import { ExplodedViewPanel } from "./CanvasWithControls/control-panels/ExplodedViewPanel";
import { SliceViewPanel } from "./CanvasWithControls/control-panels/SliceViewPanel";
import { ThresholdPanel, FloorsPanel } from "./CanvasWithControls/control-panels/ThresholdPanel";

import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SmallPlaybackControls } from "./playback/PlaybackControls";
import { ColorBarOverlay } from "./CanvasWithControls/ColorBarOverlay";

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

  const targetRef = useRef(new Vector3(0, 0, buildingVerticalCenter));

  useEffect(() => {
    targetRef.current.set(0, 0, buildingVerticalCenter);
  }, [buildingVerticalCenter]);

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

    const savedTarget = controls.target.clone();
    targetRef.current.copy(savedTarget);

    if (isOrthographic) {
      ortho.position.copy(perspective.position);
      ortho.zoom = (cameraDistance / perspective.position.length()) * 8;
      ortho.updateProjectionMatrix();
    } else {
      perspective.position.copy(ortho.position);
    }

    controls.target.copy(targetRef.current);
    controls.update();
  }, [isOrthographic, cameraDistance, orbitControlsRef]);

  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      targetRef.current.copy(controls.target);
    }
  });

  const target = useMemo(() => targetRef.current, [targetRef]);
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
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} target={target} />
    </>
  );
}

export function CanvasWithControls({
  children,
  showPlaybackControls,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  boxSelection,
}: {
  children: React.ReactNode;
  showPlaybackControls?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  boxSelection?: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
}) {
  const [isOrthographic, setIsOrthographic] = useState(false);
  const [enableSmoothing, setEnableSmoothing] = useState(false);
  const [enablePan, _setEnablePan] = useState(true);
  const { orbitControlsRef } = useCamera();
  const { currentMetric, thresholdHighlighting } = useColor();
  const { thresholds } = useThresholds();
  const { animationData } = useAnimationData();

  // Expose setEnablePan to children via a ref or context if needed
  // For now, we use useEffect to update the camera when enablePan changes
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (controls) {
      controls.enablePan = enablePan;
    }
  }, [enablePan, orbitControlsRef]);

  // Calculate box overlay styles
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

  return (
    <div className="relative w-full h-full" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <Canvas linear flat>
        <NoFog />
        <color attach="background" args={["#dcdcdc"]} />
        {children}
        <CameraManager isOrthographic={isOrthographic} enableSmoothing={enableSmoothing} enablePan={enablePan} />
      </Canvas>
      {boxStyle && (
        <div className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none" style={boxStyle} />
      )}
      <ColorBarOverlay
        currentMetric={currentMetric}
        thresholdHighlighting={thresholdHighlighting}
        thresholds={thresholds}
        animationData={animationData}
      />
      <ViewControls
        orbitControlsRef={orbitControlsRef}
        isOrthographic={isOrthographic}
        setIsOrthographic={setIsOrthographic}
        enableSmoothing={enableSmoothing}
        setEnableSmoothing={setEnableSmoothing}
      />
      {showPlaybackControls && (
        <div className="absolute top-2 left-2 z-50">
          <div className="flex items-start gap-0.5">
            <SmallPlaybackControls />
          </div>
        </div>
      )}
    </div>
  );
}

export function ViewControls({
  orbitControlsRef,
  isOrthographic,
  setIsOrthographic,
  enableSmoothing,
  setEnableSmoothing,
}: {
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  isOrthographic: boolean;
  setIsOrthographic: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
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
  const { selectedNodeIds, clearSelection } = useNodeVisibility();
  const { thresholds, setThreshold } = useThresholds();
  const { visibleFloors, toggleFloor, showAllFloors, hideAllFloors } = useFloorVisibility();
  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const [isExpanded, setIsExpanded] = useState(false);

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
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="absolute flex top-2 right-2 z-50 max-h-[calc(100%-1rem)]">
      <div className="flex items-start gap-0.5 max-h-full overflow-hidden">
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 flex items-center gap-0.5 origin-right">
              {viewButtons.map(({ view, label }) => (
                <button
                  key={view}
                  onClick={() => resetView(view)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center"
                  title={`${label} View`}>
                  {label.charAt(0)}
                </button>
              ))}
              <div className="w-px h-4 bg-neutral-300 mx-0.5" />
              <button
                onClick={toggleCameraType}
                className={`p-1 rounded transition-colors ${
                  isOrthographic ? "bg-blue-100 text-blue-700" : "hover:bg-neutral-200 text-neutral-700"
                }`}
                title={isOrthographic ? "Orthographic" : "Perspective"}>
                {isOrthographic ? <BoxSelect size={14} /> : <ScanEye size={14} />}
              </button>
              <div className="w-px h-4 bg-neutral-300 mx-0.5" />

              <button
                onClick={() => setIsExpanded(true)}
                className="p-1 rounded transition-colors hover:bg-neutral-200 text-neutral-700"
                title="More options">
                <ChevronDown size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.div
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
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 pt-0 border border-neutral-200 min-w-40 origin-top-right overflow-y-auto max-h-full">
              <div className="flex justify-between items-center mb-2 pt-2 sticky top-0 bg-white">
                <div className="text-xs font-semibold text-neutral-700">Views</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500"
                  title="Collapse">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
              </div>
              <motion.div className="grid grid-cols-2 gap-1 mb-2" variants={childVariants}>
                <ViewsPanel resetView={resetView} />
              </motion.div>
              <motion.div className="flex items-center gap-2 pt-1 border-t border-neutral-200" variants={childVariants}>
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
              {selectedNodeIds.size > 0 && (
                <motion.div className="pt-2 border-t border-neutral-200 mt-2" variants={childVariants}>
                  <button
                    onClick={clearSelection}
                    className="w-full text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded transition-colors">
                    Clear Selection ({selectedNodeIds.size} nodes)
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
