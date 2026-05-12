import DataSources from "@/data/index";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import {
  MenubarContent,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarTrigger,
} from "../ui/menubar";

export function DataMenu() {
  const { currentBuilding, currentSimulation, loadSelection, optionalLoadOptions } = useAnimationData();
  const currentValue =
    currentBuilding && currentSimulation ? `${currentBuilding.folder}::${currentSimulation.folder}` : "";

  return (
    <MenubarMenu>
      <MenubarTrigger>Simulation</MenubarTrigger>
      <MenubarContent>
        <MenubarRadioGroup
          value={currentValue}
          onValueChange={(value) => {
            const [buildingFolder, simulationFolder] = value.split("::");
            const selectedBuilding = DataSources.buildings.find((item) => item.folder === buildingFolder);
            if (!selectedBuilding) return;
            const selectedSimulation = selectedBuilding.simulations.find((item) => item.folder === simulationFolder);
            if (!selectedSimulation) return;
            loadSelection(selectedBuilding, selectedSimulation, optionalLoadOptions);
          }}>
          {DataSources.buildings.map((building, buildingIndex) => (
            <div key={building.folder}>
              {buildingIndex > 0 ? <MenubarSeparator /> : null}
              <MenubarLabel>{building.name}</MenubarLabel>
              {building.simulations.map((simulation) => (
                <MenubarRadioItem key={simulation.folder} value={`${building.folder}::${simulation.folder}`}>
                  {simulation.name}
                </MenubarRadioItem>
              ))}
            </div>
          ))}
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
  );
}
