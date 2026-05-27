import { Button } from "@/components/ui/button";
import { TriangleAlertIcon, LoaderCircleIcon } from "lucide-react";
import { motion } from "motion/react";
import {
  OPTIONAL_DATASET_KEYS,
  REQUIRED_DATASET_KEYS,
  type DatasetKey,
  type DatasetLoadState,
} from "./data-loading/loadingTypes";

export function LoadingOverlay({
  datasetStates,
  startupReady,
  startupError,
  onContinue,
  onReturnToMenu,
}: {
  datasetStates: Record<DatasetKey, DatasetLoadState>;
  startupReady: boolean;
  startupError: string | null;
  onContinue: () => void;
  onReturnToMenu: () => void;
}) {
  const requiredStates = REQUIRED_DATASET_KEYS.map((key) => datasetStates[key]);
  const optionalStates = OPTIONAL_DATASET_KEYS.map((key) => datasetStates[key]).filter((state) => state.selected);
  const requiredProgress = requiredStates.reduce((sum, state) => sum + state.progress, 0) / requiredStates.length;
  const optionalActiveCount = optionalStates.filter((state) => state.stage !== "ready").length;

  let memory = undefined;
  if ("memory" in performance) {
    // @ts-expect-error - performance.memory is not defined in Node
    const limit = performance.memory.jsHeapSizeLimit;
    // @ts-expect-error - performance.memory is not defined in Node
    const used = performance.memory.usedJSHeapSize;
    memory = { used, limit };
  }

  return (
    <motion.div
      key="loadingoverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-49 flex flex-col items-center justify-center bg-neutral-200">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-6 cursor-pointer text-6xl font-bold text-neutral-800 select-none"
          onClick={() => {
            const letters = document.querySelectorAll("[data-loader-letter]");
            letters.forEach((el, i) => {
              el.classList.remove("animate-wiggle");
              void (el as HTMLElement).offsetWidth;
              setTimeout(() => el.classList.add("animate-wiggle"), i * 50);
            });
          }}>
          {"Quakes".split("").map((letter, i) => (
            <span
              key={i}
              data-loader-letter
              className="animate-wiggle inline-block"
              style={{ animationDelay: `${i * 50}ms` }}>
              {letter}
            </span>
          ))}
        </motion.div>

        <div className="mb-5 text-center text-neutral-500">
          {startupReady
            ? "Required data is ready. Optional datasets continue loading in the background."
            : "Loading required data for the app..."}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex w-full flex-col gap-1.5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-800">Required startup datasets</span>
            <span className="text-neutral-500">{Math.round(requiredProgress)}%</span>
          </div>
          <div className="space-y-2">
            {requiredStates.map((state) => (
              <DatasetProgressRow key={state.key} state={state} />
            ))}
          </div>

          {optionalStates.length > 0 ? (
            <>
              <div className="mt-4 mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-800">Selected optional datasets</span>
                <span className="text-neutral-500">
                  {optionalActiveCount === 0 ? "All ready" : `${optionalActiveCount} still loading`}
                </span>
              </div>
              <div className="space-y-2">
                {optionalStates.map((state) => (
                  <DatasetProgressRow key={state.key} state={state} />
                ))}
              </div>
            </>
          ) : null}

          {memory && (
            <div className="mt-1 flex items-center gap-2 border-t border-neutral-300 pt-1">
              <span className="w-28 shrink-0 text-[10px] text-neutral-400">
                Memory — {Math.round(memory.used / 1024 / 1024)}MB
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-300/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(memory.used / memory.limit) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-indigo-300"
                />
              </div>
            </div>
          )}
        </motion.div>

        {startupReady && optionalStates.length > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                Some features may remain unavailable until the optional datasets finish loading. Loading continues
                whether or not you enter the app now.
              </div>
            </div>
          </div>
        ) : null}

        {startupError ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to load required data: {startupError}
          </div>
        ) : null}

        {startupReady ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={onReturnToMenu}>
              Return to menu
            </Button>
            <Button onClick={onContinue}>Continue into application</Button>
          </div>
        ) : (
          <div className="mt-4 flex justify-start">
            <Button variant="outline" onClick={onReturnToMenu}>
              Return to menu
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DatasetProgressRow({ state }: { state: DatasetLoadState }) {
  const isError = state.stage === "error";
  const isBusy = state.stage === "fetching" || state.stage === "parsing" || state.stage === "queued";

  return (
    <div className="flex items-center gap-2">
      <span className="w-full max-w-52 shrink-0 truncate text-sm text-neutral-700">{state.label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-300">
        <div
          style={{ width: `${state.progress}%` }}
          className={`h-full rounded-full transition-all duration-150 ${
            isError ? "bg-red-400" : state.stage === "ready" ? "bg-green-400" : "bg-amber-400"
          }`}
        />
      </div>
      <span className="flex w-full max-w-24 shrink-0 justify-end gap-1 text-right text-xs text-neutral-500">
        {isBusy ? state.message : isError ? "Failed" : state.stage === "ready" ? "Ready" : state.message}
        {isBusy ? <LoaderCircleIcon className="size-3.5 animate-spin text-neutral-400" /> : null}
      </span>
    </div>
  );
}
