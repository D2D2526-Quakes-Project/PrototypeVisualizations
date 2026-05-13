import { UnitTooltip } from "@/components/ui/unit-tooltip";
import { StaticHingeHistogram } from "@/components/StaticHingeHistogram";
import { summarizeHingeNodes } from "@/features/metrics/hingeMetrics";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMemo } from "react";

interface HingeLocalizedSummaryProps {
  nodeIds: number[];
}

export function HingeLocalizedSummary({ nodeIds }: HingeLocalizedSummaryProps) {
  const { animationData } = useAnimationData();

  const summary = useMemo(
    () =>
      animationData.precomputed.hingeNodeMetrics
        ? summarizeHingeNodes(nodeIds, animationData.precomputed.hingeNodeMetrics)
        : null,
    [animationData.precomputed.hingeNodeMetrics, nodeIds]
  );

  if (!summary) {
    return (
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-neutral-800">Hinges</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">No hinge-bearing nodes fall inside this selection.</div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-neutral-800">Hinges</div>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-2 py-1 text-xs">
          <span className="text-neutral-500">Max Abs Rotation</span>
          <span className="font-mono text-neutral-900">
            <UnitTooltip value={summary.maxAbsRotation} unit="radians" decimals={3} showConversions={false} />
          </span>
        </div>
      </div>

      <div className="mt-3">
        <StaticHingeHistogram maxHistogram={summary.maxHistogram} minHistogram={summary.minHistogram} height={170} />
      </div>
    </section>
  );
}
