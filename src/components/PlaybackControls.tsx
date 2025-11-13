import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAnimationData } from "../hooks/nodeDataHook";

export function usePlaybackControl() {
  const animationData = useAnimationData();
  const totalFrames = animationData.frames.length;
  const frameRate = animationData.frameRate;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const requestedAnimationFrameRef = useRef<number | null>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

  const resetPlaybackRefs = (newFrame: number) => {
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = newFrame;
    playbackStartTimeRef.current = performance.now();
  };

  // Unified frame change function that always resets playback refs
  const changeFrame = (newFrameIndex: number | ((prev: number) => number)) => {
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
  };

  const handlePlayPause = () => {
    setPlaying(!playing);
    const currentFrame = frameIndex === totalFrames - 1 ? 0 : frameIndex;

    if (frameIndex === totalFrames - 1) {
      setFrameIndex(0);
      resetPlaybackRefs(0);
    } else {
      resetPlaybackRefs(currentFrame);
    }
  };

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
        const expectedFrame = playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * frameRate;
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

  const avgDisplacements = animationData.frames.map((frame) => Math.hypot(...frame.averageDisplacement));
  const maxDisp = Math.max(...avgDisplacements);
  const minDisp = Math.min(...avgDisplacements);
  const argMaxDisp = avgDisplacements.indexOf(maxDisp);
  const argMinDisp = avgDisplacements.indexOf(minDisp);

  useEffect(() => {
    function windowKeydown(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        changeFrame((prev) => {
          if (argMaxDisp > argMinDisp) {
            if (prev > argMaxDisp) return argMaxDisp;
            else if (prev > argMinDisp) return argMinDisp;
          } else {
            // argMaxDisp < argMinDisp
            if (prev > argMinDisp) return argMinDisp;
            else if (prev > argMaxDisp) return argMaxDisp;
          }
          return 0;
        });
      } else if (e.key === "ArrowLeft") {
        changeFrame((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" && e.shiftKey) {
        changeFrame((prev) => {
          if (argMaxDisp > argMinDisp) {
            if (prev < argMinDisp) return argMinDisp;
            else if (prev < argMaxDisp) return argMaxDisp;
          } else {
            // argMaxDisp < argMinDisp
            if (prev < argMaxDisp) return argMaxDisp;
            else if (prev < argMinDisp) return argMinDisp;
          }
          return animationData.frames.length - 1;
        });
      } else if (e.key === "ArrowRight") {
        changeFrame((prev) => Math.min(totalFrames - 1, prev + 1));
      }
    }

    window.addEventListener("keydown", windowKeydown);

    return () => {
      window.removeEventListener("keydown", windowKeydown);
    };
  }, [handlePlayPause]);

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
      <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={playback.handlePlayPause}>
        {playback.playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="w-px h-1/2 bg-neutral-300" />
      <button className="p-2 hover:-translate-y-1 transition-transform cursor-pointer" onClick={playback.skipToEnd}>
        <SkipForwardIcon />
      </button>
    </div>
  );
}
