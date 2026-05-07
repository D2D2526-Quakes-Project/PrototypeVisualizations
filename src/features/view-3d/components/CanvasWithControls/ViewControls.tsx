import { useEffect, useMemo, useRef } from "react";

import {
  BoxSelect,
  ChevronDown,
  ChevronLeftIcon,
  Eye,
  EyeOff,
  Grid3X3,
  Home,
  RotateCw,
  ScanEye,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";

import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnimationData } from "@/lib/useAnimationData";
import { UNIT_SCALE } from "@/lib/utils";
import { useViewStore } from "@/state";
import { DEFAULT_COLOR_THEMES } from "@/state/profileState";
import { useCamera } from "../../contexts/CameraContext";
import { ColorPanel } from "./control-panels/ColorPanel";
import { ExpandedScalePanel } from "./control-panels/ExpandedScalePanel";
import { NodeDisplayPanel } from "./control-panels/NodeDisplayPanel";
import { SliceViewPanel } from "./control-panels/SliceViewPanel";
import { FloorsPanel, ThresholdPanel } from "./control-panels/ThresholdPanel";
import { ViewModeSelect } from "./control-panels/ViewModeSelect";
import { ViewsPanel } from "./control-panels/ViewsPanel";
import { COLLAPSED_VIEW_PRESET_OPTIONS, type ViewPresetMode } from "./viewPresets";

export function ViewControls({
  isExpanded,
  setIsExpanded,
  docked,
}: {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  docked: boolean;
}) {
  const { orbitControlsRef, orthographic, setOrthographic } = useCamera();
  const autoRotate = useViewStore((s) => s.autoRotate);
  const setAutoRotate = useViewStore((s) => s.setAutoRotate);

  const { animationData } = useAnimationData();

  // const [isExpanded, setIsExpanded] = useState(true);
  // const [docked, setDocked] = useState(true);

  const selectedNodeIds = useViewStore((s) => s.selectedNodeIds);
  const hiddenNodeIds = useViewStore((s) => s.hiddenNodeIds);
  const clearSelection = useViewStore((s) => s.clearSelection);
  const hideNodes = useViewStore((s) => s.hideNodes);
  const showNodes = useViewStore((s) => s.showNodes);
  const showAllNodes = useViewStore((s) => s.showAllNodes);
  const colorTheme = useViewStore((s) => s.colorTheme);
  const setColorTheme = useViewStore((s) => s.setColorTheme);

  const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  const buildingVerticalCenter =
    (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
  const expandedLayoutRef = useRef<HTMLDivElement>(null);

  const resetView = (viewType: ViewPresetMode) => {
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
          frontRight: [target.x + cameraDistance, target.y + cameraDistance, target.z],
          frontLeft: [target.x - cameraDistance, target.y + cameraDistance, target.z],
          backRight: [target.x + cameraDistance, target.y - cameraDistance, target.z],
          backLeft: [target.x - cameraDistance, target.y - cameraDistance, target.z],
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
    camera.position.set(-cameraDistance, -cameraDistance, buildingVerticalCenter + cameraDistance);
    controls.update();
  };

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
    [hiddenNodeIdSet, selectedIds]
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
        setOrthographic(!orthographic);
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
    visibleSelectedCount,
    setOrthographic,
    orthographic,
  ]);

  return (
    <div className={`pointer-events-none z-60 w-fit ${docked ? "h-full" : "absolute top-2 right-2 bottom-2"}`}>
      <div className="flex h-full max-h-full min-h-0 items-start gap-2">
        {!isExpanded && (
          <div className={`pointer-events-auto relative flex flex-col items-end gap-2`}>
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="flex origin-right items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-lg backdrop-blur-sm select-none">
              {COLLAPSED_VIEW_PRESET_OPTIONS.map(({ view, label }) => (
                <Tooltip key={view} disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => resetView(view)}
                      className="flex min-w-6 items-center justify-center rounded px-1 py-1 text-[10px] font-medium text-neutral-700 transition-colors select-none hover:bg-neutral-200">
                      {label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    {label} View
                  </TooltipContent>
                </Tooltip>
              ))}
              <div className="mx-0.5 h-4 w-px bg-neutral-300" />
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setOrthographic(!orthographic)}
                    className={`rounded p-1 transition-colors ${
                      orthographic ? "bg-blue-100 text-blue-700" : "text-neutral-700 hover:bg-neutral-200"
                    }`}>
                    {orthographic ? <BoxSelect size={14} /> : <ScanEye size={14} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {orthographic ? "Orthographic" : "Perspective"}
                </TooltipContent>
              </Tooltip>
              <div className="mx-0.5 h-4 w-px bg-neutral-300" />
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={resetHomeView}
                    className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200"
                    title="Home View">
                    <Home size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Home View
                </TooltipContent>
              </Tooltip>
              <div className="mx-0.5 h-4 w-px bg-neutral-300" />
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`rounded p-1 transition-colors ${
                      autoRotate ? "bg-blue-100 text-blue-700" : "text-neutral-700 hover:bg-neutral-200"
                    }`}
                    title="Auto Rotate">
                    <RotateCw size={14} className={autoRotate ? "animate-spin" : undefined} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  Auto Rotate
                </TooltipContent>
              </Tooltip>
              <div className="mx-0.5 h-4 w-px bg-neutral-300" />
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200">
                    <ChevronLeftIcon size={14} className={isExpanded ? "rotate-180" : undefined} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  {isExpanded ? "Hide sidebar" : "More options"}
                </TooltipContent>
              </Tooltip>
            </motion.div>

            {showNodeVisibilityMenu && (
              <motion.div
                key="node-visibility-menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-lg backdrop-blur-sm select-none">
                {visibleSelectedCount > 0 && (
                  <>
                    <span className="font-mono text-[10px]">
                      {visibleSelectedCount} <span className="font-normal">Selected</span>
                    </span>
                    <div className="mx-0.5 inline-block h-4 w-px bg-neutral-300" />
                  </>
                )}
                {hiddenCount > 0 && (
                  <>
                    <span className="font-mono text-[10px]">
                      {hiddenCount} <span className="font-normal">Hidden</span>
                    </span>
                    <div className="mx-0.5 inline-block h-4 w-px bg-neutral-300" />
                  </>
                )}
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => hideNodes(selectedIds)}
                      disabled={visibleSelectedCount === 0}
                      className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
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
                      type="button"
                      onClick={() => showNodes(selectedIds)}
                      disabled={hiddenSelectedCount === 0}
                      className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
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
                      type="button"
                      onClick={showAllNodes}
                      disabled={hiddenCount === 0}
                      className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                      <RotateCw size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Show All Nodes ({hiddenCount})
                  </TooltipContent>
                </Tooltip>
                <div className="mx-0.5 h-4 w-px bg-neutral-300" />
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                      className="rounded p-1 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30">
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
        )}

        <AnimatePresence mode="popLayout">
          {isExpanded && (
            <motion.div
              ref={expandedLayoutRef}
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
              className={`pointer-events-auto flex max-h-full min-h-0 min-w-40 flex-col overflow-hidden p-2 pr-0 pb-0 ${
                docked
                  ? "h-full origin-top-right border-l border-neutral-200 bg-white"
                  : "origin-top-right rounded-lg border border-neutral-200 bg-white/90 shadow-lg backdrop-blur-sm"
              }`}>
              <div className="mb-2 flex items-center justify-between pr-2">
                <div className="text-xs font-semibold text-neutral-700">Views</div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200"
                  title="Collapse">
                  <ChevronDown size={14} className="rotate-180" />
                </button>
              </div>
              <div className="min-h-0 overflow-y-auto pr-1">
                <motion.div className="mb-2 w-full" variants={childVariants}>
                  <ViewsPanel resetView={resetView} resetHomeView={resetHomeView} />
                </motion.div>
                {showNodeVisibilityMenu && (
                  <div className="border-t border-neutral-200 pt-1">
                    <div className="mb-1 text-xs font-medium text-neutral-700">Selection</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => hideNodes(selectedIds)}
                        disabled={visibleSelectedCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                        <EyeOff size={10} />
                        Hide ({visibleSelectedCount})
                      </button>
                      <button
                        onClick={showAllNodes}
                        disabled={hiddenCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                        <RotateCw size={10} />
                        Show All ({hiddenCount})
                      </button>
                    </div>
                    <button
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                      className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-1 text-[10px] text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30">
                      <XCircle size={10} />
                      Clear Selection ({selectedCount})
                    </button>
                  </div>
                )}
                <motion.div
                  className="flex items-center justify-between border-t border-neutral-200 pt-1"
                  variants={childVariants}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-700">Ortho</span>
                    <Switch size="sm" checked={orthographic} onCheckedChange={setOrthographic} />
                    <div className="mx-0.5 h-4 w-px bg-neutral-300" />
                    <span className="text-xs font-medium text-neutral-700">Spin</span>
                    <Switch size="sm" checked={autoRotate} onCheckedChange={setAutoRotate} />
                  </div>
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <div className="mb-1 flex items-center gap-1">
                    <Grid3X3 size={12} className="text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-700">Visibility</span>
                  </div>
                  <ViewModeSelect />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <ColorPanel />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <ThresholdPanel />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <SliceViewPanel />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <ExpandedScalePanel />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <NodeDisplayPanel />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 px-0 pt-2" variants={childVariants}>
                  <div className="mb-1 flex items-center gap-1">
                    <span className="text-xs font-medium text-neutral-700">Background</span>
                  </div>
                  <div className="flex gap-1 px-1">
                    {DEFAULT_COLOR_THEMES.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setColorTheme(preset)}
                        className={`h-6 w-6 rounded border-2 transition-all ${
                          colorTheme.background === preset.background
                            ? "scale-110 border-blue-500"
                            : "border-neutral-300 hover:border-neutral-400"
                        }`}
                        style={{ backgroundColor: preset.background }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <FloorsPanel />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
