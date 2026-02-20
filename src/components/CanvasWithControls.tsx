import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Canvas, useFrame } from "@react-three/fiber";
import { formatHex } from "culori";
import { BoxSelect, ChevronDown, Grid3X3, Layers, LayoutGrid, Palette, ScanEye, Sliders } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue600 = formatHex("oklch(54.6% 0.245 262.881)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red600 = formatHex("oklch(57.7% 0.245 27.325)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;

const metricToThresholdKey: Record<string, string> = {
  displacement: "displacementMag",
  "displacement-x": "displacementX",
  "displacement-y": "displacementY",
  "displacement-z": "displacementZ",
  velocity: "velocityMag",
  "velocity-x": "velocityX",
  "velocity-y": "velocityY",
  "velocity-z": "velocityZ",
  acceleration: "accelerationMag",
  "acceleration-x": "accelerationX",
  "acceleration-y": "accelerationY",
  "acceleration-z": "accelerationZ",
  "story-drift": "interstoryDrift",
};

import {
  OrthographicCamera as OrthographicCameraImpl,
  PerspectiveCamera as PerspectiveCameraImpl,
  Vector3,
} from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SmallPlaybackControls } from "./playback/PlaybackControls";

function ThresholdSlider({
  label,
  value,
  unit,
  onChange,
  max,
  tooltip,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
  max: number;
  tooltip?: string;
}) {
  const step = max > 1 ? 0.1 : 0.001;
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-neutral-500 w-16 shrink-0 cursor-help text-left">{label}</span>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="top" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        )}
      </Tooltip>
      <input
        type="range"
        min="0"
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1"
      />
      <span className="text-[10px] text-neutral-500 w-14 text-right shrink-0">
        {value.toFixed(max > 1 ? 1 : 3)} {unit}
      </span>
    </div>
  );
}

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
                  <option value="threshold">Damage Threshold</option>
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

                {/* Color Scale Bar - always visible */}
                <div className="mt-2">
                  <div className="text-[10px] text-neutral-500 mb-1">Color Scale</div>
                  {(() => {
                    const isMagnitude = ["displacement", "velocity", "acceleration", "story-drift"].includes(
                      currentMetric,
                    );

                    let maxValue: number;
                    let unit: string;

                    if (currentMetric === "displacement") {
                      maxValue = animationData.precomputed.maxDisplacement;
                      unit = "in";
                    } else if (currentMetric === "velocity") {
                      maxValue = animationData.precomputed.maxVelocity ?? 0;
                      unit = "in/s";
                    } else if (currentMetric === "acceleration") {
                      maxValue = animationData.precomputed.maxAcceleration ?? 0;
                      unit = "in/s²";
                    } else if (currentMetric === "story-drift") {
                      maxValue = animationData.precomputed.maxStoryDrift;
                      unit = "%";
                    } else {
                      const maxX = animationData.precomputed.maxDisplacementX;
                      const maxY = animationData.precomputed.maxDisplacementY;
                      const maxZ = animationData.precomputed.maxDisplacementZ;
                      maxValue = Math.max(Math.abs(maxX), Math.abs(maxY), Math.abs(maxZ));
                      unit = "in";
                    }

                    const displayMax = maxValue * 1.2;

                    // Build color bar based on mode and threshold highlighting
                    let stops: string[];
                    let labels: React.ReactNode;

                    if (thresholdHighlighting) {
                      const thresholdKey = metricToThresholdKey[currentMetric];
                      const thresholdValue = thresholdKey
                        ? ((thresholds as unknown as Record<string, number>)[thresholdKey] ?? 0)
                        : 0;
                      const thresholdRatio = maxValue > 0 ? thresholdValue / maxValue : 0;

                      if (isMagnitude) {
                        // Magnitude with threshold: white -> red only (no blue)
                        stops = [
                          `${white} 0%`,
                          `${red400} ${thresholdRatio * 100}%`,
                          `${red600} ${thresholdRatio * 100 + 0.1}%`,
                          `${red900} 100%`,
                        ];
                        labels = (
                          <>
                            <span>0</span>
                            <span>
                              {thresholdValue.toFixed(2)} {unit}
                            </span>
                            <span>{displayMax.toFixed(2)}</span>
                          </>
                        );
                      } else {
                        // Directional with threshold: blue -> white -> red
                        stops = [
                          `${blue900} 0%`,
                          `${blue600} ${(1 - thresholdRatio) * 50 - 0.1}%`,
                          `${blue400} ${(1 - thresholdRatio) * 50}%`,
                          `${white} 50%`,
                          `${red400} ${thresholdRatio * 50 + 50}%`,
                          `${red600} ${thresholdRatio * 50 + 50.1}%`,
                          `${red900} 100%`,
                        ];
                        labels = (
                          <>
                            <span>0</span>
                            <span>
                              {thresholdValue.toFixed(2)} {unit}
                            </span>
                            <span>{displayMax.toFixed(2)}</span>
                          </>
                        );
                      }
                    } else if (isMagnitude) {
                      // Magnitude without threshold: white -> red
                      stops = [`${white} 0%`, `${red400} 100%`];
                      labels = (
                        <>
                          <span>0</span>
                          <span>
                            {maxValue.toFixed(2)} {unit}
                          </span>
                        </>
                      );
                    } else {
                      // Directional without threshold: blue -> white -> red
                      stops = [`${blue900} 0%`, `${blue600} 24%`, `${white} 50%`, `${red400} 76%`, `${red900} 100%`];
                      labels = (
                        <>
                          <span>-{maxValue.toFixed(2)}</span>
                          <span>0</span>
                          <span>
                            {maxValue.toFixed(2)} {unit}
                          </span>
                        </>
                      );
                    }

                    return (
                      <>
                        <div
                          className="relative h-3 rounded-sm"
                          style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}></div>
                        <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">{labels}</div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Switch size="sm" checked={thresholdHighlighting} onCheckedChange={setThresholdHighlighting} />
                  <span className="text-[10px] text-neutral-500">Highlight exceeding threshold</span>
                </div>
              </motion.div>
              <motion.div
                className="pt-2 border-t border-neutral-200 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.225 }}>
                <div className="flex items-center justify-between mb-1">
                  <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
                    <LayoutGrid size={12} className="text-neutral-500" />
                    Exploded View
                  </Label>
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
                  <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
                    <LayoutGrid size={12} className="text-neutral-500" />
                    Displacement Scale
                  </Label>
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
                  <Label className="flex items-center gap-1 text-xs font-medium text-neutral-700 cursor-pointer">
                    <ScanEye size={12} className="text-neutral-500" />
                    Slice View
                  </Label>
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
                  {/* Displacement Thresholds */}
                  <ThresholdSlider
                    label="Disp"
                    value={thresholds.displacementMag}
                    unit={thresholdUnits.displacementMag}
                    onChange={(v) => setThreshold("displacementMag", v)}
                    max={animationData.precomputed.maxDisplacement * 1.2}
                    tooltip="Displacement magnitude threshold - nodes above this value will be highlighted"
                  />
                  <ThresholdSlider
                    label="Disp X"
                    value={thresholds.displacementX}
                    unit={thresholdUnits.displacementX}
                    onChange={(v) => setThreshold("displacementX", v)}
                    max={animationData.precomputed.maxDisplacement * 1.2}
                    tooltip="Displacement threshold in X direction (horizontal)"
                  />
                  <ThresholdSlider
                    label="Disp Y"
                    value={thresholds.displacementY}
                    unit={thresholdUnits.displacementY}
                    onChange={(v) => setThreshold("displacementY", v)}
                    max={animationData.precomputed.maxDisplacement * 1.2}
                    tooltip="Displacement threshold in Y direction (horizontal)"
                  />
                  <ThresholdSlider
                    label="Disp Z"
                    value={thresholds.displacementZ}
                    unit={thresholdUnits.displacementZ}
                    onChange={(v) => setThreshold("displacementZ", v)}
                    max={animationData.precomputed.maxDisplacement * 1.2}
                    tooltip="Displacement threshold in Z direction (vertical)"
                  />

                  {/* Rotation Thresholds - only show if displacementRot data exists */}
                  {animationData.displacementRot && (
                    <>
                      <ThresholdSlider
                        label="Rot"
                        value={thresholds.rotationMag}
                        unit={thresholdUnits.rotationMag}
                        onChange={(v) => setThreshold("rotationMag", v)}
                        max={0.05}
                        tooltip="Combined rotation magnitude threshold (radians)"
                      />
                      <ThresholdSlider
                        label="Rot X"
                        value={thresholds.rotationX}
                        unit={thresholdUnits.rotationX}
                        onChange={(v) => setThreshold("rotationX", v)}
                        max={0.05}
                        tooltip="Rotation threshold about X axis (radians)"
                      />
                      <ThresholdSlider
                        label="Rot Y"
                        value={thresholds.rotationY}
                        unit={thresholdUnits.rotationY}
                        onChange={(v) => setThreshold("rotationY", v)}
                        max={0.05}
                        tooltip="Rotation threshold about Y axis (radians)"
                      />
                      <ThresholdSlider
                        label="Rot Z"
                        value={thresholds.rotationZ}
                        unit={thresholdUnits.rotationZ}
                        onChange={(v) => setThreshold("rotationZ", v)}
                        max={0.05}
                        tooltip="Rotation threshold about Z axis (radians)"
                      />
                    </>
                  )}

                  {/* Velocity Thresholds - only show if velocityLin data exists */}
                  {animationData.velocityLin && (
                    <>
                      <ThresholdSlider
                        label="Vel"
                        value={thresholds.velocityMag}
                        unit={thresholdUnits.velocityMag}
                        onChange={(v) => setThreshold("velocityMag", v)}
                        max={(animationData.precomputed.maxVelocity ?? 10) * 1.2}
                        tooltip="Velocity magnitude threshold (inches/second)"
                      />
                      <ThresholdSlider
                        label="Vel X"
                        value={thresholds.velocityX}
                        unit={thresholdUnits.velocityX}
                        onChange={(v) => setThreshold("velocityX", v)}
                        max={(animationData.precomputed.maxVelocity ?? 10) * 1.2}
                        tooltip="Velocity threshold in X direction (inches/second)"
                      />
                      <ThresholdSlider
                        label="Vel Y"
                        value={thresholds.velocityY}
                        unit={thresholdUnits.velocityY}
                        onChange={(v) => setThreshold("velocityY", v)}
                        max={(animationData.precomputed.maxVelocity ?? 10) * 1.2}
                        tooltip="Velocity threshold in Y direction (inches/second)"
                      />
                      <ThresholdSlider
                        label="Vel Z"
                        value={thresholds.velocityZ}
                        unit={thresholdUnits.velocityZ}
                        onChange={(v) => setThreshold("velocityZ", v)}
                        max={(animationData.precomputed.maxVelocity ?? 10) * 1.2}
                        tooltip="Velocity threshold in Z direction (inches/second)"
                      />
                    </>
                  )}

                  {/* Rotation Velocity Thresholds - only show if velocityRot data exists */}
                  {animationData.velocityRot && (
                    <>
                      <ThresholdSlider
                        label="RVel"
                        value={thresholds.rotationVelocityMag}
                        unit={thresholdUnits.rotationVelocityMag}
                        onChange={(v) => setThreshold("rotationVelocityMag", v)}
                        max={0.5}
                        tooltip="Angular velocity magnitude threshold (radians/second)"
                      />
                      <ThresholdSlider
                        label="RVel X"
                        value={thresholds.rotationVelocityX}
                        unit={thresholdUnits.rotationVelocityX}
                        onChange={(v) => setThreshold("rotationVelocityX", v)}
                        max={0.5}
                        tooltip="Angular velocity threshold about X axis (radians/second)"
                      />
                      <ThresholdSlider
                        label="RVel Y"
                        value={thresholds.rotationVelocityY}
                        unit={thresholdUnits.rotationVelocityY}
                        onChange={(v) => setThreshold("rotationVelocityY", v)}
                        max={0.5}
                        tooltip="Angular velocity threshold about Y axis (radians/second)"
                      />
                      <ThresholdSlider
                        label="RVel Z"
                        value={thresholds.rotationVelocityZ}
                        unit={thresholdUnits.rotationVelocityZ}
                        onChange={(v) => setThreshold("rotationVelocityZ", v)}
                        max={0.5}
                        tooltip="Angular velocity threshold about Z axis (radians/second)"
                      />
                    </>
                  )}

                  {/* Acceleration Thresholds - only show if accelerationLin data exists */}
                  {animationData.accelerationLin && (
                    <>
                      <ThresholdSlider
                        label="Acc"
                        value={thresholds.accelerationMag}
                        unit={thresholdUnits.accelerationMag}
                        onChange={(v) => setThreshold("accelerationMag", v)}
                        max={(animationData.precomputed.maxAcceleration ?? 20) * 1.2}
                        tooltip="Acceleration magnitude threshold (inches/second²)"
                      />
                      <ThresholdSlider
                        label="Acc X"
                        value={thresholds.accelerationX}
                        unit={thresholdUnits.accelerationX}
                        onChange={(v) => setThreshold("accelerationX", v)}
                        max={(animationData.precomputed.maxAcceleration ?? 20) * 1.2}
                        tooltip="Acceleration threshold in X direction (inches/second²)"
                      />
                      <ThresholdSlider
                        label="Acc Y"
                        value={thresholds.accelerationY}
                        unit={thresholdUnits.accelerationY}
                        onChange={(v) => setThreshold("accelerationY", v)}
                        max={(animationData.precomputed.maxAcceleration ?? 20) * 1.2}
                        tooltip="Acceleration threshold in Y direction (inches/second²)"
                      />
                      <ThresholdSlider
                        label="Acc Z"
                        value={thresholds.accelerationZ}
                        unit={thresholdUnits.accelerationZ}
                        onChange={(v) => setThreshold("accelerationZ", v)}
                        max={(animationData.precomputed.maxAcceleration ?? 20) * 1.2}
                        tooltip="Acceleration threshold in Z direction (inches/second²)"
                      />
                    </>
                  )}

                  {/* Rotation Acceleration Thresholds - only show if accelerationRot data exists */}
                  {animationData.accelerationRot && (
                    <>
                      <ThresholdSlider
                        label="RAcc"
                        value={thresholds.rotationAccelerationMag}
                        unit={thresholdUnits.rotationAccelerationMag}
                        onChange={(v) => setThreshold("rotationAccelerationMag", v)}
                        max={2}
                        tooltip="Angular acceleration magnitude threshold (radians/second²)"
                      />
                      <ThresholdSlider
                        label="RAcc X"
                        value={thresholds.rotationAccelerationX}
                        unit={thresholdUnits.rotationAccelerationX}
                        onChange={(v) => setThreshold("rotationAccelerationX", v)}
                        max={2}
                        tooltip="Angular acceleration threshold about X axis (radians/second²)"
                      />
                      <ThresholdSlider
                        label="RAcc Y"
                        value={thresholds.rotationAccelerationY}
                        unit={thresholdUnits.rotationAccelerationY}
                        onChange={(v) => setThreshold("rotationAccelerationY", v)}
                        max={2}
                        tooltip="Angular acceleration threshold about Y axis (radians/second²)"
                      />
                      <ThresholdSlider
                        label="RAcc Z"
                        value={thresholds.rotationAccelerationZ}
                        unit={thresholdUnits.rotationAccelerationZ}
                        onChange={(v) => setThreshold("rotationAccelerationZ", v)}
                        max={2}
                        tooltip="Angular acceleration threshold about Z axis (radians/second²)"
                      />
                    </>
                  )}

                  {/* Interstory Drift Thresholds */}
                  <ThresholdSlider
                    label="ISD Peak"
                    value={thresholds.interstoryDrift}
                    unit={thresholdUnits.interstoryDrift}
                    onChange={(v) => setThreshold("interstoryDrift", v)}
                    max={5}
                    tooltip="Peak interstory drift ratio threshold - floors exceeding this % will be highlighted"
                  />
                  <ThresholdSlider
                    label="ISD Avg"
                    value={thresholds.interstoryDriftAvg}
                    unit={thresholdUnits.interstoryDriftAvg}
                    onChange={(v) => setThreshold("interstoryDriftAvg", v)}
                    max={5}
                    tooltip="Average interstory drift ratio threshold across all floors (%)"
                  />
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
