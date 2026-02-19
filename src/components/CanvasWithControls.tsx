import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useCamera } from "@/contexts/CameraContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import {
  useColor,
  useViewMode,
  useExplodedView,
  useSliceSelection,
  useNodeVisibility,
  useThresholds,
  useFloorVisibility,
} from "@/contexts/visualization";
import { UNIT_SCALE } from "@/lib/utils";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { BoxSelect, ChevronDown, Grid3X3, LayoutGrid, Palette, ScanEye, Sliders, Layers } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SmallPlaybackControls } from "./playback/PlaybackControls";

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
      <OrbitControls ref={orbitControlsRef} enableDamping={enableSmoothing} />
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

  return (
    <div className="relative w-full h-full" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <Canvas>
        {children}
        <CameraManager isOrthographic={isOrthographic} enableSmoothing={enableSmoothing} enablePan={enablePan} />
      </Canvas>
      {boxStyle && (
        <div className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none" style={boxStyle} />
      )}
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
  const { currentMetric, setColorMetric, availableMetrics } = useColor();
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
  const { thresholds, setThreshold, thresholdUnits } = useThresholds();
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
              initial={{ opacity: 0, scale: 0.95, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 10 }}
              transition={{ duration: 0.15 }}
              className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 pt-0 border border-neutral-200 min-w-48 origin-top-right overflow-y-auto max-h-full">
              <div className="flex justify-between items-center mb-2 pt-2 sticky top-0 bg-white">
                <div className="text-xs font-semibold text-neutral-700">Views</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-500"
                  title="Collapse">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
              </div>
              <motion.div
                className="grid grid-cols-2 gap-1 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}>
                {viewButtons.map(({ view, label }) => (
                  <button
                    key={view}
                    onClick={() => resetView(view)}
                    className="px-2 py-0.5 text-xs bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors">
                    {label}
                  </button>
                ))}
              </motion.div>
              <motion.div
                className="flex items-center gap-2 pt-1 border-t border-neutral-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}>
                <span className="text-xs font-medium text-neutral-700">Persp</span>
                <Switch size="sm" checked={isOrthographic} onCheckedChange={setIsOrthographic} />
                <span className="text-xs font-medium text-neutral-700">Ortho</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 pt-1 border-t border-neutral-200 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}>
                <span className="text-xs font-medium text-neutral-700">Sharp</span>
                <Switch size="sm" checked={enableSmoothing} onCheckedChange={setEnableSmoothing} />
                <span className="text-xs font-medium text-neutral-700">Smooth</span>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.175 }}>
                <div className="flex items-center gap-1 mb-1">
                  <Grid3X3 size={12} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-700">View Mode</span>
                </div>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                  className="w-full text-xs px-2 py-1 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors cursor-pointer">
                  <option value="all-nodes">All Nodes</option>
                  <option value="floor-slabs">Floor Slabs</option>
                  <option value="corners-only">Corners Only</option>
                  <option value="vertical-connections">Vertical Connections</option>
                </select>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}>
                <div className="flex items-center gap-1 mb-1">
                  <Palette size={12} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-700">Color By</span>
                </div>
                <select
                  value={currentMetric}
                  onChange={(e) => setColorMetric(e.target.value as typeof currentMetric)}
                  className="w-full text-xs px-2 py-1 bg-neutral-100 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors cursor-pointer">
                  {availableMetrics.map((metric) => (
                    <option key={metric} value={metric}>
                      {
                        {
                          displacement: "Displacement (Mag)",
                          "displacement-x": "Displacement X",
                          "displacement-y": "Displacement Y",
                          "displacement-z": "Displacement Z",
                          velocity: "Velocity (Mag)",
                          "velocity-x": "Velocity X",
                          "velocity-y": "Velocity Y",
                          "velocity-z": "Velocity Z",
                          acceleration: "Acceleration (Mag)",
                          "acceleration-x": "Acceleration X",
                          "acceleration-y": "Acceleration Y",
                          "acceleration-z": "Acceleration Z",
                          "story-drift": "Story Drift",
                        }[metric]
                      }
                    </option>
                  ))}
                </select>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.225 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <LayoutGrid size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Exploded View</span>
                  </div>
                  <Switch size="sm" checked={explodedState.explodedEnabled} onCheckedChange={toggleExploded} />
                </div>
                {explodedState.explodedEnabled && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 w-4">X</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={explodedState.xExplosion}
                        onChange={(e) => setExplosion("x", parseFloat(e.target.value))}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-neutral-500 w-8 text-right">
                        {explodedState.xExplosion.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 w-4">Y</span>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={explodedState.yExplosion}
                        onChange={(e) => setExplosion("y", parseFloat(e.target.value))}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-neutral-500 w-8 text-right">
                        {explodedState.yExplosion.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 w-4">Z</span>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={explodedState.zExplosion}
                        onChange={(e) => setExplosion("z", parseFloat(e.target.value))}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-neutral-500 w-8 text-right">
                        {explodedState.zExplosion.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <LayoutGrid size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Displacement Scale</span>
                  </div>
                  <Switch size="sm" checked={explodedState.displacementEnabled} onCheckedChange={toggleDisplacement} />
                </div>
                {explodedState.displacementEnabled && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 w-6">XY</span>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={explodedState.xzDisplacementScale}
                        onChange={(e) => setDisplacementScale("xz", parseFloat(e.target.value))}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-neutral-500 w-8 text-right">
                        {explodedState.xzDisplacementScale.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500 w-6">Z</span>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={explodedState.zDisplacementScale}
                        onChange={(e) => setDisplacementScale("z", parseFloat(e.target.value))}
                        className="flex-1 h-1"
                      />
                      <span className="text-[10px] text-neutral-500 w-8 text-right">
                        {explodedState.zDisplacementScale.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.275 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <ScanEye size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Slice View</span>
                  </div>
                  <Switch size="sm" checked={sliceEnabled} onCheckedChange={toggleSliceEnabled} />
                </div>
                {sliceEnabled && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">X</span>
                        <span className="text-[10px] text-neutral-500">
                          {xRange[0]} ↔ {xRange[1]}
                        </span>
                      </div>
                      <Slider
                        value={xRange}
                        onValueChange={(val) => setXRange(val as [number, number])}
                        min={Math.floor(animationData.precomputed.boundingBox.min[0])}
                        max={Math.ceil(animationData.precomputed.boundingBox.max[0])}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">Y</span>
                        <span className="text-[10px] text-neutral-500">
                          {yRange[0]} ↔ {yRange[1]}
                        </span>
                      </div>
                      <Slider
                        value={yRange}
                        onValueChange={(val) => setYRange(val as [number, number])}
                        min={Math.floor(animationData.precomputed.boundingBox.min[1])}
                        max={Math.ceil(animationData.precomputed.boundingBox.max[1])}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500">Z</span>
                        <span className="text-[10px] text-neutral-500">
                          {zRange[0]} ↔ {zRange[1]}
                        </span>
                      </div>
                      <Slider
                        value={zRange}
                        onValueChange={(val) => setZRange(val as [number, number])}
                        min={Math.floor(animationData.precomputed.boundingBox.min[2])}
                        max={Math.ceil(animationData.precomputed.boundingBox.max[2])}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}>
                <div className="flex items-center gap-1 mb-1">
                  <Sliders size={12} className="text-neutral-500" />
                  <span className="text-xs font-medium text-neutral-700">Thresholds</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 w-16">Disp</span>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.01"
                      value={thresholds.displacement}
                      onChange={(e) => setThreshold("displacement", parseFloat(e.target.value))}
                      className="flex-1 h-1"
                    />
                    <span className="text-[10px] text-neutral-500 w-14 text-right">
                      {thresholds.displacement.toFixed(2)} {thresholdUnits.displacement}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 w-16">ISD</span>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.01"
                      value={thresholds.interstoryDrift}
                      onChange={(e) => setThreshold("interstoryDrift", parseFloat(e.target.value))}
                      className="flex-1 h-1"
                    />
                    <span className="text-[10px] text-neutral-500 w-14 text-right">
                      {thresholds.interstoryDrift.toFixed(2)} {thresholdUnits.interstoryDrift}
                    </span>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.325 }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Layers size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Floors</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={showAllFloors}
                      className="text-[10px] px-1 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300">
                      All
                    </button>
                    <button
                      onClick={hideAllFloors}
                      className="text-[10px] px-1 py-0.5 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300">
                      None
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-0.5 max-h-32 overflow-y-auto">
                  {animationData.metadata.storyOrder.map((storyId) => (
                    <button
                      key={storyId}
                      onClick={() => toggleFloor(storyId)}
                      className={`text-[9px] px-1 py-0.5 rounded border transition-colors ${
                        visibleFloors.has(storyId)
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-neutral-100 border-neutral-300 text-neutral-400"
                      }`}>
                      {storyId}
                    </button>
                  ))}
                </div>
              </motion.div>
              {selectedNodeIds.size > 0 && (
                <motion.div
                  className="pt-2 border-t border-neutral-200 mt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}>
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
