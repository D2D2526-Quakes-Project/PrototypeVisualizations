import type { SerializedDockview } from 'dockview';

const LAYOUT_URL_PARAM = 'layout';
const LAST_LAYOUT_KEY = 'last_view3d_layout';

export function encodeLayoutForUrl(layout: SerializedDockview): string {
  try {
    const compressed = btoa(JSON.stringify(layout));
    return compressed;
  } catch (error) {
    console.error('Failed to encode layout for URL:', error);
    return '';
  }
}

export function decodeLayoutFromUrl(encoded: string): SerializedDockview | null {
  try {
    const decompressed = atob(encoded);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Failed to decode layout from URL:', error);
    return null;
  }
}

export function saveLayoutToLocalStorage(layout: SerializedDockview): void {
  try {
    const encoded = encodeLayoutForUrl(layout);
    if (encoded) {
      localStorage.setItem(LAST_LAYOUT_KEY, encoded);
    }
  } catch (error) {
    console.error('Failed to save layout to localStorage:', error);
  }
}

export function loadLayoutFromLocalStorage(): SerializedDockview | null {
  try {
    const encoded = localStorage.getItem(LAST_LAYOUT_KEY);
    if (encoded) {
      return decodeLayoutFromUrl(encoded);
    }
    return null;
  } catch (error) {
    console.error('Failed to load layout from localStorage:', error);
    return null;
  }
}

export function getLayoutFromCurrentUrl(): SerializedDockview | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const encodedLayout = urlParams.get(LAYOUT_URL_PARAM);
  
  if (encodedLayout) {
    return decodeLayoutFromUrl(encodedLayout);
  }
  
  return null;
}

export function removeLayoutFromUrl(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(LAYOUT_URL_PARAM);
  
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);
}

export function createShareableUrl(layout: SerializedDockview): string {
  const url = new URL(window.location.href);
  const encodedLayout = encodeLayoutForUrl(layout);
  
  if (encodedLayout) {
    url.searchParams.set(LAYOUT_URL_PARAM, encodedLayout);
  }
  
  return url.toString();
}

export function copyShareableUrlToClipboard(layout: SerializedDockview): Promise<boolean> {
  const shareableUrl = createShareableUrl(layout);
  
  return navigator.clipboard.writeText(shareableUrl)
    .then(() => true)
    .catch((error) => {
      console.error('Failed to copy URL to clipboard:', error);
      return false;
    });
}