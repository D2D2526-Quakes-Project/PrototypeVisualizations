import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { StaticHingeHistogram } from "@/features/panels/StaticHingeHistogram";
import { summarizeHingeNodes } from "@/lib/hingeMetrics";
import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import { useMemo } from "react";

interface HingeLocalizedSummaryProps {
  title: string;
  subtitle: string;
  nodeIds: number[];
}

export function HingeLocalizedSummary({ title, subtitle, nodeIds }: HingeLocalizedSummaryProps) {
  const { animationData } = useAnimationData();

  const summary = useMemo(
    () => summarizeHingeNodes(nodeIds, animationData.precomputed.hingeNodeMetrics),
    [animationData.precomputed.hingeNodeMetrics, nodeIds]
  );

  if (!summary) {
    return (
      <section className="border-t border-neutral-200 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-neutral-800">{title}</div>
            <div className="text-[10px] text-neutral-500">{subtitle}</div>
          </div>
          <div className="text-[10px] text-neutral-500">Satic Hinges</div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">No hinge-bearing nodes fall inside this selection.</div>
      </section>
    );
  }

  return (
    <section className="border-t border-neutral-200 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-neutral-800">{title}</div>
          <div className="text-[10px] text-neutral-500">{subtitle}</div>
        </div>
        <div className="text-[10px] text-neutral-500">Satic Hinges (`rad`)</div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs">
          <span className="text-neutral-500">Hinge Nodes</span>
          <span className="font-mono text-neutral-900">
            {summary.hingeNodes.toLocaleString()} ({summary.coveragePct.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs">
          <span className="text-neutral-500">Hinge Ends</span>
          <span className="font-mono text-neutral-900">{summary.totalHingeEnds.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs">
          <span className="text-neutral-500">Mean Max Rotation</span>
          <span className="font-mono text-neutral-900">
            {summary.meanMaxRotation !== null ? (
              <UnitTooltip value={summary.meanMaxRotation} unit="rad" decimals={3} showConversions={false} />
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs">
          <span className="text-neutral-500">Mean Min Rotation</span>
          <span className="font-mono text-neutral-900">
            {summary.meanMinRotation !== null ? (
              <UnitTooltip value={summary.meanMinRotation} unit="rad" decimals={3} showConversions={false} />
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs">
          <span className="text-neutral-500">Peak Max Rotation</span>
          <span className="font-mono text-neutral-900">
            {summary.governingMaxNode?.maxRotation !== undefined ? (
              <UnitTooltip
                value={summary.governingMaxNode.maxRotation}
                unit="rad"
                decimals={3}
                showConversions={false}
              />
            ) : (
              "—"
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-1 text-xs">
          <span className="text-neutral-500">Peak Min Rotation</span>
          <span className="font-mono text-neutral-900">
            {summary.governingMinNode?.minRotation !== undefined ? (
              <UnitTooltip
                value={summary.governingMinNode.minRotation}
                unit="rad"
                decimals={3}
                showConversions={false}
              />
            ) : (
              "—"
            )}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <StaticHingeHistogram
          title="Static hinge rotation distribution"
          maxHistogram={summary.maxHistogram}
          minHistogram={summary.minHistogram}
          height={170}
        />
      </div>
    </section>
  );
}
