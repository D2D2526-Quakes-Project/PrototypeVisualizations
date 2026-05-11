import { FloorTorsionPlanPreview } from "@/features/3d/components/FloorTorsionPlanPreview";
import { usePlayback } from "@/features/playback/usePlayback";
import { buildFloorTorsionSnapshot } from "@/features/3d/lib/floorTorsion";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { formatNumber } from "@/lib/utils";
import { formatHex, interpolate } from "culori";
import { useMemo } from "react";
import { useFloorVisibility } from "../3d/contexts/visualization";

const torsionColorScale = interpolate(["#2563eb", "#f8fafc", "#dc2626"], "oklab");

function formatSigned(value: number, digits = 1) {
  return `${value >= 0 ? "+" : ""}${formatNumber(Math.abs(value), digits)}`;
}

export function FloorTorsionMapPanel() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();

  const rows = useMemo(
    () =>
      animationData.metadata.storyOrder
        .filter((storyId) => visibleFloors.has(storyId))
        .map((storyId) => buildFloorTorsionSnapshot(animationData, storyId, frameIndex))
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .toReversed(),
    [animationData, frameIndex, visibleFloors]
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
      {/* Header */}
      <div className="shrink-0 border-b border-neutral-100 px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-neutral-700">Floor Torsion Map</span>
          <span className="text-[10px] text-neutral-400">Frame {frameIndex + 1}</span>
        </div>
        <p className="mt-0.5 text-[10px] text-neutral-400">Top-down floor rotation by story · X-Y plan · rad</p>

        {/* Color bar */}
        <div className="mt-2.5 px-0.5">
          <div
            className="h-2 w-full rounded-sm"
            style={{ background: "linear-gradient(90deg, #2563eb 0%, #f8fafc 50%, #dc2626 100%)" }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-neutral-400">
            <span className="text-blue-500">{formatSigned(-maxAbsRotation, 2)}</span>
            <span>0</span>
            <span className="text-red-500">{formatSigned(maxAbsRotation, 2)}</span>
          </div>
        </div>
      </div>

      {/* Story list */}
      <div className="skinny-scrollbar min-h-0 flex-1 divide-y divide-neutral-100 overflow-y-auto">
        {rows.map((row) => {
          const normalized = Math.max(-1, Math.min(1, row.rotationRad / maxAbsRotation));
          const fill = formatHex(torsionColorScale((normalized + 1) / 2));
          const isNeg = row.rotationRad < 0;

          return (
            <div key={row.storyId} className="flex gap-3 p-2.5">
              <div className="h-28 w-48 shrink-0 overflow-hidden rounded-xs bg-neutral-50 ring-1 ring-neutral-200">
                <FloorTorsionPlanPreview snapshot={row} fill={fill} className="h-full w-full" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                  <div className="truncate text-xs font-semibold text-neutral-800" title={row.storyId}>
                    {row.storyId}
                  </div>
                  <div className="mt-0.5 text-[10px] text-neutral-400">{row.nodeCount} nodes</div>
                </div>

                {/* Rotation value */}
                <div>
                  <div className="text-[9px] tracking-wide text-neutral-400 uppercase">Rotation</div>
                  <div
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      isNeg ? "text-blue-600" : "text-red-500"
                    }`}>
                    {formatSigned(row.rotationRad, 4)} rad
                  </div>
                </div>

                <div className="relative h-1 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="absolute top-0 h-full rounded-full transition-[width,left] duration-150 ease-out"
                    style={{
                      width: `${Math.abs(normalized) * 50}%`,
                      left: isNeg ? `${50 - Math.abs(normalized) * 50}%` : "50%",
                      background: isNeg ? "#2563eb" : "#dc2626",
                    }}
                  />
                  {/* Center tick */}
                  <div className="absolute top-0 left-1/2 h-full w-px -translate-x-px bg-neutral-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
