import { Button } from "@/components/ui/button";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { usePlayback } from "@/features/playback/PlaybackKeyboardEvents";
import { usePanelState } from "@/features/3d/hooks/usePanelState";
import { getMetricKeyColor } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatFixed3 } from "@/lib/utils";

import type { IDockviewPanelProps } from "dockview";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 40;

type SortKey =
  | "node"
  | "story"
  | "currentX"
  | "currentY"
  | "currentZ"
  | "currentMagnitude"
  | "peakMagnitude"
  | "peakFrame";
type SortDir = "asc" | "desc";
type DataExplorerPanelState = {
  query: string;
  page: number;
  sortKey: string;
  sortDir: SortDir;
};

const DEFAULT_DATA_EXPLORER_PANEL_STATE: DataExplorerPanelState = {
  query: "",
  page: 0,
  sortKey: "currentMagnitude",
  sortDir: "desc",
};

type ExplorerRow = {
  node: number;
  story: string;
  currentX: number;
  currentY: number;
  currentZ: number;
  currentMagnitude: number;
  peakMagnitude: number;
  peakFrame: number;
};

function sanitizeSortKey(value: unknown): SortKey {
  return value === "node" ||
    value === "story" ||
    value === "currentX" ||
    value === "currentY" ||
    value === "currentZ" ||
    value === "currentMagnitude" ||
    value === "peakMagnitude" ||
    value === "peakFrame"
    ? value
    : "currentMagnitude";
}

function sanitizeSortDir(value: unknown): SortDir {
  return value === "asc" || value === "desc" ? value : "desc";
}

function sanitizePage(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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
      className={`cursor-pointer px-2 py-1.5 select-none hover:bg-neutral-100 ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => onToggle(sortKey)}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <span>{label}</span>
        {activeSortKey === sortKey &&
          (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </div>
    </th>
  );
}

export function DataExplorerPanel({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const metricPaletteOverrides = useViewStore((s) => s.metricPaletteOverrides);
  const { state: savedState, setState: setSavedState } = usePanelState<DataExplorerPanelState>({
    panelId: api?.id,
    fallbackPanelId: "data-explorer",
    panelType: "dataExplorer",
    defaultState: DEFAULT_DATA_EXPLORER_PANEL_STATE,
  });

  const [query, setQuery] = useState(() => sanitizeQuery(savedState.query));
  const [page, setPage] = useState(() => sanitizePage(savedState.page));
  const [sortKey, setSortKey] = useState<SortKey>(() => sanitizeSortKey(savedState.sortKey));
  const [sortDir, setSortDir] = useState<SortDir>(() => sanitizeSortDir(savedState.sortDir));

  const displacementXColor = getMetricKeyColor("displacementX", metricPaletteOverrides);
  const displacementYColor = getMetricKeyColor("displacementY", metricPaletteOverrides);
  const displacementZColor = getMetricKeyColor("displacementZ", metricPaletteOverrides);

  const storyMap = useMemo(() => {
    const map: Record<number, string> = {};
    Object.entries(animationData.metadata.stories).forEach(([storyId, nodeIds]) => {
      nodeIds.forEach((nodeId) => {
        map[nodeId] = storyId;
      });
    });
    return map;
  }, [animationData.metadata.stories]);

  const rows = useMemo<ExplorerRow[]>(() => {
    const frameData = animationData.displacementLin.atFrame(frameIndex);

    return Array.from({ length: animationData.metadata.nodeCount }, (_, node) => {
      const current = frameData.at(node);
      return {
        node,
        story: storyMap[node] ?? "-",
        currentX: current[0],
        currentY: current[1],
        currentZ: current[2],
        currentMagnitude: Math.hypot(current[0], current[1], current[2]),
        peakMagnitude: animationData.precomputed.peakNodeDisplacement[node] ?? 0,
        peakFrame: animationData.precomputed.peakNodeDisplacementFrame[node] ?? 0,
      };
    });
  }, [
    animationData.displacementLin,
    animationData.metadata.nodeCount,
    animationData.precomputed.peakNodeDisplacement,
    animationData.precomputed.peakNodeDisplacementFrame,
    frameIndex,
    storyMap,
  ]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;

    return rows.filter((row) => {
      return (
        row.story.toLowerCase().includes(normalizedQuery) ||
        String(row.node).includes(normalizedQuery) ||
        `node ${row.node}`.includes(normalizedQuery)
      );
    });
  }, [query, rows]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      if (sortKey === "story") {
        const compare = a.story.localeCompare(b.story, undefined, { numeric: true });
        return sortDir === "asc" ? compare : -compare;
      }

      const compare = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? compare : -compare;
    });
    return sorted;
  }, [filteredRows, sortDir, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setSavedState({
      query,
      page: safePage,
      sortKey,
      sortDir,
    });
  }, [query, safePage, setSavedState, sortDir, sortKey]);

  const pagedRows = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [safePage, sortedRows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((value) => (value === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "story" || key === "node" || key === "peakFrame" ? "asc" : "desc");
  };

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
        <span>Frame {frameIndex + 1}</span>
        <span className="text-neutral-300">•</span>
        <span>{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
        <span className="text-neutral-300">•</span>
        <span>{filteredRows.length} matching nodes</span>
        <span className="text-neutral-300">•</span>
        <span>Page size {PAGE_SIZE}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Filter by node id or story"
            className="w-full rounded border border-neutral-300 bg-white py-1 pr-2 pl-7 text-xs text-neutral-700"
          />
        </label>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="xs" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="px-1 text-xs text-neutral-500">
            {safePage + 1}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="xs"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-neutral-200 bg-neutral-50">
            <tr className="font-medium text-neutral-600">
              <SortHeader label="Node" sortKey="node" activeSortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
              <SortHeader
                label="Story"
                sortKey="story"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
              />
              <SortHeader
                label="X (in)"
                sortKey="currentX"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Y (in)"
                sortKey="currentY"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Z (in)"
                sortKey="currentZ"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Current Mag (in)"
                sortKey="currentMagnitude"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Peak Mag (in)"
                sortKey="peakMagnitude"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
              <SortHeader
                label="Peak Frame"
                sortKey="peakFrame"
                activeSortKey={sortKey}
                sortDir={sortDir}
                onToggle={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.node} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-1 font-mono text-neutral-500">{row.node}</td>
                <td className="px-2 py-1">{row.story}</td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementXColor }}>
                  <UnitTooltip value={row.currentX} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementYColor }}>
                  <UnitTooltip value={row.currentY} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono" style={{ color: displacementZColor }}>
                  <UnitTooltip value={row.currentZ} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono font-medium">
                  <UnitTooltip value={row.currentMagnitude} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono text-neutral-600">
                  <UnitTooltip value={row.peakMagnitude} unit="in" />
                </td>
                <td className="px-2 py-1 text-right font-mono text-neutral-500">{row.peakFrame + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
