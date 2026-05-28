import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useExportRenderMode } from "@/features/export/renderMode";

import { usePlayback } from "./usePlayback";
import { useMetrics } from "../metrics/useMetrics";
import { Button } from "@/components/ui/button";

export function SmallPlaybackControls({ inline = false }: { inline?: boolean }) {
  const { playing, togglePlaying, skipToStart, skipToEnd, fps, skippedPerFrame } = usePlayback();
  const exportRenderMode = useExportRenderMode();
  const { isCurrentMetricStatic } = useMetrics();

  if (!exportRenderMode.showTransientUi) return null;

  return (
    <div
      className={
        inline
          ? "flex items-center gap-0.5"
          : "border-border bg-background/90 pointer-events-auto flex origin-right items-center gap-0.5 rounded-lg border p-0.5 shadow-lg backdrop-blur-sm select-none"
      }>
      <Button
        onClick={skipToStart}
        disabled={isCurrentMetricStatic}
        variant="ghost"
        size="icon-xs"
        title="Skip to Start">
        <SkipBackIcon />
      </Button>
      <Button
        onClick={togglePlaying}
        disabled={isCurrentMetricStatic}
        variant="ghost"
        size="icon-xs"
        title={isCurrentMetricStatic ? "Static metrics do not support playback" : playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button onClick={skipToEnd} disabled={isCurrentMetricStatic} variant="ghost" size="icon-xs" title="Skip to End">
        <SkipForwardIcon />
      </Button>
      {isCurrentMetricStatic && (
        <span className="border-border text-muted-foreground border-l pl-1 text-[10px]">Static</span>
      )}
      {playing && (
        <div className="border-border flex items-center gap-1 border-l pl-1">
          <span className="text-foreground text-[10px] font-medium" title="Frames per second">
            {fps} fps
          </span>
          {skippedPerFrame > 0 && (
            <span className="text-destructive text-[10px]" title="Frames skipped this update">
              +{skippedPerFrame}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
