// @flow
import * as React from "react";

import { deepEqual } from "fast-equals";
import clsx from "clsx";
import {
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  compactType,
  fastRGLPropsEqual,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  noop,
  synchronizeLayoutWithChildren,
  withLayoutItem
} from "./utils";

import { calcXY } from "./calculateUtils";

import GridItem from "./GridItem";
import ReactGridLayoutPropTypes from "./ReactGridLayoutPropTypes";
import DragDropContext from "./DragDropContext";
import type { DragDropContextValue } from "./DragDropContext";
import type {
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";

// Types
import type {
  CompactType,
  GridResizeEvent,
  GridDragEvent,
  DragOverEvent,
  Layout,
  DroppingPosition,
  LayoutItem
} from "./utils";

import type { PositionParams } from "./calculateUtils";

type State = {
  activeDrag: ?LayoutItem,
  layout: Layout,
  mounted: boolean,
  oldDragItem: ?LayoutItem,
  oldLayout: ?Layout,
  oldResizeItem: ?LayoutItem,
  resizing: boolean,
  droppingDOMNode: ?ReactElement<any>,
  droppingPosition?: DroppingPosition,
  // Cross-grid drag state
  isDropActive: boolean,
  isDropSource: boolean,
  // Mirrored props
  children: ReactChildrenArray<ReactElement<any>>,
  compactType?: CompactType,
  propsLayout?: Layout
};

import type { Props, DefaultProps } from "./ReactGridLayoutPropTypes";

// End Types

const layoutClassName = "react-grid-layout";
let isFirefox = false;
// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch (e) {
  /* Ignore */
}

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

export default class ReactGridLayout extends React.Component<Props, State> {
  // TODO publish internal ReactClass displayName transform
  static displayName: ?string = "ReactGridLayout";

  // Refactored to another module to make way for preval
  static propTypes = ReactGridLayoutPropTypes;

  // Context for drag and drop (grids and external containers)
  static contextType = DragDropContext;
  context: ?DragDropContextValue;

  static defaultProps: DefaultProps = {
    autoSize: true,
    cols: 12,
    className: "",
    style: {},
    draggableHandle: "",
    draggableCancel: "",
    containerPadding: null,
    rowHeight: 150,
    maxRows: Infinity, // infinite vertical growth
    layout: [],
    margin: [10, 10],
    isBounded: false,
    isDraggable: true,
    isResizable: true,
    allowOverlap: false,
    isDroppable: false,
    useCSSTransforms: true,
    transformScale: 1,
    verticalCompact: true,
    compactType: "vertical",
    preventCollision: false,
    droppingItem: {
      i: "__dropping-elem__",
      h: 1,
      w: 1
    },
    resizeHandles: ["se"],
    onLayoutChange: noop,
    onDragStart: noop,
    onDrag: noop,
    onDragStop: noop,
    onResizeStart: noop,
    onResize: noop,
    onResizeStop: noop,
    onDrop: noop,
    onDropDragOver: noop,
    // Cross-grid defaults
    enableCrossGridDrag: false,
    crossGridAcceptsDrop: true
  };

  state: State = {
    activeDrag: null,
    layout: synchronizeLayoutWithChildren(
      this.props.layout,
      this.props.children,
      this.props.cols,
      // Legacy support for verticalCompact: false
      compactType(this.props),
      this.props.allowOverlap
    ),
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    oldResizeItem: null,
    resizing: false,
    droppingDOMNode: null,
    isDropActive: false,
    isDropSource: false,
    children: []
  };

  dragEnterCounter: number = 0;
  gridRef: { current: ?HTMLElement } = React.createRef();

  // Cache for grid bounds to avoid expensive getBoundingClientRect calls
  cachedBounds: ?DOMRect = null;
  cachedBoundsTime: number = 0;
  // Cache TTL in milliseconds - bounds are considered stale after this time
  BOUNDS_CACHE_TTL: number = 100;

  componentDidMount() {
    this.setState({ mounted: true });
    // Possibly call back with layout on mount. This should be done after correcting the layout width
    // to ensure we don't rerender with the wrong width.
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);

    // Register with drag-drop context if enabled
    if (this.props.enableCrossGridDrag && this.context && this.props.id && this.gridRef.current) {
      this.context.registerDropTarget(
        this.props.id,
        this.gridRef.current,
        'grid',
        {
          cols: this.props.cols,
          rowHeight: this.props.rowHeight,
          containerWidth: this.props.width,
          margin: this.props.margin,
          acceptsDrop: this.getAcceptsDrop(),
          onItemRemoved: this.onItemRemovedFromGrid
        }
      );
    }

    // Set up resize listener to invalidate bounds cache
    window.addEventListener('resize', this.invalidateBoundsCache);
  }

  componentWillUnmount() {
    // Unregister from drag-drop context
    if (this.props.enableCrossGridDrag && this.context && this.props.id) {
      this.context.unregisterDropTarget(this.props.id);
    }

    // Clean up resize listener
    window.removeEventListener('resize', this.invalidateBoundsCache);
  }

  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State
  ): $Shape<State> | null {
    let newLayoutBase;

    if (prevState.activeDrag) {
      return null;
    }

    // Legacy support for compactType
    // Allow parent to set layout directly.
    if (
      !deepEqual(nextProps.layout, prevState.propsLayout) ||
      nextProps.compactType !== prevState.compactType
    ) {
      newLayoutBase = nextProps.layout;
    } else if (!childrenEqual(nextProps.children, prevState.children)) {
      // If children change, also regenerate the layout. Use our state
      // as the base in case because it may be more up to date than
      // what is in props.
      newLayoutBase = prevState.layout;
    }

    // We need to regenerate the layout.
    if (newLayoutBase) {
      const newLayout = synchronizeLayoutWithChildren(
        newLayoutBase,
        nextProps.children,
        nextProps.cols,
        compactType(nextProps),
        nextProps.allowOverlap
      );

      return {
        layout: newLayout,
        // We need to save these props to state for using
        // getDerivedStateFromProps instead of componentDidMount (in which we would get extra rerender)
        compactType: nextProps.compactType,
        children: nextProps.children,
        propsLayout: nextProps.layout
      };
    }

    return null;
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      // NOTE: this is almost always unequal. Therefore the only way to get better performance
      // from SCU is if the user intentionally memoizes children. If they do, and they can
      // handle changes properly, performance will increase.
      this.props.children !== nextProps.children ||
      !fastRGLPropsEqual(this.props, nextProps, deepEqual) ||
      this.state.activeDrag !== nextState.activeDrag ||
      this.state.mounted !== nextState.mounted ||
      this.state.droppingPosition !== nextState.droppingPosition ||
      this.state.isDropActive !== nextState.isDropActive ||
      this.state.isDropSource !== nextState.isDropSource
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Update drop target config in context if width or other grid properties changed
    if (this.props.enableCrossGridDrag && this.context && this.props.id) {
      if (
        prevProps.width !== this.props.width ||
        prevProps.cols !== this.props.cols ||
        prevProps.rowHeight !== this.props.rowHeight ||
        prevProps.crossGridAcceptsDrop !== this.props.crossGridAcceptsDrop
      ) {
        this.context.updateDropTargetConfig(this.props.id, {
          containerWidth: this.props.width,
          cols: this.props.cols,
          rowHeight: this.props.rowHeight,
          acceptsDrop: this.getAcceptsDrop()
        });
      }
    }

    if (!this.state.activeDrag) {
      const newLayout = this.state.layout;
      const oldLayout = prevState.layout;

      this.onLayoutMaybeChanged(newLayout, oldLayout);
    }

    // Handle external drag (cross-grid)
    // Only run if there's an active cross-grid drag to avoid unnecessary expensive calculations
    if (this.props.enableCrossGridDrag && this.context?.dragState) {
      this.handleExternalDrag();
    }

    // Handle cross-grid drag end
    if (this.props.enableCrossGridDrag && this.context) {
      const hadActiveDrag = prevState.activeDrag;
      const dragJustEnded = !this.context.dragState;

      if (hadActiveDrag && dragJustEnded) {
        // Check if this was an external placeholder drop on this grid
        const hadExternalPlaceholder = hadActiveDrag.i.startsWith("__external__");

        if (hadExternalPlaceholder && this.state.activeDrag) {
          // The drag ended while we had an external placeholder - finalize the drop
          this.handleExternalDrop();
        } else if (!hadExternalPlaceholder && this.state.activeDrag) {
          // This is the source grid - clear activeDrag if item was dropped elsewhere
          // But DON'T clear if we're currently resizing (prevents flicker)
          if (!this.state.resizing) {
            this.setState({
              activeDrag: null,
              oldLayout: null,
              ...this.clearDropState()
            });
          }
        }
      }
    }
  }

  /**
   * Calculates a pixel value for the container.
   * @return {String} Container height in pixels.
   */
  containerHeight(): ?string {
    if (!this.props.autoSize) return;
    // Exclude collapsed item from height calculation
    let layoutForHeight = this.state.layout;
    if (this.state.activeDrag?.hidden) {
      layoutForHeight = this.state.layout.filter(item => item.i !== this.state.activeDrag.i);
    }
    const nbRow = bottom(layoutForHeight);
    const containerPaddingY = this.props.containerPadding
      ? this.props.containerPadding[1]
      : this.props.margin[1];
    return (
      nbRow * this.props.rowHeight +
      (nbRow - 1) * this.props.margin[1] +
      containerPaddingY * 2 +
      "px"
    );
  }

  /**
   * When dragging starts
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStart: (i: string, x: number, y: number, GridDragEvent) => void = (
    i: string,
    x: number,
    y: number,
    { e, node }: GridDragEvent
  ) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Create placeholder (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true,
      i: i
    };

    this.setState({
      oldDragItem: cloneLayoutItem(l),
      oldLayout: layout,
      activeDrag: placeholder
    });

    return this.props.onDragStart(layout, l, l, null, e, node);
  };

  /**
   * Each drag movement create a new dragelement and move the element to the dragged location
   * @param {String} i Id of the child
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDrag: (i: string, x: number, y: number, GridDragEvent) => void = (
    i,
    x,
    y,
    { e, node }
  ) => {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, allowOverlap, preventCollision } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Collapse item when over a valid drop target (not when over empty space)
    let shouldCollapseItem = false;
    if (this.props.enableCrossGridDrag && this.context?.dragState && oldDragItem) {
      const { dragState } = this.context;
      if (dragState.sourceId === this.props.id) {
        for (const [targetId, targetConfig] of this.context.dropTargets.entries()) {
          if (targetId !== this.props.id && targetConfig.element) {
            const accepts = typeof targetConfig.acceptsDrop === 'function'
              ? targetConfig.acceptsDrop(dragState.item, dragState.sourceId)
              : targetConfig.acceptsDrop;

            if (accepts) {
              const rect = targetConfig.element.getBoundingClientRect();
              if (dragState.mouseX >= rect.left && dragState.mouseX <= rect.right &&
                  dragState.mouseY >= rect.top && dragState.mouseY <= rect.bottom) {
                shouldCollapseItem = true;
                break;
              }
            }
          }
        }
      }
    }

    const draggedItemW = oldDragItem?.w ?? l.w;
    const draggedItemH = oldDragItem?.h ?? l.h;

    const placeholder = {
      w: draggedItemW,
      h: draggedItemH,
      x: l.x,
      y: l.y,
      placeholder: true,
      i: i,
      hidden: shouldCollapseItem
    };

    let layoutForCompaction = layout;
    if (shouldCollapseItem) {
      layoutForCompaction = layout.map(item =>
        item.i === i ? { ...item, w: 0, h: 0 } : item
      );
    }

    // Move the element to the dragged location.
    const isUserAction = true;
    layoutForCompaction = moveElement(
      layoutForCompaction,
      getLayoutItem(layoutForCompaction, i),
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols,
      allowOverlap
    );

    const compactedLayout = allowOverlap
      ? layoutForCompaction
      : compact(layoutForCompaction, compactType(this.props), cols);

    const finalLayout = compactedLayout.map(item =>
      item.i === i ? { ...item, w: draggedItemW, h: draggedItemH } : item
    );

    this.props.onDrag(finalLayout, oldDragItem, l, placeholder, e, node);

    const isSourceGrid = this.props.enableCrossGridDrag &&
                         this.context?.dragState &&
                         this.context.dragState.sourceId === this.props.id;

    this.setState({
      layout: finalLayout,
      activeDrag: placeholder,
      isDropSource: !!isSourceGrid,
      isDropActive: isSourceGrid && !shouldCollapseItem
    });
  };

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStop: (i: string, x: number, y: number, GridDragEvent) => void = (
    i,
    x,
    y,
    { e, node }
  ) => {
    if (!this.state.activeDrag) return;

    // Check if this is an external item being dropped on this grid
    const isExternalDrop = i.startsWith("__external__");

    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;

    if (isExternalDrop && this.context && this.context.dragState) {
      const externalItem = this.context.dragState.item;

      // Remove the temporary __external__ item from layout
      layout = layout.filter(item => !item.i.startsWith("__external__"));

      // Get position from placeholder (it has been through collision detection)
      const placeholder = this.state.activeDrag;
      const newItem: LayoutItem = {
        ...externalItem,
        i: externalItem.i, // Use original ID, not __external__
        x: placeholder.x,
        y: placeholder.y
      };

      // Add item to layout
      layout = [...layout, newItem];

      // Compact the layout with the new item
      const newLayout = allowOverlap
        ? layout
        : compact(layout, compactType(this.props), cols);

      this.setState({
        activeDrag: null,
        layout: newLayout,
        oldDragItem: null,
        oldLayout: null,
        ...this.clearDropState()
      });

      this.onLayoutMaybeChanged(newLayout, this.state.oldLayout || layout);
      return;
    }

    // Normal drag within same grid
    const l = getLayoutItem(layout, i);
    if (!l) return;

    // Move the element here
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols,
      allowOverlap
    );

    // Set state
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);

    this.props.onDragStop(newLayout, oldDragItem, l, null, e, node);

    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null,
      ...this.clearDropState()
    });

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  };

  onLayoutMaybeChanged(newLayout: Layout, oldLayout: ?Layout) {
    if (!oldLayout) oldLayout = this.state.layout;

    if (!deepEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  onResizeStart: (i: string, w: number, h: number, GridResizeEvent) => void = (
    i,
    w,
    h,
    { e, node }
  ) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;

    this.setState({
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout,
      resizing: true
    });

    this.props.onResizeStart(layout, l, l, null, e, node);
  };

  onResize: (i: string, w: number, h: number, GridResizeEvent) => void = (
    i,
    w,
    h,
    { e, node, size, handle }
  ) => {
    const { oldResizeItem } = this.state;
    const { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;

    let shouldMoveItem = false;
    let finalLayout;
    let x;
    let y;

    const [newLayout, l] = withLayoutItem(layout, i, l => {
      let hasCollisions;
      x = l.x;
      y = l.y;
      if (["sw", "w", "nw", "n", "ne"].indexOf(handle) !== -1) {
        if (["sw", "nw", "w"].indexOf(handle) !== -1) {
          x = l.x + (l.w - w);
          w = l.x !== x && x < 0 ? l.w : w;
          x = x < 0 ? 0 : x;
        }

        if (["ne", "n", "nw"].indexOf(handle) !== -1) {
          y = l.y + (l.h - h);
          h = l.y !== y && y < 0 ? l.h : h;
          y = y < 0 ? 0 : y;
        }

        shouldMoveItem = true;
      }

      // Something like quad tree should be used
      // to find collisions faster
      if (preventCollision && !allowOverlap) {
        const collisions = getAllCollisions(layout, {
          ...l,
          w,
          h,
          x,
          y
        }).filter(layoutItem => layoutItem.i !== l.i);
        hasCollisions = collisions.length > 0;

        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
          // Reset layoutItem dimensions if there were collisions
          y = l.y;
          h = l.h;
          x = l.x;
          w = l.w;
          shouldMoveItem = false;
        }
      }

      l.w = w;
      l.h = h;

      return l;
    });

    // Shouldn't ever happen, but typechecking makes it necessary
    if (!l) return;

    finalLayout = newLayout;
    if (shouldMoveItem) {
      // Move the element to the new position.
      const isUserAction = true;
      finalLayout = moveElement(
        newLayout,
        l,
        x,
        y,
        isUserAction,
        this.props.preventCollision,
        compactType(this.props),
        cols,
        allowOverlap
      );
    }

    // Create placeholder element (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      static: true,
      i: i
    };

    this.props.onResize(finalLayout, oldResizeItem, l, placeholder, e, node);

    // Re-compact the newLayout and set the drag placeholder.
    this.setState({
      layout: allowOverlap
        ? finalLayout
        : compact(finalLayout, compactType(this.props), cols),
      activeDrag: placeholder
    });
  };

  onResizeStop: (i: string, w: number, h: number, GridResizeEvent) => void = (
    i,
    w,
    h,
    { e, node }
  ) => {
    const { layout, oldResizeItem } = this.state;
    const { cols, allowOverlap } = this.props;
    const l = getLayoutItem(layout, i);

    // Set state
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);

    this.props.onResizeStop(newLayout, oldResizeItem, l, null, e, node);

    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldResizeItem: null,
      oldLayout: null,
      resizing: false
    });

    this.onLayoutMaybeChanged(newLayout, oldLayout);
  };

  /**
   * Handle external drag from another drop target
   */
  handleExternalDrag = (): void => {
    if (!this.props.enableCrossGridDrag || !this.context || !this.gridRef.current) return;

    const { dragState } = this.context;

    // If no drag or this is the source grid, clear any external drag state
    if (!dragState || dragState.sourceId === this.props.id) {
      // Clear activeDrag if it was from an external source
      if (this.state.activeDrag && this.state.activeDrag.i.startsWith("__external__")) {
        this.setState({
          activeDrag: null,
          layout: this.state.oldLayout || this.state.layout,
          isDropActive: false
        });
      }
      return;
    }

    // Check if this grid accepts drops from the source
    const accepts = typeof this.props.crossGridAcceptsDrop === 'function'
      ? this.props.crossGridAcceptsDrop(dragState.item, dragState.sourceId)
      : this.props.crossGridAcceptsDrop !== false;

    if (!accepts) {
      // Clear any external drag state if grid doesn't accept drops
      if (this.state.activeDrag && this.state.activeDrag.i.startsWith("__external__")) {
        this.setState({
          activeDrag: null,
          layout: this.state.oldLayout || this.state.layout,
          isDropActive: false
        });
      }
      return;
    }

    // Check if mouse is over this grid
    if (!this.isMouseOverGrid(dragState.mouseX, dragState.mouseY)) {
      // Clear activeDrag if it was from an external source
      if (this.state.activeDrag && this.state.activeDrag.i.startsWith("__external__")) {
        this.setState({
          activeDrag: null,
          layout: this.state.oldLayout || this.state.layout,
          isDropActive: false
        });
      }
      return;
    }

    // Transform item from source grid to target grid dimensions
    const sourceConfig = this.context.dropTargets.get(dragState.sourceId);
    const targetConfig = {
      id: this.props.id,
      type: 'grid',
      element: this.gridRef.current,
      cols: this.props.cols,
      rowHeight: this.props.rowHeight,
      containerWidth: this.props.width,
      margin: this.props.margin,
      acceptsDrop: this.getAcceptsDrop(),
      onItemRemoved: this.onItemRemovedFromGrid
    };

    let transformedItem = dragState.item;
    if (sourceConfig) {
      // Use custom transform if provided, otherwise use context's transform (which defaults to physical size preservation)
      if (this.props.crossGridTransform) {
        transformedItem = this.props.crossGridTransform(dragState.item, sourceConfig, targetConfig);
      } else if (this.context.transformItem) {
        transformedItem = this.context.transformItem(dragState.item, sourceConfig, targetConfig);
      }
    }

    // Calculate grid position from mouse, accounting for grab offset
    const gridPos = this.calcGridPositionFromMouse(
      dragState.mouseX,
      dragState.mouseY,
      transformedItem,
      dragState.offsetX,
      dragState.offsetY
    );

    // Early exit optimization: if we already have a placeholder at this exact grid position
    // and item dimensions haven't changed, skip expensive layout calculations
    const externalId = `__external__${transformedItem.i}`;
    const currentPlaceholder = this.state.activeDrag;
    if (currentPlaceholder &&
        currentPlaceholder.i === externalId &&
        currentPlaceholder.x === gridPos.x &&
        currentPlaceholder.y === gridPos.y &&
        currentPlaceholder.w === transformedItem.w &&
        currentPlaceholder.h === transformedItem.h) {
      return;
    }

    const { cols, allowOverlap, preventCollision } = this.props;

    // Save original layout on first external drag detection
    // Use oldLayout as base, or current layout if this is the first external drag
    let baseLayout = this.state.oldLayout;
    if (!baseLayout) {
      baseLayout = this.state.layout;
      // Set oldLayout for future iterations and cleanup
      this.setState({ oldLayout: baseLayout });
    }

    // Start fresh from base layout (without any external items)
    let layout = baseLayout.filter(item => !item.i.startsWith("__external__"));

    // Check if we already have the external item's previous position in the current layout
    const existingExternalInState = getLayoutItem(this.state.layout, externalId);

    // Create a temporary item to add to the layout for collision detection
    // Use transformed item dimensions (w, h) from source grid to target grid
    const externalItem: LayoutItem = {
      ...transformedItem,
      i: externalId,
      // Use previous position if we have it, otherwise start at current gridPos
      x: existingExternalInState ? existingExternalInState.x : gridPos.x,
      y: existingExternalInState ? existingExternalInState.y : gridPos.y
    };

    // Add the external item to the layout
    layout = [...layout, externalItem];

    // Get the actual item reference from layout (moveElement mutates it directly)
    const layoutItem = getLayoutItem(layout, externalId);
    if (!layoutItem) return;

    // Apply moveElement for collision detection, just like internal drags
    // Pass the NEW position (gridPos) so moveElement moves it there
    const isUserAction = true;
    layout = moveElement(
      layout,
      layoutItem,
      gridPos.x,
      gridPos.y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols,
      allowOverlap
    );

    // Compact the layout
    const compactedLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);

    // Get the updated position of the external item from the compacted layout
    const updatedExternalItem = getLayoutItem(compactedLayout, externalId);
    if (!updatedExternalItem) return;

    // Create placeholder for display
    const placeholder: LayoutItem = {
      ...updatedExternalItem,
      placeholder: true
    };

    // Only update if position changed or no placeholder yet
    if (!this.state.activeDrag ||
        this.state.activeDrag.x !== placeholder.x ||
        this.state.activeDrag.y !== placeholder.y) {
      this.setState({
        activeDrag: placeholder,
        layout: compactedLayout,
        isDropActive: true
      });
    } else if (!this.state.isDropActive) {
      // If position hasn't changed but isDropActive is false, set it to true
      this.setState({ isDropActive: true });
    }
  };

  /**
   * Handle external drop - finalize adding an external item to this grid
   */
  handleExternalDrop = (): void => {
    if (!this.state.activeDrag || !this.state.activeDrag.i.startsWith("__external__")) return;

    const { cols, allowOverlap } = this.props;
    let { layout } = this.state;
    const placeholder = this.state.activeDrag;

    // Get the original item ID (remove __external__ prefix)
    const originalId = placeholder.i.replace("__external__", "");

    // Remove the temporary __external__ item from layout
    layout = layout.filter(item => !item.i.startsWith("__external__"));

    // Add the real item with the original ID
    const newItem: LayoutItem = {
      ...placeholder,
      i: originalId,
      placeholder: false
    };

    layout = [...layout, newItem];

    // Compact the layout with the new item
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);

    // Update state and notify
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldLayout: null,
      ...this.clearDropState()
    });

    this.onLayoutMaybeChanged(newLayout, this.state.oldLayout || layout);
  };

  getAcceptsDrop = (): boolean | ((item: LayoutItem, sourceId: string) => boolean) => {
    const { crossGridAcceptsDrop } = this.props;
    return crossGridAcceptsDrop === false ? false : crossGridAcceptsDrop || true;
  };

  clearDropState = (): $Shape<State> => {
    return {
      isDropActive: false,
      isDropSource: false
    };
  };

  /**
   * Invalidate the cached bounds (e.g., on window resize)
   */
  invalidateBoundsCache = (): void => {
    this.cachedBounds = null;
    this.cachedBoundsTime = 0;
  };

  /**
   * Get grid bounds with caching to avoid expensive getBoundingClientRect calls
   */
  getGridBounds = (): ?DOMRect => {
    if (!this.gridRef.current) return null;

    const now = Date.now();
    const cacheIsValid = this.cachedBounds && (now - this.cachedBoundsTime) < this.BOUNDS_CACHE_TTL;

    if (!cacheIsValid) {
      this.cachedBounds = this.gridRef.current.getBoundingClientRect();
      this.cachedBoundsTime = now;
    }

    return this.cachedBounds;
  };

  isMouseOverGrid = (mouseX: number, mouseY: number): boolean => {
    const rect = this.getGridBounds();
    if (!rect) return false;

    return (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    );
  };

  /**
   * Calculate grid position from mouse coordinates
   * Subtracts the grab offset so the item's top-left corner is positioned correctly
   */
  calcGridPositionFromMouse = (
    mouseX: number,
    mouseY: number,
    item: LayoutItem,
    offsetX: number = 0,
    offsetY: number = 0
  ): { x: number, y: number } => {
    if (!this.gridRef.current) return { x: 0, y: 0 };

    const rect = this.gridRef.current.getBoundingClientRect();
    // Subtract offset to get the item's top-left corner position
    const layerX = mouseX - rect.left - offsetX;
    const layerY = mouseY - rect.top - offsetY;

    const positionParams: PositionParams = {
      cols: this.props.cols,
      margin: this.props.margin,
      maxRows: this.props.maxRows,
      rowHeight: this.props.rowHeight,
      containerWidth: this.props.width,
      containerPadding: this.props.containerPadding || this.props.margin
    };

    return calcXY(positionParams, layerY, layerX, item.w, item.h);
  };

  /**
   * Called when an item is removed from this grid (dragged to another grid)
   */
  onItemRemovedFromGrid = (itemId: string): void => {
    const newLayout = this.state.layout.filter(l => l.i !== itemId);
    this.setState({ layout: newLayout }, () => {
      this.props.onLayoutChange(newLayout);
    });
  };

  /**
   * Set both inner ref and grid ref
   */
  setRefs = (element: ?HTMLElement): void => {
    if (this.gridRef) {
      this.gridRef.current = element;
    }

    const { innerRef } = this.props;
    if (innerRef) {
      if (typeof innerRef === "function") {
        innerRef(element);
      } else if (typeof innerRef === "object" && innerRef !== null) {
        innerRef.current = element;
      }
    }
  };

  /**
   * Create a placeholder object.
   * @return {Element} Placeholder div.
   */
  placeholder(): ?ReactElement<any> {
    const { activeDrag } = this.state;
    if (!activeDrag) return null;
    if (activeDrag.hidden) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      useCSSTransforms,
      transformScale
    } = this.props;

    // {...this.state.activeDrag} is pretty slow, actually
    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        className={`react-grid-placeholder ${
          this.state.resizing ? "placeholder-resizing" : ""
        }`}
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        isDraggable={false}
        isResizable={false}
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
      >
        <div />
      </GridItem>
    );
  }

  /**
   * Given a grid item, set its style attributes & surround in a <Draggable>.
   * @param  {Element} child React element.
   * @return {Element}       Element wrapped in draggable and properly placed.
   */
  processGridItem(
    child: ReactElement<any>,
    isDroppingItem?: boolean
  ): ?ReactElement<any> {
    if (!child || !child.key) return;
    const l = getLayoutItem(this.state.layout, String(child.key));
    if (!l) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      isDraggable,
      isResizable,
      isBounded,
      useCSSTransforms,
      transformScale,
      draggableCancel,
      draggableHandle,
      resizeHandles,
      resizeHandle
    } = this.props;
    const { mounted, droppingPosition } = this.state;

    // Determine user manipulations possible.
    // If an item is static, it can't be manipulated by default.
    // Any properties defined directly on the grid item will take precedence.
    const draggable =
      typeof l.isDraggable === "boolean"
        ? l.isDraggable
        : !l.static && isDraggable;
    const resizable =
      typeof l.isResizable === "boolean"
        ? l.isResizable
        : !l.static && isResizable;
    const resizeHandlesOptions = l.resizeHandles || resizeHandles;

    // isBounded set on child if set on parent, and child is not explicitly false
    const bounded = draggable && isBounded && l.isBounded !== false;

    return (
      <GridItem
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStop={this.onDragStop}
        onDragStart={this.onDragStart}
        onDrag={this.onDrag}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        isDraggable={draggable}
        isResizable={resizable}
        isBounded={bounded}
        useCSSTransforms={useCSSTransforms && mounted}
        usePercentages={!mounted}
        transformScale={transformScale}
        w={l.w}
        h={l.h}
        x={l.x}
        y={l.y}
        i={l.i}
        minH={l.minH}
        minW={l.minW}
        maxH={l.maxH}
        maxW={l.maxW}
        static={l.static}
        droppingPosition={isDroppingItem ? droppingPosition : undefined}
        resizeHandles={resizeHandlesOptions}
        resizeHandle={resizeHandle}
        gridId={this.props.id}
        enableCrossGridDrag={this.props.enableCrossGridDrag}
        dragDropContext={this.context}
      >
        {child}
      </GridItem>
    );
  }

  // Called while dragging an element. Part of browser native drag/drop API.
  // Native event target might be the layout itself, or an element within the layout.
  onDragOver: DragOverEvent => void | false = e => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();

    // we should ignore events from layout's children in Firefox
    // to avoid unpredictable jumping of a dropping placeholder
    // FIXME remove this hack
    if (
      isFirefox &&
      // $FlowIgnore can't figure this out
      !e.nativeEvent.target?.classList.contains(layoutClassName)
    ) {
      return false;
    }

    const {
      droppingItem,
      onDropDragOver,
      margin,
      cols,
      rowHeight,
      maxRows,
      width,
      containerPadding,
      transformScale
    } = this.props;
    // Allow user to customize the dropping item or short-circuit the drop based on the results
    // of the `onDragOver(e: Event)` callback.
    const onDragOverResult = onDropDragOver?.(e);
    if (onDragOverResult === false) {
      if (this.state.droppingDOMNode) {
        this.removeDroppingPlaceholder();
      }
      return false;
    }
    const finalDroppingItem = { ...droppingItem, ...onDragOverResult };

    const { layout } = this.state;

    // $FlowIgnore missing def
    const gridRect = e.currentTarget.getBoundingClientRect(); // The grid's position in the viewport

    // Calculate the mouse position relative to the grid
    const layerX = e.clientX - gridRect.left;
    const layerY = e.clientY - gridRect.top;
    const droppingPosition = {
      left: layerX / transformScale,
      top: layerY / transformScale,
      e
    };

    if (!this.state.droppingDOMNode) {
      const positionParams: PositionParams = {
        cols,
        margin,
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: containerPadding || margin
      };

      const calculatedPosition = calcXY(
        positionParams,
        layerY,
        layerX,
        finalDroppingItem.w,
        finalDroppingItem.h
      );

      this.setState({
        droppingDOMNode: <div key={finalDroppingItem.i} />,
        droppingPosition,
        layout: [
          ...layout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true
          }
        ]
      });
    } else if (this.state.droppingPosition) {
      const { left, top } = this.state.droppingPosition;
      const shouldUpdatePosition = left != layerX || top != layerY;
      if (shouldUpdatePosition) {
        this.setState({ droppingPosition });
      }
    }
  };

  removeDroppingPlaceholder: () => void = () => {
    const { droppingItem, cols } = this.props;
    const { layout } = this.state;

    const newLayout = compact(
      layout.filter(l => l.i !== droppingItem.i),
      compactType(this.props),
      cols,
      this.props.allowOverlap
    );

    this.setState({
      layout: newLayout,
      droppingDOMNode: null,
      activeDrag: null,
      droppingPosition: undefined
    });
  };

  onDragLeave: EventHandler = e => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    this.dragEnterCounter--;

    // onDragLeave can be triggered on each layout's child.
    // But we know that count of dragEnter and dragLeave events
    // will be balanced after leaving the layout's container
    // so we can increase and decrease count of dragEnter and
    // when it'll be equal to 0 we'll remove the placeholder
    if (this.dragEnterCounter === 0) {
      this.removeDroppingPlaceholder();
    }
  };

  onDragEnter: EventHandler = e => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    this.dragEnterCounter++;
  };

  onDrop: EventHandler = (e: Event) => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    const { droppingItem } = this.props;
    const { layout } = this.state;
    const item = layout.find(l => l.i === droppingItem.i);

    // reset dragEnter counter on drop
    this.dragEnterCounter = 0;

    this.removeDroppingPlaceholder();

    this.props.onDrop(layout, item, e);
  };

  render(): React.Element<"div"> {
    const { className, style, isDroppable } = this.props;

    const mergedClassName = clsx(
      layoutClassName,
      className,
      {
        'drop-active': this.state.isDropActive,
        'drop-source': this.state.isDropSource
      }
    );
    const mergedStyle = {
      height: this.containerHeight(),
      ...style
    };

    return (
      <div
        ref={this.setRefs}
        className={mergedClassName}
        style={mergedStyle}
        onDrop={isDroppable ? this.onDrop : noop}
        onDragLeave={isDroppable ? this.onDragLeave : noop}
        onDragEnter={isDroppable ? this.onDragEnter : noop}
        onDragOver={isDroppable ? this.onDragOver : noop}
      >
        {React.Children.map(this.props.children, child =>
          this.processGridItem(child)
        )}
        {isDroppable &&
          this.state.droppingDOMNode &&
          this.processGridItem(this.state.droppingDOMNode, true)}
        {this.placeholder()}
      </div>
    );
  }
}
