/**
 * Visual Template Designer - useZoom Hook
 *
 * Manages zoom state for the canvas editor.
 * Zoom is clamped to the range [25, 400].
 */

import { useState, useCallback } from 'react';

/** Minimum allowed zoom percentage */
const MIN_ZOOM = 25;
/** Maximum allowed zoom percentage */
const MAX_ZOOM = 400;
/** Zoom step for incremental zoom in/out */
const ZOOM_STEP = 25;

/**
 * Clamp a zoom value to the valid range [25, 400].
 * Exported so it can be property-tested independently.
 */
export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export interface UseZoomOptions {
  /** Initial zoom percentage (default: 100) */
  initialZoom?: number;
  /** Canvas width in px (used for fitToWidth) */
  canvasWidth?: number;
  /** Canvas height in px (used for fitToPage) */
  canvasHeight?: number;
  /** Viewport width in px (used for fit calculations) */
  viewportWidth?: number;
  /** Viewport height in px (used for fit calculations) */
  viewportHeight?: number;
}

export interface UseZoomReturn {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (zoom: number) => void;
  fitToWidth: () => void;
  fitToPage: () => void;
  actualSize: () => void;
}

/**
 * Hook for managing canvas zoom state.
 */
export function useZoom(options: UseZoomOptions = {}): UseZoomReturn {
  const {
    initialZoom = 100,
    canvasWidth = 794,
    canvasHeight = 1123,
    viewportWidth = 800,
    viewportHeight = 900,
  } = options;

  const [zoom, setZoomState] = useState<number>(clampZoom(initialZoom));

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(clampZoom(newZoom));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomState((prev) => clampZoom(prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomState((prev) => clampZoom(prev - ZOOM_STEP));
  }, []);

  const fitToWidth = useCallback(() => {
    const ratio = (viewportWidth / canvasWidth) * 100;
    setZoomState(clampZoom(Math.floor(ratio)));
  }, [viewportWidth, canvasWidth]);

  const fitToPage = useCallback(() => {
    const ratioW = (viewportWidth / canvasWidth) * 100;
    const ratioH = (viewportHeight / canvasHeight) * 100;
    setZoomState(clampZoom(Math.floor(Math.min(ratioW, ratioH))));
  }, [viewportWidth, viewportHeight, canvasWidth, canvasHeight]);

  const actualSize = useCallback(() => {
    setZoomState(100);
  }, []);

  return { zoom, zoomIn, zoomOut, setZoom, fitToWidth, fitToPage, actualSize };
}
