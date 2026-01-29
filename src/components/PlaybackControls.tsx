import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAnimationData } from "../hooks/nodeDataHook";

export function usePlaybackControl() {
  const { animationData } = useAnimationData();
  const totalFrames = animationData.metadata.frameCount;
  const frameRate = 1 / animationData.metadata.dt;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const requestedAnimationFrameRef = useRef<number | null>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

  const resetPlaybackRefs = useCallback((newFrame: number) => {
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = newFrame;
    playbackStartTimeRef.current = performance.now();
  }, []);

  // Unified frame change function that always resets playback refs
  const changeFrame = useCallback(
    (newFrameIndex: number | ((prev: number) => number)) => {
      if (typeof newFrameIndex === "number") {
        setFrameIndex(newFrameIndex);
        resetPlaybackRefs(newFrameIndex);
      } else {
        setFrameIndex((prev) => {
          const computed = newFrameIndex(prev);
          resetPlaybackRefs(computed);
          return computed;
        });
      }
    },
    [setFrameIndex, resetPlaybackRefs],
  );

  const handlePlayPause = useCallback(() => {
    setPlaying(!playing);
    const currentFrame = frameIndex === totalFrames - 1 ? 0 : frameIndex;

    if (frameIndex === totalFrames - 1) {
      setFrameIndex(0);
      resetPlaybackRefs(0);
    } else {
      resetPlaybackRefs(currentFrame);
    }
  }, [setPlaying, setFrameIndex, resetPlaybackRefs, totalFrames, frameIndex, playing]);

  const skipToStart = () => changeFrame(0);
  const skipToEnd = () => changeFrame(totalFrames - 1);

  useEffect(() => {
    if (!playing) {
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (lastDisplayedFrameTimeRef.current === 0) {
        lastDisplayedFrameTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastDisplayedFrameTimeRef.current;

      if (deltaTime >= 1000 / 30) {
        const expectedFrame =
          playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * frameRate;
        const newFrameIndex = Math.round(expectedFrame);

        if (newFrameIndex >= 0 && newFrameIndex < totalFrames) {
          setFrameIndex(newFrameIndex);
        } else {
          setFrameIndex(totalFrames - 1);
          setPlaying(false);
        }
        lastDisplayedFrameTimeRef.current = currentTime;
      }

      requestedAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    requestedAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [playing, totalFrames, frameRate]);

  useEffect(() => {
    function windowKeydown(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft") {
        changeFrame((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        changeFrame((prev) => Math.min(totalFrames - 1, prev + 1));
      }
    }

    window.addEventListener("keydown", windowKeydown);

    return () => {
      window.removeEventListener("keydown", windowKeydown);
    };
  }, [handlePlayPause, changeFrame, totalFrames]);

  return {
    frameIndex,
    playing,
    setFrameIndex: changeFrame, // This always resets playback refs
    handlePlayPause,
    skipToStart,
    skipToEnd,
  };
}

export function PlaybackControls({ playback }: { playback: ReturnType<typeof usePlaybackControl> }) {
  return (
    <div className="flex items-center gap-2">
      <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={playback.skipToStart}>
        <SkipBackIcon />
      </button>
      <div className="w-px h-1/2 bg-neutral-300" />
      <button
        className="p-2 hover:-translate-y-1 transition-transform cursor-pointer"
        onClick={playback.handlePlayPause}>
        {playback.playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="w-px h-1/2 bg-neutral-300" />
      <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={playback.skipToEnd}>
        <SkipForwardIcon />
      </button>
    </div>
  );
}
