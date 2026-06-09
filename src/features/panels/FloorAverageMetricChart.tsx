import { CheckboxSelectPopover } from "@/components/ui/checkbox-select-popover";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePanelState } from "@/features/dockview/usePanelState";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber, formatStoryLabel, tooltipPositionFunction } from "@/lib/utils";

import { useTheme } from "@/components/ThemeProvider";
import { useGlobalStore, useLiveStore } from "@/state";
import type { IDockviewPanelProps } from "dockview-react";
import type { Color, EChartsOption, SeriesOption, XAXisComponentOption } from "echarts";
import ReactECharts from "echarts-for-react";
import React, { useEffect, useMemo, useRef } from "react";
import { renderToString } from "react-dom/server";
import { useFloorVisibility } from "../3d/contexts/useFloorVisibility";
import { getMetricConfig, getMetricKeyColor, type Metric } from "../metrics/metrics";
import { useMetrics } from "../metrics/useMetrics";
import { useThresholds } from "../metrics/useThresholds";

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

function TooltipContent({
  storyId,
  elevationIn,
  params,
  seriesMetricMap,
  metricStoryData,
}: {
  storyId: string;
  elevationIn: number;
  params: { seriesIndex?: number; dataIndex: number; color?: Color }[];
  seriesMetricMap: (Metric | null)[];
  metricStoryData: Map<Metric, Array<{ storyId: string; elevationIn: number; value: number }>>;
}) {
  return (
    <div className="text-foreground grid min-w-40 grid-cols-[1fr_auto] items-baseline gap-1">
      <div className="col-span-2 mb-1 text-sm font-bold">{formatStoryLabel(storyId, elevationIn)}</div>
      {params.map((param) => {
        if (typeof param.seriesIndex !== "number") return null;
        const metric = seriesMetricMap[param.seriesIndex];
        if (!metric) return null;
        const metricConfig = getMetricConfig(metric);
        const metricRows = metricStoryData.get(metric) ?? [];
        const metricRow = metricRows[param.dataIndex];
        if (!metricRow) return null;

        return (
          <React.Fragment key={param.seriesIndex}>
            <div className="flex min-w-12 items-center gap-1">
              <div
                style={{
                  background: `${param.color}`,
                }}
                className="h-2.5 w-2.5 rounded-full"
              />
              <span className="text-muted-foreground text-xs">{metricConfig.label}</span>
            </div>

            <span className="text-right">
              {formatNumber(metricRow.value, 3)} {metricConfig.unit.abbr}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function FloorAverageMetricChart({ api }: IDockviewPanelProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { visibleFloors } = useFloorVisibility();
  const { availableMetrics, thresholdHighlighting } = useMetrics();
  const { thresholds } = useThresholds();
  const metricPaletteOverrides = useGlobalStore((s) => s.metricPaletteOverrides);
  const { echartsTheme } = useTheme();

  const { state: panelState, setState: setPanelState } = usePanelState<FloorDisplacementChartPanelState>({
    panelId: api.id,
    panelType: "Floor Average Metric",
    defaultState: DEFAULT_FLOOR_DISPLACEMENT_CHART_PANEL_STATE,
  });

  const setHoveredItem = useLiveStore((s) => s.setHoveredItem);
  const hoveredItem = useLiveStore((s) => {
    if (s.hoveredItem?.source !== api.id && s.hoveredItem?.type === "floor") return s.hoveredItem;
    return null;
  });
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    if (hoveredItem) {
      const dataIndex = visibleFloors.indexOf(hoveredItem.storyId);

      if (dataIndex !== -1) {
        chart.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex: dataIndex,
        });
        chart.dispatchAction({
          type: "highlight",
          seriesIndex: [0, 1],
          dataIndex: dataIndex,
        });
      }
    } else {
      chart.dispatchAction({
        type: "hideTip",
      });
      chart.dispatchAction({
        type: "downplay",
      });
    }
  }, [hoveredItem, visibleFloors, api.id]);

  const metricOptions = useMemo(() => {
    const metrics =
      availableMetrics.length > 0 ? availableMetrics : DEFAULT_FLOOR_DISPLACEMENT_CHART_PANEL_STATE.selectedMetrics;
    return metrics.map((metric: Metric) => {
      const config = getMetricConfig(metric);
      return {
        value: metric,
        label: config.label,
        color: getMetricKeyColor(metric, metricPaletteOverrides),
      };
    });
  }, [availableMetrics, metricPaletteOverrides]);

  const effectiveSelectedMetrics = useMemo(
    () =>
      sanitizeSelectedMetrics(
        panelState.selectedMetrics,
        metricOptions.map((option) => option.value)
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

  const storyRows = useMemo(() => {
    return visibleFloors.map((storyId) => {
      const elevationIn = animationData.precomputed.storyElevations[storyId] || 0;
      return {
        storyId,
        elevationIn,
        label: formatStoryLabel(storyId, elevationIn),
      };
    });
  }, [animationData, visibleFloors]);

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
      const rows = visibleFloors.map((storyId) => {
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
  }, [animationData, effectiveSelectedMetrics, frameIndex, visibleFloors]);

  const option = useMemo((): EChartsOption => {
    const anyHasNegative = effectiveSelectedMetrics.some((metric) => getMetricConfig(metric).hasNegative);
    const anyHasPositive = effectiveSelectedMetrics.some((metric) => getMetricConfig(metric).hasPositive);

    const unitGroups = Array.from(
      effectiveSelectedMetrics.reduce((acc, metric) => {
        const unit = getMetricConfig(metric).unit.abbr;
        if (!acc.has(unit)) acc.set(unit, []);
        acc.get(unit)!.push(metric);
        return acc;
      }, new Map<string, Metric[]>())
    ).map(([unit, metrics]) => {
      const max = Math.max(...metrics.map((m) => getMetricConfig(m).getPrecomputedMax(animationData)));
      return {
        unit,
        metrics,
        paddedMin: anyHasNegative ? -Math.max(max * 1.15, MIN_X_AXIS_MAX) : 0,
        paddedMax: anyHasPositive ? Math.max(max * 1.15, MIN_X_AXIS_MAX) : 0,
      };
    });

    const seriesMetricMap: (Metric | null)[] = [];
    const series: SeriesOption[] = effectiveSelectedMetrics.flatMap((metric) => {
      const metricConfig = getMetricConfig(metric);
      const metricColor = metricOptions.find((option) => option.value === metric)?.color ?? "#6b7280";
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

      if (thresholdValue > 0 && thresholdHighlighting) {
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
        formatter: (params) => {
          if (!params || !Array.isArray(params) || params.length === 0) return "";
          const first = params[0];
          const row = storyRows[first.dataIndex];
          if (!row) return "";

          return renderToString(
            <TooltipContent
              storyId={row.storyId}
              elevationIn={row.elevationIn}
              params={params}
              seriesMetricMap={seriesMetricMap}
              metricStoryData={metricStoryData}
            />
          );
        },
        position: tooltipPositionFunction({ right: 0, bottom: unitGroups.length * 30 + 12 }),
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
              color: getMetricKeyColor(group.metrics[0], metricPaletteOverrides),
              fontWeight: 500,
            },
            min: group.paddedMin,
            max: group.paddedMax,
            position: "bottom",
            axisLine: {
              lineStyle: { color: getMetricKeyColor(group.metrics[0], metricPaletteOverrides) },
            },
            axisLabel: {
              color: getMetricKeyColor(group.metrics[0], metricPaletteOverrides),
              fontSize: 10,
              formatter: (value: number) => formatNumber(value, 2),
            },
            splitLine: {
              lineStyle: {
                color: getMetricKeyColor(group.metrics[0], metricPaletteOverrides) + "40",
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
    thresholdHighlighting,
    thresholds,
  ]);

  return (
    <div className="bg-background relative flex h-full w-full flex-col">
      <div className="absolute top-0 right-0 z-10 flex flex-wrap items-center justify-center p-1">
        <CheckboxSelectPopover
          options={metricOptions}
          selected={effectiveSelectedMetrics}
          onChange={(selectedMetrics) => setPanelState({ selectedMetrics })}
          triggerLabel={`${effectiveSelectedMetrics.length} selected`}
          className="max-w-full min-w-20"
        />
      </div>
      <div className="min-h-0 w-full flex-1">
        <ReactECharts
          ref={chartRef}
          theme={echartsTheme}
          option={option}
          replaceMerge={["series", "legend", "xAxis"]}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          onChartReady={(echartsInstance) => {
            echartsInstance.getZr().on("mousemove", (params) => {
              const pointInPixel = [params.offsetX, params.offsetY];
              if (echartsInstance.containPixel("grid", pointInPixel)) {
                const pointInGrid = echartsInstance.convertFromPixel("grid", pointInPixel);
                const categoryIndex = pointInGrid[1];
                const storyId = storyRows[categoryIndex].storyId;
                if (storyId) {
                  setHoveredItem({ type: "floor", storyId, source: api.id });
                }
              }
            });
            echartsInstance.getZr().on("mouseout", () => {
              setHoveredItem(null);
            });
          }}
        />
      </div>
    </div>
  );
}
