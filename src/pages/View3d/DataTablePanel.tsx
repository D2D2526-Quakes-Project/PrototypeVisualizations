/**
 * DataTablePanel Component
 * =============================================================================
 * 
 * PURPOSE:
 * Provides a paginated tabular view of all node displacement data for the
 * current frame. Allows engineers to see exact numerical values.
 * 
 * WHAT IT SHOWS:
 * - Node index
 * - Story assignment
 * - X, Y, Z displacement components (inches)
 * - Displacement magnitude (inches)
 * 
 * DATA SOURCES:
 * - Displacement: animationData.displacementLin
 * - Node-to-story mapping: animationData.metadata.stories
 * 
 * UNITS:
 * - Displacement: inches
 * - Magnitude: inches
 * 
 * IMPORTANCE:
 * Provides raw numerical access to simulation data for verification,
 * debugging, and detailed analysis. Essential for engineers who need
 * exact values rather than visual representations.
 * =============================================================================
 */

import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

const PAGE_SIZE = 50;

export function DataTablePanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const [page, setPage] = useState(0);

  const { nodeCount, stories } = animationData.metadata;

  const tableData = useMemo(() => {
    const { displacementLin } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);
    const data: Array<{
      node: number;
      story: string;
      x: number;
      y: number;
      z: number;
      magnitude: number;
    }> = [];

    const storyMap: Record<number, string> = {};
    Object.entries(stories).forEach(([storyId, nodes]) => {
      nodes.forEach((nodeIdx) => {
        storyMap[nodeIdx] = storyId;
      });
    });

    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, nodeCount);

    for (let i = start; i < end; i++) {
      const pos = frameData.at(i);
      const mag = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
      data.push({
        node: i,
        story: storyMap[i] ?? "-",
        x: pos[0],
        y: pos[1],
        z: pos[2],
        magnitude: mag,
      });
    }

    return data;
  }, [animationData, frameIndex, page, nodeCount, stories]);

  const totalPages = Math.ceil(nodeCount / PAGE_SIZE);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            <span className="font-medium">Data Table</span>
            <span className="text-neutral-400 ml-2">
              - Nodes {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, nodeCount)} of {nodeCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <span className="text-xs text-neutral-500 px-1">
              {page + 1}/{totalPages}
            </span>
            <Button variant="outline" size="xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="font-medium text-neutral-600">
              <th className="px-2 py-1.5 text-left">Node</th>
              <th className="px-2 py-1.5 text-left">Story</th>
              <th className="px-2 py-1.5 text-right">X (in)</th>
              <th className="px-2 py-1.5 text-right">Y (in)</th>
              <th className="px-2 py-1.5 text-right">Z (in)</th>
              <th className="px-2 py-1.5 text-right">Magnitude</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.node} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-1 font-mono text-neutral-500">{row.node}</td>
                <td className="px-2 py-1">{row.story}</td>
                <td className="px-2 py-1 font-mono text-right" style={{ color: "#ef4444" }}>
                  <UnitTooltip value={row.x} unit="in" decimals={4} />
                </td>
                <td className="px-2 py-1 font-mono text-right" style={{ color: "#22c55e" }}>
                  <UnitTooltip value={row.y} unit="in" decimals={4} />
                </td>
                <td className="px-2 py-1 font-mono text-right" style={{ color: "#3b82f6" }}>
                  <UnitTooltip value={row.z} unit="in" decimals={4} />
                </td>
                <td className="px-2 py-1 font-mono text-right font-medium">
                  <UnitTooltip value={row.magnitude} unit="in" decimals={4} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
