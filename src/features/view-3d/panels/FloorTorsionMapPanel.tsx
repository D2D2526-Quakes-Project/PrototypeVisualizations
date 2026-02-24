import { FloorTorsionPlanPreview } from "@/features/view-3d/components/FloorTorsionPlanPreview";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { buildFloorTorsionSnapshot } from "@/features/view-3d/lib/floorTorsion";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatHex, interpolate } from "culori";
import { useMemo } from "react";

const torsionColorScale = interpolate(["#2563eb", "#f8fafc", "#dc2626"], "oklab");

function formatSigned(value: number, digits = 5) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function FloorTorsionMapPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();

  const rows = useMemo(
    () =>
      animationData.metadata.storyOrder
        .map((storyId) => buildFloorTorsionSnapshot(animationData, storyId, frameIndex))
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [animationData, frameIndex],
  );

  const maxAbsRotation = useMemo(() => {
    let maxAbs = 0;
    for (const row of rows) {
      maxAbs = Math.max(maxAbs, Math.abs(row.rotationRad));
    }
    return Math.max(maxAbs, 1e-6);
  }, [rows]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-2 border-b border-neutral-100 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Floor Torsion Map</span>
          <span className="text-neutral-400 ml-2">Top-down floor rotation by story (X-Z plan, rad)</span>
        </div>
        <div className="mt-2 rounded border border-neutral-200 bg-neutral-50 p-2">
          <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1">
            <span>Color Bar: Rotation (rad)</span>
            <span>Frame {frameIndex}</span>
          </div>
          <div
            className="h-2 rounded border border-neutral-200"
            style={{
              background:
                "linear-gradient(90deg, #2563eb 0%, #f8fafc 50%, #dc2626 100%)",
            }}
            title={`Rotation color scale from -${maxAbsRotation.toFixed(6)} rad to +${maxAbsRotation.toFixed(6)} rad`}
          />
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>{(-maxAbsRotation).toFixed(6)}</span>
            <span>0.000000</span>
            <span>{maxAbsRotation.toFixed(6)}</span>
          </div>
          <div className="mt-1 text-[10px] text-neutral-500">Axes: X (horizontal), Y (vertical) in inches (in)</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto skinny-scrollbar p-2 space-y-2">
        {rows.map((row) => {
          const normalized = Math.max(-1, Math.min(1, row.rotationRad / maxAbsRotation));
          const fill = formatHex(torsionColorScale((normalized + 1) / 2));
          const tooltip = `Story ${row.storyId}\nRotation: ${row.rotationRad.toFixed(6)} rad\nNodes: ${row.nodeCount}`;
          const absRotation = Math.abs(row.rotationRad);

          return (
            <div key={row.storyId} className="rounded border border-neutral-200 bg-white p-2" title={tooltip}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-neutral-500">Story</div>
                  <div className="font-mono text-xs text-neutral-800 truncate" title={row.storyId}>
                    {row.storyId}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-tight shrink-0">
                  <div className="text-neutral-500">Rotation (rad)</div>
                  <div className="font-mono text-neutral-800 text-right">{formatSigned(row.rotationRad, 6)}</div>
                  <div className="text-neutral-500">|Rotation|</div>
                  <div className="font-mono text-neutral-700 text-right">{absRotation.toFixed(6)}</div>
                  <div className="text-neutral-500">Nodes</div>
                  <div className="text-neutral-500 text-right">{row.nodeCount}</div>
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
