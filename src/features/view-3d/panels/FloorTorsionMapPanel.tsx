import { FloorTorsionPlanPreview } from "@/features/view-3d/components/FloorTorsionPlanPreview";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { buildFloorTorsionSnapshot } from "@/features/view-3d/lib/floorTorsion";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatCompactNumber } from "@/lib/utils";
import { formatHex, interpolate } from "culori";
import { useMemo } from "react";

const torsionColorScale = interpolate(["#2563eb", "#f8fafc", "#dc2626"], "oklab");

function formatSigned(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${formatCompactNumber(Math.abs(value), digits)}`;
}

export function FloorTorsionMapPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const rows = useMemo(
    () =>
      animationData.metadata.storyOrder
        .map((storyId) => buildFloorTorsionSnapshot(animationData, storyId, frameIndex))
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [animationData, frameIndex]
  );

  const maxAbsRotation = useMemo(() => {
    let maxAbs = 0;
    for (const row of rows) {
      maxAbs = Math.max(maxAbs, Math.abs(row.rotationRad));
    }
    return Math.max(maxAbs, 1e-6);
  }, [rows]);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="shrink-0 border-b border-neutral-100 px-3 py-2">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Floor Torsion Map</span>
          <span className="ml-2 text-neutral-400">Top-down floor rotation by story (X-Y plan, rad)</span>
        </div>
        <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 p-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-neutral-600">
            <span>Color Bar: Rotation (rad)</span>
            <span>Frame {frameIndex + 1}</span>
          </div>
          <div
            className="h-2 rounded border border-neutral-200"
            style={{
              background: "linear-gradient(90deg, #2563eb 0%, #f8fafc 50%, #dc2626 100%)",
            }}
            title={`Rotation color scale from -${formatCompactNumber(maxAbsRotation)} rad to +${formatCompactNumber(maxAbsRotation)} rad`}
          />
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-neutral-500">
            <span>{formatSigned(-maxAbsRotation, 2)}</span>
            <span>0</span>
            <span>{formatCompactNumber(maxAbsRotation)}</span>
          </div>
          <div className="mt-1 text-[10px] text-neutral-500">Axes: X and Y plan coordinates in inches (in)</div>
        </div>
      </div>

      <div className="skinny-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {rows.map((row) => {
          const normalized = Math.max(-1, Math.min(1, row.rotationRad / maxAbsRotation));
          const fill = formatHex(torsionColorScale((normalized + 1) / 2));
          const tooltip = `Story ${row.storyId}\nRotation: ${formatCompactNumber(row.rotationRad)} rad\nNodes: ${row.nodeCount}`;
          const absRotation = Math.abs(row.rotationRad);

          return (
            <div key={row.storyId} className="rounded border border-neutral-200 bg-white p-2" title={tooltip}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-neutral-500">Story</div>
                  <div className="truncate font-mono text-xs text-neutral-800" title={row.storyId}>
                    {row.storyId}
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-tight">
                  <div className="text-neutral-500">Rotation (rad)</div>
                  <div className="text-right font-mono text-neutral-800">{formatSigned(row.rotationRad)}</div>
                  <div className="text-neutral-500">|Rotation|</div>
                  <div className="text-right font-mono text-neutral-700">{formatCompactNumber(absRotation)} rad</div>
                  <div className="text-neutral-500">Nodes</div>
                  <div className="text-right text-neutral-500">{row.nodeCount}</div>
                </div>
              </div>
              <div className="h-32 min-w-0 rounded border border-neutral-100 bg-neutral-50">
                <FloorTorsionPlanPreview snapshot={row} fill={fill} className="h-full w-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
