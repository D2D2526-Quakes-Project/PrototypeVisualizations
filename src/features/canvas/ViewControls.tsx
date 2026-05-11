import { useRef } from "react";

import { ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useLiveStore } from "@/state";
import { useCamera } from "../3d/contexts/CanvasContext";
import { QuickControls } from "./components/QuickControls";
import { MetricSelectSection } from "./control-sections/MetricSelectSection";
import { ThresholdSection } from "./control-sections/ThresholdSection";
import { ViewsPanel } from "./control-sections/ViewsPanel";
import { ViewToggleSection } from "./control-sections/ViewToggleSection";
import { SlicesSection } from "./control-sections/SlicesSection";

const childVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export function ViewControls({
  isExpanded,
  setIsExpanded,
  docked,
}: {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  docked: boolean;
}) {
  const { resetView, resetHomeView, orthographic, setOrthographic } = useCamera();
  const autoRotate = useLiveStore((s) => s.autoRotate);
  const setAutoRotate = useLiveStore((s) => s.setAutoRotate);

  const { animationData } = useAnimationData();

  // const selectedNodeIds = useViewStore((s) => s.selectedNodeIds);
  // const hiddenNodeIds = useViewStore((s) => s.hiddenNodeIds);
  // const clearSelection = useViewStore((s) => s.clearSelection);
  // const hideNodes = useViewStore((s) => s.hideNodes);
  // const showNodes = useViewStore((s) => s.showNodes);
  // const showAllNodes = useViewStore((s) => s.showAllNodes);
  // const colorTheme = useViewStore((s) => s.colorTheme);
  // const setColorTheme = useViewStore((s) => s.setColorTheme);

  // const cameraDistance = animationData.precomputed.boundingBox.radius * 2.5 * UNIT_SCALE;
  // const buildingVerticalCenter =
  //   (animationData.precomputed.boundingBox.center[2] - animationData.precomputed.boundingBox.min[2]) * UNIT_SCALE;
  const expandedLayoutRef = useRef<HTMLDivElement>(null);

  // const selectedIds = selectedNodeIds;
  // const selectedCount = selectedIds.length;
  // const hiddenCount = hiddenNodeIds.length;
  // const hiddenNodeIdSet = useMemo(() => new Set(hiddenNodeIds), [hiddenNodeIds]);
  // const hiddenSelectedCount = useMemo(
  //   () => selectedIds.filter((nodeId) => hiddenNodeIdSet.has(nodeId)).length,
  //   [hiddenNodeIdSet, selectedIds]
  // );
  // const visibleSelectedCount = selectedCount - hiddenSelectedCount;
  // const showNodeVisibilityMenu = selectedCount > 0 || hiddenCount > 0;

  // useEffect(() => {
  //   const isEditableTarget = (target: EventTarget | null): boolean => {
  //     if (!(target instanceof HTMLElement)) return false;
  //     const tagName = target.tagName;
  //     return (
  //       target.isContentEditable ||
  //       tagName === "INPUT" ||
  //       tagName === "TEXTAREA" ||
  //       tagName === "SELECT" ||
  //       target.getAttribute("role") === "textbox"
  //     );
  //   };

  //   const onKeyDown = (e: KeyboardEvent) => {
  //     if (isEditableTarget(e.target)) return;
  //     if (e.ctrlKey || e.metaKey || e.altKey) return;

  //     const key = e.key.toLowerCase();
  //     if (key === "m") {
  //       e.preventDefault();
  //       setIsExpanded(!isExpanded);
  //       return;
  //     }
  //     if (key === "o") {
  //       e.preventDefault();
  //       setOrthographic(!orthographic);
  //       return;
  //     }
  //     if (key === "h" && visibleSelectedCount > 0) {
  //       e.preventDefault();
  //       hideNodes(selectedIds);
  //       return;
  //     }
  //     if (key === "u" && hiddenCount > 0) {
  //       e.preventDefault();
  //       showAllNodes();
  //       return;
  //     }
  //     if (key === "x" && selectedCount > 0) {
  //       e.preventDefault();
  //       clearSelection();
  //     }
  //   };

  //   window.addEventListener("keydown", onKeyDown);
  //   return () => window.removeEventListener("keydown", onKeyDown);
  // }, [
  //   clearSelection,
  //   hiddenCount,
  //   hideNodes,
  //   isExpanded,
  //   selectedCount,
  //   selectedIds,
  //   setIsExpanded,
  //   showAllNodes,
  //   visibleSelectedCount,
  //   setOrthographic,
  //   orthographic,
  // ]);

  return (
    <div className={`pointer-events-none z-60 w-fit ${docked ? "h-full" : "absolute top-2 right-2 bottom-2"}`}>
      <div className="flex h-full max-h-full min-h-0 items-start gap-2">
        {!isExpanded && (
          <div className={`pointer-events-auto relative flex flex-col items-end gap-2`}>
            <QuickControls isExpanded={isExpanded} setIsExpanded={setIsExpanded} />

            {/* {showNodeVisibilityMenu && (
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
            )} */}
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
              className={`border-sidebar-border pointer-events-auto flex max-h-full min-h-0 min-w-40 flex-col gap-2 overflow-hidden pt-2 pl-2 ${
                docked
                  ? "bg-sidebar h-full origin-top-right border-l"
                  : "bg-sidebar/90 origin-top-right rounded-md border shadow-lg backdrop-blur-sm"
              }`}>
              <div className="flex items-center justify-between pr-2">
                <div className="font-semibold">View Settings</div>
                <Button variant="ghost" onClick={() => setIsExpanded(false)} title="Collapse" size="icon-sm">
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="items-st flex min-h-0 flex-col gap-1 overflow-x-hidden overflow-y-auto pr-2 pb-2">
                <motion.div className="" variants={childVariants}>
                  <ViewsPanel resetView={resetView} resetHomeView={resetHomeView} />
                </motion.div>
                {/* {showNodeVisibilityMenu && (
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
                )} */}
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="flex items-center gap-2" variants={childVariants}>
                  <Label className="flex-1 text-xs font-medium text-neutral-700">
                    Orthographic
                    <Switch checked={orthographic} onCheckedChange={setOrthographic} />
                  </Label>
                  <div className="mx-0.5 h-4 w-px bg-neutral-300" />
                  <Label className="flex-1 text-xs font-medium text-neutral-700">
                    Spin
                    <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
                  </Label>
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <ViewToggleSection />
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <MetricSelectSection />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <ThresholdSection />
                </motion.div>
                <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <SlicesSection />
                </motion.div>
                {/* <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <ExpandedScalePanel />
                </motion.div> */}
                {/* <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <NodeDisplayPanel />
                </motion.div> */}
                {/* <motion.div className="mt-2 border-t border-neutral-200 px-0 pt-2" variants={childVariants}>
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
                </motion.div> */}
                {/* <motion.div className="mt-2 border-t border-neutral-200 pt-2" variants={childVariants}>
                  <FloorsPanel />
                </motion.div> */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
