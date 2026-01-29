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
