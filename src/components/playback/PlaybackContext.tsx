import { useAnimationData } from "@/hooks/nodeDataHook";
import { useViewStore } from "@/stores";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

export type PlaybackControlParams = {
  frameIndex: number;
  playing: boolean;
  setFrameIndex: (index: number | ((prevState: number) => number)) => void;
  handlePlayPause: () => void;
  skipToStart: () => void;
  skipToEnd: () => void;
  fps: number;
  skippedPerFrame: number;
};

const DISPLAY_FPS = 30;

export const usePlayback = (): PlaybackControlParams => {
  const frameIndex = useViewStore((s) => s.frameIndex);
  const playing = useViewStore((s) => s.playing);
  const fps = useViewStore((s) => s.fps);
  const skippedPerFrame = useViewStore((s) => s.skippedPerFrame);
  const totalFrames = useViewStore((s) => s.totalFrames);
  const setStoreFrameIndex = useViewStore((s) => s.setFrameIndex);
  const setPlaying = useViewStore((s) => s.setPlaying);

  const setFrameIndex = useCallback(
    (nextIndex: number | ((prevState: number) => number)) => {
      const resolvedIndex =
        typeof nextIndex === "number" ? nextIndex : nextIndex(frameIndex);
      const clamped = Math.max(0, Math.min(totalFrames - 1, resolvedIndex));
      setStoreFrameIndex(clamped);
    },
    [frameIndex, totalFrames, setStoreFrameIndex],
  );

  const handlePlayPause = useCallback(() => {
    if (frameIndex >= totalFrames - 1) {
      setStoreFrameIndex(0);
    }
    setPlaying(!playing);
  }, [frameIndex, totalFrames, setPlaying, playing, setStoreFrameIndex]);

  const skipToStart = useCallback(() => {
    setStoreFrameIndex(0);
  }, [setStoreFrameIndex]);

  const skipToEnd = useCallback(() => {
    setStoreFrameIndex(totalFrames - 1);
  }, [setStoreFrameIndex, totalFrames]);

  return {
    frameIndex,
    playing,
    setFrameIndex,
    handlePlayPause,
    skipToStart,
    skipToEnd,
    fps,
    skippedPerFrame,
  };
};

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();

  const playing = useViewStore((s) => s.playing);
  const frameIndex = useViewStore((s) => s.frameIndex);
  const totalFrames = useViewStore((s) => s.totalFrames);
  const setFrameIndex = useViewStore((s) => s.setFrameIndex);
  const setPlaying = useViewStore((s) => s.setPlaying);
  const setFps = useViewStore((s) => s.setFps);
  const setSkippedPerFrame = useViewStore((s) => s.setSkippedPerFrame);
  const setTotalFrames = useViewStore((s) => s.setTotalFrames);

  const requestedAnimationFrameRef = useRef<number | null>(null);
  const lastDisplayedFrameTimeRef = useRef(0);
  const playbackStartFrameRef = useRef(0);
  const playbackStartTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const expectedFrameRef = useRef(0);

  const frameRate = animationData.metadata.dt > 0 ? 1 / animationData.metadata.dt : 30;

  useEffect(() => {
    setTotalFrames(animationData.metadata.frameCount);
  }, [animationData.metadata.frameCount, setTotalFrames]);

  useEffect(() => {
    if (!playing) {
      if (requestedAnimationFrameRef.current !== null) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
      return;
    }

    playbackStartFrameRef.current = frameIndex;
    playbackStartTimeRef.current = performance.now();
    lastDisplayedFrameTimeRef.current = 0;

    const animate = (currentTime: number) => {
      if (lastDisplayedFrameTimeRef.current === 0) {
        lastDisplayedFrameTimeRef.current = currentTime;
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
        expectedFrameRef.current = frameIndex;
      }

      const deltaTime = currentTime - lastDisplayedFrameTimeRef.current;

      if (deltaTime >= 1000 / DISPLAY_FPS) {
        const expectedFrame =
          playbackStartFrameRef.current +
          ((currentTime - playbackStartTimeRef.current) / 1000) * frameRate;
        const nextFrameIndex = Math.round(expectedFrame);

        const framesSkipped = nextFrameIndex - expectedFrameRef.current;
        setSkippedPerFrame(framesSkipped > 0 ? framesSkipped : 0);
        expectedFrameRef.current = nextFrameIndex;

        if (nextFrameIndex >= 0 && nextFrameIndex < totalFrames) {
          setFrameIndex(nextFrameIndex);
        } else {
          setFrameIndex(totalFrames - 1);
          setPlaying(false);
        }

        lastDisplayedFrameTimeRef.current = currentTime;

        frameCountRef.current += 1;
        if (currentTime - lastFpsUpdateRef.current >= 500) {
          const elapsed = currentTime - lastFpsUpdateRef.current;
          const currentFps = (frameCountRef.current / elapsed) * 1000;
          setFps(Math.round(currentFps));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = currentTime;
        }
      }

      requestedAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    requestedAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestedAnimationFrameRef.current !== null) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [frameIndex, frameRate, playing, setFps, setFrameIndex, setPlaying, setSkippedPerFrame, totalFrames]);

  useEffect(() => {
    const changeFrame = (delta: number) => {
      const next = Math.max(0, Math.min(totalFrames - 1, frameIndex + delta));
      setFrameIndex(next);
      playbackStartFrameRef.current = next;
      playbackStartTimeRef.current = performance.now();
      lastDisplayedFrameTimeRef.current = 0;
    };

    function windowKeydown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const shiftKey = e.shiftKey;
      const ctrlKey = e.ctrlKey || e.metaKey;

      if (e.key === " ") {
        e.preventDefault();
        if (frameIndex >= totalFrames - 1) {
          setFrameIndex(0);
        }
        setPlaying(!playing);
        return;
      }

      if (ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        setFrameIndex(0);
      } else if (ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        setFrameIndex(totalFrames - 1);
      } else if (shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        changeFrame(-100);
      } else if (shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        changeFrame(100);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        changeFrame(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        changeFrame(1);
      }
    }

    window.addEventListener("keydown", windowKeydown);
    return () => window.removeEventListener("keydown", windowKeydown);
  }, [frameIndex, playing, setFrameIndex, setPlaying, totalFrames]);

  return <>{children}</>;
}
