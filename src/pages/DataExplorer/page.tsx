import { PauseIcon, PlayIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";

export function ViewDataExplorer() {
  const animationData = useAnimationData();
  const [frameIndex, setFrameIndex] = useState(0);

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

  const frame = animationData.frames[frameIndex];
  const sortedStories = useMemo(
    () =>
      Array.from(frame.stories.entries()).sort(([, a], [, b]) => {
        const yA = frame.nodePositions.get(a.nodeIds[0])![1];
        const yB = frame.nodePositions.get(b.nodeIds[0])![1];
        return yB - yA; // Sort descending by height
      }),
    [frame]
  );

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-hidden">
      <div className="flex items-center gap-4">
        <button className="bg-neutral-300 px-4 py-2 rounded-md flex items-center gap-2" onClick={handlePlayPause}>
          {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <div className="flex-grow">
          <input type="range" min="0" max={animationData.frames.length - 1} value={frameIndex} onChange={(e) => setFrameIndex(parseInt(e.target.value))} className="w-full" />
        </div>
      </div>
      <div className="text-sm text-neutral-600">
        <span>
          Frame: {frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[frameIndex]?.toFixed(3)}s | Avg Building Displacement: {Math.hypot(...frame.averageDisplacement)?.toFixed(3)}m
        </span>
      </div>
      <div className="flex-grow overflow-auto border-2 border-neutral-300 rounded-lg">
        <table className="w-full text-left table-auto border-collapse">
          <thead className="sticky top-0 bg-neutral-200">
            <tr>
              <th className="p-2 border-b-2 border-neutral-300">Story ID</th>
              <th className="p-2 border-b-2 border-neutral-300">Avg Disp X (m)</th>
              <th className="p-2 border-b-2 border-neutral-300">Avg Disp Y (m)</th>
              <th className="p-2 border-b-2 border-neutral-300">Avg Disp Z (m)</th>
              <th className="p-2 border-b-2 border-neutral-300">Total Magnitude (m)</th>
            </tr>
          </thead>
          <tbody>
            {sortedStories.map(([storyId, story]) => {
              const dispMag = Math.hypot(...story.averageDisplacement);
              return (
                <tr key={storyId} className="odd:bg-white even:bg-neutral-50">
                  <td className="p-2 border-b border-neutral-200">{storyId}</td>
                  <td className="p-2 border-b border-neutral-200">{story.averageDisplacement[0].toFixed(4)}</td>
                  <td className="p-2 border-b border-neutral-200">{story.averageDisplacement[1].toFixed(4)}</td>
                  <td className="p-2 border-b border-neutral-200">{story.averageDisplacement[2].toFixed(4)}</td>
                  <td className="p-2 border-b border-neutral-200 font-bold">{dispMag.toFixed(4)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
