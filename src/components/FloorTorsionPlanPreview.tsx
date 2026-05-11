import { memo, useMemo } from "react";
import type { FloorTorsionSnapshot } from "@/features/3d/lib/floorTorsion";

type FloorTorsionPlanPreviewProps = {
  snapshot: FloorTorsionSnapshot;
  fill: string;
  className?: string;
  label?: string;
};

function FloorTorsionPlanStaticLayer({ snapshot }: { snapshot: FloorTorsionSnapshot }) {
  const { bounds } = snapshot;
  const pad = Math.max(bounds.width, bounds.height) * 0.14 || 1;
  const viewMinX = bounds.minX - pad;
  const viewMinY = bounds.minY - pad;
  const viewWidth = Math.max(bounds.width + pad * 2, 1);
  const viewHeight = Math.max(bounds.height + pad * 2, 1);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const axisLen = Math.max(bounds.width, bounds.height) * 0.18;
  const labelFontSize = Math.max(viewWidth, viewHeight) * 0.065;
  const tickLen = labelFontSize * 0.5;

  const referencePointString = useMemo(
    () => snapshot.referencePolygon.map(([x, y]) => `${x},${y}`).join(" "),
    [snapshot.referencePolygon]
  );

  return (
    <>
      {/* Background */}
      <rect x={viewMinX} y={viewMinY} width={viewWidth} height={viewHeight} fill="#f8fafc" />

      {/* Reference polygon (undeformed outline) */}
      <polygon
        points={referencePointString}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3 2"
      />

      {/* Axis lines — subtle, from center */}
      <line
        x1={cx - axisLen}
        y1={cy}
        x2={cx + axisLen}
        y2={cy}
        stroke="#d1d5db"
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={cx}
        y1={cy - axisLen}
        x2={cx}
        y2={cy + axisLen}
        stroke="#d1d5db"
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
      />

      {/* Axis arrowheads */}
      <polygon
        points={`${cx + axisLen},${cy} ${cx + axisLen - tickLen},${cy - tickLen * 0.5} ${cx + axisLen - tickLen},${cy + tickLen * 0.5}`}
        fill="#9ca3af"
      />
      <polygon
        points={`${cx},${cy - axisLen} ${cx - tickLen * 0.5},${cy - axisLen + tickLen} ${cx + tickLen * 0.5},${cy - axisLen + tickLen}`}
        fill="#9ca3af"
      />

      {/* Axis labels */}
      <text
        x={cx + axisLen + labelFontSize * 0.4}
        y={cy}
        fontSize={labelFontSize}
        textAnchor="start"
        dominantBaseline="middle"
        fill="#9ca3af"
        fontFamily="ui-monospace, monospace">
        X
      </text>
      <text
        x={cx}
        y={cy - axisLen - labelFontSize * 0.4}
        fontSize={labelFontSize}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="#9ca3af"
        fontFamily="ui-monospace, monospace">
        Y
      </text>
    </>
  );
}

const MemoFloorTorsionPlanStaticLayer = memo(
  FloorTorsionPlanStaticLayer,
  (prev, next) =>
    prev.snapshot.bounds === next.snapshot.bounds && prev.snapshot.referencePolygon === next.snapshot.referencePolygon
);

function FloorTorsionPlanPreviewComponent({ snapshot, fill, className, label }: FloorTorsionPlanPreviewProps) {
  const { bounds, polygon, rotationRad, storyId } = snapshot;
  const pad = Math.max(bounds.width, bounds.height) * 0.14 || 1;
  const viewMinX = bounds.minX - pad;
  const viewMinY = bounds.minY - pad;
  const viewWidth = Math.max(bounds.width + pad * 2, 1);
  const viewHeight = Math.max(bounds.height + pad * 2, 1);
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;

  const pointString = useMemo(() => polygon.map(([x, y]) => `${x},${y}`).join(" "), [polygon]);

  return (
    <svg
      className={className}
      viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label ?? `Story ${storyId} floor plan rotation preview`}>
      <title>{`Story ${storyId}: top-down floor rotation ${rotationRad.toFixed(4)} rad`}</title>

      <MemoFloorTorsionPlanStaticLayer snapshot={snapshot} />

      {/* Deformed floor polygon */}
      <polygon
        points={pointString}
        fill={fill}
        fillOpacity={0.75}
        stroke="#334155"
        strokeWidth={1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Center of rotation marker */}
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill="none"
        stroke="#475569"
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cy} r={0.8} fill="#475569" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const FloorTorsionPlanPreview = memo(FloorTorsionPlanPreviewComponent);
