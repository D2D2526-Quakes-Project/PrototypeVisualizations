import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

const PlaybackContext = createContext<PlaybackControlParams | undefined>(undefined);

export const PlaybackProvider = ({ children }: { children: ReactNode }) => {
  const { animationData } = useAnimationData();
  const totalFrames = animationData.metadata.frameCount;
  const frameRate = 1 / animationData.metadata.dt;

  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(0);
  const [skippedPerFrame, setSkippedPerFrame] = useState(0);

  const requestedAnimationFrameRef = useRef<number | null>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);
  
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const lastFrameIndexRef = useRef(0);
  const expectedFrameRef = useRef(0);

  const resetPlaybackRefs = useCallback((newFrame: number) => {
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = newFrame;
    playbackStartTimeRef.current = performance.now();
  }, []);

  const changeFrame = useCallback(
    (newFrameIndex: number | ((prevState: number) => number)) => {
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
    [resetPlaybackRefs],
  );

  const handlePlayPause = useCallback(() => {
    const nextPlayingState = !playing;
    setPlaying(nextPlayingState);

    const currentFrame = frameIndex === totalFrames - 1 ? 0 : frameIndex;

    if (frameIndex === totalFrames - 1) {
      setFrameIndex(0);
      resetPlaybackRefs(0);
    } else {
      resetPlaybackRefs(currentFrame);
    }
  }, [playing, frameIndex, totalFrames, resetPlaybackRefs]);

  const skipToStart = useCallback(() => changeFrame(0), [changeFrame]);
  const skipToEnd = useCallback(() => changeFrame(totalFrames - 1), [changeFrame, totalFrames]);

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
        lastFrameIndexRef.current = frameIndex;
        expectedFrameRef.current = frameIndex;
      }

      const deltaTime = currentTime - lastDisplayedFrameTimeRef.current;

      // Throttle to ~30fps or use frameRate logic
      if (deltaTime >= 1000 / 30) {
        const expectedFrame =
          playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * frameRate;
        const newFrameIndex = Math.round(expectedFrame);

        // Track skipped frames per update (how many frames we jumped)
        const framesSkipped = newFrameIndex - expectedFrameRef.current;
        if (framesSkipped > 0) {
          setSkippedPerFrame(framesSkipped);
        } else {
          setSkippedPerFrame(0);
        }
        expectedFrameRef.current = newFrameIndex;
        lastFrameIndexRef.current = newFrameIndex;

        if (newFrameIndex >= 0 && newFrameIndex < totalFrames) {
          setFrameIndex(newFrameIndex);
        } else {
          setFrameIndex(totalFrames - 1);
          setPlaying(false);
        }
        lastDisplayedFrameTimeRef.current = currentTime;

        // Update FPS every 500ms
        frameCountRef.current++;
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
      if (requestedAnimationFrameRef.current) {
        cancelAnimationFrame(requestedAnimationFrameRef.current);
      }
    };
  }, [playing, totalFrames, frameRate, frameIndex]);

  // Keyboard Shortcuts
  useEffect(() => {
    function windowKeydown(e: KeyboardEvent) {
      // Prevent triggers if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
    return () => window.removeEventListener("keydown", windowKeydown);
  }, [handlePlayPause, changeFrame, totalFrames]);

  const value = {
    frameIndex,
    playing,
    setFrameIndex: changeFrame,
    handlePlayPause,
    skipToStart,
    skipToEnd,
    fps,
    skippedPerFrame,
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
};

// Custom hook for consumption
export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (context === undefined) {
    throw new Error("usePlayback must be used within a PlaybackProvider");
  }
  return context;
};
