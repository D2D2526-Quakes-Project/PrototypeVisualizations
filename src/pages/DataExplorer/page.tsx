import { useMemo } from "react";
import { PlaybackControls, usePlaybackControl } from "../../components/PlaybackControls";
import { SmallTimeline } from "../../components/SmallTimeline";
import { useAnimationData } from "../../hooks/nodeDataHook";

export function ViewDataExplorer() {
  const animationData = useAnimationData();
  const playback = usePlaybackControl();

  const frame = animationData.frames[playback.frameIndex];
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
        <PlaybackControls playback={playback} />
        <div className="grow h-8">
          <SmallTimeline frameIndex={playback.frameIndex} onFrameChange={playback.setFrameIndex} />
        </div>
      </div>
      <div className="text-sm text-neutral-600">
        <span>
          Frame: {playback.frameIndex + 1} / {animationData.frames.length} | Time: {animationData.timeSteps[playback.frameIndex]?.toFixed(3)}s | Avg Building Displacement: {Math.hypot(...frame.averageDisplacement)?.toFixed(3)}m
        </span>
      </div>
      <div className="grow overflow-auto border-2 border-neutral-300 rounded-lg">
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
