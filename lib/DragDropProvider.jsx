// @flow
import * as React from "react";
import DragDropContext from "./DragDropContext";
import type { DragDropContextValue, DragState, DropTargetConfig, DropTargetType } from "./DragDropContext";
import type { LayoutItem } from "./utils";
import type { Node as ReactNode } from "react";

type Props = {
  children: ReactNode,
  // Optional custom transform function for adapting items between grids
  transformItem?: (item: LayoutItem, sourceConfig: DropTargetConfig, targetConfig: DropTargetConfig) => LayoutItem
};

type State = {
  dragState: ?DragState,
  // Track which target the mouse is currently over (for CSS class management)
  activeDropTargetId: ?string
};

/**
 * Provider for drag and drop between grids and external containers.
 * Maintains minimal state: which item is being dragged, mouse position, and active drop target.
 * Stores drop target configurations for transforms and event callbacks.
 */
export default class DragDropProvider extends React.Component<Props, State> {
  state: State = {
    dragState: null,
    activeDropTargetId: null
  };

  dropTargets: Map<string, DropTargetConfig> = new Map();
  // Track previous mouse-over state for external containers
  previousOverTargetId: ?string = null;

  /**
   * Register a drop target (grid or external container) with the drag-drop system
   * @param {string} id - Unique target identifier
   * @param {HTMLElement} element - Target DOM element
   * @param {DropTargetType} type - Type of drop target ('grid' or 'external')
   * @param {Object} config - Configuration object with type-specific properties
   */
  registerDropTarget = (
    id: string,
    element: HTMLElement,
    type: DropTargetType,
    config: $Shape<DropTargetConfig>
  ): void => {
    this.dropTargets.set(id, {
      id,
      element,
      type,
      ...config
    });
  };

  /**
   * Unregister a drop target from the drag-drop system
   * @param {string} id - Target identifier to remove
   */
  unregisterDropTarget = (id: string): void => {
    this.dropTargets.delete(id);
  };

  /**
   * Update configuration for a registered drop target
   * @param {string} id - Target identifier
   * @param {Object} updates - Partial target configuration to update
   */
  updateDropTargetConfig = (id: string, updates: $Shape<DropTargetConfig>): void => {
    const existing = this.dropTargets.get(id);
    if (existing) {
      this.dropTargets.set(id, { ...existing, ...updates });
    }
  };

  /**
   * Start a drag operation
   * @param {string} sourceId - ID of the source (grid) where drag started
   * @param {LayoutItem} item - The item being dragged
   * @param {number} mouseX - Current mouse X position
   * @param {number} mouseY - Current mouse Y position
   * @param {number} offsetX - Offset from item's left edge to mouse
   * @param {number} offsetY - Offset from item's top edge to mouse
   */
  startDrag = (
    sourceId: string,
    item: LayoutItem,
    mouseX: number,
    mouseY: number,
    offsetX: number,
    offsetY: number
  ): void => {
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
  };

  /**
   * Update mouse position during an active drag
   * Also triggers external container callbacks (onDragEnter, onDragOver, onDragLeave)
   * @param {number} mouseX - Current mouse X position
   * @param {number} mouseY - Current mouse Y position
   */
  updateDrag = (mouseX: number, mouseY: number): void => {
    if (!this.state.dragState) return;

    const newDragState = {
      ...this.state.dragState,
      mouseX,
      mouseY
    };

    // Determine which drop target the mouse is currently over
    let currentOverTargetId: ?string = null;
    for (const [targetId, targetConfig] of this.dropTargets.entries()) {
      if (targetId !== this.state.dragState.sourceId && targetConfig.element) {
        const accepts = typeof targetConfig.acceptsDrop === 'function'
          ? targetConfig.acceptsDrop(this.state.dragState.item, this.state.dragState.sourceId)
          : targetConfig.acceptsDrop;

        if (accepts) {
          const rect = targetConfig.element.getBoundingClientRect();
          if (mouseX >= rect.left && mouseX <= rect.right &&
              mouseY >= rect.top && mouseY <= rect.bottom) {
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
  };

  /**
   * End a drag operation
   * @param {string | null} droppedOnTargetId - ID of target where item was dropped (null if dropped outside)
   */
  endDrag = (droppedOnTargetId: ?string): void => {
    const { dragState } = this.state;
    if (!dragState) return;

    // Handle drop on a target (grid or external)
    if (droppedOnTargetId && droppedOnTargetId !== dragState.sourceId) {
      const targetConfig = this.dropTargets.get(droppedOnTargetId);

      if (targetConfig) {
        const accepts = typeof targetConfig.acceptsDrop === 'function'
          ? targetConfig.acceptsDrop(dragState.item, dragState.sourceId)
          : targetConfig.acceptsDrop;

        if (accepts) {
          // Handle grid target - item removal is handled by ReactGridLayout
          if (targetConfig.type === 'grid') {
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

            // Notify source grid to remove item
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
  };

  /**
   * Default transform: preserves physical size when moving items between grids
   */
  defaultTransformItem = (
    item: LayoutItem,
    sourceConfig: DropTargetConfig,
    targetConfig: DropTargetConfig
  ): LayoutItem => {
    // Only transform between grids
    if (sourceConfig.type !== 'grid' || targetConfig.type !== 'grid') {
      return item;
    }

    if (
      sourceConfig.cols === targetConfig.cols &&
      sourceConfig.rowHeight === targetConfig.rowHeight &&
      sourceConfig.containerWidth === targetConfig.containerWidth
    ) {
      return item;
    }

    const physicalW = (item.w / sourceConfig.cols) * sourceConfig.containerWidth;
    const physicalH = item.h * sourceConfig.rowHeight;

    let w = Math.round((physicalW / targetConfig.containerWidth) * targetConfig.cols);
    let h = Math.round(physicalH / targetConfig.rowHeight);

    w = Math.max(1, w);
    h = Math.max(1, h);

    if (item.minW !== undefined) w = Math.max(item.minW, w);
    if (item.maxW !== undefined) w = Math.min(item.maxW, w);
    if (item.minH !== undefined) h = Math.max(item.minH, h);
    if (item.maxH !== undefined) h = Math.min(item.maxH, h);

    w = Math.min(w, targetConfig.cols);

    return { ...item, w, h };
  };

  /**
   * Get drop state for a specific target (for external use by Droppable components)
   * @param {string} targetId - ID of the drop target
   * @returns {Object} Drop state with isSource, isActive, draggedItem
   */
  getDropState = (targetId: string): { isSource: boolean, isActive: boolean, draggedItem: ?LayoutItem } => {
    const { dragState, activeDropTargetId } = this.state;

    if (!dragState) {
      return { isSource: false, isActive: false, draggedItem: null };
    }

    return {
      isSource: dragState.sourceId === targetId,
      isActive: activeDropTargetId === targetId,
      draggedItem: dragState.item
    };
  };

  render(): ReactNode {
    const contextValue: DragDropContextValue = {
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

    return (
      <DragDropContext.Provider value={contextValue}>
        {this.props.children}
      </DragDropContext.Provider>
    );
  }
}
