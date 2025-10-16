// @flow
import { createContext } from "react";
import type { LayoutItem } from "./utils";

/**
 * Minimal context for cross-grid drag and drop.
 * Tracks which item is being dragged and mouse position.
 */

export type DragState = {
  sourceGridId: string,
  item: LayoutItem,
  mouseX: number,
  mouseY: number,
  // Offset from item's top-left corner to where mouse grabbed it (in pixels)
  offsetX: number,
  offsetY: number
};

export type GridConfig = {
  id: string,
  element: HTMLElement,
  cols: number,
  rowHeight: number,
  containerWidth: number,
  margin: [number, number],
  acceptsDrop: boolean | ((item: LayoutItem, sourceGridId: string) => boolean),
  onItemRemoved: (itemId: string) => void
};

export type CrossGridContextValue = {
  // Current drag state (null when not dragging)
  dragState: ?DragState,

  // Registered grids with their configurations
  grids: Map<string, GridConfig>,

  // Context methods
  registerGrid: (
    id: string,
    element: HTMLElement,
    cols: number,
    rowHeight: number,
    containerWidth: number,
    margin: [number, number],
    acceptsDrop: boolean | ((item: LayoutItem, sourceGridId: string) => boolean),
    onItemRemoved: (itemId: string) => void
  ) => void,
  unregisterGrid: (id: string) => void,
  updateGridConfig: (id: string, updates: $Shape<GridConfig>) => void,
  startDrag: (sourceGridId: string, item: LayoutItem, mouseX: number, mouseY: number, offsetX: number, offsetY: number) => void,
  updateDrag: (mouseX: number, mouseY: number) => void,
  endDrag: (droppedOnGridId: ?string) => void,

  // Transform function for adapting items between grids with different configurations
  transformItem: ?(item: LayoutItem, sourceConfig: GridConfig, targetConfig: GridConfig) => LayoutItem
};

const CrossGridContext: React$Context<?CrossGridContextValue> = createContext<?CrossGridContextValue>(null);

export default CrossGridContext;
