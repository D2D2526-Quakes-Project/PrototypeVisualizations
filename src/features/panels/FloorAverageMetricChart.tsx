import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePanelState } from "@/features/dockview/usePanelState";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber, formatStoryLabel } from "@/lib/utils";

import { useGlobalStore } from "@/state";
import type { IDockviewPanelProps } from "dockview-react";
import type { EChartsOption, SeriesOption, XAXisComponentOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFloorVisibility } from "../3d/contexts/useFloorVisibility";
import { useHover } from "../3d/lib/useHover";
import { getMetricConfig, getMetricKeyColor, type Metric } from "../metrics/metrics";
import { useMetrics } from "../metrics/useMetrics";
import { useThresholds } from "../metrics/useThresholds";

type MetricOption = {
  metric: Metric;
  label: string;
  shortName: string;
  color: string;
};

const MIN_X_AXIS_MAX = 0.01;
type FloorDisplacementChartPanelState = {
  selectedMetrics: Metric[];
};

const DEFAULT_FLOOR_DISPLACEMENT_CHART_PANEL_STATE: FloorDisplacementChartPanelState = {
  selectedMetrics: ["displacementX", "displacementY"],
};

function sanitizeSelectedMetrics(value: unknown, availableMetrics: Metric[]): Metric[] {
  if (!Array.isArray(value)) {
    return availableMetrics.slice(0, Math.min(2, availableMetrics.length));
  }

  const valid = value.filter(
    (entry): entry is Metric => typeof entry === "string" && availableMetrics.includes(entry as Metric)
  );
  const unique = Array.from(new Set(valid));

  if (unique.length > 0) {
    return unique;
  }

  return availableMetrics.slice(0, Math.min(2, availableMetrics.length));
}

function MetricSelect({
  options,
  selected,
  onChange,
}: {
  options: MetricOption[];
  selected: Metric[];
  onChange: (metrics: Metric[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleOption = (metric: Metric) => {
    if (selected.includes(metric)) {
      if (selected.length > 1) {
        onChange(selected.filter((entry) => entry !== metric));
      }
      return;
    }

    onChange([...selected, metric]);
  };

  const labelText = selected.length + " selected";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-full min-w-20">
          <span className="text-foreground flex-1 truncate">{labelText || "Select Metrics"}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="flex max-h-80 flex-col gap-0.5 overflow-auto">
          {options.map((option) => {
            const isChecked = selected.includes(option.metric);
            return (
              <Label
                key={option.metric}
                className="text-foreground hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleOption(option.metric)}
                  className="data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-500"
                />
                <span className="flex-1">{option.label}</span>
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ backgroundColor: option.color }}
                />
              </Label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FloorAverageMetricChart({ api }: IDockviewPanelProps) {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics } = useMetrics();
  const { thresholds } = useThresholds();
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);

  const { state: panelState, setState: setPanelState } = usePanelState<FloorDisplacementChartPanelState>({
    panelId: api.id,
    panelType: "Floor Average Metric",
    defaultState: DEFAULT_FLOOR_DISPLACEMENT_CHART_PANEL_STATE,
  });

  const { setHoveredFloor } = useHover();

  const metricOptions = useMemo<MetricOption[]>(() => {
    const metrics =
      availableMetrics.length > 0 ? availableMetrics : DEFAULT_FLOOR_DISPLACEMENT_CHART_PANEL_STATE.selectedMetrics;
    return metrics.map((metric: Metric) => {
      const config = getMetricConfig(metric);
      return {
        metric,
        label: config.label,
        shortName: config.shortLabel,
        color: getMetricKeyColor(metric, metricPaletteOverrides),
      };
    });
  }, [availableMetrics, metricPaletteOverrides]);

  const effectiveSelectedMetrics = useMemo(
    () =>
      sanitizeSelectedMetrics(
        panelState.selectedMetrics,
        metricOptions.map((option) => option.metric)
      ),
    [metricOptions, panelState.selectedMetrics]
  );

  useEffect(() => {
    const sameLength = panelState.selectedMetrics.length === effectiveSelectedMetrics.length;
    const sameOrder =
      sameLength && panelState.selectedMetrics.every((metric, index) => metric === effectiveSelectedMetrics[index]);
    if (sameOrder) return;

    setPanelState({
      selectedMetrics: effectiveSelectedMetrics,
    });
  }, [effectiveSelectedMetrics, panelState.selectedMetrics, setPanelState]);

  const storyIds = useMemo(() => Array.from(visibleFloors).slice(1), [visibleFloors]);

  const storyRows = useMemo(() => {
    return storyIds.map((storyId) => {
      const elevationIn = animationData.precomputed.storyElevations[storyId] || 0;
      return {
        storyId,
        elevationIn,
        label: formatStoryLabel(storyId, elevationIn),
      };
    });
  }, [animationData, storyIds]);

  const metricStoryData = useMemo(() => {
    const results = new Map<
      Metric,
      Array<{
        storyId: string;
        elevationIn: number;
        value: number;
      }>
    >();

    for (const metric of effectiveSelectedMetrics) {
      const metricConfig = getMetricConfig(metric);
      const rows = storyIds.map((storyId) => {
        const nodes = animationData.metadata.stories[storyId] || [];
        const elevationIn = animationData.precomputed.storyElevations[storyId] || 0;

        if (nodes.length === 0) {
          return { storyId, elevationIn, value: 0 };
        }

        let sum = 0;
        let count = 0;

        for (const nodeIdx of nodes) {
          const value = metricConfig.getValue(animationData, frameIndex, nodeIdx);
          if (value === undefined || !isFinite(value)) continue;
          sum += value;
          count += 1;
        }

        return {
          storyId,
          elevationIn,
          value: count > 0 ? sum / count : 0,
        };
      });

      results.set(metric, rows);
    }

    return results;
  }, [animationData, effectiveSelectedMetrics, frameIndex, storyIds]);

  const option = useMemo((): EChartsOption => {
    const anyHasNegative = effectiveSelectedMetrics.some((metric) => getMetricConfig(metric).hasNegative);
    const anyHasPositive = effectiveSelectedMetrics.some((metric) => getMetricConfig(metric).hasPositive);

    const unitGroups = effectiveSelectedMetrics.map((metric) => {
      const config = getMetricConfig(metric);
      const max = config.getPrecomputedMax(animationData);

      return {
        unit: config.unit.abbr,
        metric,
        paddedMin: anyHasNegative ? -Math.max(max * 1.15, MIN_X_AXIS_MAX) : 0,
        paddedMax: anyHasPositive ? Math.max(max * 1.15, MIN_X_AXIS_MAX) : 0,
      };
    });

    const seriesMetricMap: (Metric | null)[] = [];
    const series: SeriesOption[] = effectiveSelectedMetrics.flatMap((metric) => {
      const metricConfig = getMetricConfig(metric);
      const metricColor = metricOptions.find((option) => option.metric === metric)?.color ?? "#6b7280";
      const xAxisIndex = unitGroups.findIndex((g) => g.unit === metricConfig.unit.abbr);
      const thresholdValue = metricConfig.thresholdKey === "inf" ? 0 : (thresholds[metricConfig.thresholdKey] ?? 0);

      const barSeries: SeriesOption = {
        name: `${metricConfig.shortLabel} (${metricConfig.unit.abbr})`,
        type: "bar" as const,
        xAxisIndex,
        data: (metricStoryData.get(metric) ?? []).map((row) => row.value),
        barMaxWidth: 18,
        itemStyle: {
          color: metricColor,
          opacity: 0.85,
          borderRadius: [3, 3, 3, 3] as [number, number, number, number],
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
          },
        },
        tooltip: {
          valueFormatter: (value) => `${formatNumber(Number(value), 3)} ${metricConfig.unit.abbr}`,
        },
      };

      if (thresholdValue > 0) {
        const markLineData = [];
        if (metricConfig.hasPositive) {
          markLineData.push({ xAxis: thresholdValue, name: `Threshold +${metricConfig.unit.abbr}` });
        }
        if (metricConfig.hasNegative) {
          markLineData.push({ xAxis: -thresholdValue, name: `Threshold -${metricConfig.unit.abbr}` });
        }

        seriesMetricMap.push(metric, null);
        return [
          barSeries,
          {
            name: `Threshold (${metricConfig.unit.abbr})`,
            type: "line" as const,
            xAxisIndex,
            data: [],
            symbol: "line" as const,
            lineStyle: { color: metricColor, width: 2, type: "solid" as const },
            markLine: {
              symbol: "none",
              data: markLineData,
              lineStyle: { color: metricColor, width: 2, type: "solid" as const },
              label: { show: false },
              silent: true,
            },
          } as SeriesOption,
        ];
      }

      seriesMetricMap.push(metric);
      return [barSeries];
    });

    // const axisColors = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b"];
    // const axisSplitColors = ["#e0e7ff", "#e0f2fe", "#d1fae5", "#fef3c7"];

    return {
      legend: {
        data: (series as Array<{ name?: string; markLine?: unknown }>)
          .filter((s): s is { name: string } => !!s.name && !s.name.startsWith("Threshold"))
          .map((s) => s.name)
          .concat(
            (series as Array<{ name?: string; markLine?: unknown }>)
              .filter((s): s is { name: string } => !!s.name?.startsWith("Threshold") && !!s.markLine)
              .map((s) => s.name)
          ) as string[],
        top: 35,
        right: 0,
        orient: "vertical",
        itemGap: 8,
        selectedMode: false,
        textStyle: {
          fontSize: 11,
          color: "#374151",
        },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        textStyle: { color: "#374151", fontSize: 11 },
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const first = params[0];
          const row = storyRows[first.dataIndex];
          if (!row) return "";

          const lines = [`<div style="font-weight:600;margin-bottom:6px">${row.label}</div>`];

          for (const param of params) {
            if (typeof param.seriesIndex !== "number") continue;
            const metric = seriesMetricMap[param.seriesIndex];
            if (!metric) continue;
            const metricConfig = getMetricConfig(metric);
            const metricRows = metricStoryData.get(metric) ?? [];
            const metricRow = metricRows[param.dataIndex];
            if (!metricRow) continue;

            lines.push(
              `<div style="display:flex;align-items:center;gap:8px;margin-top:2px">` +
                `<span style="width:8px;height:8px;border-radius:9999px;background:${param.color}"></span>` +
                `<span style="color:#6b7280">${metricConfig.label}:</span>` +
                `<span style="margin-left:auto;font-weight:600">${formatNumber(metricRow.value, 3)} ${metricConfig.unit.abbr}</span>` +
                `</div>`
            );
          }

          return lines.join("");
        },
      },
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: unitGroups.length * 30,
        containLabel: false,
      },

      xAxis: unitGroups.map(
        (group, idx) =>
          ({
            type: "value",
            xAxisId: String(idx),
            offset: idx * 30,
            name: group.unit,
            nameLocation: "middle",
            nameGap: 18,
            nameTextStyle: {
              fontSize: 10,
              color: getMetricKeyColor(group.metric, metricPaletteOverrides),
              fontWeight: 500,
            },
            min: group.paddedMin,
            max: group.paddedMax,
            position: "bottom",
            axisLine: {
              lineStyle: { color: getMetricKeyColor(group.metric, metricPaletteOverrides) },
            },
            axisLabel: {
              color: getMetricKeyColor(group.metric, metricPaletteOverrides),
              fontSize: 10,
              formatter: (value: number) => formatNumber(value, 2),
            },
            splitLine: {
              lineStyle: {
                color: getMetricKeyColor(group.metric, metricPaletteOverrides) + "40",
                type: "dashed" as const,
              },
            },
          }) as XAXisComponentOption
      ),
      yAxis: {
        type: "category",
        name: "Story",
        nameLocation: "end",
        nameGap: 4,
        nameTextStyle: {
          fontSize: 10,
          color: "#4b5563",
          fontWeight: 500,
        },
        data: storyRows.map((row) => row.label),
        axisLine: {
          lineStyle: { color: "#d1d5db" },
        },
        axisLabel: {
          color: "#374151",
          fontSize: 10,
          fontWeight: 500,
        },
        axisTick: { show: false },
      },
      series,
      animation: false,
    };
  }, [
    animationData,
    effectiveSelectedMetrics,
    metricOptions,
    metricStoryData,
    metricPaletteOverrides,
    storyRows,
    thresholds,
  ]);

  return (
    <div className="relative flex h-full w-full flex-col bg-white">
      <div className="absolute top-0 right-0 z-10 flex flex-wrap items-center justify-center p-1">
        <MetricSelect
          options={metricOptions}
          selected={effectiveSelectedMetrics}
          onChange={(selectedMetrics) => setPanelState({ selectedMetrics })}
        />
      </div>
      <div className="min-h-0 w-full flex-1">
        <ReactECharts
          option={option}
          replaceMerge={["series", "legend", "xAxis"]}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onEvents={{
            mouseover: (params: { dataIndex?: number }) => {
              if (params.dataIndex !== undefined && params.dataIndex >= 0) {
                const row = storyRows[params.dataIndex];
                if (row) {
                  setHoveredFloor({ type: "floor", storyId: row.storyId });
                }
              }
            },
            mouseout: () => {
              setHoveredFloor(null);
            },
          }}
        />
      </div>
    </div>
  );
}
