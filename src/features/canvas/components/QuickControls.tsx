import { useMemo } from "react";

import { EyeIcon, EyeOffIcon, RotateCwIcon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveStore, useProfileActions, useProfileData } from "@/state";

import { ButtonGroupSeparator } from "@/components/ui/button-group";
import { useCanvasState } from "@/features/3d/contexts/CanvasContext";
import { BoxSelect, Home, RotateCw, ScanEye } from "lucide-react";
import { COLLAPSED_VIEW_PRESET_OPTIONS } from "../viewPresets";

function ViewButtons() {
  const { resetView, resetHomeView, orthographic, setOrthographic, spin, setSpin } = useCanvasState();

  return (
    <motion.div
      key="collapsed"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="border-border bg-background/90 pointer-events-auto flex origin-right items-center gap-0.5 rounded-lg border p-0.5 shadow-lg backdrop-blur-sm select-none">
      {COLLAPSED_VIEW_PRESET_OPTIONS.map(({ view, label }) => (
        <Tooltip key={view} disableHoverableContent>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => resetView(view)}
              className="text-[10px]">
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>
            {label} View
          </TooltipContent>
        </Tooltip>
      ))}
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button type="button" onClick={resetHomeView} variant="ghost" size="icon-sm" title="Home View">
            <Home size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Home View
        </TooltipContent>
      </Tooltip>
      <ButtonGroupSeparator />
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOrthographic(!orthographic)}
            className={orthographic ? "bg-primary/10 text-primary" : ""}>
            {orthographic ? <BoxSelect size={14} /> : <ScanEye size={14} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          {orthographic ? "Orthographic" : "Perspective"}
        </TooltipContent>
      </Tooltip>
      <ButtonGroupSeparator />
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setSpin(!spin)}
            className={spin ? "bg-primary/10 text-primary" : ""}
            title="Auto Rotate">
            <RotateCw size={14} className={spin ? "animate-spin" : undefined} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Auto Rotate
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

export function QuickControls() {
  const { isHoveringPanel, isPrimaryPanel, isViewControlsExpanded } = useCanvasState();

  const clearSelection = useLiveStore((s) => s.clearSelection);
  const selectedNodeIds = useLiveStore((s) => s.selectedNodeIds);
  const hiddenNodeIds = useProfileData((s) => s._hiddenNodeIds);
  const { showAllNodes, hideNodes, showNodes } = useProfileActions();

  const selectedCount = selectedNodeIds.length;
  const hiddenCount = hiddenNodeIds.length;
  const hiddenSelectedCount = useMemo(
    () => selectedNodeIds.filter((nodeId) => hiddenNodeIds.includes(nodeId)).length,
    [hiddenNodeIds, selectedNodeIds]
  );
  const visibleSelectedCount = selectedCount - hiddenSelectedCount;
  const showNodeVisibilityMenu = selectedCount > 0 || hiddenCount > 0;

  return (
    <div
      className={`pointer-events-none absolute inset-x-1 top-1 z-1 flex flex-col items-center gap-1 ${isViewControlsExpanded && "items-end"}`}>
      <AnimatePresence>
        {(isHoveringPanel || isPrimaryPanel) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="origin-top">
            <ViewButtons />
          </motion.div>
        )}

        {(isHoveringPanel || isPrimaryPanel) && showNodeVisibilityMenu && (
          <motion.div
            key="node-visibility-menu"
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15, delay: 0.05 }}
            className="border-border bg-background/90 pointer-events-auto flex origin-right items-center gap-0.5 rounded-lg border p-0.5 shadow-lg backdrop-blur-sm select-none">
            {visibleSelectedCount > 0 && (
              <>
                <span className="p-1 font-mono text-[10px]">
                  {visibleSelectedCount} <span className="font-normal">Selected</span>
                </span>
                <ButtonGroupSeparator />
              </>
            )}
            {hiddenCount > 0 && (
              <>
                <span className="font-mono text-[10px]">
                  {hiddenCount} <span className="font-normal">Hidden</span>
                </span>
                <ButtonGroupSeparator />
              </>
            )}
            <Tooltip disableHoverableContent>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"icon-sm"}
                  onClick={() => hideNodes(selectedNodeIds)}
                  disabled={visibleSelectedCount === 0}>
                  <EyeOffIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Hide Selected ({selectedCount})
              </TooltipContent>
            </Tooltip>
            <Tooltip disableHoverableContent>
              <TooltipTrigger asChild>
                <Button
                  variant={"ghost"}
                  size={"icon-sm"}
                  onClick={() => showNodes(selectedNodeIds)}
                  disabled={hiddenSelectedCount === 0}>
                  <EyeIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Show Selected ({hiddenSelectedCount})
              </TooltipContent>
            </Tooltip>
            <Tooltip disableHoverableContent>
              <TooltipTrigger asChild>
                <Button variant={"ghost"} size={"icon-sm"} onClick={showAllNodes} disabled={hiddenCount === 0}>
                  <RotateCwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Show All Nodes ({hiddenCount})
              </TooltipContent>
            </Tooltip>
            <Tooltip disableHoverableContent>
              <TooltipTrigger asChild>
                <Button
                  variant={"destructive"}
                  size={"icon-sm"}
                  onClick={clearSelection}
                  disabled={selectedCount === 0}>
                  <XCircleIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                Clear Selection ({selectedCount})
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
