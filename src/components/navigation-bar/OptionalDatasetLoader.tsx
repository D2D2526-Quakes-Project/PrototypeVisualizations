import { AlertTriangle, Check } from "lucide-react";
import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OPTIONAL_DATASET_KEYS, type OptionalDatasetKey } from "@/features/animation-data/data-loading/loadingTypes";
import { Button } from "../ui/button";
import { useAnimationData } from "@/features/animation-data/useAnimationData";

export function OptionalDatasetLoader() {
  const { datasetStates: dataDatasetStates, requestDatasetLoad, retryDatasetLoad } = useAnimationData();

  const datasetStates = useMemo(
    () => OPTIONAL_DATASET_KEYS.map((key) => dataDatasetStates[key]).filter((state) => state.available),
    [dataDatasetStates]
  );

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
              ? "border-warning bg-warning/20 text-primary"
              : "border-border bg-background text-foreground"
          }>
          {backgroundLoadingCount > 0 ? <AlertTriangle size={11} /> : <Check size={11} />}
          <span>{loadingSummaryLabel}</span>
          {backgroundLoadingCount > 0 ? (
            <div className="bg-warning h-1.5 w-16 overflow-hidden rounded-full">
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
          <div className="text-foreground text-sm font-medium">Optional dataset loading</div>
          <div className="text-muted-foreground text-xs">
            Selected datasets continue loading in the background. Unselected datasets can be queued on demand.
          </div>
        </div>
        <div className="space-y-1.5">
          {datasetStates.map((state) => (
            <div key={state.key} className="border-border bg-background rounded border px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground text-xs font-medium">{state.label}</span>
                <span className="text-muted-foreground flex items-center gap-2 text-[10px]">
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
                      <Button
                        onClick={() => retryDatasetLoad(state.key as OptionalDatasetKey)}
                        variant="outline"
                        size="sm">
                        Retry
                      </Button>
                    ) : state.stage === "idle" || !state.selected ? (
                      <Button
                        onClick={() => requestDatasetLoad(state.key as OptionalDatasetKey)}
                        variant="outline"
                        size="sm">
                        Load
                      </Button>
                    ) : null}
                  </div>
                </span>
              </div>
              <span className="text-muted-foreground flex items-center gap-2 text-[10px]">{state.error}</span>
              {state.stage === "fetching" || state.stage === "parsing" || state.stage === "queued" ? (
                <div className="bg-muted mt-1 mb-1 h-1.5 overflow-hidden rounded-full">
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
