import { Button } from "@/components/ui/button";
import { useFloorVisibility } from "@/features/3d/contexts/useFloorVisibility";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { slidingWindow3 } from "@/lib/utils";
import { AlertTriangleIcon, LayersIcon } from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";

export function FloorVisibilitySection() {
  const { animationData } = useAnimationData();

  const storyOrder = animationData.metadata.storyOrder;
  const storyHeights = animationData.metadata.storyHeights;

  const {
    hiddenFloors,
    noFloorsVisible,
    showFloors,
    hideFloors,
    showDefaultFloors,
    showAllFloors,
    hideAllFloors,
    isFloorVisible,
    setHiddenFloors,
  } = useFloorVisibility();
  const [dragVisibility, setDragVisibility] = useState<boolean | null>(null);
  const [draftHiddenFloors, setDraftHiddenFloors] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (dragVisibility === null) return;
    const handleMouseUp = () => {
      if (draftHiddenFloors) {
        setHiddenFloors(Array.from(draftHiddenFloors));
      }
      setDraftHiddenFloors(null);
      setDragVisibility(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragVisibility, draftHiddenFloors, setHiddenFloors]);

  const handleFloorMouseDown = (event: MouseEvent<HTMLButtonElement>, storyId: string) => {
    event.preventDefault();
    const nextVisible = hiddenFloors.includes(storyId);
    setDragVisibility(nextVisible);
    const draft = new Set(hiddenFloors);
    if (nextVisible) draft.delete(storyId);
    else draft.add(storyId);
    setDraftHiddenFloors(draft);
  };

  const handleFloorMouseEnter = (storyId: string) => {
    if (dragVisibility === null) return;
    setDraftHiddenFloors((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (dragVisibility) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  const handleFloorKeyDown = (event: KeyboardEvent<HTMLButtonElement>, storyId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (hiddenFloors.includes(storyId)) showFloors([storyId]);
    else hideFloors([storyId]);
  };

  const isVisibleLocal = useCallback(
    (storyId: string) => {
      if (draftHiddenFloors) return !draftHiddenFloors.has(storyId);
      return isFloorVisible(storyId);
    },
    [draftHiddenFloors, isFloorVisible],
  );

  const noFloorsVisibleLocal = draftHiddenFloors
    ? draftHiddenFloors.size === storyOrder.length
    : noFloorsVisible;

  const orderedStories = [...storyOrder].reverse();

  const formatHeight = (heightIn: number) => {
    if (Number.isInteger(heightIn)) return `${heightIn} in`;
    return `${heightIn.toFixed(1)} in`;
  };

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <LayersIcon size={12} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-700">Floors</span>
        </div>
        <div className="flex items-center gap-1">
          {noFloorsVisibleLocal && (
            <Button
              onClick={showDefaultFloors}
              variant={"outline"}
              size="xs"
              className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              title="All floors are hidden. Show all floors.">
              <AlertTriangleIcon size={9} />
              None visible
            </Button>
          )}
          <Button onClick={showAllFloors} variant={"outline"} size="xs">
            All
          </Button>
          <Button onClick={hideAllFloors} variant={"outline"} size="xs">
            None
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-px overflow-hidden rounded">
        {slidingWindow3(orderedStories).map(([pStoryId, storyId, nStoryId]) => {
          const isVisible = isVisibleLocal(storyId);
          const prevIsVisible = !(pStoryId && isVisibleLocal(pStoryId));
          const nextIsVisible = !(nStoryId && isVisibleLocal(nStoryId));
          return (
            <button
              key={storyId}
              type="button"
              aria-pressed={isVisible}
              aria-label={`${isVisible ? "Hide" : "Show"} floor ${storyId}`}
              onMouseDown={(event) => handleFloorMouseDown(event, storyId)}
              onMouseEnter={() => handleFloorMouseEnter(storyId)}
              onKeyDown={(event) => handleFloorKeyDown(event, storyId)}
              className={`col-span-3 grid grid-cols-subgrid border border-transparent px-2 text-right font-medium select-none ${
                isVisible
                  ? `border-border bg-primary text-primary-foreground border-x ${prevIsVisible && "rounded-t border-t"} ${nextIsVisible && "rounded-b border-b"}`
                  : `bg-background hover:bg-muted ${!prevIsVisible && "rounded-t"} ${!nextIsVisible && "rounded-b"}`
              }`}>
              <div className="truncate text-left text-xs font-medium">{storyId}</div>
              <div className="text-[11px] whitespace-nowrap">{formatHeight(storyHeights[storyId] ?? 0)}</div>
              <div className="text-[11px] whitespace-nowrap">{isVisible ? "Visible" : "Hidden"}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}
