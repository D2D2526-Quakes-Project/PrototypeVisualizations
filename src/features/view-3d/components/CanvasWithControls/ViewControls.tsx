import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";

import {
  BoxSelect,
  ChevronDown,
  ChevronLeftIcon,
  Eye,
  EyeOff,
  Grid3X3,
  Home,
  RotateCcw,
  ScanEye,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useColor,
  useExpandedScale,
  useFloorVisibility,
  useSliceSelection,
  useThresholds,
  useViewMode,
} from "@/features/view-3d/contexts/visualization";
import { useAnimationData } from "@/lib/useAnimationData";
import { getMetricConfig } from "@/lib/metrics";
import { UNIT_SCALE } from "@/lib/utils";
import { useViewStore } from "@/state";

import { ColorScaleBar } from "./ColorScaleBar";
import { ColorPanel } from "./control-panels/ColorPanel";
import { ExpandedScalePanel } from "./control-panels/ExpandedScalePanel";
import { SliceViewPanel } from "./control-panels/SliceViewPanel";
import { FloorsPanel, ThresholdPanel } from "./control-panels/ThresholdPanel";
import { ViewModeSelect } from "./control-panels/ViewModeSelect";
import { ViewsPanel } from "./control-panels/ViewsPanel";

import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface ViewControlsProps {
  orbitControlsRef: RefObject<OrbitControlsImpl | null>;
  isOrthographic: boolean;
  setIsOrthographic: (value: boolean) => void;
  enableSmoothing: boolean;
  setEnableSmoothing: (value: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onExpandedWidthChange: (width: number) => void;
  docked: boolean;
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
}: ViewControlsProps) {
  const { animationData } = useAnimationData();
  const { currentMetric, setColorMetric, availableMetrics, thresholdHighlighting, setThresholdHighlighting } =
    useColor();
  const { mode, setMode } = useViewMode();
  const {
    state: expandedScaleState,
    toggleExpansion,
    toggleDisplacement,
    setExpansion,
    setDisplacementScale,
  } = useExpandedScale();
  const { sliceEnabled, xRange, yRange, zRange, toggleSliceEnabled, setXRange, setYRange, setZRange } =
    useSliceSelection();
  const { thresholds, setThreshold } = useThresholds();
  const { visibleFloors, toggleFloor, showAllFloors, hideAllFloors } = useFloorVisibility();

  const selectedNodeIds = useViewStore((s) => s.selectedNodeIds);
  const hiddenNodeIds = useViewStore((s) => s.hiddenNodeIds);
  const clearSelection = useViewStore((s) => s.clearSelection);
  const hideNodes = useViewStore((s) => s.hideNodes);
  const showNodes = useViewStore((s) => s.showNodes);
  const showAllNodes = useViewStore((s) => s.showAllNodes);
  const backgroundColor = useViewStore((s) => s.backgroundColor);
  const setBackgroundColor = useViewStore((s) => s.setBackgroundColor);

  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
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

  const resetHomeView = () => {
    if (!orbitControlsRef?.current) return;
    const controls = orbitControlsRef.current;
    const camera = controls.object;
    controls.target.set(0, 0, buildingVerticalCenter);
    camera.position.set(cameraDistance, cameraDistance, buildingVerticalCenter + cameraDistance);
    controls.update();
  };

  const toggleCameraType = useCallback(() => {
    setIsOrthographic(!isOrthographic);
  }, [isOrthographic, setIsOrthographic]);

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

  const selectedIds = selectedNodeIds;
  const selectedCount = selectedIds.length;
  const hiddenCount = hiddenNodeIds.length;
  const hiddenNodeIdSet = useMemo(() => new Set(hiddenNodeIds), [hiddenNodeIds]);
  const hiddenSelectedCount = useMemo(
    () => selectedIds.filter((nodeId) => hiddenNodeIdSet.has(nodeId)).length,
    [hiddenNodeIdSet, selectedIds],
  );
  const visibleSelectedCount = selectedCount - hiddenSelectedCount;
  const showNodeVisibilityMenu = selectedCount > 0 || hiddenCount > 0;

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName;
      return (
        target.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target.getAttribute("role") === "textbox"
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "m") {
        e.preventDefault();
        setIsExpanded(!isExpanded);
        return;
      }
      if (key === "o") {
        e.preventDefault();
        toggleCameraType();
        return;
      }
      if (key === "h" && visibleSelectedCount > 0) {
        e.preventDefault();
        hideNodes(selectedIds);
        return;
      }
      if (key === "u" && hiddenCount > 0) {
        e.preventDefault();
        showAllNodes();
        return;
      }
      if (key === "x" && selectedCount > 0) {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearSelection,
    hiddenCount,
    hideNodes,
    isExpanded,
    selectedCount,
    selectedIds,
    setIsExpanded,
    showAllNodes,
    toggleCameraType,
    visibleSelectedCount,
  ]);

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
      className={`absolute flex z-[60] ${docked ? "top-0 right-0 bottom-0" : "top-2 right-2 max-h-[calc(100%-1rem)]"}`}>
      <div className={`flex flex-col max-h-full overflow-hidden ${docked ? "items-stretch" : "items-end gap-0.5"}`}>
        <AnimatePresence mode="popLayout">
          {!isExpanded ? (
            <div className="flex flex-col gap-0.5 items-end">
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
                      onClick={resetHomeView}
                      className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700"
                      title="Home View">
                      <Home size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Home View
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
            </div>
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
                <motion.div className="mb-2 w-full" variants={childVariants}>
                  <ViewsPanel resetView={resetView} />
                </motion.div>
                <motion.div className="mb-2 w-full" variants={childVariants}>
                  <button
                    onClick={resetHomeView}
                    className="w-full inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200">
                    <Home size={12} />
                    Home View
                  </button>
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
                <motion.div className="flex items-center justify-between pt-1 border-t border-neutral-200" variants={childVariants}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-700">Ortho</span>
                    <Switch size="sm" checked={isOrthographic} onCheckedChange={setIsOrthographic} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-700">Smooth</span>
                    <Switch size="sm" checked={enableSmoothing} onCheckedChange={setEnableSmoothing} />
                  </div>
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
                  <ExpandedScalePanel
                    expansionEnabled={expandedScaleState.expansionEnabled}
                    displacementEnabled={expandedScaleState.displacementEnabled}
                    xExpansion={expandedScaleState.xExpansion}
                    yExpansion={expandedScaleState.yExpansion}
                    zExpansion={expandedScaleState.zExpansion}
                    xzDisplacementScale={expandedScaleState.xzDisplacementScale}
                    zDisplacementScale={expandedScaleState.zDisplacementScale}
                    toggleExpansion={toggleExpansion}
                    toggleDisplacement={toggleDisplacement}
                    setExpansion={setExpansion}
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
