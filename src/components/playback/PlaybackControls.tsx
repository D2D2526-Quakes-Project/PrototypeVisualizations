import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { usePlayback } from "./PlaybackContext";

export function PlaybackControls() {
  const { playing, handlePlayPause, skipToStart, skipToEnd } = usePlayback();

  return (
    <div className="flex items-center gap-2">
      <button
        className="p-2 hover:-translate-y-1 transition-transform cursor-pointer"
        onClick={skipToStart}
        title="Skip to Start">
        <SkipBackIcon />
      </button>

      <div className="w-px h-6 bg-neutral-300" />

      <button
        className="p-2 hover:-translate-y-1 transition-transform cursor-pointer"
        onClick={handlePlayPause}
        title={playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="w-px h-6 bg-neutral-300" />

      <button
        className="p-2 hover:-translate-y-1 transition-transform cursor-pointer"
        onClick={skipToEnd}
        title="Skip to End">
        <SkipForwardIcon />
      </button>
    </div>
  );
}

export function SmallPlaybackControls() {
  const { playing, handlePlayPause, skipToStart, skipToEnd } = usePlayback();

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-neutral-200 p-1 flex items-center gap-0.5 origin-right">
      <button
        onClick={skipToStart}
        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center"
        title="Skip to Start">
        <SkipBackIcon />
      </button>
      <button
        onClick={handlePlayPause}
        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center"
        title={playing ? "Pause" : "Play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        onClick={skipToEnd}
        className="p-1 rounded hover:bg-neutral-200 transition-colors text-neutral-700 text-[10px] font-medium w-5 h-5 flex items-center justify-center"
        title="Skip to End">
        <SkipForwardIcon />
      </button>
    </div>
  );
}
