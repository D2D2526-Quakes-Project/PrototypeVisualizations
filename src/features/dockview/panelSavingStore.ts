import { useSyncExternalStore } from "react";

const savingMap = new Map<string, boolean>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setPanelSaving(panelId: string, saving: boolean) {
  if (savingMap.get(panelId) === saving) return;
  if (saving) {
    savingMap.set(panelId, true);
  } else {
    savingMap.delete(panelId);
  }
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(panelId: string): () => boolean {
  return () => savingMap.has(panelId);
}

export function usePanelSaving(panelId: string): boolean {
  return useSyncExternalStore(subscribe, getSnapshot(panelId), getSnapshot(panelId));
}
