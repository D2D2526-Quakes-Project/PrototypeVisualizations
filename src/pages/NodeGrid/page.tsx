import { converter, formatRgb, interpolate } from "culori";
import { PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAnimationData } from "../../hooks/nodeDataHook";

// Color scale for drift
const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");
const rgbConverter = converter("rgb");

export function ViewNodeGrid() {
  const animationData = useAnimationData();
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const requestedAnimationFrameRef = useRef<number | null>(null);
  const lastDisplayedFrameTimeRef = useRef<number>(0);
  const playbackStartFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);

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
        const newFrameIndex = Math.round(expectedFrame);
        if (newFrameIndex >= 0 && newFrameIndex < animationData.frames.length) {
          setFrameIndex(newFrameIndex);
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
      if (requestedAnimationFrameRef.current) cancelAnimationFrame(requestedAnimationFrameRef.current);
    };
  }, [playing, animationData.frames.length, animationData.frameRate, frameIndex]);

  // Find the maximum displacement of any node across the entire animation for normalization
  const maxNodeDisplacement = useMemo(() => Math.hypot(...animationData.maxDisplacement), [animationData.maxDisplacement]);

  // Find the maximum inter-story drift ratio across the entire animation for normalization
  const maxInterStoryDrift = useMemo(() => {
    let maxDrift = 0;
    const initialFrame = animationData.frames[0];

    for (const frame of animationData.frames) {
      const stories = Array.from(frame.stories.values()).sort((a, b) => {
        const yA = frame.nodePositions.get(a.nodeIds[0])![1];
        const yB = frame.nodePositions.get(b.nodeIds[0])![1];
        return yA - yB;
      });

      for (let i = 0; i < stories.length; i++) {
        const story = stories[i];
        const displacement = Math.hypot(...story.averageDisplacement);
        const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
        let ratio = 0;

        if (i === 0) {
          const initialHeight = initialFrame.nodePositions.get(story.nodeIds[0])![1];
          ratio = initialHeight > 0 ? displacement / initialHeight : 0;
        } else {
          const prevStory = stories[i - 1];
          const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
          const prevDisp = Math.hypot(...prevStory.averageDisplacement);
          const drift = Math.abs(displacement - prevDisp);
          const interStoryHeight = storyHeight - prevHeight;
          ratio = interStoryHeight > 0 ? drift / interStoryHeight : 0;
        }

        if (ratio > maxDrift) {
          maxDrift = ratio;
        }
      }
    }
    return maxDrift > 0 ? maxDrift : 1; // Avoid division by zero
  }, [animationData]);

  // Structure nodes by story for rendering
  const structuredNodes = useMemo(() => {
    const storyMap = new Map<string, { story: string; corner: string; nodeId: string }[]>();
    for (const [nodeId, nodeData] of animationData.nodes.entries()) {
      if (!storyMap.has(nodeData.story)) {
        storyMap.set(nodeData.story, []);
      }
      storyMap.get(nodeData.story)!.push({ ...nodeData, nodeId });
    }

    const sortedStoryKeys = Array.from(storyMap.keys()).sort((a, b) => {
      const numA = parseInt(a.replace("S", ""));
      const numB = parseInt(b.replace("S", ""));
      return numB - numA; // Sort descending, so top floor is first
    });

    return sortedStoryKeys.map((storyKey) => {
      const nodes = storyMap.get(storyKey)!;
      nodes.sort((a, b) => a.corner.localeCompare(b.corner)); // Sort nodes within story by corner
      return { storyId: storyKey, nodes };
    });
  }, [animationData.nodes]);

  const frame = animationData.frames[frameIndex];
  const initialFrame = animationData.frames[0];

  // Calculate drift ratios for the current frame
  const currentDrifts = useMemo(() => {
    const driftMap = new Map<string, number>();
    const stories = Array.from(frame.stories.entries()).sort(([, a], [, b]) => {
      const yA = frame.nodePositions.get(a.nodeIds[0])![1];
      const yB = frame.nodePositions.get(b.nodeIds[0])![1];
      return yA - yB;
    });

    for (let i = 0; i < stories.length; i++) {
      const [storyId, story] = stories[i];
      const displacement = Math.hypot(...story.averageDisplacement);
      const storyHeight = frame.nodePositions.get(story.nodeIds[0])![1];
      let ratio = 0;

      if (i === 0) {
        const initialHeight = initialFrame.nodePositions.get(story.nodeIds[0])![1];
        ratio = initialHeight > 0 ? displacement / initialHeight : 0;
      } else {
        const [, prevStory] = stories[i - 1];
        const prevHeight = frame.nodePositions.get(prevStory.nodeIds[0])![1];
        const prevDisp = Math.hypot(...prevStory.averageDisplacement);
        const drift = Math.abs(displacement - prevDisp);
        const interStoryHeight = storyHeight - prevHeight;
        ratio = interStoryHeight > 0 ? drift / interStoryHeight : 0;
      }
      driftMap.set(storyId, ratio);
    }
    return driftMap;
  }, [frame, initialFrame]);

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center gap-4">
          <button className="bg-neutral-300 px-4 py-2 flex items-center gap-2" onClick={handlePlayPause}>
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            <span>{playing ? "Pause" : "Play"}</span>
          </button>
          <div className="grow">
            <input type="range" min="0" max={animationData.frames.length - 1} value={frameIndex} onChange={(e) => setFrameIndex(parseInt(e.target.value))} className="w-full" />
          </div>
        </div>
        <div className="text-sm text-neutral-600 mt-2">
          <span>
            Frame: {frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[frameIndex]?.toFixed(3)}s
          </span>
          <p>Circle size represents individual node displacement. Color represents inter-story drift for the node's floor.</p>
        </div>
      </div>

      <div className="grow overflow-auto bg-neutral-100 p-4">
        <div className="flex flex-col">
          {structuredNodes.map(({ storyId, nodes }) => (
            <div key={storyId}>
              <div className="grid grid-cols-4 w-fit gap-4 pt-2">
                {nodes.map(({ nodeId }) => {
                  const initialPos = initialFrame.nodePositions.get(nodeId);
                  const currentPos = frame.nodePositions.get(nodeId);
                  if (!initialPos || !currentPos) return null;

                  const displacement = Math.hypot(currentPos[0] - initialPos[0], currentPos[1] - initialPos[1], currentPos[2] - initialPos[2]);
                  const sizeRatio = Math.min(displacement / maxNodeDisplacement, 1.0);
                  const size = 10 + sizeRatio * 50; // min size 10, max size 60

                  const driftRatio = currentDrifts.get(storyId) ?? 0;
                  const colorRatio = Math.min(driftRatio / maxInterStoryDrift, 1.0);
                  const color = rgbConverter(colorMap(colorRatio));

                  return (
                    <div key={nodeId} className="flex flex-col items-center justify-center gap-1">
                      <div
                        className="rounded-full transition-all duration-75 ease-linear"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: formatRgb(color),
                        }}
                        title={`Node: ${nodeId}\nDisp: ${displacement.toFixed(4)}m\nStory Drift Ratio: ${driftRatio.toFixed(4)}`}
                      />
                      <span className="text-xs text-neutral-500">{nodeId}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
