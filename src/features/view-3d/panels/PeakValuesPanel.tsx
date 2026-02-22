/**
 * PeakValuesPanel Component
 * =============================================================================
 *
 * PURPOSE:
 * Displays the top 10 nodes with the highest peak displacement magnitude.
 * Shows both the peak value (from precomputed data) and current value
 * at the selected frame.
 *
 * WHAT IT SHOWS:
 * - Node index and ranking
 * - Peak X, Y, Z displacement components (inches)
 * - Peak magnitude (inches)
 * - Frame at which peak occurred
 * - Current magnitude at selected frame
 *
 * DATA SOURCES:
 * - Peak displacement: animationData.precomputed.peakNodeDisplacement
 * - Peak frame: animationData.precomputed.peakNodeDisplacementFrame
 * - Peak components: animationData.precomputed.peakNodeDisplacementX/Y/Z
 * - Current displacement: animationData.displacementLin (per frame)
 *
 * UNITS:
 * - Displacement: inches
 * - Magnitude: inches
 *
 * IMPORTANCE:
 * Identifies critical nodes that experience the largest movements.
 * Engineers use this to focus attention on the most stressed parts
 * of the structure. Comparing peak vs current values shows how
 * close the current state is to the maximum experienced.
 * =============================================================================
 */

import { usePlayback } from "@/features/playback/PlaybackContext";
import { useAnimationData } from "@/lib/useAnimationData";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { UnitTooltip } from "@/components/ui/unit-tooltip";

type SortKey = "node" | "x" | "y" | "z" | "magnitude";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
}) {
  return (
    <th className="px-2 py-1.5 text-left cursor-pointer hover:bg-neutral-100 select-none" onClick={() => onToggle(k)}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </div>
    </th>
  );
}

export function PeakValuesPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex, playing } = usePlayback();
  const [sortKey, setSortKey] = useState<SortKey>("magnitude");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { metadata, precomputed, displacementLin } = animationData;
  const { nodeCount } = metadata;
  const {
    peakNodeDisplacement,
    peakNodeDisplacementFrame,
    peakNodeDisplacementX,
    peakNodeDisplacementY,
    peakNodeDisplacementZ,
  } = precomputed;

  const peakData = useMemo(() => {
    const peaks: Array<{ node: number; x: number; y: number; z: number; magnitude: number; peakFrame: number }> = [];

    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      peaks.push({
        node: nodeIdx,
        x: peakNodeDisplacementX[nodeIdx],
        y: peakNodeDisplacementY[nodeIdx],
        z: peakNodeDisplacementZ[nodeIdx],
        magnitude: peakNodeDisplacement[nodeIdx],
        peakFrame: peakNodeDisplacementFrame[nodeIdx],
      });
    }

    return peaks;
  }, [
    nodeCount,
    peakNodeDisplacement,
    peakNodeDisplacementFrame,
    peakNodeDisplacementX,
    peakNodeDisplacementY,
    peakNodeDisplacementZ,
  ]);

  const currentValues = useMemo(() => {
    const frameData = displacementLin.atFrame(frameIndex);
    const values: Record<number, number> = {};

    for (let i = 0; i < nodeCount; i++) {
      const pos = frameData.at(i);
      values[i] = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
    }

    return values;
  }, [displacementLin, frameIndex, nodeCount]);

  const sortedData = useMemo(() => {
    const sorted = [...peakData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return sorted;
  }, [peakData, sortKey, sortDir]);

  const top10 = sortedData.slice(0, 10);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Peak Values</span>
          <span className="text-neutral-400 ml-2">- Top 10 nodes by peak displacement</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="font-medium text-neutral-600">
              <SortHeader label="#" k="node" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="X (in)" k="x" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Y (in)" k="y" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Z (in)" k="z" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader label="Mag (in)" k="magnitude" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <th className="px-2 py-1.5 text-left">Frame</th>
              <th className="px-2 py-1.5 text-left">Current (in)</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((row, idx) => (
              <tr key={row.node} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-1 font-mono text-neutral-500">{idx + 1}</td>
                <td className="px-2 py-1 font-mono" style={{ color: "#ef4444" }}>
                  <UnitTooltip value={row.x} unit="in" decimals={4} interactive={!playing} />
                </td>
                <td className="px-2 py-1 font-mono" style={{ color: "#22c55e" }}>
                  <UnitTooltip value={row.y} unit="in" decimals={4} interactive={!playing} />
                </td>
                <td className="px-2 py-1 font-mono" style={{ color: "#3b82f6" }}>
                  <UnitTooltip value={row.z} unit="in" decimals={4} interactive={!playing} />
                </td>
                <td className="px-2 py-1 font-mono font-medium">
                  <UnitTooltip value={row.magnitude} unit="in" decimals={4} interactive={!playing} />
                </td>
                <td className="px-2 py-1 font-mono text-neutral-500">{row.peakFrame + 1}</td>
                <td className="px-2 py-1 font-mono text-neutral-400">
                  {currentValues[row.node] !== undefined ? (
                    <UnitTooltip value={currentValues[row.node]!} unit="in" decimals={4} interactive={!playing} />
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
