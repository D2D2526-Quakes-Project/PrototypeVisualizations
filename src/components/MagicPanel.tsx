import { InterstoryDriftChart } from "@/pages/View3d/InterstoryDriftChart";
import { SmallTimeline } from "./SmallTimeline";
import { Timeline } from "./Timeline";
import { useState } from "react";
import type { IDockviewPanelProps } from "dockview";
import { View3d } from "@/pages/View3d/page";
import { NodePanel } from "./NodePanel";

const PanelCatalog = {
  Timeline: Timeline,
  SmallTimeline: SmallTimeline,
  InterstoryDriftChart: InterstoryDriftChart,
  ["3DView"]: View3d,
} as const;

type PanelType = keyof typeof PanelCatalog;

const MagicPanel = (props: IDockviewPanelProps<{ panelType: PanelType }>) => {
  console.log("render");
  const [currentPanelType, setCurrentPanelType] = useState<PanelType>(props.params.panelType); // Default view

  const CurrentComponent = PanelCatalog[currentPanelType];

  const handlePanelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPanelType(event.target.value as PanelType);
  };

  return (
    <div className="magic-panel">
      <div className="panel-header">
        <select value={currentPanelType} onChange={handlePanelChange}>
          {Object.keys(PanelCatalog).map((panelType) => (
            <option key={panelType} value={panelType}>
              {panelType}
            </option>
          ))}
        </select>
        {/* Other dock controls can go here */}
      </div>
      <div className="panel-content">
        {/* Dynamically render the selected component and pass dock props */}
        <CurrentComponent {...props} />
      </div>
    </div>
  );
};

export default MagicPanel;
