import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useExportRenderMode } from "@/features/export/renderMode";

import { usePlayback } from "./usePlayback";
import { useMetrics } from "../metrics/useMetrics";

export function PlaybackControls() {
  const { playing, togglePlaying, skipToStart, skipToEnd } = usePlayback();
  const { isCurrentMetricStatic } = useMetrics();

  return (
    <div className="flex items-center gap-2">
      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        onClick={skipToStart}
        disabled={isCurrentMetricStatic}
        title="Skip to Start">
        <SkipBackIcon />
      </button>

      <div className="h-6 w-px bg-neutral-300" />

      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        onClick={togglePlaying}
        disabled={isCurrentMetricStatic}
        title={isCurrentMetricStatic ? "Static metrics do not support playback" : playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="h-6 w-px bg-neutral-300" />

      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        onClick={skipToEnd}
        disabled={isCurrentMetricStatic}
        title="Skip to End">
        <SkipForwardIcon />
      </button>
      {isCurrentMetricStatic && <span className="text-xs text-neutral-500">Static</span>}
    </div>
  );
}

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
          : "flex origin-right items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-lg backdrop-blur-sm"
      }>
      <button
        onClick={skipToStart}
        disabled={isCurrentMetricStatic}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        title="Skip to Start">
        <SkipBackIcon />
      </button>
      <button
        onClick={togglePlaying}
        disabled={isCurrentMetricStatic}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        title={isCurrentMetricStatic ? "Static metrics do not support playback" : playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        onClick={skipToEnd}
        disabled={isCurrentMetricStatic}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        title="Skip to End">
        <SkipForwardIcon />
      </button>
      {isCurrentMetricStatic && (
        <span className="border-l border-neutral-300 pl-1 text-[10px] text-neutral-500">Static</span>
      )}
      {playing && (
        <div className="flex items-center gap-1 border-l border-neutral-300 pl-1">
          <span className="text-[10px] font-medium text-neutral-700" title="Frames per second">
            {fps} fps
          </span>
          {skippedPerFrame > 0 && (
            <span className="text-[10px] text-red-600" title="Frames skipped this update">
              +{skippedPerFrame}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
