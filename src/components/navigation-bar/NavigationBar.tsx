import { AlertTriangleIcon, Keyboard, LogOutIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useVisibilityWarnings } from "@/features/3d/contexts/useVisibilityWarnings";
import { OPTIONAL_DATASET_KEYS } from "@/features/animation-data/data-loading/loadingTypes";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePlayback } from "@/features/playback/usePlayback";
import { formatNumber } from "@/lib/utils";
import { useGlobalStore } from "@/state";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { DataMenu } from "./DataMenu";
import { OptionalDatasetLoader } from "./OptionalDatasetLoader";
import { ProfileMenu } from "./ProfileMenu";
import { ShortcutsBar } from "./ShortcutsBar";

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { frameIndex } = usePlayback();
  const showHiddenMetrics = useGlobalStore((state) => state.showHiddenMetrics);
  const setShowHiddenMetrics = useGlobalStore((state) => state.setShowHiddenMetrics);

  const { allVisibilityHiddenWarning, mostNodesHiddenWarning, allFloorsHiddenWarning } = useVisibilityWarnings();

  const {
    animationData,
    clearSelection,
    currentBuilding,
    currentSimulation,
    datasetStates,
    requestDatasetLoad,
    retryDatasetLoad,
  } = useAnimationData();

  const [activeMenu, setActiveMenu] = useState("");
  // const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);

  const backToHome = () => {
    clearSelection();
    navigate("/");
  };

  // const copyLink = async () => {
  //   if (isCopyingLink) return;
  //   setIsCopyingLink(true);
  //   setActiveMenu("share");
  //   await copyShareableUrlToClipboard(store);
  //   setIsCopyingLink(false);
  //   setActiveMenu("");
  // };

  // const clearCurrentSelection = () => {
  //   store.getState().setSelectedNodes([]);
  // };

  const optionalDatasetStates = useMemo(
    () => OPTIONAL_DATASET_KEYS.map((key) => datasetStates[key]).filter((state) => state.available),
    [datasetStates]
  );

  useEffect(() => {
    // Ctrl+? for help
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        setHelpDrawerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setHelpDrawerOpen]);

  return (
    <div className="border-border bg-background grid grid-cols-[auto_auto_auto] items-center gap-3 border-b">
      <div className="flex h-full min-w-0 items-center justify-start gap-3">
        <Menubar className="h-full rounded-none border-none" value={activeMenu} onValueChange={setActiveMenu}>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <AnimatedTitle />
              </MenubarItem>
              {location.pathname !== "/" && (
                <MenubarItem onClick={backToHome}>
                  <LogOutIcon className="-scale-x-100" />
                  Return to 3D View
                </MenubarItem>
              )}
              <MenubarItem onClick={backToHome}>
                <LogOutIcon className="-scale-x-100" />
                Exit to Menu
              </MenubarItem>

              {/* <MenubarItem onSelect={openExportPanel}>
                <FilmIcon />
                Export
              </MenubarItem> */}

              <MenubarSeparator />

              <MenubarCheckboxItem checked={showHiddenMetrics} onCheckedChange={setShowHiddenMetrics}>
                Show Hidden Metrics
              </MenubarCheckboxItem>

              <MenubarSeparator />

              {/* <MenubarItem
                disabled={isCopyingLink}
                onSelect={(event) => {
                  event.preventDefault();
                  void copyLink();
                }}>
                <Share2 />
                {isCopyingLink ? "Copying..." : "Copy Shareable Link"}
              </MenubarItem> */}
              <MenubarItem onClick={() => setHelpDrawerOpen(true)}>
                <Keyboard />
                Help
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <DataMenu />
          <ProfileMenu />
        </Menubar>
      </div>

      <Sheet open={helpDrawerOpen} onOpenChange={setHelpDrawerOpen}>
        <SheetContent className="h-[35vh] max-h-[50vh]" side="bottom">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Keyboard size={13} className="text-neutral-400" />
              Shortcuts
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col overflow-y-auto">
            <ShortcutsBar />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center justify-center gap-2 py-1 text-sm whitespace-nowrap">
        <span className="font-medium">Frame:</span>
        <span className="font-mono">{frameIndex + 1}</span>
        <span className="text-neutral-300">|</span>
        <span className="font-medium">Time:</span>
        <span className="font-mono">{formatNumber(frameIndex * animationData.metadata.dt)} s</span>
      </div>

      <div className="flex min-w-0 items-center justify-end py-1 pr-2">
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <div className="truncate">
            {currentBuilding?.name} / {currentSimulation?.name}
          </div>
          {allFloorsHiddenWarning && (
            <Button
              variant="ghost"
              className="border-amber-300 bg-amber-50 text-amber-800"
              size="xs"
              onClick={allFloorsHiddenWarning}>
              <AlertTriangleIcon size={11} />
              All floors hidden
              <span className="font-bold">Show</span>
            </Button>
          )}
          {mostNodesHiddenWarning && (
            <Button
              variant="ghost"
              className="border-amber-300 bg-amber-50 text-amber-800"
              size="xs"
              onClick={mostNodesHiddenWarning}>
              <AlertTriangleIcon size={11} />
              All nodes hidden
              <span className="font-bold">Show</span>
            </Button>
          )}
          {allVisibilityHiddenWarning && (
            <Button
              variant="ghost"
              className="border-amber-300 bg-amber-50 text-amber-800"
              size="xs"
              onClick={allVisibilityHiddenWarning}>
              <AlertTriangleIcon size={11} />
              All views hidden
              <span className="font-bold">Show</span>
            </Button>
          )}
          <OptionalDatasetLoader
            datasetStates={optionalDatasetStates}
            onRetry={retryDatasetLoad}
            onRequestLoad={requestDatasetLoad}
          />
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
