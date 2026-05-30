import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useExportVideo } from "@/features/export/ExportProvider";

import { usePlayback } from "./usePlayback";
import { useMetrics } from "../metrics/useMetrics";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SmallPlaybackControls({ inline = false }: { inline?: boolean }) {
  const { playing, togglePlaying, skipToStart, skipToEnd, fps } = usePlayback();
  const exportRenderMode = useExportVideo();
  const { isCurrentMetricStatic } = useMetrics();

  if (!exportRenderMode.showTransientUi) return null;

  return (
    <div
      className={
        inline
          ? "flex items-center gap-0.5"
          : "border-border bg-background pointer-events-auto flex origin-right items-center gap-0.5 rounded-lg border p-0.5 shadow-lg select-none"
      }>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button onClick={skipToStart} disabled={isCurrentMetricStatic} variant="ghost" size="icon-xs">
            <SkipBackIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Skip to Start
        </TooltipContent>
      </Tooltip>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button onClick={togglePlaying} disabled={isCurrentMetricStatic} variant="ghost" size="icon-xs">
            {playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          {isCurrentMetricStatic ? "Static metrics do not support playback" : playing ? "Pause" : "Play"}
        </TooltipContent>
      </Tooltip>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button onClick={skipToEnd} disabled={isCurrentMetricStatic} variant="ghost" size="icon-xs">
            <SkipForwardIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8}>
          Skip to End
        </TooltipContent>
      </Tooltip>
      {isCurrentMetricStatic && (
        <span className="border-border text-muted-foreground border-l pl-1 text-[10px]">Static</span>
      )}
      {playing && (
        <div className="border-border flex items-center gap-1 border-l pl-1">
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <span className="text-foreground text-[10px] font-medium">{fps} fps</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              Frames per second
            </TooltipContent>
          </Tooltip>
          {/* {skippedPerFrame > 0 && (
            <span className="text-destructive text-[10px]" title="Frames skipped this update">
              +{skippedPerFrame}
            </span>
          )} */}
        </div>
      )}
    </div>
  );
}
