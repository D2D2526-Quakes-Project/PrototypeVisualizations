import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { useAnimationData } from "@/hooks/nodeDataHook";

export function CorrelationMatrix() {
  const { animationData } = useAnimationData();

  const correlationData = useMemo(() => {
    const { nodeCount, frameCount } = animationData.metadata;
    const { displacementLin } = animationData;

    const xValues: number[] = [];
    const yValues: number[] = [];
    const zValues: number[] = [];
    const magValues: number[] = [];

    const sampleRate = Math.max(1, Math.floor(frameCount / 100));
    const nodeSampleRate = Math.max(1, Math.floor(nodeCount / 50));

    for (let frame = 0; frame < frameCount; frame += sampleRate) {
      const frameData = displacementLin.atFrame(frame);
      for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx += nodeSampleRate) {
        const pos = frameData.at(nodeIdx);
        xValues.push(pos[0]);
        yValues.push(pos[1]);
        zValues.push(pos[2]);
        magValues.push(Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2));
      }
    }

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = (arr: number[], m: number) => Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);

    const corr = (a: number[], b: number[]) => {
      const meanA = mean(a);
      const meanB = mean(b);
      const stdA = std(a, meanA);
      const stdB = std(b, meanB);
      if (stdA === 0 || stdB === 0) return 0;
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += (a[i] - meanA) * (b[i] - meanB);
      }
      return sum / (a.length * stdA * stdB);
    };

    const labels = ["X", "Y", "Z", "Magnitude"];
    const values = [xValues, yValues, zValues, magValues];

    const matrix: number[][] = [];
    for (let i = 0; i < labels.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < labels.length; j++) {
        row.push(corr(values[i], values[j]));
      }
      matrix.push(row);
    }

    return { labels, matrix };
  }, [animationData]);

  const option = useMemo(() => {
    const { labels, matrix } = correlationData;

    const data: Array<[number, number, number]> = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = 0; j < labels.length; j++) {
        data.push([i, j, matrix[i][j]]);
      }
    }

    return {
      tooltip: {
        position: "top",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#d1d5db",
        borderWidth: 1,
        padding: 10,
        formatter: (params: any) => {
          const [i, j, value] = params.data;
          return `<div style="font-weight: 600;">${labels[i]} vs ${labels[j]}</div><div>Correlation: ${value.toFixed(4)}</div>`;
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 30,
        bottom: 40,
      },
      xAxis: {
        type: "category",
        data: labels,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "category",
        data: labels,
        splitArea: { show: true },
        axisLabel: { fontSize: 11 },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 5,
        inRange: {
          color: ["#3b82f6", "#e5e7eb", "#ef4444"],
        },
        textStyle: { fontSize: 10 },
      },
      series: [
        {
          type: "heatmap",
          data: data,
          label: {
            show: true,
            formatter: (params: any) => params.data[2].toFixed(2),
            fontSize: 11,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(0, 0, 0, 0.5)",
            },
          },
        },
      ],
      animation: false,
    };
  }, [correlationData]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="px-3 py-1.5 border-b border-neutral-100 bg-white z-20 shrink-0">
        <div className="text-sm text-neutral-700">
          <span className="font-medium">Correlation Matrix</span>
          <span className="text-neutral-400 ml-2">- Displacement axis correlations</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  );
}
