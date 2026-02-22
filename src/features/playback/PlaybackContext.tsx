import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore } from "@/state";
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
      const resolvedIndex = typeof nextIndex === "number" ? nextIndex : nextIndex(frameIndex);
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
  const playbackStartFrameRef = useRef(0);
  const playbackStartTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const displayedFrameRef = useRef(frameIndex);
  const frameIndexRef = useRef(frameIndex);

  const frameRate = animationData.metadata.dt > 0 ? 1 / animationData.metadata.dt : 30;

  useEffect(() => {
    frameIndexRef.current = frameIndex;
  }, [frameIndex]);

  useEffect(() => {
    if (!playing) {
      return;
    }

    if (frameIndex === displayedFrameRef.current) {
      return;
    }

    // Treat external frame changes during playback as live seeks.
    playbackStartFrameRef.current = frameIndex;
    playbackStartTimeRef.current = performance.now();
    displayedFrameRef.current = frameIndex;
    setSkippedPerFrame(0);
  }, [frameIndex, playing, setSkippedPerFrame]);

  useEffect(() => {
    setTotalFrames(animationData.metadata.frameCount);
  }, [animationData.metadata.frameCount, setTotalFrames]);

  useEffect(() => {
    if (!playing) {
      if (requestedAnimationFrameRef.current !== null) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
      setSkippedPerFrame(0);
      setFps(0);
      return;
    }

    playbackStartFrameRef.current = frameIndexRef.current;
    playbackStartTimeRef.current = performance.now();
    displayedFrameRef.current = frameIndexRef.current;
    frameCountRef.current = 0;
    lastFpsUpdateRef.current = 0;

    const animate = (currentTime: number) => {
      if (lastFpsUpdateRef.current === 0) {
        lastFpsUpdateRef.current = currentTime;
      }

      const elapsedSeconds = (currentTime - playbackStartTimeRef.current) / 1000;
      const expectedFrame = playbackStartFrameRef.current + elapsedSeconds * frameRate;
      const targetFrame = Math.round(expectedFrame);

      if (targetFrame >= totalFrames - 1) {
        const previousFrame = displayedFrameRef.current;
        const skipped = Math.max(0, totalFrames - 1 - previousFrame - 1);
        setSkippedPerFrame(skipped);
        displayedFrameRef.current = totalFrames - 1;
        if (frameIndexRef.current !== totalFrames - 1) {
          setFrameIndex(totalFrames - 1);
        }
        setPlaying(false);
        return;
      }

      if (targetFrame > displayedFrameRef.current) {
        const previousFrame = displayedFrameRef.current;
        const skipped = Math.max(0, targetFrame - previousFrame - 1);
        setSkippedPerFrame(skipped);
        displayedFrameRef.current = targetFrame;
        if (frameIndexRef.current !== targetFrame) {
          setFrameIndex(targetFrame);
        }
      } else {
        setSkippedPerFrame(0);
      }

      frameCountRef.current += 1;
      if (currentTime - lastFpsUpdateRef.current >= 500) {
        const elapsed = currentTime - lastFpsUpdateRef.current;
        const currentFps = (frameCountRef.current / elapsed) * 1000;
        setFps(Math.round(currentFps));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
      }

      requestedAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    requestedAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestedAnimationFrameRef.current !== null) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [frameRate, playing, setFps, setFrameIndex, setPlaying, setSkippedPerFrame, totalFrames]);

  useEffect(() => {
    const changeFrame = (delta: number) => {
      const next = Math.max(0, Math.min(totalFrames - 1, frameIndex + delta));
      setFrameIndex(next);
      playbackStartFrameRef.current = next;
      playbackStartTimeRef.current = performance.now();
      displayedFrameRef.current = next;
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
