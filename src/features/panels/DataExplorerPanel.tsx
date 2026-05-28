import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePanelState } from "@/features/dockview/usePanelState";
import { usePlayback } from "@/features/playback/usePlayback";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { IDockviewPanelProps } from "dockview-react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SortKey = "node" | "story" | "currentDispMag" | "peakDispMag" | "currentDrift" | "peakDrift";
type SortDir = "asc" | "desc";

type DataExplorerPanelState = {
  query: string;
  sortKey: SortKey;
  sortDir: SortDir;
};

const DEFAULT_STATE: DataExplorerPanelState = {
  query: "",
  sortKey: "peakDispMag",
  sortDir: "desc",
};

function sanitizeSortKey(value: unknown): SortKey {
  const valid: SortKey[] = ["node", "story", "currentDispMag", "peakDispMag", "currentDrift", "peakDrift"];
  return valid.includes(value as SortKey) ? (value as SortKey) : "peakDispMag";
}

function sanitizeSortDir(value: unknown): SortDir {
  return value === "asc" || value === "desc" ? value : "desc";
}

function sanitizeQuery(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function SortHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onToggle: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border-border bg-muted hover:bg-muted/50 sticky top-0 z-10 cursor-pointer border-b px-2 py-1.5 transition-colors select-none ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onToggle(sortKey)}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <span>{label}</span>
        {activeSortKey === sortKey &&
          (sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </div>
    </th>
  );
}

export function DataExplorerPanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const { state: savedState, setState: setSavedState } = usePanelState<DataExplorerPanelState>({
    panelId: api?.id,
    panelType: "Data Explorer",
    defaultState: DEFAULT_STATE,
  });

  const [query, setQuery] = useState(() => sanitizeQuery(savedState.query));
  const [sortKey, setSortKey] = useState<SortKey>(() => sanitizeSortKey(savedState.sortKey));
  const [sortDir, setSortDir] = useState<SortDir>(() => sanitizeSortDir(savedState.sortDir));

  const getStaticData = useCallback(
    (node: number) => {
      return {
        peakDispMag: animationData.precomputed.peakNodeDisplacement?.[node] ?? 0,
        peakDrift: animationData.precomputed.peakStoryDrift?.[node] ?? 0,
      };
    },
    [animationData.precomputed.peakNodeDisplacement, animationData.precomputed.peakStoryDrift]
  );

  const getDynamicData = useCallback(
    (node: number, frame: number) => {
      const disp = animationData.displacementLin?.atFrame(frame)?.at(node);
      const currentDispMag = disp ? Math.hypot(disp[0], disp[1], disp[2]) : 0;
      const currentDrift = animationData.storyDrift.get(frame, node) ?? 0;

      return { currentDispMag, currentDrift };
    },
    [animationData.displacementLin, animationData.storyDrift]
  );

  const storyMap = useMemo(() => {
    const map: Record<number, string> = {};
    Object.entries(animationData.metadata.stories || {}).forEach(([storyId, nodeIds]) => {
      nodeIds.forEach((nodeId) => (map[nodeId] = storyId));
    });
    return map;
  }, [animationData.metadata.stories]);

  const filteredNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const allNodes = Array.from({ length: animationData.metadata.nodeCount }, (_, i) => i);

    if (!normalizedQuery) return allNodes;

    return allNodes.filter((node) => {
      return String(node).includes(normalizedQuery) || (storyMap[node] || "").toLowerCase().includes(normalizedQuery);
    });
  }, [query, animationData.metadata.nodeCount, storyMap]);

  const staticSortedNodes = useMemo(() => {
    const nodes = [...filteredNodes];
    if (sortKey === "node") return sortDir === "asc" ? nodes : nodes.reverse();
    if (sortKey === "currentDispMag" || sortKey === "currentDrift") return nodes; // Handled in dynamic

    nodes.sort((a, b) => {
      if (sortKey === "story") {
        const compare = (storyMap[a] || "").localeCompare(storyMap[b] || "", undefined, { numeric: true });
        return sortDir === "asc" ? compare : -compare;
      }
      const statA = getStaticData(a);
      const statB = getStaticData(b);
      const compare = statA[sortKey] - statB[sortKey];
      return sortDir === "asc" ? compare : -compare;
    });
    return nodes;
  }, [filteredNodes, sortKey, sortDir, storyMap, getStaticData]);

  const sortedNodes = useMemo(() => {
    if (sortKey !== "currentDispMag" && sortKey !== "currentDrift") {
      return staticSortedNodes;
    }

    const dynVals = new Float32Array(staticSortedNodes.length);
    for (let i = 0; i < staticSortedNodes.length; i++) {
      dynVals[i] = getDynamicData(staticSortedNodes[i], frameIndex)[sortKey];
    }

    const sortablePairs = staticSortedNodes.map((node, i) => ({ node, val: dynVals[i] }));
    sortablePairs.sort((a, b) => {
      const compare = a.val - b.val;
      return sortDir === "asc" ? compare : -compare;
    });

    return sortablePairs.map((p) => p.node);
  }, [staticSortedNodes, sortKey, sortDir, frameIndex, getDynamicData]);

  useEffect(() => {
    setSavedState({ query, sortKey, sortDir });
  }, [query, sortKey, sortDir, setSavedState]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "story" || key === "node" ? "asc" : "desc");
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line
  const rowVirtualizer = useVirtualizer({
    count: sortedNodes.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  return (
    <div className="bg-background flex h-full w-full flex-col">
      <div className="border-border flex items-center border-b p-2">
        <label className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by node id or story"
            className="border-border bg-background text-foreground focus:border-foreground w-full rounded-md border py-1 pr-2 pl-8 text-xs outline-none"
          />
        </label>
      </div>

      {/* Virtual Table */}
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max text-[11px] whitespace-nowrap">
          <thead>
            <tr className="text-foreground font-medium">
              <SortHeader label="Node" sortKey="node" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader
                label="Story"
                sortKey="story"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <SortHeader
                label="Current Disp Mag"
                sortKey="currentDispMag"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Peak Disp Mag"
                sortKey="peakDispMag"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Current Drift"
                sortKey="currentDrift"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Peak Drift"
                sortKey="peakDrift"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={6} />
              </tr>
            )}

            {virtualRows.map((virtualRow) => {
              const node = sortedNodes[virtualRow.index];
              const story = storyMap[node] ?? "-";
              const { peakDispMag, peakDrift } = getStaticData(node);
              const { currentDispMag, currentDrift } = getDynamicData(node, frameIndex);

              return (
                <tr key={node} className="border-border hover:bg-muted border-b transition-colors">
                  <td className="text-foreground px-2 py-1 font-mono">{node}</td>
                  <td className="text-foreground px-2 py-1">{story}</td>
                  <td className="px-2 py-1 text-right font-mono font-medium">
                    <UnitTooltip value={currentDispMag} unit="inches" />
                  </td>
                  <td className="text-muted-foreground px-2 py-1 text-right font-mono">
                    <UnitTooltip value={peakDispMag} unit="inches" />
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-medium">
                    <UnitTooltip value={currentDrift} unit="percent" />
                  </td>
                  <td className="text-muted-foreground px-2 py-1 text-right font-mono">
                    <UnitTooltip value={peakDrift} unit="percent" />
                  </td>
                </tr>
              );
            })}

            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={6} />
              </tr>
            )}
          </tbody>
        </table>

        {sortedNodes.length === 0 && (
          <div className="text-foreground py-8 text-center text-xs">No nodes match the given filter.</div>
        )}
      </div>
    </div>
  );
}
