import { forwardRef, useEffect, useMemo, useRef } from "react";

import {
  ChevronRightIcon,
  EyeOffIcon,
  RotateCwIcon,
  SettingsIcon,
  SquareDashedMousePointerIcon,
  SwatchBookIcon,
  XCircleIcon,
} from "lucide-react";
import { AnimatePresence, motion, stagger } from "motion/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isEditableTarget } from "@/lib/utils";
import { useGlobalStore, useLiveStore, useProfileActions, useProfileData } from "@/state";
import { DEFAULT_COLOR_THEMES } from "@/state/globalState";
import { useCanvasState } from "../3d/contexts/CanvasContext";
import { FloorVisibilitySection } from "./control-sections/FloorVisibilitySection";
import { MetricSelectSection } from "./control-sections/MetricSelectSection";
import { NodeDisplaySection } from "./control-sections/NodeDisplaySection";
import { ScaleSection } from "./control-sections/ScaleSection";
import { SlicesSection } from "./control-sections/SlicesSection";
import { ThresholdSection } from "./control-sections/ThresholdSection";
import { ViewsPanel } from "./control-sections/ViewsPanel";
import { ViewToggleSection } from "./control-sections/ViewToggleSection";

const childVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const ViewControls = forwardRef<
  HTMLDivElement,
  {
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
    docked: boolean;
    showCanvasSpecificControls?: boolean;
  }
>(function ViewControls({ isExpanded, setIsExpanded, docked, showCanvasSpecificControls = true }, ref) {
  const { resetView, resetHomeView, orthographic, setOrthographic, spin, setSpin, isHoveringPanel, isPrimaryPanel } =
    useCanvasState();
  const colorTheme = useGlobalStore((s) => s.colorTheme);
  const setColorTheme = useGlobalStore((s) => s.setColorTheme);
  const clearSelection = useLiveStore((s) => s.clearSelection);
  const expandedLayoutRef = useRef<HTMLDivElement>(null);

  const selectedNodeIds = useLiveStore((s) => s.selectedNodeIds);
  const hiddenNodeIds = useProfileData((s) => s._hiddenNodeIds);
  const { showAllNodes, hideNodes } = useProfileActions();

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
    <div
      ref={ref}
      className={`pointer-events-none z-5 w-fit flex-[0_0] ${docked ? "h-full" : "absolute top-1 right-1 bottom-1"}`}>
      <AnimatePresence mode="popLayout">
        {!isExpanded && (isHoveringPanel || isPrimaryPanel) && (
          <motion.button
            key="view-controls-button"
            initial={{ opacity: 0, scale: 0.9, x: 4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 4 }}
            transition={{ duration: 0.15 }}
            className="group border-border bg-background pointer-events-auto absolute -right-1 flex origin-right items-center rounded-l-lg border border-r-0 p-1 shadow-lg select-none"
            onClick={() => setIsExpanded(true)}>
            <div className="text-foreground group-hover:bg-accent flex min-w-6 items-center justify-center rounded px-1 py-1 text-[10px] font-medium transition-colors select-none">
              <SettingsIcon size={14} />
            </div>
          </motion.button>
        )}

        {isExpanded && (
          <motion.div className="flex h-full max-h-full min-h-0 items-start gap-2">
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
              className={`border-sidebar-border bg-sidebar pointer-events-auto flex max-h-full min-h-0 min-w-40 flex-col gap-2 pt-2 ${
                docked ? "h-full origin-top-right border-l" : "origin-top-right rounded-md border shadow-lg"
              }`}>
              <div className="flex items-center justify-between px-2">
                <div className="font-semibold">View Settings</div>
                <Button variant="ghost" onClick={() => setIsExpanded(false)} title="Collapse" size="icon-sm">
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="flex min-h-0 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 pb-2 *:shrink-0">
                {showCanvasSpecificControls && (
                  <motion.div className="" variants={childVariants}>
                    <ViewsPanel resetView={resetView} resetHomeView={resetHomeView} />
                  </motion.div>
                )}
                {showNodeVisibilityMenu && (
                  <>
                    <div className="bg-border my-1 h-px w-full" />
                    <motion.div className="" variants={childVariants}>
                      <div className="mb-1 flex items-center gap-1">
                        <SquareDashedMousePointerIcon size={12} className="text-muted-foreground" />
                        <span className="text-foreground text-xs font-medium">Selected Nodes</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Button
                          variant={"outline"}
                          size="xs"
                          onClick={() => hideNodes(selectedNodeIds)}
                          disabled={visibleSelectedCount === 0}>
                          <EyeOffIcon size={10} />
                          Hide ({visibleSelectedCount})
                        </Button>
                        <Button variant={"outline"} size="xs" onClick={showAllNodes} disabled={hiddenCount === 0}>
                          <RotateCwIcon size={10} />
                          Show All ({hiddenCount})
                        </Button>

                        <Button
                          variant={"destructive"}
                          size="xs"
                          onClick={clearSelection}
                          disabled={selectedCount === 0}
                          className="col-span-2">
                          <XCircleIcon size={10} />
                          Clear Selection ({selectedCount})
                        </Button>
                      </div>
                    </motion.div>
                  </>
                )}

                {showCanvasSpecificControls && (
                  <>
                    <div className="bg-border my-1 h-px w-full" />
                    <motion.div className="flex items-center gap-2" variants={childVariants}>
                      <Label className="text-foreground flex-1 text-xs font-medium">
                        Orthographic
                        <Switch checked={orthographic} onCheckedChange={setOrthographic} />
                      </Label>
                      <div className="bg-border mx-0.5 h-4 w-px" />
                      <Label className="text-foreground flex-1 text-xs font-medium">
                        Spin
                        <Switch checked={spin} onCheckedChange={setSpin} />
                      </Label>
                    </motion.div>
                  </>
                )}
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <ViewToggleSection />
                </motion.div>
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <MetricSelectSection />
                </motion.div>
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <ThresholdSection />
                </motion.div>
                {showCanvasSpecificControls && <div className="bg-border my-1 h-px w-full" />}
                {showCanvasSpecificControls && (
                  <motion.div className="" variants={childVariants}>
                    <SlicesSection />
                  </motion.div>
                )}
                {showCanvasSpecificControls && <div className="bg-border my-1 h-px w-full" />}
                {showCanvasSpecificControls && (
                  <motion.div className="" variants={childVariants}>
                    <ScaleSection />
                  </motion.div>
                )}
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <NodeDisplaySection />
                </motion.div>
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <div className="mb-1 flex items-center gap-1">
                    <SwatchBookIcon size={12} className="text-muted-foreground" />
                    <span className="text-foreground text-xs font-medium">Theme</span>
                  </div>
                  <div className="flex gap-1 px-1">
                    {DEFAULT_COLOR_THEMES.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setColorTheme(preset)}
                        className={`h-6 w-full rounded border-2 transition-all ${
                          colorTheme.label === preset.label
                            ? "border-primary scale-110"
                            : "border-border hover:border-foreground"
                        }`}
                        style={{ backgroundColor: preset.background }}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </motion.div>
                <div className="bg-border my-1 h-px w-full" />
                <motion.div className="" variants={childVariants}>
                  <FloorVisibilitySection />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
