import { useMemo } from "react";

import { EyeIcon, EyeOffIcon, RotateCwIcon, XCircleIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLiveStore, useProfileActions, useProfileData } from "@/state";

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
            onClick={() => setSpin(!spin)}
            className={`rounded p-1 transition-colors ${
              spin ? "bg-blue-100 text-blue-700" : "text-neutral-700 hover:bg-neutral-200"
            }`}
            title="Auto Rotate">
            <RotateCw size={14} className={spin ? "animate-spin" : undefined} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Auto Rotate
        </TooltipContent>
      </Tooltip>
      {/* <div className="mx-0.5 h-4 w-px bg-neutral-300" /> */}
      {/* <Tooltip disableHoverableContent>
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
      </Tooltip> */}
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
            className="pointer-events-auto origin-top">
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
            className="border-border bg-background pointer-events-auto flex origin-top items-center gap-0.5 rounded-lg border p-1 shadow-lg backdrop-blur-sm select-none">
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
                <Button
                  variant={"ghost"}
                  size={"icon-xs"}
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
                  size={"icon-xs"}
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
                <Button variant={"ghost"} size={"icon-xs"} onClick={showAllNodes} disabled={hiddenCount === 0}>
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
                  size={"icon-xs"}
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
