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

import { usePlayback } from "@/features/playback/PlaybackContext";
import { getDefaultDataTablePanelState } from "@/features/view-3d/lib/statePersistence";
import { useAnimationData } from "@/lib/useAnimationData";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import type { IDockviewPanelProps } from "dockview";
import { getMetricKeyColor } from "@/lib/metrics";
import { useViewStore } from "@/state";
import { formatFixed3 } from "@/lib/utils";

const PAGE_SIZE = 50;

export function DataTablePanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const setPanelState = useViewStore((s) => s.setPanelState);
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const panelId = api?.id ?? "data-table";
  const savedPanelState = useViewStore((s) => s.panelStates[panelId]);
  const defaultState = getDefaultDataTablePanelState();
  const savedState = savedPanelState?.type === "dataTable" ? savedPanelState.state : defaultState;
  const [page, setPage] = useState(() => Math.max(0, Math.floor(savedState.page)));
  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const displacementZColor = getMetricKeyColor("displacementZ", metricPaletteOverrides);

  const { nodeCount, stories } = animationData.metadata;
  const totalPages = Math.ceil(nodeCount / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));

  useEffect(() => {
    setPanelState(panelId, "dataTable", { page: safePage });
  }, [panelId, safePage, setPanelState]);

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

    const start = safePage * PAGE_SIZE;
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
  }, [animationData, frameIndex, safePage, nodeCount, stories]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="xs" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="px-1 text-xs text-neutral-500">
          {safePage + 1}/{totalPages}
        </span>
        <Button variant="outline" size="xs" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
        <span>Frame {frameIndex + 1}</span>
        <span className="text-neutral-300">•</span>
        <span>{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
        <span className="text-neutral-300">•</span>
        <span>Page Size: {PAGE_SIZE}</span>
        <span className="text-neutral-300">•</span>
        <span>
          Nodes {safePage * PAGE_SIZE + 1}-{Math.min((safePage + 1) * PAGE_SIZE, nodeCount)} of {nodeCount}
        </span>
        <span className="text-neutral-300">•</span>
        <span>Units: in</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50">
            <tr className="font-medium text-neutral-600">
              <th className="px-2 py-1.5 text-left">Node</th>
              <th className="px-2 py-1.5 text-left">Story</th>
              <th className="px-2 py-1.5 text-right">X (in)</th>
              <th className="px-2 py-1.5 text-right">Y (in)</th>
              <th className="px-2 py-1.5 text-right">Z (in)</th>
              <th className="px-2 py-1.5 text-right">Magnitude (in)</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row) => (
              <tr key={row.node} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-1 font-mono text-neutral-500">{row.node}</td>
                <td className="px-2 py-1">{row.story}</td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementXColor }}>
                  <UnitTooltip value={row.x} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementYColor }}>
                  <UnitTooltip value={row.y} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementZColor }}>
                  <UnitTooltip value={row.z} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono font-medium">
                  <UnitTooltip value={row.magnitude} unit="in" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
