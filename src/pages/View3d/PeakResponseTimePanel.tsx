import { useAnimationData } from "@/hooks/nodeDataHook";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

type SortKey = "story" | "peakDrift" | "peakFrame" | "peakTime";
type SortDir = "asc" | "desc";

export function PeakResponseTimePanel() {
  const { animationData } = useAnimationData();
  const [sortKey, setSortKey] = useState<SortKey>("peakDrift");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const peakData = useMemo(() => {
    const { storyOrder, storyHeights } = animationData.metadata;
    const { storyDrift } = animationData.precomputed;
    const storyOrderWithoutGround = storyOrder.slice(1);

    const data: Array<{
      story: string;
      elevation: number;
      peakDrift: number;
      peakCorner: string;
      peakFrame: number;
      peakTime: number;
    }> = [];

    const corners = ["NW", "NE", "SW", "SE"];

    storyOrderWithoutGround.forEach((storyId, storyIdx) => {
      let maxDrift = 0;
      let maxFrame = 0;
      let peakCorner = "NW";

      for (let frame = 0; frame < animationData.metadata.frameCount; frame++) {
        const drifts = storyDrift.getStoryDrift(storyIdx + 1, frame);
        drifts.forEach((d, i) => {
          if (d > maxDrift) {
            maxDrift = d;
            maxFrame = frame;
            peakCorner = corners[i];
          }
        });
      }

      const heightIn = storyHeights[storyId] || 0;
      data.push({
        story: storyId,
        elevation: heightIn / 12,
        peakDrift: maxDrift,
        peakCorner,
        peakFrame: maxFrame,
        peakTime: maxFrame * animationData.metadata.dt,
      });
    });

    return data;
  }, [animationData]);

  const sortedData = useMemo(() => {
    return [...peakData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [peakData, sortKey, sortDir]);

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
          <span className="font-medium">Peak Response Time</span>
          <span className="text-neutral-400 ml-2">- When each story reaches max drift</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200">
            <tr className="font-medium text-neutral-600">
              <SortHeader label="Story" k="story" />
              <th className="px-2 py-1.5 text-left">Elev (ft)</th>
              <SortHeader label="Peak Drift" k="peakDrift" />
              <th className="px-2 py-1.5 text-left">Corner</th>
              <SortHeader label="Frame" k="peakFrame" />
              <SortHeader label="Time" k="peakTime" />
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.story} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-1 font-medium">{row.story}</td>
                <td className="px-2 py-1 font-mono text-neutral-500">{row.elevation.toFixed(0)}</td>
                <td className="px-2 py-1 font-mono font-medium">{row.peakDrift.toFixed(4)}%</td>
                <td className="px-2 py-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      background:
                        row.peakCorner === "NW"
                          ? "#dbeafe"
                          : row.peakCorner === "NE"
                            ? "#fee2e2"
                            : row.peakCorner === "SW"
                              ? "#dcfce7"
                              : "#fef3c7",
                      color:
                        row.peakCorner === "NW"
                          ? "#1e40af"
                          : row.peakCorner === "NE"
                            ? "#991b1b"
                            : row.peakCorner === "SW"
                              ? "#166534"
                              : "#92400e",
                    }}>
                    {row.peakCorner}
                  </span>
                </td>
                <td className="px-2 py-1 font-mono text-neutral-500">{row.peakFrame + 1}</td>
                <td className="px-2 py-1 font-mono text-neutral-500">{row.peakTime.toFixed(3)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
