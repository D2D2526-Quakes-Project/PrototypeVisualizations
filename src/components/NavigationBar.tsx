import DataSources from "@/data/index";
import { useAnimationData } from "../hooks/nodeDataHook";
import { Link, useLocation } from "react-router";
import React from "react";

export function NavigationBar({ routes }: { routes: { path: string; label: string }[] }) {
  const location = useLocation();

  return (
    <div className="p-4 px-6 flex gap-6 border-b-2 border-neutral-300 max-w-full overflow-x-auto relative skinny-scrollbar">
      <DataPicker />
      {routes.map((route) => {
        const isActive = location.pathname === route.path;

        return (
          <Link
            key={route.path}
            to={{
              pathname: route.path,
              search: window.location.search,
            }}
            className={`text-xl whitespace-nowrap ${isActive ? "font-bold" : "font-normal"}`}>
            {route.label}
          </Link>
        );
      })}
    </div>
  );
}

export function DataPicker() {
  const { currentBuilding, currentSimulation, loadSelection } = useAnimationData();
  return (
    <select
      value={currentBuilding?.folder + "/" + currentSimulation?.folder}
      onChange={(e) => {
        // Loopup
        const [building, simulation] = e.target.value.split("/");
        const b = DataSources.buildings.find((b) => b.folder === building);
        if (!b || b.data_type !== "binary") return;
        const s = b?.simulations.find((s) => s.folder === simulation);
        if (!s) return;
        loadSelection(b, s);
      }}>
      {DataSources.buildings.map((b) => (
        <React.Fragment key={b.folder}>
          <hr />
          <optgroup label={b.name}>
            {b.simulations.map((s) => (
              <option key={s.folder} value={`${b.folder}/${s.folder}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        </React.Fragment>
      ))}
    </select>
  );
}
