import DataSources from "@/data/index";
import { useAnimationData } from "../hooks/nodeDataHook";
import { Link, useLocation } from "react-router";
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { ChevronDown, type LucideIcon } from "lucide-react";

const VERSION = "0.1.0";

export function NavigationBar({
  routes,
}: {
  routes: { path: string; label: string; icon: LucideIcon }[];
}) {
  const location = useLocation();
  const currentRoute = routes.find((r) => r.path === location.pathname);
  const currentLabel = currentRoute?.label ?? "Select Page";
  const CurrentIcon = currentRoute?.icon;

  return (
    <div className="p-2 px-6 flex items-center justify-between border-b-2 border-neutral-300">
      <DataPicker />
      <div className="text-2xl font-bold text-neutral-800">Quakes</div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-neutral-400">v{VERSION}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {CurrentIcon && <CurrentIcon className="w-4 h-4 text-neutral-500" />}
              <span className="font-medium">{currentLabel}</span>
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <div className="flex flex-col gap-0.5">
              {routes.map((route) => {
                const isActive = location.pathname === route.path;
                const Icon = route.icon;
                return (
                  <Link
                    key={route.path}
                    to={{
                      pathname: route.path,
                      search: window.location.search,
                    }}
                    className={`px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent flex items-center gap-2 ${
                      isActive ? "bg-accent font-medium" : ""
                    }`}>
                    <Icon className="w-4 h-4 text-neutral-500" />
                    {route.label}
                  </Link>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function DataPicker() {
  const { currentBuilding, currentSimulation, loadSelection } = useAnimationData();
  return (
    <select
      value={currentBuilding?.folder + "/" + currentSimulation?.folder}
      onChange={(e) => {
        const [building, simulation] = e.target.value.split("/");
        const b = DataSources.buildings.find((b) => b.folder === building);
        if (!b) return;
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
