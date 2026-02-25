import { useAnimationData } from "@/lib/useAnimationData";
import { useMemo, useState } from "react";
import { formatHex, interpolate } from "culori";
import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { PanelHeader } from "@/features/view-3d/components/PanelHeader";

const blue900 = formatHex("oklch(37.9% 0.146 265.522)")!;
const blue400 = formatHex("oklch(70.7% 0.165 254.624)")!;
const white = formatHex("#fff")!;
const red400 = formatHex("oklch(70.4% 0.191 22.216)")!;
const red900 = formatHex("oklch(39.6% 0.141 25.723)")!;

const colorMap = interpolate(
  [
    [blue900, -1],
    [blue400, -0.5],
    [white, 0],
    [red400, 0.5],
    [red900, 1],
  ],
  "oklab",
);

const cornerMeta = {
  NW: { label: "NW", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  NE: { label: "NE", pill: "bg-red-50 text-red-700 border-red-200" },
  SW: { label: "SW", pill: "bg-green-50 text-green-700 border-green-200" },
  SE: { label: "SE", pill: "bg-amber-50 text-amber-800 border-amber-200" },
} as const;

type CornerName = keyof typeof cornerMeta;

type PeakCorner = { drift: number; frame: number; time: number };
type PeakRow = {
  story: string;
  elevationFt: number;
  corners: Record<CornerName, PeakCorner>;
  maxCorner: CornerName;
  maxDrift: number;
  maxTime: number;
  maxFrame: number;
};

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

function fmtCornerTime(time: number) {
  // keep time readable in tight spaces
  return time < 10 ? time.toFixed(2) : time.toFixed(1);
}

const SortCaret = ({ active }: { active: boolean }) => (
  <span className={`ml-1 inline-block ${active ? "text-neutral-700" : "text-neutral-300"}`}>▾</span>
);

export function PeakResponseTimePanel() {
  const { animationData } = useAnimationData();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"story" | "elev" | "maxDrift" | "maxTime" | "corner">("maxDrift");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showCornerDetails, setShowCornerDetails] = useState(true);

  const { rows, maxDriftOverall, duration } = useMemo(() => {
    const { storyOrder, storyHeights, frameCount, dt } = animationData.metadata;
    const { storyDrift } = animationData.precomputed;

    const storyIds = storyOrder.slice(1); // omit ground
    const data: PeakRow[] = [];

    for (let storyIdx = 0; storyIdx < storyIds.length; storyIdx++) {
      const storyId = storyIds[storyIdx];

      const corners: Record<CornerName, PeakCorner> = {
        NW: { drift: 0, frame: 0, time: 0 },
        NE: { drift: 0, frame: 0, time: 0 },
        SW: { drift: 0, frame: 0, time: 0 },
        SE: { drift: 0, frame: 0, time: 0 },
      };

      const cornerNames: CornerName[] = ["NW", "NE", "SW", "SE"];

      for (let frame = 0; frame < frameCount; frame++) {
        const drifts = storyDrift.getStoryDrift(storyIdx + 1, frame);
        for (let i = 0; i < drifts.length; i++) {
          const c = cornerNames[i];
          const d = drifts[i];
          if (d > corners[c].drift) {
            corners[c] = { drift: d, frame, time: frame * dt };
          }
        }
      }

      let maxCorner: CornerName = "NW";
      let maxDrift = corners.NW.drift;
      for (const c of cornerNames) {
        if (corners[c].drift > maxDrift) {
          maxDrift = corners[c].drift;
          maxCorner = c;
        }
      }

      const heightIn = storyHeights[storyId] || 0;

      data.push({
        story: storyId,
        elevationFt: heightIn / 12,
        corners,
        maxCorner,
        maxDrift,
        maxTime: corners[maxCorner].time,
        maxFrame: corners[maxCorner].frame,
      });
    }

    const maxOverall = Math.max(
      0,
      ...Object.values(animationData.precomputed.peakStoryDrift).flatMap((s) => Object.values(s)),
    );

    const dur = (animationData.metadata.frameCount - 1) * animationData.metadata.dt;

    return { rows: data, maxDriftOverall: maxOverall, duration: dur };
  }, [animationData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.story.toLowerCase().includes(q));
  }, [rows, query]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const cmp = (a: PeakRow, b: PeakRow) => {
      switch (sortKey) {
        case "story":
          return a.story.localeCompare(b.story) * dir;
        case "elev":
          return (a.elevationFt - b.elevationFt) * dir;
        case "maxTime":
          return (a.maxTime - b.maxTime) * dir;
        case "corner":
          return a.maxCorner.localeCompare(b.maxCorner) * dir;
        case "maxDrift":
        default:
          return (a.maxDrift - b.maxDrift) * dir;
      }
    };

    return [...filtered].sort(cmp);
  }, [filtered, sortKey, sortDir]);

  const insights = useMemo(() => {
    const all = rows;
    if (!all.length) {
      return {
        globalPeak: 0,
        p50MaxTime: 0,
        p90MaxTime: 0,
        earliest: null as null | PeakRow,
        latest: null as null | PeakRow,
        topStory: null as null | PeakRow,
      };
    }

    const times = all.map((r) => r.maxTime).sort((a, b) => a - b);
    const earliest = all.reduce((m, r) => (r.maxTime < m.maxTime ? r : m), all[0]);
    const latest = all.reduce((m, r) => (r.maxTime > m.maxTime ? r : m), all[0]);
    const topStory = all.reduce((m, r) => (r.maxDrift > m.maxDrift ? r : m), all[0]);

    return {
      globalPeak: maxDriftOverall,
      p50MaxTime: quantile(times, 0.5),
      p90MaxTime: quantile(times, 0.9),
      earliest,
      latest,
      topStory,
    };
  }, [rows, maxDriftOverall]);

  function toggleSort(nextKey: typeof sortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      // sensible defaults per column
      setSortDir(nextKey === "story" || nextKey === "corner" ? "asc" : "desc");
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <PanelHeader
        title="Peak Response Timing"
        subtitle="Fast scan + sort + compare max drift timing per corner"
        meta={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500">
            <span>Stories: {rows.length}</span>
            <span className="text-neutral-300">•</span>
            <span>Drift: %</span>
            <span className="text-neutral-300">•</span>
            <span>Time: s</span>
            <span className="text-neutral-300">•</span>
            <span>Color normalized to global peak</span>
          </div>
        }
      />

      {/* Insights + Controls */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="p-3 grid grid-cols-1 gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-2">
              <div className="text-[10px] text-neutral-500">Global peak drift</div>
              <div className="text-sm font-semibold tabular-nums">
                <UnitTooltip value={insights.globalPeak} unit="%" decimals={3} />
              </div>
              {insights.topStory && (
                <div className="text-[10px] text-neutral-500 mt-1">
                  Top story: <span className="font-medium text-neutral-700">{insights.topStory.story}</span> (
                  {insights.topStory.maxCorner},{" "}
                  <span className="tabular-nums">{fmtCornerTime(insights.topStory.maxTime)}s</span>)
                </div>
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-2">
              <div className="text-[10px] text-neutral-500">Peak-time distribution (max corner)</div>
              <div className="text-sm font-semibold tabular-nums">
                P50 <span className="text-neutral-400 font-normal">/</span>{" "}
                <UnitTooltip value={insights.p50MaxTime} unit="s" decimals={2} showConversions={false} />{" "}
                <span className="text-neutral-400 font-normal">•</span> P90{" "}
                <UnitTooltip value={insights.p90MaxTime} unit="s" decimals={2} showConversions={false} />
              </div>
              <div className="mt-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-neutral-300"
                  style={{ width: `${clamp01(insights.p50MaxTime / (duration || 1)) * 100}%` }}
                  title="P50"
                />
              </div>
              <div className="text-[10px] text-neutral-500 mt-1">
                Duration: <span className="tabular-nums">{duration.toFixed(2)}s</span>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white p-2">
              <div className="text-[10px] text-neutral-500">Earliest / latest max</div>
              <div className="text-[11px] text-neutral-700">
                {insights.earliest ? (
                  <>
                    Earliest: <span className="font-medium">{insights.earliest.story}</span>{" "}
                    <span className="text-neutral-400">({insights.earliest.maxCorner})</span>{" "}
                    <span className="tabular-nums">{fmtCornerTime(insights.earliest.maxTime)}s</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="text-[11px] text-neutral-700 mt-1">
                {insights.latest ? (
                  <>
                    Latest: <span className="font-medium">{insights.latest.story}</span>{" "}
                    <span className="text-neutral-400">({insights.latest.maxCorner})</span>{" "}
                    <span className="tabular-nums">{fmtCornerTime(insights.latest.maxTime)}s</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search story…"
                className="w-full h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm outline-none focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            <button
              onClick={() => setShowCornerDetails((v) => !v)}
              className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-sm hover:bg-neutral-50">
              {showCornerDetails ? "Hide corner chips" : "Show corner chips"}
            </button>

            <div className="text-[10px] text-neutral-500 ml-auto">Tip: click headers to sort</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="grid grid-cols-[120px_90px_140px_110px_110px_1fr] gap-2 px-3 py-2 text-[11px] text-neutral-500">
            <button className="text-left hover:text-neutral-700" onClick={() => toggleSort("story")}>
              Story <SortCaret active={sortKey === "story"} />
            </button>
            <button className="text-left hover:text-neutral-700" onClick={() => toggleSort("elev")}>
              Elevation <SortCaret active={sortKey === "elev"} />
            </button>
            <button className="text-left hover:text-neutral-700" onClick={() => toggleSort("maxDrift")}>
              Max drift <SortCaret active={sortKey === "maxDrift"} />
            </button>
            <button className="text-left hover:text-neutral-700" onClick={() => toggleSort("corner")}>
              Corner <SortCaret active={sortKey === "corner"} />
            </button>
            <button className="text-left hover:text-neutral-700" onClick={() => toggleSort("maxTime")}>
              Peak time <SortCaret active={sortKey === "maxTime"} />
            </button>
            <div className="text-left">Corners</div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6 text-sm text-neutral-500">No stories match that search.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {sorted.map((r, idx) => {
              const ratio = clamp01(r.maxDrift / (maxDriftOverall || 1));
              const bg = formatHex(colorMap(ratio)) || "#fff";

              return (
                <div
                  key={r.story}
                  className={`grid grid-cols-[120px_90px_140px_110px_110px_1fr] gap-2 px-3 py-2 ${
                    idx % 2 === 0 ? "bg-white" : "bg-neutral-50/40"
                  } hover:bg-neutral-50`}>
                  <div className="text-sm font-medium text-neutral-800">{r.story}</div>

                  <div className="text-sm text-neutral-600 tabular-nums">
                    {/* UnitTooltip expects inches for conversions; feed inches, show ft via conversions naturally */}
                    <UnitTooltip value={r.elevationFt * 12} unit="in" decimals={0} />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm border border-black/10"
                      style={{ background: bg }}
                      title="Normalized to global peak drift"
                    />
                    <span className="text-sm font-semibold tabular-nums text-neutral-800">
                      <UnitTooltip value={r.maxDrift} unit="%" decimals={3} />
                    </span>
                    <span className="text-[11px] text-neutral-500 tabular-nums">F{r.maxFrame + 1}</span>
                  </div>

                  <div className="text-sm text-neutral-700">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${cornerMeta[r.maxCorner].pill}`}
                      title="Corner where this story reaches its max drift">
                      {cornerMeta[r.maxCorner].label}
                    </span>
                  </div>

                  <div className="text-sm text-neutral-700 tabular-nums">
                    <UnitTooltip value={r.maxTime} unit="s" decimals={2} showConversions={false} />
                  </div>

                  <div className="min-w-0">
                    {showCornerDetails ? (
                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(cornerMeta) as CornerName[]).map((c) => {
                          const d = r.corners[c];
                          const cr = clamp01(d.drift / (maxDriftOverall || 1));
                          const cBg = formatHex(colorMap(cr)) || "#fff";

                          const isMax = c === r.maxCorner;

                          return (
                            <div
                              key={c}
                              className={`flex items-center gap-2 px-2 py-1 rounded-md border ${
                                isMax ? "border-neutral-400 bg-white" : "border-neutral-200 bg-white/70"
                              }`}
                              title={`${c} • Drift ${d.drift.toFixed(4)}% • Time ${d.time.toFixed(3)}s • Frame ${d.frame + 1}`}>
                              <span
                                className="w-2.5 h-2.5 rounded-sm border border-black/10"
                                style={{ background: cBg }}
                              />
                              <span
                                className={`text-[10px] font-semibold ${cornerMeta[c].pill} px-1.5 py-0.5 rounded-full border`}>
                                {c}
                              </span>
                              <span className="text-[11px] text-neutral-800 tabular-nums">{d.drift.toFixed(3)}%</span>
                              <span className="text-[11px] text-neutral-500 tabular-nums">
                                {fmtCornerTime(d.time)}s
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-neutral-500">
                        <span className="font-medium text-neutral-700">{r.maxCorner}</span> is max •{" "}
                        {r.maxDrift.toFixed(3)}% at {fmtCornerTime(r.maxTime)}s
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
