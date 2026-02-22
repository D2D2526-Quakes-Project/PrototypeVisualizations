import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Check, LogOutIcon, Plus, RotateCcw, Share2, Trash2, type LucideIcon } from "lucide-react";

import DataSources from "@/data/index";
import { useAnimationData } from "@/lib/useAnimationData";
import {
  copyShareableUrlToClipboard,
  createUserProfile,
  deleteUserProfile,
  getActiveProfileId,
  loadSaveProfiles,
  resetProfileToDefault,
  saveToLocalStorage,
  setActiveProfile,
  type AppState,
  type SaveProfile,
  getDefaultAppState,
  getDataSelectionFromCurrentUrl,
} from "@/features/view-3d/lib/statePersistence";
import { useViewStoreRaw } from "@/state";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

const VERSION = "0.1.0";

interface RouteItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

function getCurrentAppState(store: ReturnType<typeof useViewStoreRaw>): AppState {
  const state = store.getState();

  return {
    version: 1,
    timestamp: Date.now(),
    frameIndex: state.frameIndex,
    currentMetric: state.currentMetric,
    thresholdHighlighting: state.thresholdHighlighting,
    thresholds: state.thresholds,
    visibleFloors: state.visibleFloors,
    selectedNodeIds: state.selectedNodeIds,
    hideSelectedNodes: state.hideSelectedNodes,
    explodedView: state.explodedView,
    sliceEnabled: state.sliceEnabled,
    xRange: state.xRange,
    yRange: state.yRange,
    zRange: state.zRange,
    camera: state.cameraState,
    backgroundColor: state.backgroundColor,
    layout: state.dockviewLayout ?? getDefaultAppState().layout,
    panelStates: state.panelStates,
    dataSelection: getDataSelectionFromCurrentUrl() ?? undefined,
  };
}

export function NavigationBar({ routes }: { routes: RouteItem[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useViewStoreRaw();
  const { clearSelection } = useAnimationData();

  const [profiles, setProfiles] = useState<SaveProfile[]>(() => loadSaveProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => getActiveProfileId());
  const [activeMenu, setActiveMenu] = useState("");
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const refreshProfiles = () => {
    const loadedProfiles = loadSaveProfiles();
    setProfiles(loadedProfiles);
    setActiveProfileId(getActiveProfileId());
  };

  const backToHome = () => {
    clearSelection();
    navigate({ pathname: "/", search: window.location.search });
  };

  const switchProfile = (profile: SaveProfile) => {
    saveToLocalStorage(getCurrentAppState(store));

    const changed = setActiveProfile(profile.id);
    if (!changed) return;

    setActiveProfileId(profile.id);
    window.location.reload();
  };

  const createProfileFromCurrent = () => {
    const name = prompt("Enter a profile name:");
    if (!name) return;

    const created = createUserProfile(name, getCurrentAppState(store));
    if (!created) return;

    setActiveProfile(created.id);
    refreshProfiles();
    window.location.reload();
  };

  const deleteCurrentProfile = () => {
    if (!activeProfile || activeProfile.kind !== "user") return;
    if (!confirm(`Delete profile "${activeProfile.name}"?`)) return;

    deleteUserProfile(activeProfile.id);
    refreshProfiles();
    window.location.reload();
  };

  const resetCurrentProfile = () => {
    if (!activeProfile || activeProfile.kind !== "system") return;
    if (!confirm(`Reset "${activeProfile.name}" to defaults?`)) return;

    resetProfileToDefault(activeProfile.id);
    window.location.reload();
  };

  const copyLink = async () => {
    if (isCopyingLink) return;
    setIsCopyingLink(true);
    setActiveMenu("share");
    await copyShareableUrlToClipboard(getCurrentAppState(store));
    setIsCopyingLink(false);
    setActiveMenu("");
  };

  const clearCurrentSelection = () => {
    store.getState().setSelectedNodes([]);
  };

  const openRoute = (route: RouteItem) => {
    navigate({ pathname: route.path, search: window.location.search });
  };

  return (
    <div className="px-2 py-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-neutral-300 bg-neutral-100">
      <div className="flex items-center gap-3 justify-start min-w-0">
        <Menubar className="h-8 bg-neutral-50/80" value={activeMenu} onValueChange={setActiveMenu}>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={backToHome}>
                <LogOutIcon className="-scale-x-100" />
                Exit to Main 3D View
              </MenubarItem>

              <MenubarSub>
                <MenubarSubTrigger>Simulation</MenubarSubTrigger>
                <MenubarSubContent className="w-80 p-2">
                  <DataPicker />
                </MenubarSubContent>
              </MenubarSub>

              <MenubarSeparator />

              <MenubarItem onClick={createProfileFromCurrent}>
                <Plus />
                New Profile From Current State
              </MenubarItem>

              <MenubarSub>
                <MenubarSubTrigger>Switch Profile</MenubarSubTrigger>
                <MenubarSubContent>
                  {profiles.map((profile) => (
                    <MenubarItem key={profile.id} onClick={() => switchProfile(profile)}>
                      {profile.id === activeProfileId ? <Check /> : <span className="w-4" />}
                      <span>{profile.name}</span>
                      <span className="ml-auto text-xs text-neutral-500">
                        {profile.kind === "system" ? "Default" : "User"}
                      </span>
                    </MenubarItem>
                  ))}
                </MenubarSubContent>
              </MenubarSub>

              {activeProfile?.kind === "system" && (
                <MenubarItem onClick={resetCurrentProfile}>
                  <RotateCcw />
                  Reset "{activeProfile.name}" to Defaults
                </MenubarItem>
              )}

              {activeProfile?.kind === "user" && (
                <MenubarItem onClick={deleteCurrentProfile} variant="destructive">
                  <Trash2 />
                  Delete "{activeProfile.name}"
                </MenubarItem>
              )}

              <MenubarSeparator />
              {activeProfile?.kind === "system" && (
                <MenubarItem onClick={resetCurrentProfile}>Reset Current Profile State</MenubarItem>
              )}
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={clearCurrentSelection}>Clear Selection</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel>Pages</MenubarLabel>
              {routes.map((route) => {
                const isActive = location.pathname === route.path;
                const Icon = route.icon;
                return (
                  <MenubarItem key={route.path} onClick={() => openRoute(route)}>
                    {isActive ? <Check /> : <Icon className="size-4" />}
                    {route.label}
                  </MenubarItem>
                );
              })}
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu value="share">
            <MenubarTrigger>Share</MenubarTrigger>
            <MenubarContent>
              <MenubarItem
                disabled={isCopyingLink}
                onSelect={(event) => {
                  event.preventDefault();
                  void copyLink();
                }}>
                <Share2 />
                {isCopyingLink ? "Copying..." : "Copy Shareable Link"}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <div className="text-sm font-medium text-neutral-700 truncate">
          Profile: {activeProfile ? activeProfile.name : "Default View"}
          {activeProfile ? (
            <span className="ml-2 text-xs text-neutral-500">
              ({activeProfile.kind === "system" ? "default" : "user"})
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex justify-center">
        <AnimatedTitle />
      </div>

      <div className="flex items-center justify-end min-w-0">
        <div className="text-xs text-neutral-500">Quakes v{VERSION}</div>
      </div>
    </div>
  );
}

function AnimatedTitle() {
  return (
    <span
      className="flex cursor-pointer select-none"
      onClick={() => {
        const letters = document.querySelectorAll("[data-letter]");
        letters.forEach((element, index) => {
          element.classList.remove("animate-wiggle");
          void (element as HTMLElement).offsetWidth;
          setTimeout(() => element.classList.add("animate-wiggle"), index * 50);
        });
      }}>
      {"Quakes".split("").map((letter, index) => (
        <span
          key={index}
          data-letter
          className="inline-block text-2xl font-bold text-neutral-800 animate-wiggle"
          style={{ animationDelay: `${index * 50}ms` }}>
          {letter}
        </span>
      ))}
    </span>
  );
}

function DataPicker() {
  const { currentBuilding, currentSimulation, loadSelection } = useAnimationData();
  const currentValue =
    currentBuilding && currentSimulation ? `${currentBuilding.folder}::${currentSimulation.folder}` : "";

  return (
    <>
      <MenubarRadioGroup
        value={currentValue}
        onValueChange={(value) => {
          const [buildingFolder, simulationFolder] = value.split("::");
          const selectedBuilding = DataSources.buildings.find((item) => item.folder === buildingFolder);
          if (!selectedBuilding) return;

          const selectedSimulation = selectedBuilding.simulations.find((item) => item.folder === simulationFolder);
          if (!selectedSimulation) return;

          loadSelection(selectedBuilding, selectedSimulation);
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
    </>
  );
}
