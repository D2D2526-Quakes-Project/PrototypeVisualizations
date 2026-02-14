import { formatHex, interpolate } from "culori";
import { useMemo } from "react";
import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { SmallTimeline } from "@/components/SmallTimeline";

// Color scale for drift
const amber400 = "oklch(82.8% 0.189 84.429)";
const red700 = "oklch(50.5% 0.213 27.518)";
const colorMap = interpolate([amber400, red700], "oklab");

export function ViewNodeGrid() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { stories, storyOrder, corners } = animationData.metadata;
  const frameCount = animationData.metadata.frameCount;
  const dt = animationData.metadata.dt;
  const maxDisplacement = animationData.precomputed.maxDisplacement;
  const nodeCount = animationData.metadata.nodeCount;

  // Create corner sets for quick lookup
  const cornerSets = useMemo(() => ({
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  }), [corners]);

  // Structure nodes by story for rendering
  const structuredNodes = useMemo(() => {
    const storyMap = new Map<string, { nodeIdx: number; corner: string }[]>();
    
    storyOrder.forEach((storyId) => {
      const nodeIndices = stories[storyId];
      const nodes: { nodeIdx: number; corner: string }[] = [];
      
      nodeIndices.forEach((nodeIdx) => {
        let corner = "";
        if (cornerSets.NW.has(nodeIdx)) corner = "NW";
        else if (cornerSets.NE.has(nodeIdx)) corner = "NE";
        else if (cornerSets.SW.has(nodeIdx)) corner = "SW";
        else if (cornerSets.SE.has(nodeIdx)) corner = "SE";
        
        if (corner) {
          nodes.push({ nodeIdx, corner });
        }
      });
      
      // Sort by corner
      nodes.sort((a, b) => a.corner.localeCompare(b.corner));
      storyMap.set(storyId, nodes);
    });

    // Return in reverse story order (top to bottom)
    return storyOrder.map((storyId) => ({
      storyId,
      nodes: storyMap.get(storyId) || [],
    })).reverse();
  }, [stories, storyOrder, cornerSets]);

  // Calculate node displacement magnitudes
  const nodeDisplacements = useMemo(() => {
    const displacements = new Map<number, number>();
    
    for (let i = 0; i < nodeCount; i++) {
      const disp = animationData.displacementLin.atFrame(frameIndex).at(i);
      const mag = Math.hypot(disp[0], disp[1], disp[2]);
      displacements.set(i, mag);
    }
    
    return displacements;
  }, [animationData, frameIndex, nodeCount]);

  // Calculate story average displacements and drift ratios
  const { storyDrifts, maxInterStoryDrift } = useMemo(() => {
    const avgDisps = new Map<string, number>();
    const drifts = new Map<string, number>();
    let maxDrift = 0;

    // Calculate average displacement for each story
    storyOrder.forEach((storyId) => {
      const nodeIndices = stories[storyId];
      let totalMag = 0;

      for (const nodeIdx of nodeIndices) {
        const disp = animationData.displacementLin.atFrame(frameIndex).at(nodeIdx);
        totalMag += Math.hypot(disp[0], disp[1], disp[2]);
      }

      avgDisps.set(storyId, totalMag / nodeIndices.length);
    });

    // Calculate inter-story drift
    storyOrder.forEach((storyId, index) => {
      if (index === 0) {
        drifts.set(storyId, 0);
        return;
      }

      const currentAvg = avgDisps.get(storyId) || 0;
      const belowAvg = avgDisps.get(storyOrder[index - 1]) || 0;
      // Use precomputed per-story height (in inches)
      const storyHeight = animationData.precomputed.storyHeights[storyId] || 0;

      const drift = storyHeight > 0 ? Math.abs(currentAvg - belowAvg) / storyHeight : 0;
      drifts.set(storyId, drift);
      maxDrift = Math.max(maxDrift, drift);
    });

    return { storyDrifts: drifts, maxInterStoryDrift: maxDrift > 0 ? maxDrift : 1 };
  }, [stories, storyOrder, animationData, frameIndex]);

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-hidden">
      <div className="shrink-0">
        <div className="text-sm text-neutral-600 mt-2">
          <span>
            Frame: {frameIndex + 1} / {frameCount} | Time: {(frameIndex * dt).toFixed(3)}s
          </span>
          <p>Circle size represents individual node displacement. Color represents the Story Drift Ratio for the node&apos;s floor.</p>
        </div>
      </div>
      <div className="h-8 shrink-0">
        <SmallTimeline />
      </div>

      <div className="grow overflow-auto bg-neutral-100 p-4">
        <div className="flex flex-col">
          {structuredNodes.map(({ storyId, nodes }) => (
            <div key={storyId}>
              <div className="grid grid-cols-4 w-full max-w-sm mx-auto gap-4 pt-2">
                {nodes.map(({ nodeIdx, corner }) => {
                  const displacement = nodeDisplacements.get(nodeIdx) || 0;
                  const sizeRatio = Math.min(displacement / maxDisplacement, 1.0);
                  const size = 10 + sizeRatio * 50; // min size 10, max size 60

                  const driftRatio = storyDrifts.get(storyId) ?? 0;
                  const colorRatio = Math.min(driftRatio / maxInterStoryDrift, 1.0);
                  const color = formatHex(colorMap(colorRatio));

                  return (
                    <div key={nodeIdx} className="flex flex-col items-center justify-center gap-1 aspect-square">
                      <div
                        className="rounded-full transition-all duration-[50] ease-linear"
                        style={{
                          width: `${size}px`,
                          height: `${size}px`,
                          backgroundColor: color,
                        }}
                        title={`Node: ${nodeIdx} (${corner})\nDisp: ${displacement.toFixed(4)}in\nStory Drift Ratio: ${driftRatio.toFixed(4)}`}
                      />
                      <span className="text-xs text-neutral-500">{corner}</span>
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
