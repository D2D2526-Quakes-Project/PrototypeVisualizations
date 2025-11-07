import { useEffect, useRef, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";
import { converter, formatRgb, interpolate } from "culori";

const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function ViewHamburger() {
  const animationData = useAnimationData();
  const [frameIndex, setFrameIndex] = useState(0);
  const [displacementScale, setDisplacementScale] = useState(1);

  const maxDisp = Math.hypot(...animationData.maxAverageStoryDisplacement);
  const frame = animationData.frames[frameIndex];
  const stories = Array.from(animationData.frames[frameIndex].stories.values());

  const totalDisplacementForFrame = stories.reduce((acc, story) => acc + Math.hypot(...story.averageDisplacement), 0);

  /**
   * Frame playback and animation controls
   */

  const requestedAnimationFrameRef = useRef<number>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);

  function handlePlayPause() {
    setPlaying(!playing);
    lastDisplayedFrameTimeRef.current = 0;
    playbackStartFrameRef.current = frameIndex;
    playbackStartTimeRef.current = performance.now();
    if (frameIndex === animationData.frames.length - 1) {
      setFrameIndex(0);
      playbackStartFrameRef.current = 0;
    }
  }

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
        const expectedFrame = playbackStartFrameRef.current + ((currentTime - playbackStartTimeRef.current) / 1000) * animationData.frameRate;
        const frameIndex = Math.round(expectedFrame);
        if (frameIndex >= 0 && frameIndex < animationData.frames.length) {
          setFrameIndex(frameIndex);
        } else {
          setFrameIndex(animationData.frames.length - 1);
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
  }, [playing, animationData.frames.length, frameIndex]);

  return (
    <div className="h-full flex flex-col gap-2">
      <div>
        <span>
          Frame: {frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[frameIndex]?.toFixed(3)}s | Avg Displacement: {Math.hypot(...frame.averageDisplacement)?.toFixed(2)}m
        </span>
        <button className="bg-neutral-300 px-2 py-1" onClick={handlePlayPause}>
          {playing ? "Pause" : "Play"}
        </button>
        <br />
        <span>Color is the average displacement of the story scaled by maximum displacement. The size is a percentage of the total displacement for the frame.</span>
      </div>
      <div className="flex gap-2">
        <input type="range" min="0" max={animationData.frames.length - 1} value={frameIndex} onChange={(e) => setFrameIndex(parseInt(e.target.value))} className="w-full" />
        <label className="flex gap-2 whitespace-nowrap">
          <input type="range" min="20" max="2000" step={1} value={displacementScale} onChange={(e) => setDisplacementScale(parseFloat(e.target.value))} className="w-full" />
          Scale: {displacementScale.toFixed(2)}
        </label>
      </div>
      <div className="flex gap-1">
        {stories.map((story, i) => {
          const avgDisp = Math.hypot(...story.averageDisplacement);
          const color = rgbConverter(colorMap(avgDisp / maxDisp));
          // style={{ backgroundColor: formatRgb(color), width: `${avgDisp}fr` }}
          return <div key={i} className="h-96 rounded" style={{ backgroundColor: formatRgb(color), width: `${(avgDisp / totalDisplacementForFrame) * 100}%` }} />;
        })}
      </div>
      <div className="flex flex-col h-full gap-1">
        {stories.map((story, i) => {
          const avgDisp = Math.hypot(...story.averageDisplacement);
          const color = rgbConverter(colorMap(avgDisp / maxDisp));
          // style={{ backgroundColor: formatRgb(color), width: `${avgDisp}fr` }}
          return <div key={i} className="w-full rounded" style={{ backgroundColor: formatRgb(color), height: `${(avgDisp / totalDisplacementForFrame) * 100}%` }} />;
        })}
      </div>
    </div>
  );
}
