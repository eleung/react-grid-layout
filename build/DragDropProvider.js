"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _DragDropContext = _interopRequireDefault(require("./DragDropContext"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/*:: import type { DragDropContextValue, DragState, DropTargetConfig, DropTargetType } from "./DragDropContext";*/
/*:: import type { LayoutItem } from "./utils";*/
/*:: import type { Node as ReactNode } from "react";*/
/*:: type Props = {
  children: ReactNode,
  // Optional custom transform function for adapting items between grids
  transformItem?: (item: LayoutItem, sourceConfig: DropTargetConfig, targetConfig: DropTargetConfig) => LayoutItem
};*/
/*:: type State = {
  dragState: ?DragState,
  // Track which target the mouse is currently over (for CSS class management)
  activeDropTargetId: ?string
};*/
/**
 * Provider for drag and drop between grids and external containers.
 * Maintains minimal state: which item is being dragged, mouse position, and active drop target.
 * Stores drop target configurations for transforms and event callbacks.
 */
class DragDropProvider extends React.Component /*:: <Props, State>*/{
  constructor() {
    super(...arguments);
    _defineProperty(this, "state", {
      dragState: null,
      activeDropTargetId: null
    });
    _defineProperty(this, "dropTargets", new Map());
    // Track previous mouse-over state for external containers
    _defineProperty(this, "previousOverTargetId", null);
    /**
     * Register a drop target (grid or external container) with the drag-drop system
     * @param {string} id - Unique target identifier
     * @param {HTMLElement} element - Target DOM element
     * @param {DropTargetType} type - Type of drop target ('grid' or 'external')
     * @param {Object} config - Configuration object with type-specific properties
     */
    _defineProperty(this, "registerDropTarget", (id /*: string*/, element /*: HTMLElement*/, type /*: DropTargetType*/, config /*: $Shape<DropTargetConfig>*/) => /*: void*/{
      this.dropTargets.set(id, {
        id,
        element,
        type,
        ...config
      });
    });
    /**
     * Unregister a drop target from the drag-drop system
     * @param {string} id - Target identifier to remove
     */
    _defineProperty(this, "unregisterDropTarget", (id /*: string*/) => /*: void*/{
      this.dropTargets.delete(id);
    });
    /**
     * Update configuration for a registered drop target
     * @param {string} id - Target identifier
     * @param {Object} updates - Partial target configuration to update
     */
    _defineProperty(this, "updateDropTargetConfig", (id /*: string*/, updates /*: $Shape<DropTargetConfig>*/) => /*: void*/{
      const existing = this.dropTargets.get(id);
      if (existing) {
        this.dropTargets.set(id, {
          ...existing,
          ...updates
        });
      }
    });
    /**
     * Start a drag operation
     * @param {string} sourceId - ID of the source (grid) where drag started
     * @param {LayoutItem} item - The item being dragged
     * @param {number} mouseX - Current mouse X position
     * @param {number} mouseY - Current mouse Y position
     * @param {number} offsetX - Offset from item's left edge to mouse
     * @param {number} offsetY - Offset from item's top edge to mouse
     */
    _defineProperty(this, "startDrag", (sourceId /*: string*/, item /*: LayoutItem*/, mouseX /*: number*/, mouseY /*: number*/, offsetX /*: number*/, offsetY /*: number*/) => /*: void*/{
      this.setState({
        dragState: {
          sourceId,
          item,
          mouseX,
          mouseY,
          offsetX,
          offsetY
        },
        activeDropTargetId: null
      });
      this.previousOverTargetId = null;
    });
    /**
     * Update mouse position during an active drag
     * Also triggers external container callbacks (onDragEnter, onDragOver, onDragLeave)
     * @param {number} mouseX - Current mouse X position
     * @param {number} mouseY - Current mouse Y position
     */
    _defineProperty(this, "updateDrag", (mouseX /*: number*/, mouseY /*: number*/) => /*: void*/{
      if (!this.state.dragState) return;
      const newDragState = {
        ...this.state.dragState,
        mouseX,
        mouseY
      };

      // Determine which drop target the mouse is currently over
      let currentOverTargetId /*: ?string*/ = null;
      for (const [targetId, targetConfig] of this.dropTargets.entries()) {
        if (targetId !== this.state.dragState.sourceId && targetConfig.element) {
          const accepts = typeof targetConfig.acceptsDrop === 'function' ? targetConfig.acceptsDrop(this.state.dragState.item, this.state.dragState.sourceId) : targetConfig.acceptsDrop;
          if (accepts) {
            const rect = targetConfig.element.getBoundingClientRect();
            if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
              currentOverTargetId = targetId;
              break;
            }
          }
        }
      }

      // Handle external container drag events
      if (currentOverTargetId !== this.previousOverTargetId) {
        // Mouse left previous target
        if (this.previousOverTargetId) {
          const prevTarget = this.dropTargets.get(this.previousOverTargetId);
          if (prevTarget && prevTarget.type === 'external' && prevTarget.onDragLeave) {
            prevTarget.onDragLeave(this.state.dragState.item);
          }
        }

        // Mouse entered new target
        if (currentOverTargetId) {
          const currentTarget = this.dropTargets.get(currentOverTargetId);
          if (currentTarget && currentTarget.type === 'external' && currentTarget.onDragEnter) {
            currentTarget.onDragEnter(this.state.dragState.item, mouseX, mouseY);
          }
        }
        this.previousOverTargetId = currentOverTargetId;
      } else if (currentOverTargetId) {
        // Mouse still over same target - trigger onDragOver
        const currentTarget = this.dropTargets.get(currentOverTargetId);
        if (currentTarget && currentTarget.type === 'external' && currentTarget.onDragOver) {
          currentTarget.onDragOver(this.state.dragState.item, mouseX, mouseY);
        }
      }
      this.setState({
        dragState: newDragState,
        activeDropTargetId: currentOverTargetId
      });
    });
    /**
     * End a drag operation
     * @param {string | null} droppedOnTargetId - ID of target where item was dropped (null if dropped outside)
     */
    _defineProperty(this, "endDrag", (droppedOnTargetId /*: ?string*/) => /*: void*/{
      const {
        dragState
      } = this.state;
      if (!dragState) return;

      // Handle drop on a target (grid, flex, or external)
      if (droppedOnTargetId && droppedOnTargetId !== dragState.sourceId) {
        const targetConfig = this.dropTargets.get(droppedOnTargetId);
        if (targetConfig) {
          const accepts = typeof targetConfig.acceptsDrop === 'function' ? targetConfig.acceptsDrop(dragState.item, dragState.sourceId) : targetConfig.acceptsDrop;
          if (accepts) {
            // Handle grid target - item removal is handled by ReactGridLayout
            if (targetConfig.type === 'grid') {
              const sourceConfig = this.dropTargets.get(dragState.sourceId);
              if (sourceConfig && sourceConfig.onItemRemoved) {
                sourceConfig.onItemRemoved(dragState.item.i);
              }
            }

            // Handle flex target - item removal is handled by ReactFlexLayout
            if (targetConfig.type === 'flex') {
              const sourceConfig = this.dropTargets.get(dragState.sourceId);
              if (sourceConfig && sourceConfig.onItemRemoved) {
                sourceConfig.onItemRemoved(dragState.item.i);
              }
            }

            // Handle external container target
            if (targetConfig.type === 'external') {
              // Call external container's onDrop callback
              if (targetConfig.onDrop) {
                targetConfig.onDrop(dragState.item, dragState.mouseX, dragState.mouseY);
              }

              // Notify source (grid or flex) to remove item
              const sourceConfig = this.dropTargets.get(dragState.sourceId);
              if (sourceConfig && sourceConfig.onItemRemoved) {
                sourceConfig.onItemRemoved(dragState.item.i);
              }
            }
          }
        }
      } else {
        // Dropped outside or back on source - trigger onDragLeave if needed
        if (this.previousOverTargetId) {
          const prevTarget = this.dropTargets.get(this.previousOverTargetId);
          if (prevTarget && prevTarget.type === 'external' && prevTarget.onDragLeave) {
            prevTarget.onDragLeave(dragState.item);
          }
        }
      }
      this.setState({
        dragState: null,
        activeDropTargetId: null
      });
      this.previousOverTargetId = null;
    });
    /**
     * Default transform: preserves physical size when moving items between different layouts
     */
    _defineProperty(this, "defaultTransformItem", (item /*: LayoutItem*/, sourceConfig /*: DropTargetConfig*/, targetConfig /*: DropTargetConfig*/) => /*: LayoutItem*/{
      const sourceType = sourceConfig.type;
      const targetType = targetConfig.type;

      // Grid -> Grid transformation
      if (sourceType === 'grid' && targetType === 'grid') {
        return this.transformGridToGrid(item, sourceConfig, targetConfig);
      }

      // Grid -> Flex transformation
      if (sourceType === 'grid' && targetType === 'flex') {
        return this.transformGridToFlex(item, sourceConfig, targetConfig);
      }

      // Flex -> Grid transformation
      if (sourceType === 'flex' && targetType === 'grid') {
        return this.transformFlexToGrid(item, sourceConfig, targetConfig);
      }

      // Flex -> Flex transformation
      if (sourceType === 'flex' && targetType === 'flex') {
        return this.transformFlexToFlex(item, sourceConfig, targetConfig);
      }

      // No transformation for other combinations (e.g., to external containers)
      return item;
    });
    _defineProperty(this, "transformGridToGrid", (item /*: LayoutItem*/, sourceConfig /*: DropTargetConfig*/, targetConfig /*: DropTargetConfig*/) => /*: LayoutItem*/{
      if (sourceConfig.cols === targetConfig.cols && sourceConfig.rowHeight === targetConfig.rowHeight && sourceConfig.containerWidth === targetConfig.containerWidth) {
        return item;
      }
      const physicalW = item.w / sourceConfig.cols * sourceConfig.containerWidth;
      const physicalH = item.h * sourceConfig.rowHeight;
      let w = Math.round(physicalW / targetConfig.containerWidth * targetConfig.cols);
      let h = Math.round(physicalH / targetConfig.rowHeight);
      w = Math.max(1, w);
      h = Math.max(1, h);
      if (item.minW !== undefined) w = Math.max(item.minW, w);
      if (item.maxW !== undefined) w = Math.min(item.maxW, w);
      if (item.minH !== undefined) h = Math.max(item.minH, h);
      if (item.maxH !== undefined) h = Math.min(item.maxH, h);
      w = Math.min(w, targetConfig.cols);
      return {
        ...item,
        w,
        h
      };
    });
    /**
     * Helper: Convert grid constraints (minW, maxW, minH, maxH) to flex constraints (minWidth, maxWidth, etc)
     */
    _defineProperty(this, "convertGridConstraintsToFlex", (item /*: LayoutItem*/, cols /*: number*/, containerWidth /*: number*/, rowHeight /*: number*/) => /*: $Shape<LayoutItem>*/{
      return {
        minWidth: item.minW !== undefined ? item.minW / cols * containerWidth : undefined,
        maxWidth: item.maxW !== undefined ? item.maxW / cols * containerWidth : undefined,
        minHeight: item.minH !== undefined ? item.minH * rowHeight : undefined,
        maxHeight: item.maxH !== undefined ? item.maxH * rowHeight : undefined
      };
    });
    /**
     * Helper: Convert flex constraints (minWidth, maxWidth, etc) to grid constraints (minW, maxW, etc)
     */
    _defineProperty(this, "convertFlexConstraintsToGrid", (item /*: LayoutItem*/, cols /*: number*/, containerWidth /*: number*/, rowHeight /*: number*/) => /*: $Shape<LayoutItem>*/{
      return {
        minW: item.minWidth !== undefined ? Math.max(1, Math.round(item.minWidth / containerWidth * cols)) : undefined,
        maxW: item.maxWidth !== undefined ? Math.round(item.maxWidth / containerWidth * cols) : undefined,
        minH: item.minHeight !== undefined ? Math.max(1, Math.round(item.minHeight / rowHeight)) : undefined,
        maxH: item.maxHeight !== undefined ? Math.round(item.maxHeight / rowHeight) : undefined
      };
    });
    _defineProperty(this, "transformGridToFlex", (item /*: LayoutItem*/, sourceConfig /*: DropTargetConfig*/, targetConfig /*: DropTargetConfig*/) => /*: LayoutItem*/{
      // Validate and get config with defaults
      if (!sourceConfig.containerWidth || !sourceConfig.cols || !sourceConfig.rowHeight) {
        console.warn('DragDropProvider: Missing source grid config for grid-to-flex transformation. Using defaults.');
      }
      const containerWidth = sourceConfig.containerWidth || 1200;
      const cols = sourceConfig.cols || 12;
      const rowHeight = sourceConfig.rowHeight || 30;

      // Convert grid dimensions to physical pixels
      const physicalWidth = item.w / cols * containerWidth;
      const physicalHeight = item.h * rowHeight;
      return {
        i: item.i,
        order: 0,
        grow: 0,
        shrink: 1,
        width: physicalWidth,
        height: physicalHeight,
        ...this.convertGridConstraintsToFlex(item, cols, containerWidth, rowHeight)
      };
    });
    _defineProperty(this, "transformFlexToGrid", (item /*: LayoutItem*/, sourceConfig /*: DropTargetConfig*/, targetConfig /*: DropTargetConfig*/) => /*: LayoutItem*/{
      // Validate and get config with defaults
      if (!targetConfig.containerWidth || !targetConfig.cols || !targetConfig.rowHeight) {
        console.warn('DragDropProvider: Missing target grid config for flex-to-grid transformation. Using defaults.');
      }
      const containerWidth = targetConfig.containerWidth || 1200;
      const cols = targetConfig.cols || 12;
      const rowHeight = targetConfig.rowHeight || 30;

      // Use actual measured dimensions with sensible defaults
      const defaultWidth = 2 / cols * containerWidth;
      const defaultHeight = 2 * rowHeight;
      const physicalW = item.width || defaultWidth;
      const physicalH = item.height || defaultHeight;

      // Convert to grid units
      let w = Math.max(1, Math.round(physicalW / containerWidth * cols));
      let h = Math.max(1, Math.round(physicalH / rowHeight));

      // Get converted constraints
      const constraints = this.convertFlexConstraintsToGrid(item, cols, containerWidth, rowHeight);

      // Apply constraints to w and h
      if (constraints.minW !== undefined) w = Math.max(w, constraints.minW);
      if (constraints.maxW !== undefined) w = Math.min(w, constraints.maxW);
      if (constraints.minH !== undefined) h = Math.max(h, constraints.minH);
      if (constraints.maxH !== undefined) h = Math.min(h, constraints.maxH);
      w = Math.min(w, cols);
      return {
        i: item.i,
        w,
        h,
        x: 0,
        y: 0,
        ...constraints
      };
    });
    _defineProperty(this, "transformFlexToFlex", (item /*: LayoutItem*/, sourceConfig /*: DropTargetConfig*/, targetConfig /*: DropTargetConfig*/) => /*: LayoutItem*/{
      return {
        i: item.i,
        grow: item.grow || 0,
        shrink: item.shrink !== undefined ? item.shrink : 1,
        order: 0,
        alignSelf: item.alignSelf,
        minWidth: item.minWidth,
        maxWidth: item.maxWidth,
        minHeight: item.minHeight,
        maxHeight: item.maxHeight
      };
    });
    /**
     * Get drop state for a specific target (for external use by Droppable components)
     * @param {string} targetId - ID of the drop target
     * @returns {Object} Drop state with isSource, isActive, draggedItem
     */
    _defineProperty(this, "getDropState", (targetId /*: string*/) => /*: { isSource: boolean, isActive: boolean, draggedItem: ?LayoutItem }*/{
      const {
        dragState,
        activeDropTargetId
      } = this.state;
      if (!dragState) {
        return {
          isSource: false,
          isActive: false,
          draggedItem: null
        };
      }
      return {
        isSource: dragState.sourceId === targetId,
        isActive: activeDropTargetId === targetId,
        draggedItem: dragState.item
      };
    });
  }
  render() /*: ReactNode*/{
    const contextValue /*: DragDropContextValue*/ = {
      dragState: this.state.dragState,
      dropTargets: this.dropTargets,
      registerDropTarget: this.registerDropTarget,
      unregisterDropTarget: this.unregisterDropTarget,
      updateDropTargetConfig: this.updateDropTargetConfig,
      startDrag: this.startDrag,
      updateDrag: this.updateDrag,
      endDrag: this.endDrag,
      getDropState: this.getDropState,
      transformItem: this.props.transformItem || this.defaultTransformItem
    };
    return /*#__PURE__*/React.createElement(_DragDropContext.default.Provider, {
      value: contextValue
    }, this.props.children);
  }
}
exports.default = DragDropProvider;