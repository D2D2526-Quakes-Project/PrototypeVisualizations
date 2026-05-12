import { useEffect, useMemo, useRef } from "react";

import { ChevronRightIcon, EyeIcon, EyeOffIcon, RotateCwIcon, SwatchBookIcon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isEditableTarget } from "@/lib/utils";
import { useGlobalStore, useLiveStore, useProfileStore } from "@/state";
import { DEFAULT_COLOR_THEMES } from "@/state/globalState";
import { useCanvasState } from "../3d/contexts/CanvasContext";
import { QuickControls } from "./components/QuickControls";
import { FloorVisibilitySection } from "./control-sections/FloorVisibilitySection";
import { MetricSelectSection } from "./control-sections/MetricSelectSection";
import { NodeDisplaySection } from "./control-sections/NodeDisplaySection";
import { ScaleSection } from "./control-sections/ScaleSection";
import { SlicesSection } from "./control-sections/SlicesSection";
import { ThresholdSection } from "./control-sections/ThresholdSection";
import { ViewsPanel } from "./control-sections/ViewsPanel";
import { ViewToggleSection } from "./control-sections/ViewToggleSection";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { resetView, resetHomeView, orthographic, setOrthographic } = useCanvasState();
  const autoRotate = useLiveStore((s) => s.autoRotate);
  const setAutoRotate = useLiveStore((s) => s.setAutoRotate);
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  const setColorTheme = useGlobalStore((s) => s.setColorTheme);
  const clearSelection = useLiveStore((s) => s.clearSelection);
  const expandedLayoutRef = useRef<HTMLDivElement>(null);

  const selectedNodeIds = useLiveStore((s) => s.selectedNodeIds);
  const hiddenNodeIds = useProfileStore((s) => s._hiddenNodeIds);
  const showAllNodes = useProfileStore((s) => s.showAllNodes);
  const hideNodes = useProfileStore((s) => s.hideNodes);
  const showNodes = useProfileStore((s) => s.showNodes);

  const selectedCount = selectedNodeIds.length;
  const hiddenCount = hiddenNodeIds.length;
  const hiddenSelectedCount = useMemo(
    () => selectedNodeIds.filter((nodeId) => hiddenNodeIds.includes(nodeId)).length,
    [hiddenNodeIds, selectedNodeIds]
  );
  const visibleSelectedCount = selectedCount - hiddenSelectedCount;
  const showNodeVisibilityMenu = selectedCount > 0 || hiddenCount > 0;

  useEffect(() => {
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
      if (key === "x") {
        e.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded, setIsExpanded, setOrthographic, orthographic, clearSelection]);

  return (
    <div className={`pointer-events-none z-60 w-fit ${docked ? "h-full" : "absolute top-2 right-2 bottom-2"}`}>
      <div className="flex h-full max-h-full min-h-0 items-start gap-2">
        {!isExpanded && (
          <div className={`pointer-events-auto relative flex flex-col items-end gap-2`}>
            <QuickControls isExpanded={isExpanded} setIsExpanded={setIsExpanded} />

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
                      onClick={() => hideNodes(selectedNodeIds)}
                      disabled={visibleSelectedCount === 0}
                      className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                      <EyeOffIcon size={14} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    Hide Selected ({selectedCount})
                  </TooltipContent>
                </Tooltip>
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => showNodes(selectedNodeIds)}
                      disabled={hiddenSelectedCount === 0}
                      className="rounded p-1 text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                      <EyeIcon size={14} />
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
                      <RotateCwIcon size={14} />
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
                      <XCircleIcon size={14} />
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
              className={`border-sidebar-border pointer-events-auto flex max-h-full min-h-0 min-w-40 flex-col gap-2 pt-2 ${
                docked
                  ? "bg-sidebar h-full origin-top-right border-l"
                  : "bg-sidebar/90 origin-top-right rounded-md border shadow-lg backdrop-blur-sm"
              }`}>
              <div className="flex items-center justify-between px-2">
                <div className="font-semibold">View Settings</div>
                <Button variant="ghost" onClick={() => setIsExpanded(false)} title="Collapse" size="icon-sm">
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="flex min-h-0 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 pb-2 *:shrink-0">
                <motion.div className="" variants={childVariants}>
                  <ViewsPanel resetView={resetView} resetHomeView={resetHomeView} />
                </motion.div>
                {showNodeVisibilityMenu && (
                  <div className="border-t border-neutral-200 pt-1">
                    <div className="mb-1 text-xs font-medium text-neutral-700">Selection</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => hideNodes(selectedNodeIds)}
                        disabled={visibleSelectedCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                        <EyeOffIcon size={10} />
                        Hide ({visibleSelectedCount})
                      </button>
                      <button
                        onClick={showAllNodes}
                        disabled={hiddenCount === 0}
                        className="inline-flex items-center justify-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-[10px] text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-30">
                        <RotateCwIcon size={10} />
                        Show All ({hiddenCount})
                      </button>
                    </div>
                    <button
                      onClick={clearSelection}
                      disabled={selectedCount === 0}
                      className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-1 text-[10px] text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30">
                      <XCircleIcon size={10} />
                      Clear Selection ({selectedCount})
                    </button>
                  </div>
                )}
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
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <ThresholdSection />
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <SlicesSection />
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <ScaleSection />
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <NodeDisplaySection />
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <div className="mb-1 flex items-center gap-1">
                    <SwatchBookIcon size={12} className="text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-700">Theme</span>
                  </div>
                  <div className="flex gap-1 px-1">
                    {DEFAULT_COLOR_THEMES.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setColorTheme(preset)}
                        className={`h-6 w-full rounded border-2 transition-all ${
                          colorTheme.background === preset.background
                            ? "scale-110 border-black"
                            : "border-neutral-300 hover:border-neutral-400"
                        }`}
                        style={{ backgroundColor: preset.background }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </motion.div>
                <div className="my-1 h-px w-full bg-neutral-200" />
                <motion.div className="" variants={childVariants}>
                  <FloorVisibilitySection />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
