// @flow
import * as React from "react";
import { flushSync } from "react-dom";
import { deepEqual } from "fast-equals";
import clsx from "clsx";
import {
  childrenEqual,
  synchronizeFlexLayoutWithChildren,
  getFlexLayoutItem,
  noop
} from "./flexUtils";

import FlexItem from "./FlexItem";
import ReactFlexLayoutPropTypes from "./ReactFlexLayoutPropTypes";
import DragDropContext from "./DragDropContext";
import type { DragDropContextValue } from "./DragDropContext";
import type {
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";

import type {
  FlexLayout,
  FlexLayoutItem,
  FlexDirection,
  FlexJustifyContent,
  FlexAlignItems
} from "./flexUtils";

import type { Props, DefaultProps } from "./ReactFlexLayoutPropTypes";

type State = {
  activeDrag: ?FlexLayoutItem,
  layout: FlexLayout,
  mounted: boolean,
  oldDragItem: ?FlexLayoutItem,
  oldLayout: ?FlexLayout,
  // Mirrored props
  children: ReactChildrenArray<ReactElement<any>>,
  propsLayout?: FlexLayout,
  // Visual reordering transforms (item id -> offset)
  transforms: Map<string, {x: number, y: number}>,
  // Current order during drag (for persisting on drop)
  currentOrder: ?Array<string>,
  // Disable transitions during order persistence
  disableTransitions: boolean,
  // Cross-container drag state
  isDropActive: boolean,
  isDropSource: boolean
};

const layoutClassName = "react-flex-layout";

// Constants
const TRANSITION_RESET_DELAY_MS = 50;

/**
 * A reactive, fluid flex layout with draggable components.
 */
export default class ReactFlexLayout extends React.Component<Props, State> {
  static displayName: ?string = "ReactFlexLayout";
  static propTypes = ReactFlexLayoutPropTypes;

  // Context for drag and drop (flex layouts, grids, and external containers)
  static contextType = DragDropContext;
  context: ?DragDropContextValue;

  static defaultProps: DefaultProps = {
    className: "",
    style: {},
    draggableHandle: "",
    draggableCancel: "",
    layout: [],
    gap: 0,
    direction: "row",
    justifyContent: "flex-start",
    alignItems: "stretch",
    isBounded: false,
    isDraggable: true,
    isDroppable: false,
    useCSSTransforms: true,
    transformScale: 1,
    onLayoutChange: noop,
    onDragStart: noop,
    onDrag: noop,
    onDragStop: noop,
    onDrop: noop,
    enableCrossGridDrag: false,
    crossGridAcceptsDrop: true
  };

  state: State = {
    activeDrag: null,
    layout: synchronizeFlexLayoutWithChildren(
      this.props.layout,
      this.props.children,
      12 // Not used for flex, but keep for compatibility
    ),
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    children: [],
    transforms: new Map(),
    currentOrder: null,
    disableTransitions: false,
    isDropActive: false,
    isDropSource: false
  };

  flexRef: { current: ?HTMLElement } = React.createRef();

  // Store item bounds during drag for collision detection and reordering
  itemBounds: Map<string, DOMRect> = new Map();
  // Store original order before drag for diff calculation
  originalOrder: Array<string> = [];
  // Timeout for re-enabling transitions after drop
  transitionTimeout: ?TimeoutID = null;
  // Store mouse position when external item is first added (for calculating initial order after bounds collection)
  pendingExternalMousePosition: ?{ mouseX: number, mouseY: number } = null;

  componentDidMount() {
    this.setState({ mounted: true });
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);

    // Register with drag-drop context if enabled
    if (this.props.enableCrossGridDrag && this.context && this.props.id && this.flexRef.current) {
      this.context.registerDropTarget(
        this.props.id,
        this.flexRef.current,
        'flex',
        {
          direction: this.props.direction,
          gap: this.props.gap,
          containerHeight: this.getContainerHeight(),
          acceptsDrop: this.getAcceptsDrop(),
          onItemRemoved: this.onItemRemovedFromFlex
        }
      );
    }
  }

  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State
  ): $Shape<State> | null {
    let newLayoutBase;

    if (prevState.activeDrag) {
      return null;
    }

    // Allow parent to set layout directly
    if (!deepEqual(nextProps.layout, prevState.propsLayout)) {
      newLayoutBase = nextProps.layout;
    } else if (!childrenEqual(nextProps.children, prevState.children)) {
      // If children change, also regenerate the layout
      newLayoutBase = prevState.layout;
    }

    // We need to regenerate the layout
    if (newLayoutBase) {
      const newLayout = synchronizeFlexLayoutWithChildren(
        newLayoutBase,
        nextProps.children,
        12
      );

      return {
        layout: newLayout,
        children: nextProps.children,
        propsLayout: nextProps.layout,
        // Preserve transforms during layout updates
        transforms: prevState.transforms
      };
    }

    return null;
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      this.props.children !== nextProps.children ||
      !deepEqual(this.props, nextProps) ||
      this.state.activeDrag !== nextState.activeDrag ||
      this.state.mounted !== nextState.mounted ||
      this.state.transforms !== nextState.transforms || // Check if transforms Map changed
      this.state.disableTransitions !== nextState.disableTransitions ||
      this.state.isDropActive !== nextState.isDropActive ||
      this.state.isDropSource !== nextState.isDropSource
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    this.updateDropTargetConfigIfNeeded(prevProps);

    if (!this.state.activeDrag) {
      this.onLayoutMaybeChanged(this.state.layout, prevState.layout);
    }

    this.handleExternalDragIfActive();
    this.collectBoundsIfExternalItemAdded(prevState);
    this.finalizeExternalDropIfDragEnded(prevState);
  }

  componentWillUnmount() {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }

    // Unregister from drag-drop context
    if (this.props.enableCrossGridDrag && this.context && this.props.id) {
      this.context.unregisterDropTarget(this.props.id);
    }
  }

  /**
   * Helper: Schedule re-enabling transitions after a brief delay
   */
  scheduleReEnableTransitions = (): void => {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
    this.transitionTimeout = setTimeout(() => {
      this.setState({ disableTransitions: false });
    }, TRANSITION_RESET_DELAY_MS);
  };

  /**
   * Helper: Schedule bounds collection after DOM paint (double RAF)
   */
  scheduleCollectBounds = (): void => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.collectItemBounds();
        this.forceUpdate();
      });
    });
  };

  /**
   * Helper: Update drop target config if relevant props changed
   */
  updateDropTargetConfigIfNeeded = (prevProps: Props): void => {
    if (!this.props.enableCrossGridDrag || !this.context || !this.props.id) return;

    if (
      prevProps.direction !== this.props.direction ||
      prevProps.gap !== this.props.gap ||
      prevProps.crossGridAcceptsDrop !== this.props.crossGridAcceptsDrop
    ) {
      this.context.updateDropTargetConfig(this.props.id, {
        direction: this.props.direction,
        gap: this.props.gap,
        containerHeight: this.getContainerHeight(),
        acceptsDrop: this.getAcceptsDrop()
      });
    }
  };

  /**
   * Helper: Handle external drag from other containers
   */
  handleExternalDragIfActive = (): void => {
    if (!this.props.enableCrossGridDrag || !this.context?.dragState) return;

    const isSourceFlex = this.context.dragState.sourceId === this.props.id;
    if (!isSourceFlex) {
      this.handleExternalDrag();
    }
  };

  /**
   * Helper: Collect bounds if external item was just added to layout
   * After bounds are collected, calculate initial order and apply transforms
   */
  collectBoundsIfExternalItemAdded = (prevState: State): void => {
    if (!this.props.enableCrossGridDrag) return;

    const currentExternalItem = this.state.layout.find(item => item.i.startsWith("__external__"));
    const prevExternalItem = prevState.layout.find(item => item.i.startsWith("__external__"));

    // External item was just added or changed - collect bounds after DOM is painted
    if ((currentExternalItem && !prevExternalItem) ||
        (currentExternalItem && prevExternalItem && currentExternalItem.i !== prevExternalItem.i)) {

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Collect bounds with external item now in DOM
          this.collectItemBounds();

          // Now calculate initial order based on mouse position
          if (this.pendingExternalMousePosition && currentExternalItem) {
            const { mouseX, mouseY } = this.pendingExternalMousePosition;
            const initialOrder = this.calculateInitialOrderForExternalItem(mouseX, mouseY);
            const externalId = currentExternalItem.i;

            // Calculate visual order with external item inserted at calculated position
            const newOrderArray = [...this.originalOrder];
            // Remove external item from its current position in originalOrder (it's at the end)
            const currentIndex = newOrderArray.indexOf(externalId);
            if (currentIndex !== -1) {
              newOrderArray.splice(currentIndex, 1);
            }
            // Insert at calculated position
            newOrderArray.splice(initialOrder, 0, externalId);

            // Get external item's bounds for transform calculation
            const draggedRect = this.itemBounds.get(externalId);
            if (draggedRect) {
              // Calculate transforms to visually position items
              const transforms = this.calculateTransforms(externalId, newOrderArray, draggedRect);

              // Apply transforms and set visual order
              this.setState({
                transforms: new Map(transforms),
                currentOrder: newOrderArray
              });
            }

            // Clear pending mouse position
            this.pendingExternalMousePosition = null;

            // Re-enable transitions after a brief delay
            this.scheduleReEnableTransitions();
          }

          this.forceUpdate();
        });
      });
    }
  };

  /**
   * Helper: Finalize external drop when drag ends
   */
  finalizeExternalDropIfDragEnded = (prevState: State): void => {
    if (!this.props.enableCrossGridDrag || !this.context) return;

    const hadActiveDrag = prevState.activeDrag;
    const dragJustEnded = !this.context.dragState;

    if (hadActiveDrag && dragJustEnded) {
      const hadExternalPlaceholder = hadActiveDrag.i.startsWith("__external__");

      if (hadExternalPlaceholder && this.state.activeDrag) {
        this.handleExternalDrop();
      }
    }
  };

  /**
   * Get actual container height for drop target registration
   */
  getContainerHeight(): number {
    if (this.flexRef.current) {
      return this.flexRef.current.clientHeight;
    }
    return 0;
  }

  /**
   * When the layout may have changed, emit `onLayoutChange`
   */
  onLayoutMaybeChanged(
    newLayout: FlexLayout,
    oldLayout: ?FlexLayout
  ): void {
    if (!oldLayout) oldLayout = this.state.layout;

    if (!deepEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  /**
   * Helper: Find the item ID at the given mouse position using gap-extended collision detection
   * Returns the closest item if multiple zones overlap, or null if no collision
   */
  findItemAtPosition = (mouseX: number, mouseY: number): ?string => {
    const { direction, gap } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';
    const halfGap = gap / 2;
    let closestItemId = null;
    let closestDistance = Infinity;

    for (const [itemId, rect] of this.itemBounds.entries()) {
      // Extend bounds by halfGap in main axis
      const left = rect.left - (isHorizontal ? halfGap : 0);
      const right = rect.right + (isHorizontal ? halfGap : 0);
      const top = rect.top - (isHorizontal ? 0 : halfGap);
      const bottom = rect.bottom + (isHorizontal ? 0 : halfGap);

      const isColliding = isHorizontal
        ? mouseX >= left && mouseX <= right
        : mouseY >= top && mouseY <= bottom;

      if (isColliding) {
        // Calculate distance to item center to handle overlapping zones
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = isHorizontal
          ? Math.abs(mouseX - centerX)
          : Math.abs(mouseY - centerY);

        // Pick the closest item if multiple zones overlap
        if (distance < closestDistance) {
          closestDistance = distance;
          closestItemId = itemId;
        }
      }
    }

    return closestItemId;
  };

  getAcceptsDrop = (): boolean | ((item: FlexLayoutItem, sourceId: string) => boolean) => {
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
   * Clear external drag state and restore original layout
   */
  clearExternalDragState = (): void => {
    if (!this.state.activeDrag?.i.startsWith("__external__")) return;

    const externalId = this.state.activeDrag.i;
    this.itemBounds.delete(externalId);
    this.pendingExternalMousePosition = null;  // Clear pending mouse position

    this.setState({
      activeDrag: null,
      layout: this.state.oldLayout || this.state.layout,
      oldLayout: null,
      transforms: new Map(),
      currentOrder: null,
      isDropActive: false,
      disableTransitions: true
    }, () => {
      this.collectItemBounds();
    });

    this.scheduleReEnableTransitions();
  };

  /**
   * Called when an item is removed from this flex layout (dragged to another container)
   */
  onItemRemovedFromFlex = (itemId: string): void => {
    const newLayout = this.state.layout.filter(l => l.i !== itemId);
    this.setState({ layout: newLayout }, () => {
      this.props.onLayoutChange(newLayout);
    });
  };

  /**
   * Calculate insertion index based on mouse position
   */
  calculateInsertIndex = (mouseX: number, mouseY: number): number => {
    if (!this.flexRef.current) return 0;

    const { direction } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';

    const items = this.flexRef.current.querySelectorAll('.react-flex-item:not(.react-flex-placeholder)');
    if (items.length === 0) return 0;

    // Find the item closest to the mouse position
    let closestIndex = 0;
    let closestDistance = Infinity;

    items.forEach((item: HTMLElement, index) => {
      const rect = item.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const distance = isHorizontal
        ? Math.abs(mouseX - centerX)
        : Math.abs(mouseY - centerY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    // Determine if we should insert before or after the closest item
    const closestItem = items[closestIndex];
    const closestRect = closestItem.getBoundingClientRect();

    if (isHorizontal) {
      // If mouse is to the right of center, insert after
      return mouseX > closestRect.left + closestRect.width / 2
        ? closestIndex + 1
        : closestIndex;
    } else {
      // If mouse is below center, insert after
      return mouseY > closestRect.top + closestRect.height / 2
        ? closestIndex + 1
        : closestIndex;
    }
  };

  /**
   * Renumber layout item orders after inserting at a specific index
   */
  renumberOrders = (layout: FlexLayout): FlexLayout => {
    const { direction } = this.props;
    const isReversed = direction === 'row-reverse' || direction === 'column-reverse';

    // Don't sort - maintain array order, only update order property
    return layout.map((item, index) => {
      const orderValue = isReversed ? (layout.length - 1 - index) : index;
      return { ...item, order: orderValue };
    });
  };

  /**
   * Helper: Check if mouse is over this flex container
   */
  isMouseOverContainer = (mouseX: number, mouseY: number): boolean => {
    if (!this.flexRef.current) return false;
    const rect = this.flexRef.current.getBoundingClientRect();
    return mouseX >= rect.left && mouseX <= rect.right &&
           mouseY >= rect.top && mouseY <= rect.bottom;
  };

  /**
   * Helper: Transform dragged item from source to this flex layout
   */
  transformDraggedItem = (dragState: any): FlexLayoutItem => {
    const sourceConfig = this.context?.dropTargets.get(dragState.sourceId);
    const targetConfig = {
      id: this.props.id,
      type: 'flex',
      element: this.flexRef.current,
      direction: this.props.direction,
      gap: this.props.gap,
      containerHeight: this.getContainerHeight()
    };

    let transformedItem = dragState.item;
    if (sourceConfig) {
      if (this.props.crossGridTransform) {
        transformedItem = this.props.crossGridTransform(dragState.item, sourceConfig, targetConfig);
      } else if (this.context?.transformItem) {
        transformedItem = this.context.transformItem(dragState.item, sourceConfig, targetConfig);
      }
    }
    return transformedItem;
  };

  /**
   * Helper: Add external item to layout for the first time
   * This just adds the item to layout - bounds collection and visual reordering happens in componentDidUpdate
   */
  addExternalItemToLayout = (transformedItem: FlexLayoutItem, mouseX: number, mouseY: number): void => {
    // Save original layout (filter out any existing external items)
    const oldLayout = this.state.oldLayout ||
      this.state.layout.filter(item => !item.i.startsWith("__external__"));

    const externalId = `__external__${transformedItem.i}`;

    const externalItem: FlexLayoutItem = {
      i: externalId,
      order: this.state.layout.length,  // Append to end to avoid order conflicts
      grow: transformedItem.grow !== undefined ? transformedItem.grow : 0,
      shrink: transformedItem.shrink !== undefined ? transformedItem.shrink : 1,
      alignSelf: transformedItem.alignSelf,
      minWidth: transformedItem.minWidth,
      maxWidth: transformedItem.maxWidth,
      minHeight: transformedItem.minHeight,
      maxHeight: transformedItem.maxHeight,
      placeholder: true
    };

    // Just add external item to layout
    // Don't calculate transforms yet - that happens after bounds are collected
    const newLayout = [...this.state.layout, externalItem];

    // Store mouse position for later use in bounds collection phase
    this.pendingExternalMousePosition = { mouseX, mouseY };

    this.setState({
      layout: newLayout,
      activeDrag: externalItem,
      oldLayout: oldLayout,
      isDropActive: true,
      disableTransitions: false  // Allow other items to transition when external item inserted
    });
  };

  /**
   * Helper: Update existing external item position during drag
   */
  updateExternalItemPosition = (externalId: string, mouseX: number, mouseY: number): void => {
    // Update item sizes to account for flex-shrink changes
    this.updateItemSizes();

    if (this.itemBounds.size === 0) return;

    const draggedRect = this.itemBounds.get(externalId);
    if (!draggedRect) return;

    const newOrder = this.calculateNewOrder(externalId, mouseX, mouseY);

    // If newOrder is null, cursor is in a gap - keep current order
    if (!newOrder) return;

    const currentOrderStr = this.state.currentOrder?.join(',');
    const newOrderStr = newOrder.join(',');
    if (currentOrderStr === newOrderStr) return;

    const transforms = this.calculateTransforms(externalId, newOrder, draggedRect);

    this.setState({
      transforms: new Map(transforms),
      currentOrder: newOrder
    });
  };

  /**
   * Handle external drag from another drop target (grid, flex, or external)
   * Matches ReactGridLayout's approach: Add external item to state.layout
   */
  handleExternalDrag = (): void => {
    if (!this.props.enableCrossGridDrag || !this.context || !this.flexRef.current) return;

    const { dragState } = this.context;

    // Early exit conditions
    if (!dragState || dragState.sourceId === this.props.id) {
      this.clearExternalDragState();
      return;
    }

    // Check if this flex accepts drops from the source
    const accepts = typeof this.props.crossGridAcceptsDrop === 'function'
      ? this.props.crossGridAcceptsDrop(dragState.item, dragState.sourceId)
      : this.props.crossGridAcceptsDrop !== false;

    if (!accepts || !this.isMouseOverContainer(dragState.mouseX, dragState.mouseY)) {
      this.clearExternalDragState();
      return;
    }

    // Transform item and check if already added
    const transformedItem = this.transformDraggedItem(dragState);
    const externalId = `__external__${transformedItem.i}`;
    const alreadyAdded = this.state.layout.some(item => item.i === externalId);

    if (!alreadyAdded) {
      this.addExternalItemToLayout(transformedItem, dragState.mouseX, dragState.mouseY);
    } else {
      this.updateExternalItemPosition(externalId, dragState.mouseX, dragState.mouseY);
    }
  };

  /**
   * Calculate initial order for external item based on mouse position
   * Uses same zone collision logic as calculateNewOrder for consistency
   */
  calculateInitialOrderForExternalItem = (mouseX: number, mouseY: number): number => {
    // If no items yet, start at 0
    if (this.originalOrder.length === 0) return 0;

    // Use same collision detection as calculateNewOrder
    // This ensures consistent behavior between initial insertion and subsequent updates
    const hoveredItemId = this.findItemAtPosition(mouseX, mouseY);

    if (hoveredItemId) {
      // Insert at the hovered item's position
      const targetIndex = this.originalOrder.indexOf(hoveredItemId);
      return targetIndex;
    }

    // No collision - check if before first or after last item
    // This matches the logic in calculateNewOrder
    const { direction, gap } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';
    const halfGap = gap / 2;

    const firstId = this.originalOrder[0];
    const lastId = this.originalOrder[this.originalOrder.length - 1];
    const firstRect = this.itemBounds.get(firstId);
    const lastRect = this.itemBounds.get(lastId);

    if (firstRect && lastRect) {
      const firstBound = isHorizontal ? firstRect.left - halfGap : firstRect.top - halfGap;
      const lastBound = isHorizontal ? lastRect.right + halfGap : lastRect.bottom + halfGap;
      const cursorPos = isHorizontal ? mouseX : mouseY;

      if (cursorPos < firstBound) {
        // Before first item
        return 0;
      }
      if (cursorPos > lastBound) {
        // After last item
        return this.originalOrder.length;
      }
    }

    // In a gap between items - default to end (safer than position 0)
    return this.originalOrder.length;
  };

  /**
   * Handle external drop - finalize adding an external item to this flex layout
   */
  handleExternalDrop = (): void => {
    if (!this.state.activeDrag || !this.state.activeDrag.i.startsWith("__external__")) return;

    const { currentOrder, oldLayout } = this.state;
    let { layout } = this.state;
    const placeholder = this.state.activeDrag;

    const originalId = placeholder.i.replace("__external__", "");

    layout = layout.filter(item => !item.i.startsWith("__external__"));

    const newItem: FlexLayoutItem = {
      ...placeholder,
      i: originalId,
      placeholder: false
    };

    layout = [...layout, newItem];

    // Apply final orders from currentOrder
    let newLayout = layout;
    if (currentOrder && currentOrder.length > 0) {
      const { direction } = this.props;
      const isReversed = direction === 'row-reverse' || direction === 'column-reverse';
      const orderMap = new Map();

      // Map each item to its final order, replacing __external__ with originalId
      currentOrder.forEach((itemId, index) => {
        const finalId = itemId === placeholder.i ? originalId : itemId;
        const orderValue = isReversed ? (currentOrder.length - 1 - index) : index;
        orderMap.set(finalId, orderValue);
      });

      newLayout = layout.map(item => {
        const newOrder = orderMap.get(item.i);
        if (newOrder !== undefined && newOrder !== item.order) {
          return { ...item, order: newOrder };
        }
        return item;
      });
    } else {
      // Fallback: just renumber if no currentOrder
      newLayout = this.renumberOrders(layout);
    }

    // Disable transitions immediately to prevent non-dragged items from animating
    // (same as internal drop)
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldLayout: null,
      transforms: new Map(),
      currentOrder: null,
      disableTransitions: true,
      ...this.clearDropState()
    });

    this.scheduleReEnableTransitions();
    this.onLayoutMaybeChanged(newLayout, oldLayout || layout);
  };

  /**
   * Collect bounds for all flex items from the DOM
   */
  collectItemBounds = () => {
    if (!this.flexRef.current) return;

    this.itemBounds.clear();
    this.originalOrder = [];

    const items = this.flexRef.current.querySelectorAll('.react-flex-item:not(.react-flex-placeholder)');

    // Build array of items with their bounds
    const itemsWithBounds = [];
    items.forEach((item: HTMLElement) => {
      const itemId = item.getAttribute('data-rgl-item-id');
      if (itemId) {
        const rect = item.getBoundingClientRect();
        itemsWithBounds.push({ id: itemId, rect });
      }
    });

    // Create a map of item id -> layout item for looking up order property
    const layoutMap = new Map(this.state.layout.map(item => [item.i, item]));

    // Sort by order property from layout, not visual position
    // This ensures consistency even during CSS transitions or when order !== visual position
    itemsWithBounds.sort((a, b) => {
      const orderA = layoutMap.get(a.id)?.order ?? 0;
      const orderB = layoutMap.get(b.id)?.order ?? 0;
      return orderA - orderB;
    });

    // Now build originalOrder and itemBounds in layout order
    itemsWithBounds.forEach(({ id, rect }) => {
      this.itemBounds.set(id, rect);
      this.originalOrder.push(id);
    });
  };

  /**
   * Update only width/height of existing bounds (during drag).
   * Preserves original positions to avoid capturing transformed positions.
   * This accounts for flex-shrink changes as items redistribute space.
   */
  updateItemSizes = () => {
    if (!this.flexRef.current || this.itemBounds.size === 0) return;

    const items = this.flexRef.current.querySelectorAll('.react-flex-item:not(.react-flex-placeholder)');

    items.forEach((item: HTMLElement) => {
      const itemId = item.getAttribute('data-rgl-item-id');
      if (itemId) {
        // Skip external items - they stay in flex flow with opacity: 0
        // We must preserve their originally collected flexed bounds
        if (itemId.startsWith('__external__')) return;

        const existingBounds = this.itemBounds.get(itemId);
        if (existingBounds) {
          // Use offsetWidth/offsetHeight to get actual layout size without CSS transforms
          // getBoundingClientRect() would include transform scale which compounds errors
          const currentWidth = item.offsetWidth;
          const currentHeight = item.offsetHeight;

          // Create new DOMRect with original position but updated size
          const updatedBounds = new DOMRect(
            existingBounds.x,      // Keep original position
            existingBounds.y,      // Keep original position
            currentWidth,          // Update width (changes due to flex-shrink)
            currentHeight          // Update height (changes due to flex-shrink)
          );

          this.itemBounds.set(itemId, updatedBounds);
        }
      }
    });
  };

  /**
   * onDragStart event handler
   */
  onDragStart = (i: string, order: number, eventData: Object) => {
    const { onDragStart } = this.props;
    const l = getFlexLayoutItem(this.state.layout, i);
    if (!l) return;

    this.collectItemBounds();

    const placeholder = {
      ...l,
      placeholder: true
    };

    this.setState({
      transforms: new Map(),
      currentOrder: null,
      oldLayout: this.state.layout,
      oldDragItem: l,
      activeDrag: placeholder
    });

    const { e, node } = eventData;
    return onDragStart(this.state.layout, l, l, null, e, node);
  };

  /**
   * Calculate the new order based on mouse cursor position
   * Detect collision with items (including gap/2 extension)
   */
  calculateNewOrder = (draggedId: string, mouseX: number, mouseY: number): ?Array<string> => {
    const { direction, gap } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';
    const halfGap = gap / 2;

    // Use shared collision detection
    const hoveredItemId = this.findItemAtPosition(mouseX, mouseY);

    // If hovering over an item (including self), that's the target position
    if (hoveredItemId) {
      const targetIndex = this.originalOrder.indexOf(hoveredItemId);
      const draggedIndex = this.originalOrder.indexOf(draggedId);

      // Already at target position, no change needed
      if (targetIndex === draggedIndex) {
        return this.originalOrder;
      }

      // Create new order by moving dragged item to target position
      const newOrder = [...this.originalOrder];
      newOrder.splice(draggedIndex, 1); // Remove from current position
      newOrder.splice(targetIndex, 0, draggedId); // Insert at target position
      return newOrder;
    }

    // No collision - check if before first or after last item
    if (this.originalOrder.length > 0) {
      const firstId = this.originalOrder[0];
      const lastId = this.originalOrder[this.originalOrder.length - 1];
      const firstRect = this.itemBounds.get(firstId);
      const lastRect = this.itemBounds.get(lastId);

      if (firstRect && lastRect) {
        const firstBound = isHorizontal ? firstRect.left - halfGap : firstRect.top - halfGap;
        const lastBound = isHorizontal ? lastRect.right + halfGap : lastRect.bottom + halfGap;
        const cursorPos = isHorizontal ? mouseX : mouseY;

        if (cursorPos < firstBound) {
          // Before first item
          const newOrder = [...this.originalOrder];
          const draggedIndex = newOrder.indexOf(draggedId);
          newOrder.splice(draggedIndex, 1);
          newOrder.unshift(draggedId);
          return newOrder;
        }
        if (cursorPos > lastBound) {
          // After last item
          const newOrder = [...this.originalOrder];
          const draggedIndex = newOrder.indexOf(draggedId);
          newOrder.splice(draggedIndex, 1);
          newOrder.push(draggedId);
          return newOrder;
        }
      }
    }

    // In a gap between items - keep current order by returning null
    // Caller should handle this by not updating state
    return null;
  };

  /**
   * Calculate transform offsets for each item based on order change
   * Returns Map of item id -> {x, y} offset
   */
  calculateTransforms = (
    draggedId: string,
    newOrder: Array<string>,
    draggedRect: DOMRect
  ): Map<string, {x: number, y: number}> => {
    const transforms = new Map();
    const { direction, gap } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';
    const isReversed = direction === 'row-reverse' || direction === 'column-reverse';
    const draggedSize = (isHorizontal ? draggedRect.width : draggedRect.height) + gap;

    const oldDraggedIndex = this.originalOrder.indexOf(draggedId);
    const newDraggedIndex = newOrder.indexOf(draggedId);

    // Calculate placeholder transform (where dragged item will land)
    if (oldDraggedIndex !== -1 && newDraggedIndex !== -1 && oldDraggedIndex !== newDraggedIndex) {
      const startIndex = Math.min(oldDraggedIndex, newDraggedIndex);
      const endIndex = Math.max(oldDraggedIndex, newDraggedIndex);
      const moveDirection = newDraggedIndex < oldDraggedIndex ? -1 : 1;

      let totalOffset = 0;
      for (let i = startIndex; i <= endIndex; i++) {
        const id = this.originalOrder[i];
        if (id !== draggedId) {
          const itemRect = this.itemBounds.get(id);
          if (itemRect) {
            totalOffset += (isHorizontal ? itemRect.width : itemRect.height) + gap;
          }
        }
      }

      // Apply direction multiplier for reverse layouts
      const directionMultiplier = isReversed ? -1 : 1;
      totalOffset *= moveDirection * directionMultiplier;

      transforms.set('__placeholder__', isHorizontal
        ? { x: totalOffset, y: 0 }
        : { x: 0, y: totalOffset }
      );
    } else {
      transforms.set('__placeholder__', { x: 0, y: 0 });
    }

    // Calculate transforms for each displaced item
    // Items shift by the dragged item's size to fill the gap it left
    this.originalOrder.forEach((id, oldIndex) => {
      if (id === draggedId) return;

      const newIndex = newOrder.indexOf(id);
      const indexDiff = newIndex - oldIndex;

      if (indexDiff !== 0) {
        // All displaced items shift by the dragged item's size
        // Direction multiplier handles row-reverse and column-reverse
        const directionMultiplier = isReversed ? -1 : 1;
        const offset = (indexDiff < 0 ? -1 : 1) * draggedSize * directionMultiplier;
        transforms.set(id, isHorizontal ? { x: offset, y: 0 } : { x: 0, y: offset });
      } else {
        transforms.set(id, { x: 0, y: 0 });
      }
    });

    // If dragging an external item, it needs the same transform as its placeholder
    if (draggedId.startsWith('__external__')) {
      const placeholderTransform = transforms.get('__placeholder__');
      if (placeholderTransform) {
        transforms.set(draggedId, placeholderTransform);
      }
    }

    return transforms;
  };

  /**
   * onDrag event handler
   */
  onDrag = (i: string, order: number, eventData: Object) => {
    const { onDrag } = this.props;
    const l = getFlexLayoutItem(this.state.layout, i);
    if (!l) return;

    const { e, node, newPosition } = eventData;
    const { oldDragItem } = this.state;

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

    // Preserve original flex properties
    const draggedGrow = oldDragItem?.grow ?? l.grow;
    const draggedShrink = oldDragItem?.shrink ?? l.shrink;

    if (this.itemBounds.size > 0 && newPosition && e) {
      // Update item sizes to account for flex-shrink changes as items reorder
      // Preserves original positions to avoid capturing transformed positions.
      this.updateItemSizes();

      const draggedRect = new DOMRect(
        newPosition.left,
        newPosition.top,
        newPosition.width,
        newPosition.height
      );

      // Create layout for calculations
      // If collapsing, set item to zero size so other items fill the gap
      let layoutForCalculation = this.state.layout;
      if (shouldCollapseItem) {
        layoutForCalculation = this.state.layout.map(item =>
          item.i === i
            ? { ...item, grow: 0, shrink: 1, maxWidth: 0, maxHeight: 0 }
            : item
        );
      }

      let newOrder = shouldCollapseItem
        ? this.originalOrder // Keep original order when collapsed
        : this.calculateNewOrder(i, e.clientX, e.clientY);

      // If newOrder is null, cursor is in a gap - keep current order
      if (!newOrder) {
        newOrder = this.state.currentOrder || this.originalOrder;
      }

      const transforms = this.calculateTransforms(i, newOrder, draggedRect);

      // Restore original flex properties in the final layout
      const finalLayout = layoutForCalculation.map(item =>
        item.i === i
          ? { ...item, grow: draggedGrow, shrink: draggedShrink, maxWidth: oldDragItem?.maxWidth, maxHeight: oldDragItem?.maxHeight }
          : item
      );

      // Determine if this flex is the drag source for CSS class application
      const isSourceFlex = this.props.enableCrossGridDrag &&
                           this.context?.dragState &&
                           this.context.dragState.sourceId === this.props.id;

      flushSync(() => {
        this.setState({
          layout: finalLayout,
          transforms: new Map(transforms),
          currentOrder: newOrder,
          activeDrag: {
            ...this.state.activeDrag,
            hidden: shouldCollapseItem
          },
          isDropSource: !!isSourceFlex,
          isDropActive: isSourceFlex && !shouldCollapseItem
        });
      });
    }

    return onDrag(this.state.layout, l, l, null, e, node);
  };

  /**
   * onDragStop event handler
   */
  onDragStop = (i: string, order: number, eventData: Object) => {
    const { onDragStop } = this.props;
    const l = getFlexLayoutItem(this.state.layout, i);
    if (!l) return;

    const { e, node } = eventData;
    const { currentOrder, oldLayout } = this.state;

    let newLayout = this.state.layout;
    if (currentOrder && currentOrder.length > 0) {
      const { direction } = this.props;
      const isReversed = direction === 'row-reverse' || direction === 'column-reverse';
      const orderMap = new Map();

      currentOrder.forEach((itemId, index) => {
        // For reversed flex directions, reverse the order assignment
        const orderValue = isReversed ? (currentOrder.length - 1 - index) : index;
        orderMap.set(itemId, orderValue);
      });

      newLayout = this.state.layout.map(item => {
        const newOrder = orderMap.get(item.i);
        if (newOrder !== undefined && newOrder !== item.order) {
          return { ...item, order: newOrder };
        }
        return item;
      });
    }

    // Disable transitions immediately to prevent non-dragged items from animating.
    // The dragged item has its own animation via FlexItem's animating state.
    this.setState({
      transforms: new Map(),
      currentOrder: null,
      layout: newLayout,
      oldLayout: null,
      oldDragItem: null,
      activeDrag: null,
      disableTransitions: true,
      ...this.clearDropState()
    });

    this.scheduleReEnableTransitions();

    // Notify parent if layout changed
    this.onLayoutMaybeChanged(newLayout, oldLayout);

    return onDragStop(newLayout, l, l, null, e, node);
  };

  /**
   * Render external item if it exists in layout
   * External items are in state.layout but not in props.children
   * We create a synthetic child for them to render in the flex flow
   */
  renderExternalItem(): ?ReactElement<any> {
    // Find external item in layout
    const externalItem = this.state.layout.find(item => item.i.startsWith("__external__"));
    if (!externalItem) return null;

    // Create synthetic child for external item
    // Use renderDroppingItem if provided, otherwise use empty div
    const syntheticChild = this.props.renderDroppingItem
      ? React.cloneElement(this.props.renderDroppingItem(externalItem), { key: externalItem.i })
      : <div key={externalItem.i} />;

    // Process it through normal flex item rendering
    return this.processFlexItem(syntheticChild, false);
  }

  /**
   * Render placeholder for external item
   * Positioned absolutely relative to flex container, overlaying the invisible external item
   */
  renderExternalPlaceholder(): ?ReactElement<any> {
    if (!this.flexRef.current) return null;

    const externalItem = this.state.layout.find(item => item.i.startsWith("__external__"));
    if (!externalItem) return null;

    // Only render placeholder if we have bounds collected
    const bounds = this.itemBounds.get(externalItem.i);
    if (!bounds) return null;

    // Query the external item's actual position in DOM
    const externalEl = this.flexRef.current.querySelector(`[data-rgl-item-id="${externalItem.i}"]`);
    if (!externalEl) return null;

    const externalBounds = externalEl.getBoundingClientRect();
    const containerBounds = this.flexRef.current.getBoundingClientRect();

    // Calculate base position relative to container
    let left = externalBounds.left - containerBounds.left;
    let top = externalBounds.top - containerBounds.top;
    const width = externalBounds.width;
    const height = externalBounds.height;

    // Apply transform offset from state if it exists
    // This is crucial because getBoundingClientRect() is called during render,
    // before the browser has painted the new transform
    const transform = this.state.transforms?.get(externalItem.i);
    if (transform) {
      left += transform.x;
      top += transform.y;
    }

    // Apply transition for smooth movement, unless transitions are disabled
    const transition = this.state.disableTransitions
      ? 'none'
      : 'left 200ms ease, top 200ms ease, width 100ms ease, height 100ms ease';

    return (
      <div
        key="external-placeholder"
        className="react-flex-item react-flex-placeholder placeholder-dragging"
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          pointerEvents: 'none',
          boxSizing: 'border-box',
          transition
        }}
      />
    );
  }

  /**
   * Given a FlexLayoutItem, generate the child element.
   */
  processFlexItem(
    child: ReactElement<any>,
    isDraggable: boolean
  ): ?ReactElement<any> {
    if (!child || !child.key) return null;

    const l = getFlexLayoutItem(this.state.layout, String(child.key));
    if (!l) return null;

    const {
      gap,
      draggableHandle,
      draggableCancel,
      useCSSTransforms,
      transformScale,
      isBounded
    } = this.props;

    // Determine if this item is draggable
    const draggable =
      typeof l.isDraggable === "boolean"
        ? l.isDraggable
        : !l.static && isDraggable;

    // Check if this is an external placeholder item (for static/draggable logic)
    const isExternalPlaceholder = l.i.startsWith("__external__");

    // Get transform offset for this item (for visual reordering)
    // External placeholders should not have transform offset - they stay in place
    // Only their placeholder shows where they will land (using placeholderTransform)
    const transform = isExternalPlaceholder
      ? { x: 0, y: 0 }
      : this.state.transforms.get(l.i) || { x: 0, y: 0 };

    // Get placeholder transform (where the dragged item will land)
    const placeholderTransform = this.state.transforms.get('__placeholder__') || { x: 0, y: 0 };

    // Check if this item's placeholder should be hidden (when dragging over external target)
    const hidePlaceholder = this.state.activeDrag?.hidden && l.i === this.state.activeDrag.i;

    return (
      <FlexItem
        key={child.key}
        i={l.i}
        order={l.order}
        grow={l.grow}
        shrink={l.shrink}
        alignSelf={l.alignSelf}
        direction={this.props.direction}
        minWidth={l.minWidth}
        maxWidth={l.maxWidth}
        minHeight={l.minHeight}
        maxHeight={l.maxHeight}
        static={l.static || isExternalPlaceholder}
        isDraggable={draggable && !isExternalPlaceholder}
        isBounded={isBounded}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStart={this.onDragStart}
        onDrag={this.onDrag}
        onDragStop={this.onDragStop}
        className={child.props.className}
        style={child.props.style}
        transformOffset={transform}
        placeholderTransform={placeholderTransform}
        hidePlaceholder={hidePlaceholder}
        isExternalPlaceholder={isExternalPlaceholder}
        disableTransitions={isExternalPlaceholder}  // External items pop into place without transition
        flexId={this.props.id}
        enableCrossGridDrag={this.props.enableCrossGridDrag}
        dragDropContext={this.context}
      >
        {child}
      </FlexItem>
    );
  }

  render(): ReactElement<"div"> {
    const { className, style, direction, justifyContent, alignItems, gap } = this.props;

    const mergedClassName = clsx(
      layoutClassName,
      className,
      {
        'react-flex-no-transition': this.state.disableTransitions,
        'drop-active': this.state.isDropActive,
        'drop-source': this.state.isDropSource
      }
    );
    const mergedStyle = {
      display: "flex",
      flexDirection: direction,
      justifyContent,
      alignItems,
      gap: `${gap}px`,
      position: 'relative',  // For absolute positioning of external placeholder
      ...style
    };

    return (
      <div
        ref={this.flexRef}
        className={mergedClassName}
        style={mergedStyle}
      >
        {React.Children.map(
          this.props.children,
          (child: ReactElement<any>) =>
            this.processFlexItem(child, this.props.isDraggable)
        )}
        {this.renderExternalItem()}
        {this.renderExternalPlaceholder()}
      </div>
    );
  }
}
