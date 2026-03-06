import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AlertTriangle, Check, LogOutIcon, Plus, RotateCcw, Share2, Trash2, type LucideIcon } from "lucide-react";

import DataSources from "@/data/index";
import { useAnimationData } from "@/lib/useAnimationData";
import {
  copyShareableUrlToClipboard,
  createUserProfile,
  deleteUserProfile,
  getActiveProfileId,
  loadSaveProfiles,
  PROFILES_UPDATED_EVENT,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    hiddenNodeIds: state.hiddenNodeIds,
    hideSelectedNodes: state.hideSelectedNodes,
    expandedScale: state.expandedScale,
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
  const { animationData, clearSelection, currentBuilding, currentSimulation, loadSelection } = useAnimationData();

  const [profiles, setProfiles] = useState<SaveProfile[]>(() => loadSaveProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => getActiveProfileId());
  const [activeMenu, setActiveMenu] = useState("");
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

  const refreshProfiles = () => {
    const loadedProfiles = loadSaveProfiles();
    setProfiles(loadedProfiles);
    setActiveProfileId(getActiveProfileId());
  };

  const backToHome = () => {
    clearSelection();
    navigate("/");
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

  useEffect(() => {
    const handleProfilesUpdated = () => {
      refreshProfiles();
    };

    window.addEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
    return () => {
      window.removeEventListener(PROFILES_UPDATED_EVENT, handleProfilesUpdated);
    };
  }, []);

  const profileKindLabel =
    activeProfile?.kind === "system" ? "default" : activeProfile?.kind === "ephemeral" ? "session" : "user";

  const optionalDataWarnings = useMemo(() => {
    const checks: Array<{
      key:
        | "beamData"
        | "hingeData"
        | "displacementRot"
        | "velocityLin"
        | "velocityRot"
        | "accelerationLin"
        | "accelerationRot";
      label: string;
      available: boolean;
      loaded: boolean;
    }> = [
      {
        key: "beamData",
        label: "Beam Data",
        available: Boolean(currentBuilding?.beamData),
        loaded: Boolean(animationData?.beamData),
      },
      {
        key: "hingeData",
        label: "Hinge Data",
        available: Boolean(currentSimulation?.hingeData),
        loaded: Boolean(animationData?.hingeData),
      },
      {
        key: "displacementRot",
        label: "Rotation Displacement",
        available: Boolean(currentSimulation?.displacementRot),
        loaded: Boolean(animationData?.displacementRot),
      },
      {
        key: "velocityLin",
        label: "Linear Velocity",
        available: Boolean(currentSimulation?.velocityLin),
        loaded: Boolean(animationData?.velocityLin),
      },
      {
        key: "velocityRot",
        label: "Rotation Velocity",
        available: Boolean(currentSimulation?.velocityRot),
        loaded: Boolean(animationData?.velocityRot),
      },
      {
        key: "accelerationLin",
        label: "Linear Acceleration",
        available: Boolean(currentSimulation?.accelerationLin),
        loaded: Boolean(animationData?.accelerationLin),
      },
      {
        key: "accelerationRot",
        label: "Rotation Acceleration",
        available: Boolean(currentSimulation?.accelerationRot),
        loaded: Boolean(animationData?.accelerationRot),
      },
    ];

    return checks.filter((entry) => entry.available && !entry.loaded);
  }, [animationData, currentBuilding, currentSimulation]);

  const loadOptionalDataKey = useCallback(
    (
      key:
        | "beamData"
        | "hingeData"
        | "displacementRot"
        | "velocityLin"
        | "velocityRot"
        | "accelerationLin"
        | "accelerationRot"
    ) => {
      if (!currentBuilding || !currentSimulation) return;
      loadSelection(currentBuilding, currentSimulation, {
        beamData: Boolean(animationData?.beamData) || key === "beamData",
        hingeData: Boolean(animationData?.hingeData) || key === "hingeData",
        displacementRot: Boolean(animationData?.displacementRot) || key === "displacementRot",
        velocityLin: Boolean(animationData?.velocityLin) || key === "velocityLin",
        velocityRot: Boolean(animationData?.velocityRot) || key === "velocityRot",
        accelerationLin: Boolean(animationData?.accelerationLin) || key === "accelerationLin",
        accelerationRot: Boolean(animationData?.accelerationRot) || key === "accelerationRot",
      });
    },
    [animationData, currentBuilding, currentSimulation, loadSelection]
  );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-neutral-300 bg-neutral-100 px-2 py-1">
      <div className="flex min-w-0 items-center justify-start gap-3">
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
                        {profile.kind === "system" ? "Default" : profile.kind === "ephemeral" ? "Session" : "User"}
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

        <div className="truncate text-sm font-medium text-neutral-700">
          Profile: {activeProfile ? activeProfile.name : "Default View"}
          {activeProfile ? <span className="ml-2 text-xs text-neutral-500">({profileKindLabel})</span> : null}
        </div>
      </div>

      <div className="flex justify-center">
        <AnimatedTitle />
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="truncate">
            {currentBuilding?.name} / {currentSimulation?.name}
          </div>
          {optionalDataWarnings.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                  <AlertTriangle size={11} />
                  {optionalDataWarnings.length} optional dataset
                  {optionalDataWarnings.length === 1 ? "" : "s"} not loaded
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-sm">
                <div className="space-y-1">
                  <div className="font-medium">Optional data available but not loaded</div>
                  {optionalDataWarnings.map((warning) => (
                    <div key={warning.key} className="flex items-center justify-between gap-2">
                      <span>{warning.label}</span>
                      <button
                        onClick={() => loadOptionalDataKey(warning.key)}
                        className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-100">
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <div>Quakes v{VERSION}</div>
        </div>
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
          className="animate-wiggle inline-block text-2xl font-bold text-neutral-800"
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
