import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useExportRenderMode } from "@/features/export/renderMode";
import { usePlayback } from "./PlaybackContext";

export function PlaybackControls() {
  const { playing, handlePlayPause, skipToStart, skipToEnd } = usePlayback();

  return (
    <div className="flex items-center gap-2">
      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1"
        onClick={skipToStart}
        title="Skip to Start">
        <SkipBackIcon />
      </button>

      <div className="h-6 w-px bg-neutral-300" />

      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1"
        onClick={handlePlayPause}
        title={playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="h-6 w-px bg-neutral-300" />

      <button
        className="cursor-pointer p-2 transition-transform hover:-translate-y-1"
        onClick={skipToEnd}
        title="Skip to End">
        <SkipForwardIcon />
      </button>
    </div>
  );
}

export function SmallPlaybackControls({ inline = false }: { inline?: boolean }) {
  const { playing, handlePlayPause, skipToStart, skipToEnd, fps, skippedPerFrame } = usePlayback();
  const exportRenderMode = useExportRenderMode();

  if (exportRenderMode.active && exportRenderMode.hideTransientUi) {
    return null;
  }

  return (
    <div
      data-export-hide="transient"
      className={
        inline
          ? "flex items-center gap-0.5"
          : "flex origin-right items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-lg backdrop-blur-sm"
      }>
      <button
        onClick={skipToStart}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
        title="Skip to Start">
        <SkipBackIcon />
      </button>
      <button
        onClick={handlePlayPause}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
        title={playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        onClick={skipToEnd}
        className="flex h-5 w-5 items-center justify-center rounded p-1 text-[10px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
        title="Skip to End">
        <SkipForwardIcon />
      </button>
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
