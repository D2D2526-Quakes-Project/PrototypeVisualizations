import { isStaticMetric } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { useLiveStore, useProfileStore } from "@/state";
import { useCallback } from "react";

export type PlaybackControlParams = {
  totalFrames: number;
  frameIndex: number;
  setFrameIndex: (index: number | ((prevState: number) => number)) => void;

  playing: boolean;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;

  skipToStart: () => void;
  skipToEnd: () => void;

  fps: number;
  skippedPerFrame: number;
};

export const usePlayback = (): PlaybackControlParams => {
  const { animationData } = useAnimationData();

  const totalFrames = animationData.metadata.frameCount;

  const frameIndex = useProfileStore((s) => s.frameIndex);
  const setStoreFrameIndex = useProfileStore((s) => s.setFrameIndex);

  const playing = useLiveStore((s) => s._playing);
  const setStorePlaying = useLiveStore((s) => s._setPlaying);

  const fps = useLiveStore((s) => s._fps);
  const skippedPerFrame = useLiveStore((s) => s._skippedPerFrame);

  const currentMetric = useProfileStore((s) => s.currentMetric);
  const staticMetricMode = isStaticMetric(currentMetric);

  const setFrameIndex = useCallback(
    (nextIndex: number | ((prevState: number) => number)) => {
      if (staticMetricMode) {
        setStoreFrameIndex(0);
        return;
      }
      const resolvedIndex = typeof nextIndex === "number" ? nextIndex : nextIndex(frameIndex);
      const clamped = Math.max(0, Math.min(totalFrames - 1, resolvedIndex));
      setStoreFrameIndex(clamped);
    },
    [frameIndex, staticMetricMode, totalFrames, setStoreFrameIndex]
  );

  const setPlaying = useCallback(
    (playing: boolean) => {
      if (staticMetricMode) {
        setStoreFrameIndex(0);
        setStorePlaying(false);
        return;
      }
      if (frameIndex >= totalFrames - 1) {
        setStoreFrameIndex(0);
      }
      setStorePlaying(playing);
    },
    [frameIndex, staticMetricMode, totalFrames, setStorePlaying, setStoreFrameIndex]
  );

  const togglePlaying = useCallback(() => {
    setStorePlaying(!playing);
  }, [playing, setStorePlaying]);

  const skipToStart = useCallback(() => {
    setStoreFrameIndex(0);
  }, [setStoreFrameIndex]);

  const skipToEnd = useCallback(() => {
    if (staticMetricMode) {
      setStoreFrameIndex(0);
      return;
    }
    setStoreFrameIndex(totalFrames - 1);
  }, [staticMetricMode, setStoreFrameIndex, totalFrames]);

  return {
    totalFrames,
    frameIndex,
    playing,
    setFrameIndex,
    setPlaying,
    togglePlaying,
    skipToStart,
    skipToEnd,
    fps,
    skippedPerFrame,
  };
};
