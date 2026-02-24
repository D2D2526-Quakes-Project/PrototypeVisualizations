import type { FloorTorsionSnapshot } from "@/features/view-3d/lib/floorTorsion";

export function FloorTorsionPlanPreview({
  snapshot,
  fill,
  className,
  label,
}: {
  snapshot: FloorTorsionSnapshot;
  fill: string;
  className?: string;
  label?: string;
}) {
  const { bounds, polygon, rotationRad, storyId } = snapshot;
  const pad = Math.max(bounds.width, bounds.height) * 0.14 || 1;
  const viewMinX = bounds.minX - pad;
  const viewMinZ = bounds.minZ - pad;
  const viewWidth = Math.max(bounds.width + pad * 2, 1);
  const viewHeight = Math.max(bounds.height + pad * 2, 1);
  const cx = bounds.minX + bounds.width / 2;
  const cz = bounds.minZ + bounds.height / 2;
  const axisLen = Math.max(bounds.width, bounds.height) * 0.22 || 1;
  const pointString = polygon.map(([x, z]) => `${x},${z}`).join(" ");

  return (
    <svg
      className={className}
      viewBox={`${viewMinX} ${viewMinZ} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label ?? `Story ${storyId} floor plan rotation preview`}>
      <title>
        {`Story ${storyId}: top-down floor rotation ${rotationRad.toFixed(6)} rad (X-Z plan)`}
      </title>
      <rect
        x={viewMinX}
        y={viewMinZ}
        width={viewWidth}
        height={viewHeight}
        fill="#fafafa"
        stroke="#e5e7eb"
        strokeWidth={Math.max(viewWidth, viewHeight) * 0.01}
      />
      <line x1={cx} y1={cz} x2={cx + axisLen} y2={cz} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="1.5 1" />
      <line x1={cx} y1={cz} x2={cx} y2={cz + axisLen} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="1.5 1" />
      <text x={cx + axisLen * 1.05} y={cz} fontSize={Math.max(viewWidth, viewHeight) * 0.08} fill="#4b5563">
        X
      </text>
      <text x={cx} y={cz + axisLen * 1.22} fontSize={Math.max(viewWidth, viewHeight) * 0.08} fill="#4b5563">
        Z
      </text>
      <polygon
        points={pointString}
        fill={fill}
        stroke="#111827"
        strokeWidth={Math.max(viewWidth, viewHeight) * 0.01}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cz} r={Math.max(viewWidth, viewHeight) * 0.02} fill="#111827" />
    </svg>
  );
}
