import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, useMemo, type ReactNode } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";

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

// Zustand-like store implementation using useSyncExternalStore
interface PlaybackStore {
  getState: () => {
    frameIndex: number;
    playing: boolean;
    fps: number;
    skippedPerFrame: number;
    totalFrames: number;
    frameRate: number;
  };
  setFrameIndex: (frame: number) => void;
  setPlaying: (playing: boolean) => void;
  setFps: (fps: number) => void;
  setSkippedPerFrame: (frames: number) => void;
  setTotalFrames: (frames: number) => void;
  setFrameRate: (rate: number) => void;
  subscribe: (callback: () => void) => () => void;
}

const createPlaybackStore = () => {
  let frameIndex = 0;
  let playing = false;
  let fps = 0;
  let skippedPerFrame = 0;
  let totalFrames = 100;
  let frameRate = 30;
  // eslint-disable-next-line prefer-const
  let subscribers: Set<() => void> = new Set();

  const notify = () => subscribers.forEach((cb) => cb());

    return {
      getState: () => ({ frameIndex, playing, fps, skippedPerFrame, totalFrames, frameRate }),
      setFrameIndex: (value: number) => {
        frameIndex = value;
        notify();
      },
      setPlaying: (value: boolean) => {
        playing = value;
        notify();
      },
      setFps: (value: number) => {
        fps = value;
        notify();
      },
      setSkippedPerFrame: (value: number) => {
        skippedPerFrame = value;
        notify();
      },
      setTotalFrames: (value: number) => {
        totalFrames = value;
        notify();
      },
      setFrameRate: (value: number) => {
        frameRate = value;
        notify();
      },
      subscribe: (callback: () => void) => {
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
    };
  };

  const PlaybackContext = createContext<PlaybackStore | null>(null);

// Hook to use the store
function usePlaybackStore<T>(selector: (state: ReturnType<PlaybackStore["getState"]>) => T): T {
  const store = useContext(PlaybackContext);
  if (!store) {
    throw new Error("usePlaybackStore must be used within PlaybackProvider");
  }
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

// Custom hook for consumption - maintains same API as before
export const usePlayback = (): PlaybackControlParams => {
  const frameIndex = usePlaybackStore((s) => s.frameIndex);
  const playing = usePlaybackStore((s) => s.playing);
  const fps = usePlaybackStore((s) => s.fps);
  const skippedPerFrame = usePlaybackStore((s) => s.skippedPerFrame);
  const store = useContext(PlaybackContext);

  if (!store) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }

  const resetPlaybackRefs = useCallback((newFrame: number) => {
    // These are tracked via refs in the animation loop
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = newFrame;
    playbackStartTimeRef.current = performance.now();
  }, []);

  const changeFrame = useCallback(
    (newFrameIndex: number | ((prevState: number) => number)) => {
      if (typeof newFrameIndex === "number") {
        store.setFrameIndex(newFrameIndex);
        resetPlaybackRefs(newFrameIndex);
      } else {
        const current = store.getState().frameIndex;
        const computed = newFrameIndex(current);
        store.setFrameIndex(computed);
        resetPlaybackRefs(computed);
      }
    },
    [store, resetPlaybackRefs],
  );

  const handlePlayPause = useCallback(() => {
    const currentPlaying = store.getState().playing;
    const currentFrame = store.getState().frameIndex;
    const tf = store.getState().totalFrames;

    store.setPlaying(!currentPlaying);

    if (currentFrame === tf - 1) {
      store.setFrameIndex(0);
      resetPlaybackRefs(0);
    } else {
      resetPlaybackRefs(currentFrame);
    }
  }, [store, resetPlaybackRefs]);

  const skipToStart = useCallback(() => changeFrame(0), [changeFrame]);
  const skipToEnd = useCallback(() => changeFrame(store.getState().totalFrames - 1), [changeFrame, store]);

  return {
    frameIndex,
    playing,
    setFrameIndex: changeFrame,
    handlePlayPause,
    skipToStart,
    skipToEnd,
    fps,
    skippedPerFrame,
  };
};

// Refs for animation loop (not reactive)
const requestedAnimationFrameRef = { current: null as number | null };
const lastDisplayedFrameTimeRef = { current: 0 };
const playbackStartFrameRef = { current: 0 };
const playbackStartTimeRef = { current: 0 };
const frameCountRef = { current: 0 };
const lastFpsUpdateRef = { current: 0 };
const lastFrameIndexRef = { current: 0 };
const expectedFrameRef = { current: 0 };

export const PlaybackProvider = ({ children }: { children: ReactNode }) => {
  const { animationData } = useAnimationData();

  const store = useMemo(() => createPlaybackStore(), []);

  // Initialize from animationData
  useEffect(() => {
    if (animationData?.metadata) {
      store.setTotalFrames(animationData.metadata.frameCount);
      store.setFrameRate(1 / animationData.metadata.dt);
    }
  }, [animationData, store]);

  // Use useSyncExternalStore directly with the store instance (not the hook, which needs context)
  const playing = useSyncExternalStore(store.subscribe, () => store.getState().playing);

  // Animation Loop
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
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = currentTime;
        lastFrameIndexRef.current = store.getState().frameIndex;
        expectedFrameRef.current = store.getState().frameIndex;
      }

      const deltaTime = currentTime - lastDisplayedFrameTimeRef.current;

      if (deltaTime >= 1000 / 30) {
        const tf = store.getState().totalFrames;
        const fr = store.getState().frameRate;

        const expectedFrame =
          playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * fr;
        const newFrameIndex = Math.round(expectedFrame);

        const framesSkipped = newFrameIndex - expectedFrameRef.current;
        store.setSkippedPerFrame(framesSkipped > 0 ? framesSkipped : 0);
        expectedFrameRef.current = newFrameIndex;
        lastFrameIndexRef.current = newFrameIndex;

        if (newFrameIndex >= 0 && newFrameIndex < tf) {
          store.setFrameIndex(newFrameIndex);
        } else {
          store.setFrameIndex(tf - 1);
          store.setPlaying(false);
        }
        lastDisplayedFrameTimeRef.current = currentTime;

        frameCountRef.current++;
        if (currentTime - lastFpsUpdateRef.current >= 500) {
          const elapsed = currentTime - lastFpsUpdateRef.current;
          const currentFps = (frameCountRef.current / elapsed) * 1000;
          store.setFps(Math.round(currentFps));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = currentTime;
        }
      }

      requestedAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    requestedAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [playing, store]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handlePlayPause = () => {
      const currentPlaying = store.getState().playing;
      const currentFrame = store.getState().frameIndex;
      const tf = store.getState().totalFrames;

      store.setPlaying(!currentPlaying);

      if (currentFrame === tf - 1) {
        store.setFrameIndex(0);
        lastDisplayedFrameTimeRef.current = 0;
        playbackStartFrameRef.current = 0;
        playbackStartTimeRef.current = performance.now();
      } else {
        lastDisplayedFrameTimeRef.current = 0;
        playbackStartFrameRef.current = currentFrame;
        playbackStartTimeRef.current = performance.now();
      }
    };

    const changeFrame = (delta: number) => {
      const currentFrame = store.getState().frameIndex;
      const tf = store.getState().totalFrames;
      const newFrame = Math.max(0, Math.min(tf - 1, currentFrame + delta));
      store.setFrameIndex(newFrame);
      lastDisplayedFrameTimeRef.current = 0;
      playbackStartFrameRef.current = newFrame;
      playbackStartTimeRef.current = performance.now();
    };

    function windowKeydown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft") {
        changeFrame(-1);
      } else if (e.key === "ArrowRight") {
        changeFrame(1);
      }
    }

    window.addEventListener("keydown", windowKeydown);
    return () => window.removeEventListener("keydown", windowKeydown);
  }, [store]);

  return <PlaybackContext.Provider value={store}>{children}</PlaybackContext.Provider>;
};
