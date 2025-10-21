"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
/*:: import type { LayoutItem } from "./utils";*/
/*:: export type DragState = {
  sourceId: string,
  item: LayoutItem,
  mouseX: number,
  mouseY: number,
  // Offset from item's top-left corner to where mouse grabbed it (in pixels)
  offsetX: number,
  offsetY: number
};*/
/**
 * Context for drag and drop between grids and external containers.
 * Tracks which item is being dragged and mouse position.
 */
/*:: export type DropTargetType = 'grid' | 'flex' | 'external';*/
/*:: export type DropTargetConfig = {
  id: string,
  element: HTMLElement,
  type: DropTargetType,

  // Grid-specific properties (only when type='grid')
  cols?: number,
  rowHeight?: number,
  containerWidth?: number,
  margin?: [number, number],
  onItemRemoved?: (itemId: string) => void,

  // Flex-specific properties (only when type='flex')
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse',
  gap?: number,
  containerHeight?: number,

  // Universal property (grids, flex layouts, and external containers)
  acceptsDrop: boolean | ((item: LayoutItem, sourceId: string) => boolean),

  // External container callbacks (only when type='external')
  onDragEnter?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragOver?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragLeave?: (item: LayoutItem) => void,
  onDrop?: (item: LayoutItem, mouseX: number, mouseY: number) => void
};*/
/*:: export type DragDropContextValue = {
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
};*/
const DragDropContext /*: React$Context<?DragDropContextValue>*/ = /*#__PURE__*/(0, _react.createContext)(null);
var _default = exports.default = DragDropContext;