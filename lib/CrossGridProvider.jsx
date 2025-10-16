// @flow
import * as React from "react";
import CrossGridContext from "./CrossGridContext";
import type { CrossGridContextValue, DragState, GridConfig } from "./CrossGridContext";
import type { LayoutItem } from "./utils";
import type { Node as ReactNode } from "react";

type Props = {
  children: ReactNode,
  // Optional custom transform function for adapting items between grids
  transformItem?: (item: LayoutItem, sourceConfig: GridConfig, targetConfig: GridConfig) => LayoutItem
};

type State = {
  dragState: ?DragState
};

/**
 * Provider for cross-grid drag and drop.
 * Maintains minimal state: which item is being dragged and mouse position.
 * Stores grid configurations for transforms between different grid layouts.
 */
export default class CrossGridProvider extends React.Component<Props, State> {
  state: State = {
    dragState: null
  };

  grids: Map<string, GridConfig> = new Map();

  /**
   * Register a grid instance with the cross-grid system
   * @param {string} id - Unique grid identifier
   * @param {HTMLElement} element - Grid DOM element
   * @param {number} cols - Number of columns
   * @param {number} rowHeight - Height of each row in pixels
   * @param {number} containerWidth - Total width of grid container
   * @param {[number, number]} margin - Margin between items [x, y]
   * @param {boolean | Function} acceptsDrop - Whether grid accepts drops (boolean or predicate)
   * @param {Function} onItemRemoved - Callback when item is removed from grid
   */
  registerGrid = (
    id: string,
    element: HTMLElement,
    cols: number,
    rowHeight: number,
    containerWidth: number,
    margin: [number, number],
    acceptsDrop: boolean | ((item: LayoutItem, sourceGridId: string) => boolean),
    onItemRemoved: (itemId: string) => void
  ): void => {
    this.grids.set(id, {
      id,
      element,
      cols,
      rowHeight,
      containerWidth,
      margin,
      acceptsDrop,
      onItemRemoved
    });
  };

  /**
   * Unregister a grid from the cross-grid system
   * @param {string} id - Grid identifier to remove
   */
  unregisterGrid = (id: string): void => {
    this.grids.delete(id);
  };

  /**
   * Update configuration for a registered grid
   * @param {string} id - Grid identifier
   * @param {Object} updates - Partial grid configuration to update
   */
  updateGridConfig = (id: string, updates: $Shape<GridConfig>): void => {
    const existing = this.grids.get(id);
    if (existing) {
      this.grids.set(id, { ...existing, ...updates });
    }
  };

  /**
   * Start a cross-grid drag operation
   * @param {string} sourceGridId - ID of the grid where drag started
   * @param {LayoutItem} item - The item being dragged
   * @param {number} mouseX - Current mouse X position
   * @param {number} mouseY - Current mouse Y position
   * @param {number} offsetX - Offset from item's left edge to mouse
   * @param {number} offsetY - Offset from item's top edge to mouse
   */
  startDrag = (
    sourceGridId: string,
    item: LayoutItem,
    mouseX: number,
    mouseY: number,
    offsetX: number,
    offsetY: number
  ): void => {
    this.setState({
      dragState: {
        sourceGridId,
        item,
        mouseX,
        mouseY,
        offsetX,
        offsetY
      }
    });
  };

  /**
   * Update mouse position during an active drag
   * @param {number} mouseX - Current mouse X position
   * @param {number} mouseY - Current mouse Y position
   */
  updateDrag = (mouseX: number, mouseY: number): void => {
    if (!this.state.dragState) return;

    this.setState({
      dragState: {
        ...this.state.dragState,
        mouseX,
        mouseY
      }
    });
  };

  /**
   * End a cross-grid drag operation
   * @param {string | null} droppedOnGridId - ID of grid where item was dropped (null if dropped outside)
   */
  endDrag = (droppedOnGridId: ?string): void => {
    const { dragState } = this.state;
    if (!dragState) return;

    if (droppedOnGridId && droppedOnGridId !== dragState.sourceGridId) {
      const targetGrid = this.grids.get(droppedOnGridId);

      if (targetGrid) {
        const accepts = typeof targetGrid.acceptsDrop === 'function'
          ? targetGrid.acceptsDrop(dragState.item, dragState.sourceGridId)
          : targetGrid.acceptsDrop;

        if (accepts) {
          const sourceGrid = this.grids.get(dragState.sourceGridId);
          if (sourceGrid && sourceGrid.onItemRemoved) {
            sourceGrid.onItemRemoved(dragState.item.i);
          }
        }
      }
    }

    this.setState({ dragState: null });
  };

  /**
   * Default transform: preserves physical size when moving items between grids
   */
  defaultTransformItem = (
    item: LayoutItem,
    sourceConfig: GridConfig,
    targetConfig: GridConfig
  ): LayoutItem => {
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

  render(): ReactNode {
    const contextValue: CrossGridContextValue = {
      dragState: this.state.dragState,
      grids: this.grids,
      registerGrid: this.registerGrid,
      unregisterGrid: this.unregisterGrid,
      updateGridConfig: this.updateGridConfig,
      startDrag: this.startDrag,
      updateDrag: this.updateDrag,
      endDrag: this.endDrag,
      transformItem: this.props.transformItem || this.defaultTransformItem
    };

    return (
      <CrossGridContext.Provider value={contextValue}>
        {this.props.children}
      </CrossGridContext.Provider>
    );
  }
}
