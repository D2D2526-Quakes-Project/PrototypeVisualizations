import { usePlayback } from "@/components/playback/PlaybackContext";
import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

type SortKey = "node" | "x" | "y" | "z" | "magnitude";
type SortDir = "asc" | "desc";

export function PeakValuesPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const [sortKey, setSortKey] = useState<SortKey>("magnitude");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const peakData = useMemo(() => {
    const { nodeCount, frameCount } = animationData.metadata;
    const { displacementLin } = animationData;

    const peaks: Array<{ node: number; x: number; y: number; z: number; magnitude: number; peakFrame: number }> = [];

    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      let maxMag = 0;
      let peakFrame = 0;
      let peakX = 0;
      let peakY = 0;
      let peakZ = 0;

      for (let frame = 0; frame < frameCount; frame++) {
        const frameData = displacementLin.atFrame(frame);
        const pos = frameData.at(nodeIdx);
        const mag = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
        if (mag > maxMag) {
          maxMag = mag;
          peakFrame = frame;
          peakX = pos[0];
          peakY = pos[1];
          peakZ = pos[2];
        }
      }

      peaks.push({ node: nodeIdx, x: peakX, y: peakY, z: peakZ, magnitude: maxMag, peakFrame });
    }

    return peaks;
  }, [animationData]);

  const currentValues = useMemo(() => {
    const { nodeCount } = animationData.metadata;
    const { displacementLin } = animationData;
    const frameData = displacementLin.atFrame(frameIndex);

    const values: Array<{ node: number; x: number; y: number; z: number; magnitude: number }> = [];

    for (let i = 0; i < nodeCount; i++) {
      const pos = frameData.at(i);
      values.push({
        node: i,
        x: pos[0],
        y: pos[1],
        z: pos[2],
        magnitude: Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2),
      });
    }

    return values;
  }, [animationData, frameIndex]);

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

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-2 py-1.5 text-left cursor-pointer hover:bg-neutral-100 select-none" onClick={() => toggleSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </div>
    </th>
  );

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Peak Values</span>
          <span className="text-neutral-400 ml-2">- Top 10 nodes by magnitude</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="font-medium text-neutral-600">
              <SortHeader label="#" k="node" />
              <SortHeader label="X" k="x" />
              <SortHeader label="Y" k="y" />
              <SortHeader label="Z" k="z" />
              <SortHeader label="Mag" k="magnitude" />
              <th className="px-2 py-1.5 text-left">Frame</th>
              <th className="px-2 py-1.5 text-left">Current</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((row, idx) => {
              const current = currentValues.find((v) => v.node === row.node);
              return (
                <tr key={row.node} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="px-2 py-1 font-mono text-neutral-500">{idx + 1}</td>
                  <td className="px-2 py-1 font-mono" style={{ color: "#ef4444" }}>
                    {row.x.toFixed(4)}
                  </td>
                  <td className="px-2 py-1 font-mono" style={{ color: "#22c55e" }}>
                    {row.y.toFixed(4)}
                  </td>
                  <td className="px-2 py-1 font-mono" style={{ color: "#3b82f6" }}>
                    {row.z.toFixed(4)}
                  </td>
                  <td className="px-2 py-1 font-mono font-medium">{row.magnitude.toFixed(4)}</td>
                  <td className="px-2 py-1 font-mono text-neutral-500">{row.peakFrame + 1}</td>
                  <td className="px-2 py-1 font-mono text-neutral-400">{current?.magnitude.toFixed(4) ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
