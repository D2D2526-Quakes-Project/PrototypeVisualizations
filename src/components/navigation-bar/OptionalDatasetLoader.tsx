import { AlertTriangle, Check } from "lucide-react";
import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { OptionalDatasetKey } from "@/features/animation-data/data-loading/loadingTypes";
import type { DatasetLoadState } from "@/features/animation-data/data-loading/loadingTypes";
import { Button } from "../ui/button";

interface OptionalDatasetLoaderProps {
  datasetStates: DatasetLoadState[];
  onRetry: (key: OptionalDatasetKey) => void;
  onRequestLoad: (key: OptionalDatasetKey) => void;
}

export function OptionalDatasetLoader({ datasetStates, onRetry, onRequestLoad }: OptionalDatasetLoaderProps) {
  const backgroundLoadingCount = useMemo(
    () => datasetStates.filter((state) => state.stage === "fetching" || state.stage === "parsing").length,
    [datasetStates]
  );
  const loadedOptionalCount = useMemo(
    () => datasetStates.filter((state) => state.stage === "ready").length,
    [datasetStates]
  );
  const availableOptionalCount = datasetStates.length;
  const unselectedAvailableCount = useMemo(
    () => datasetStates.filter((state) => !state.selected && state.stage !== "ready").length,
    [datasetStates]
  );
  const optionalSummaryProgress = useMemo(() => {
    const activeStates = datasetStates.filter((state) => state.stage === "fetching" || state.stage === "parsing");
    if (activeStates.length === 0) return 100;
    return activeStates.reduce((sum, state) => sum + state.progress, 0) / activeStates.length;
  }, [datasetStates]);
  const loadingSummaryLabel = useMemo(() => {
    if (backgroundLoadingCount > 0) {
      return `${backgroundLoadingCount} dataset${backgroundLoadingCount === 1 ? "" : "s"} loading`;
    }
    if (loadedOptionalCount === availableOptionalCount && availableOptionalCount > 0) {
      return `${loadedOptionalCount} datasets loaded`;
    }
    if (loadedOptionalCount > 0 && unselectedAvailableCount > 0) {
      return `${loadedOptionalCount} loaded, ${unselectedAvailableCount} available`;
    }
    return `${unselectedAvailableCount} dataset${unselectedAvailableCount === 1 ? "" : "s"} available`;
  }, [availableOptionalCount, backgroundLoadingCount, loadedOptionalCount, unselectedAvailableCount]);

  if (datasetStates.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className={
            backgroundLoadingCount > 0
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-neutral-300 bg-white text-neutral-700"
          }>
          {backgroundLoadingCount > 0 ? <AlertTriangle size={11} /> : <Check size={11} />}
          <span>{loadingSummaryLabel}</span>
          {backgroundLoadingCount > 0 ? (
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${optionalSummaryProgress}%` }}
              />
            </div>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-sm space-y-2 p-3">
        <div className="space-y-1">
          <div className="text-sm font-medium text-neutral-800">Optional dataset loading</div>
          <div className="text-xs text-neutral-500">
            Selected datasets continue loading in the background. Unselected datasets can be queued on demand.
          </div>
        </div>
        <div className="space-y-1.5">
          {datasetStates.map((state) => (
            <div key={state.key} className="rounded border border-neutral-200 bg-white px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-neutral-800">{state.label}</span>
                <span className="flex items-center gap-2 text-[10px] text-neutral-500">
                  {state.stage === "ready" ? (
                    <>
                      <Check size={11} /> Loaded
                    </>
                  ) : state.stage === "error" ? (
                    "Failed"
                  ) : state.selected ? (
                    state.message
                  ) : (
                    "Available"
                  )}
                  <div className="inline-block items-center justify-between gap-2 text-[10px]">
                    {state.stage === "error" ? (
                      <Button onClick={() => onRetry(state.key as OptionalDatasetKey)} variant="outline" size="sm">
                        Retry
                      </Button>
                    ) : state.stage === "idle" || !state.selected ? (
                      <Button
                        onClick={() => onRequestLoad(state.key as OptionalDatasetKey)}
                        variant="outline"
                        size="sm">
                        Load
                      </Button>
                    ) : null}
                  </div>
                </span>
              </div>
              <span className="flex items-center gap-2 text-[10px] text-neutral-500">{state.error}</span>
              {state.stage === "fetching" || state.stage === "parsing" || state.stage === "queued" ? (
                <div className="mt-1 mb-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
