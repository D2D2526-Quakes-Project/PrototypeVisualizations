import { InterstoryDriftChart } from "@/pages/View3d/InterstoryDriftChart";
import { MainCanvasPanel } from "@/pages/View3d/MainCanvasPanel";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { SmallTimeline } from "./SmallTimeline";
import { Timeline } from "./Timeline";

const PanelCatalog = {
  Timeline: Timeline,
  SmallTimeline: SmallTimeline,
  InterstoryDriftChart: InterstoryDriftChart,
  MainCanvas: MainCanvasPanel,
} as const;

type PanelType = keyof typeof PanelCatalog;

export const MagicPanel = (props: IDockviewPanelProps<{ panelType: PanelType }>) => {
  const currentPanelType = props.params.panelType;
  const CurrentComponent = PanelCatalog[currentPanelType];

  return (
    <div className="h-full w-full relative">
      <div className="h-full w-full">
        {/* Dynamically render the selected component and pass dock props */}
        <CurrentComponent {...props} />
      </div>
    </div>
  );
};

export const MagicPanelTab = (props: IDockviewPanelHeaderProps<{ panelType: PanelType }>) => {
  const currentPanelType = props.params.panelType;

  const handlePanelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPanelType = event.target.value as PanelType;
    props.api.updateParameters({ panelType: newPanelType });
  };

  return (
    <div className="flex z-10 justify-between w-full border-b-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm p-2">
      {/* <span className="text-sm font-medium text-neutral-700">{props} */}
      <select value={currentPanelType} onChange={handlePanelChange}>
        {Object.keys(PanelCatalog).map((panelType) => (
          <option key={panelType} value={panelType}>
            {panelType}
          </option>
        ))}
      </select>
    </div>
  );
};
