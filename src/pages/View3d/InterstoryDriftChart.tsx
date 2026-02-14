import { usePlayback } from "@/components/playback/PlaybackContext";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { renderToString } from "react-dom/server";
import { useAnimationData } from "../../hooks/nodeDataHook";

const cornerColors = {
  NW: "#3b82f6",
  NE: "#ef4444",
  SW: "#10b981",
  SE: "#f59e0b",
};

const MIN_X_AXIS_MAX = 0.01;

function TooltipContent({
  storyId,
  elevationFt,
  corners,
  currentDrifts,
  peakDrift,
}: {
  storyId: string;
  elevationFt: number;
  corners: Array<keyof typeof cornerColors>;
  currentDrifts: Record<string, Record<string, number>>;
  peakDrift: Record<string, Record<string, number>>;
}) {
  return (
    <div style={{ minWidth: "200px" }}>
      <div style={{ fontWeight: 600, marginBottom: "8px", fontSize: "13px" }}>
        Story {storyId} ({elevationFt.toFixed(0)}ft)
      </div>
      {corners.map((corner) => {
        const current = currentDrifts[storyId]?.[corner] || 0;
        const peak = peakDrift[storyId]?.[corner] || 0;

        return (
          <div
            key={corner}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginTop: "4px",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "2px",
                  background: cornerColors[corner],
                }}
              />
              <span style={{ color: "#6b7280", fontSize: "11px" }}>{corner}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontWeight: 500 }}>{current.toFixed(4)}%</span>
              <span style={{ color: "#9ca3af", fontSize: "10px", marginLeft: "6px" }}>/ {peak.toFixed(4)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterstoryDriftChart() {
  const { animationData } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { precomputed } = animationData;

  const chartData = useMemo(() => {
    const storyOrder = animationData.metadata.storyOrder;
    const peakDrift = precomputed.peakStoryDrift;
    const storyDrift = precomputed.storyDrift;

    const currentDrifts: Record<string, Record<string, number>> = {};
    let maxCurrentRatio = 0.0001;
    let maxPeakRatio = 0.0001;

    storyOrder.forEach((storyId, storyIndex) => {
      if (storyIndex === 0) return;

      const cornerDrifts = storyDrift.getStoryDrift(storyIndex, frameIndex);
      currentDrifts[storyId] = {
        NW: cornerDrifts[0],
        NE: cornerDrifts[1],
        SW: cornerDrifts[2],
        SE: cornerDrifts[3],
      };

      maxCurrentRatio = Math.max(maxCurrentRatio, ...cornerDrifts);

      const peakCornerDrifts = [
        peakDrift[storyId]?.NW || 0,
        peakDrift[storyId]?.NE || 0,
        peakDrift[storyId]?.SW || 0,
        peakDrift[storyId]?.SE || 0,
      ];
      maxPeakRatio = Math.max(maxPeakRatio, ...peakCornerDrifts);
    });

    return { currentDrifts, maxCurrentRatio, maxPeakRatio };
  }, [animationData, precomputed, frameIndex]);

  const option = useMemo(() => {
    console.log("running chartdata");
    const { currentDrifts, maxPeakRatio } = chartData;
    const { storyOrder, storyHeights } = animationData.metadata;
    const { storyElevations, peakStoryDrift } = precomputed;

    const storyOrderWithoutGround = storyOrder.slice(1);

    const yAxisData = storyOrderWithoutGround.map((storyId) => {
      const heightIn = storyHeights[storyId] || 0;
      const heightFt = heightIn / 12;
      return `${storyId} (${heightFt.toFixed(0)}ft)`;
    });

    const corners: Array<keyof typeof cornerColors> = ["NW", "NE", "SW", "SE"];

    // Create peak series first (render behind)
    const peakSeries = corners.map((corner) => ({
      name: `${corner}`,
      type: "bar" as const,
      stack: corner,
      data: storyOrderWithoutGround.map((storyId) => peakStoryDrift[storyId][corner] - currentDrifts[storyId][corner]),
      itemStyle: {
        color: cornerColors[corner],
        opacity: 0.3,
        borderRadius: [0, 2, 2, 0],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      silent: true,
      z: 1,
      legendHoverLink: false,
    }));

    // Current value series (render on top)
    const currentSeries = corners.map((corner) => ({
      name: corner,
      type: "bar" as const,
      stack: corner,
      data: storyOrderWithoutGround.map((storyId) => currentDrifts[storyId][corner] || 0),
      itemStyle: {
        color: cornerColors[corner],
        borderRadius: [0, 2, 2, 0],
      },
      barGap: "0%",
      barCategoryGap: "20%",
      z: 2,
    }));

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(0,0,0,0.05)",
          },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 12,
        textStyle: {
          color: "#374151",
          fontSize: 12,
        },
        transitionDuration: 0,
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";

          const storyIdx = params[0].dataIndex;
          const storyId = storyOrderWithoutGround[storyIdx];
          const heightIn = storyHeights[storyId] || 0;
          const heightFt = heightIn / 12;

          return renderToString(
            <TooltipContent
              storyId={storyId}
              elevationFt={heightFt}
              corners={corners}
              currentDrifts={currentDrifts}
              peakDrift={peakStoryDrift}
            />,
          );
        },
      },
      legend: {
        data: [
          ...corners.map((corner) => ({
            name: corner,
            itemStyle: { color: cornerColors[corner] },
          })),
        ],
        right: 0,
        top: 0,
        orient: "vertical" as const,
        itemGap: 8,
        textStyle: {
          fontSize: 11,
          color: "#374151",
        },
        itemWidth: 14,
        itemHeight: 14,
      },
      grid: {
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        containLabel: false,
      },
      xAxis: {
        type: "value" as const,
        name: "Drift (%)",
        nameLocation: "middle" as const,
        nameGap: 25,
        nameTextStyle: {
          fontSize: 11,
          color: "#4b5563",
          fontWeight: 500,
        },
        max: Math.max(maxPeakRatio * 1.15, MIN_X_AXIS_MAX),
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          formatter: (value: number) => value.toFixed(3),
          color: "#6b7280",
          fontSize: 10,
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
            type: "dashed" as const,
          },
        },
      },
      yAxis: {
        type: "category" as const,
        data: yAxisData,
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          color: "#374151",
          fontSize: 11,
          fontWeight: 500,
        },
        axisTick: {
          show: false,
        },
      },
      series: [...currentSeries, ...peakSeries],
      animation: false,
    };
  }, [chartData]);

  return (
    <div className="h-full w-full">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
    </div>
  );
}
