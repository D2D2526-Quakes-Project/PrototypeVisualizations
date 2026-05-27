import { AlertTriangleIcon, Keyboard, LogOutIcon, Palette } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { usePlayback } from "@/features/playback/usePlayback";
import { useMetrics } from "@/features/metrics/useMetrics";
import { formatNumber } from "@/lib/utils";
import { useGlobalStore, useLiveStore, useProfileActions, useProfileData } from "@/state";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { DataMenu } from "./DataMenu";
import { MetricColorsBar } from "./MetricColorsBar";
import { OptionalDatasetLoader } from "./OptionalDatasetLoader";
import { ProfileMenu } from "./ProfileMenu";
import { ShortcutsBar } from "./ShortcutsBar";

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { frameIndex } = usePlayback();
  const showHiddenMetrics = useGlobalStore((state) => state.showHiddenMetrics);
  const setShowHiddenMetrics = useGlobalStore((state) => state.setShowHiddenMetrics);
  const coloredConnectionLines = useProfileData((s) => s.coloredConnectionLines);
  const { setColoredConnectionLines } = useProfileActions();

  const { allVisibilityHiddenWarning, mostNodesHiddenWarning, allFloorsHiddenWarning } = useVisibilityWarnings();

  const { animationData, clearSelection, currentBuilding, currentSimulation } = useAnimationData();
  const { isCurrentMetricStatic } = useMetrics();

  const [activeMenu, setActiveMenu] = useState("");
  // const [isCopyingLink, setIsCopyingLink] = useState(false);
  const helpDrawerOpen = useLiveStore((s) => s.helpDrawerOpen);
  const setHelpDrawerOpen = useLiveStore((s) => s.setHelpDrawerOpen);
  const metricColorsDrawerOpen = useLiveStore((s) => s.metricColorsDrawerOpen);
  const setMetricColorsDrawerOpen = useLiveStore((s) => s.setMetricColorsDrawerOpen);

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
    <div className="border-border px-app-inset grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b">
      <div className="flex h-full min-w-0 items-center justify-start gap-3">
        <Menubar className="h-full border-none" value={activeMenu} onValueChange={setActiveMenu}>
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

              <MenubarCheckboxItem checked={coloredConnectionLines} onCheckedChange={setColoredConnectionLines}>
                Colored Connection Lines
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
              <MenubarItem onClick={() => setMetricColorsDrawerOpen(true)}>
                <Palette />
                Metric Colors
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

      <Sheet open={metricColorsDrawerOpen} onOpenChange={setMetricColorsDrawerOpen}>
        <SheetContent className="h-[35vh] max-h-[50vh]" side="bottom">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Palette size={13} className="text-neutral-400" />
              Metric Colors
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col overflow-y-auto">
            <MetricColorsBar />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center justify-center gap-2 text-sm whitespace-nowrap">
        {isCurrentMetricStatic ? (
          <>
            <AnimatedTitle />
          </>
        ) : (
          <>
            <span className="font-medium">Frame:</span>
            <span className="font-mono">{frameIndex + 1}</span>
            <span className="text-neutral-300">|</span>
            <span className="font-medium">Time:</span>
            <span className="font-mono">{formatNumber(frameIndex * animationData.metadata.dt)} s</span>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-end">
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
          <OptionalDatasetLoader />
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
