import { isStaticMetric } from "@/lib/metrics";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { useLiveStore, useProfileStore } from "@/state";
import { useEffect, useRef } from "react";
import { usePlayback } from "./usePlayback";

export function PlaybackKeyboardEvents() {
  const { animationData } = useAnimationData();

  const { frameIndex, setFrameIndex, totalFrames, playing, setPlaying } = usePlayback();

  const setFps = useLiveStore((s) => s._setFps);
  const setSkippedPerFrame = useLiveStore((s) => s._setSkippedPerFrame);

  const displayedFrameRef = useRef(frameIndex);
  const frameIndexRef = useRef(frameIndex);
  const playbackStartFrameRef = useRef(frameIndex);
  const playbackStartTimeRef = useRef(0);
  const frameCountRef = useRef(totalFrames);
  const lastFpsUpdateRef = useRef(0);
  const requestedAnimationFrameRef = useRef<number | null>(null);

  const currentMetric = useProfileStore((s) => s.currentMetric);
  const staticMetricMode = isStaticMetric(currentMetric);

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

    playbackStartFrameRef.current = frameIndex;
    playbackStartTimeRef.current = performance.now();
    displayedFrameRef.current = frameIndex;
    setSkippedPerFrame(0);
  }, [frameIndex, playing, setSkippedPerFrame]);

  useEffect(() => {
    if (staticMetricMode) {
      if (requestedAnimationFrameRef.current !== null) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
      setSkippedPerFrame(0);
      setFps(0);
      return;
    }

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
  }, [frameRate, staticMetricMode, playing, setFps, setFrameIndex, setPlaying, setSkippedPerFrame, totalFrames]);

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

      if (staticMetricMode) {
        if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          setPlaying(false);
          setFrameIndex(0);
        }
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
  }, [frameIndex, staticMetricMode, playing, setFrameIndex, setPlaying, totalFrames]);

  return null;
}
