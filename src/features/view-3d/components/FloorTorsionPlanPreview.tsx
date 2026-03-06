import { memo, useMemo } from "react";
import type { FloorTorsionSnapshot } from "@/features/view-3d/lib/floorTorsion";

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
  const axisLen = Math.max(bounds.width, bounds.height) * 0.22 || 1;
  const referencePointString = useMemo(
    () => snapshot.referencePolygon.map(([x, y]) => `${x},${y}`).join(" "),
    [snapshot.referencePolygon]
  );
  const labelFontSize = Math.max(viewWidth, viewHeight) * 0.075;
  const labelInset = Math.max(pad * 0.35, Math.max(viewWidth, viewHeight) * 0.05);

  return (
    <>
      <rect
        x={viewMinX}
        y={viewMinY}
        width={viewWidth}
        height={viewHeight}
        fill="#fafafa"
        stroke="#e5e7eb"
        strokeWidth={Math.max(viewWidth, viewHeight) * 0.01}
      />
      <line x1={cx} y1={cy} x2={cx + axisLen} y2={cy} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="1.5 1" />
      <line x1={cx} y1={cy} x2={cx} y2={cy + axisLen} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="1.5 1" />
      <text
        x={viewMinX + viewWidth - labelInset}
        y={viewMinY + viewHeight - labelInset * 0.35}
        fontSize={labelFontSize}
        textAnchor="end"
        fill="#4b5563">
        X
      </text>
      <text
        x={viewMinX + labelInset * 0.95}
        y={viewMinY + viewHeight / 2}
        fontSize={labelFontSize}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#4b5563"
        transform={`rotate(-90 ${viewMinX + labelInset * 0.95} ${viewMinY + viewHeight / 2})`}>
        Y
      </text>
      <polygon
        points={referencePointString}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="3 2"
      />
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
      <title>{`Story ${storyId}: top-down floor rotation ${rotationRad.toFixed(6)} rad (X-Y plan)`}</title>
      <MemoFloorTorsionPlanStaticLayer snapshot={snapshot} />
      <polygon
        points={pointString}
        fill={fill}
        fillOpacity={0.9}
        stroke="#334155"
        strokeWidth={0.9}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cy} r={1.25} fill="#475569" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const FloorTorsionPlanPreview = memo(FloorTorsionPlanPreviewComponent);
