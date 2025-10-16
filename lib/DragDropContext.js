// @flow
import { createContext } from "react";
import type { LayoutItem } from "./utils";

/**
 * Context for drag and drop between grids and external containers.
 * Tracks which item is being dragged and mouse position.
 */

export type DragState = {
  sourceId: string,
  item: LayoutItem,
  mouseX: number,
  mouseY: number,
  // Offset from item's top-left corner to where mouse grabbed it (in pixels)
  offsetX: number,
  offsetY: number
};

export type DropTargetType = 'grid' | 'external';

export type DropTargetConfig = {
  id: string,
  element: HTMLElement,
  type: DropTargetType,

  // Grid-specific properties (only when type='grid')
  cols?: number,
  rowHeight?: number,
  containerWidth?: number,
  margin?: [number, number],
  onItemRemoved?: (itemId: string) => void,

  // Universal property (both grids and external containers)
  acceptsDrop: boolean | ((item: LayoutItem, sourceId: string) => boolean),

  // External container callbacks (only when type='external')
  onDragEnter?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragOver?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragLeave?: (item: LayoutItem) => void,
  onDrop?: (item: LayoutItem, mouseX: number, mouseY: number) => void
};

export type DragDropContextValue = {
  // Current drag state (null when not dragging)
  dragState: ?DragState,

  // Registered drop targets (grids and external containers)
  dropTargets: Map<string, DropTargetConfig>,

  // Context methods
  registerDropTarget: (
    id: string,
    element: HTMLElement,
    type: DropTargetType,
    config: $Shape<DropTargetConfig>
  ) => void,
  unregisterDropTarget: (id: string) => void,
  updateDropTargetConfig: (id: string, updates: $Shape<DropTargetConfig>) => void,
  startDrag: (sourceId: string, item: LayoutItem, mouseX: number, mouseY: number, offsetX: number, offsetY: number) => void,
  updateDrag: (mouseX: number, mouseY: number) => void,
  endDrag: (droppedOnTargetId: ?string) => void,

  // Get drop state for a specific target (useful for external containers to manage CSS classes)
  getDropState: (targetId: string) => { isSource: boolean, isActive: boolean, draggedItem: ?LayoutItem },

  // Transform function for adapting items between grids with different configurations
  transformItem: ?(item: LayoutItem, sourceConfig: DropTargetConfig, targetConfig: DropTargetConfig) => LayoutItem
};

const DragDropContext: React$Context<?DragDropContextValue> = createContext<?DragDropContextValue>(null);

export default DragDropContext;
