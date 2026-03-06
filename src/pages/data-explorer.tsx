import { useMemo } from "react";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { SmallTimeline } from "@/features/playback/SmallTimeline";

export function ViewDataExplorer() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { stories, storyOrder } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;

  // Calculate average building displacement for current frame
  const avgBuildingDisplacement = useMemo(() => {
    let totalDx = 0;
    let totalDy = 0;
    let totalDz = 0;
    const nodeCount = animationData.metadata.nodeCount;

    for (let i = 0; i < nodeCount; i++) {
      const displacement = animationData.displacementLin.atFrame(frameIndex).at(i);
      totalDx += displacement[0];
      totalDy += displacement[1];
      totalDz += displacement[2];
    }

    return [totalDx / nodeCount, totalDy / nodeCount, totalDz / nodeCount];
  }, [animationData, frameIndex]);

  // Sort stories by height (descending)
  const sortedStories = useMemo(() => {
    return storyOrder.map((storyId) => ({
      storyId,
      nodeIndices: stories[storyId],
    }));
  }, [stories, storyOrder]);

  // Calculate story data for current frame
  const storyData = useMemo(() => {
    return sortedStories.map(({ storyId, nodeIndices }) => {
      let totalDx = 0;
      let totalDy = 0;
      let totalDz = 0;

      for (const nodeIdx of nodeIndices) {
        const displacement = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);
        totalDx += displacement[0];
        totalDy += displacement[1];
        totalDz += displacement[2];
      }

      const count = nodeIndices.length;
      const avgDisp = [totalDx / count, totalDy / count, totalDz / count];
      const dispMag = Math.hypot(...avgDisp);

      return {
        storyId,
        avgDisp,
        dispMag,
      };
    });
  }, [sortedStories, animationData, frameIndex]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-neutral-600">
          <span>
            Frame: {frameIndex + 1} / {frameCount} | Time: {(frameIndex * dt).toFixed(3)}s | Avg Building Displacement:{" "}
            {Math.hypot(...avgBuildingDisplacement).toFixed(3)}in
          </span>
        </div>
      </div>
      <div className="h-8 shrink-0">
        <SmallTimeline />
      </div>
      <div className="grow overflow-auto rounded-lg border-2 border-neutral-300">
        <table className="w-full table-auto border-collapse text-left">
          <thead className="sticky top-0 bg-neutral-200">
            <tr>
              <th className="border-b-2 border-neutral-300 p-2">Story ID</th>
              <th className="border-b-2 border-neutral-300 p-2">Avg Disp X (in)</th>
              <th className="border-b-2 border-neutral-300 p-2">Avg Disp Y (in)</th>
              <th className="border-b-2 border-neutral-300 p-2">Avg Disp Z (in)</th>
              <th className="border-b-2 border-neutral-300 p-2">Total Magnitude (in)</th>
            </tr>
          </thead>
          <tbody>
            {storyData.map(({ storyId, avgDisp, dispMag }) => (
              <tr key={storyId} className="odd:bg-white even:bg-neutral-50">
                <td className="border-b border-neutral-200 p-2">{storyId}</td>
                <td className="border-b border-neutral-200 p-2">{avgDisp[0].toFixed(4)}</td>
                <td className="border-b border-neutral-200 p-2">{avgDisp[1].toFixed(4)}</td>
                <td className="border-b border-neutral-200 p-2">{avgDisp[2].toFixed(4)}</td>
                <td className="border-b border-neutral-200 p-2 font-bold">{dispMag.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
