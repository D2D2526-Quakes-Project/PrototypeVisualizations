import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BoxSelect, ScanEye, Home, RotateCw, ChevronLeftIcon } from "lucide-react";
import { motion } from "motion/react";
import { COLLAPSED_VIEW_PRESET_OPTIONS } from "../viewPresets";
import { useCanvasState } from "@/features/3d/contexts/CanvasContext";

export function QuickControls({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}) {
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
  );
}
