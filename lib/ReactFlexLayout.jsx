// @flow
import * as React from "react";
import { flushSync } from "react-dom";
import { deepEqual } from "fast-equals";
import clsx from "clsx";
import {
  childrenEqual,
  synchronizeFlexLayoutWithChildren,
  getFlexLayoutItem,
  noop,
  sortFlexLayoutItemsByOrder
} from "./flexUtils";

import FlexItem from "./FlexItem";
import ReactFlexLayoutPropTypes from "./ReactFlexLayoutPropTypes";
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
  disableTransitions: boolean
};

const layoutClassName = "react-flex-layout";

/**
 * A reactive, fluid flex layout with draggable components.
 */
export default class ReactFlexLayout extends React.Component<Props, State> {
  static displayName: ?string = "ReactFlexLayout";
  static propTypes = ReactFlexLayoutPropTypes;

  static defaultProps: DefaultProps = {
    autoSize: true,
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
    disableTransitions: false
  };

  flexRef: { current: ?HTMLElement } = React.createRef();

  // Store item bounds during drag for collision detection and reordering
  itemBounds: Map<string, DOMRect> = new Map();
  // Store original order before drag for diff calculation
  originalOrder: Array<string> = [];
  // Timeout for re-enabling transitions after drop
  transitionTimeout: ?TimeoutID = null;

  componentDidMount() {
    this.setState({ mounted: true });
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);
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
      this.state.disableTransitions !== nextState.disableTransitions
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!this.state.activeDrag) {
      const newLayout = this.state.layout;
      const oldLayout = prevState.layout;
      this.onLayoutMaybeChanged(newLayout, oldLayout);
    }
  }

  componentWillUnmount() {
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
  }

  /**
   * Calculates a pixel value for the container.
   */
  containerHeight(): ?string {
    if (!this.props.autoSize) return;

    // For flex, we let the browser handle height
    return "auto";
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

    // Sort by visual position (left for row, top for column)
    const { direction } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';

    itemsWithBounds.sort((a, b) => {
      if (isHorizontal) {
        // For row layouts, sort by left position
        return a.rect.left - b.rect.left;
      } else {
        // For column layouts, sort by top position
        return a.rect.top - b.rect.top;
      }
    });

    // Now build originalOrder and itemBounds in visual order
    itemsWithBounds.forEach(({ id, rect }) => {
      this.itemBounds.set(id, rect);
      this.originalOrder.push(id);
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
   */
  calculateNewOrder = (draggedId: string, mouseX: number, mouseY: number): Array<string> => {
    const { direction, gap } = this.props;
    const isHorizontal = direction === 'row' || direction === 'row-reverse';
    const halfGap = gap / 2;
    let hoveredItemId = null;

    for (const [itemId, rect] of this.itemBounds.entries()) {
      if (itemId === draggedId) continue;

      const left = rect.left - (isHorizontal ? halfGap : 0);
      const right = rect.right + (isHorizontal ? halfGap : 0);
      const top = rect.top - (isHorizontal ? 0 : halfGap);
      const bottom = rect.bottom + (isHorizontal ? 0 : halfGap);

      const isColliding = isHorizontal
        ? mouseX >= left && mouseX <= right
        : mouseY >= top && mouseY <= bottom;

      if (isColliding) {
        hoveredItemId = itemId;
        break;
      }
    }

    const items = this.originalOrder.filter(id => id !== draggedId);

    if (hoveredItemId) {
      const draggedOriginalIndex = this.originalOrder.indexOf(draggedId);
      const hoveredOriginalIndex = this.originalOrder.indexOf(hoveredItemId);
      let insertIndex = items.indexOf(hoveredItemId);

      if (hoveredOriginalIndex > draggedOriginalIndex) {
        insertIndex += 1;
      }

      const newOrder = [...items];
      newOrder.splice(insertIndex, 0, draggedId);
      return newOrder;
    }

    if (items.length > 0) {
      const firstRect = this.itemBounds.get(items[0]);
      const lastRect = this.itemBounds.get(items[items.length - 1]);

      if (firstRect && lastRect) {
        const firstBound = isHorizontal ? firstRect.left - halfGap : firstRect.top - halfGap;
        const lastBound = isHorizontal ? lastRect.right + halfGap : lastRect.bottom + halfGap;
        const cursorPos = isHorizontal ? mouseX : mouseY;

        if (cursorPos < firstBound) return [draggedId, ...items];
        if (cursorPos > lastBound) return [...items, draggedId];
      }
    }

    return [...this.originalOrder];
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
    const draggedSize = (isHorizontal ? draggedRect.width : draggedRect.height) + gap;

    const oldDraggedIndex = this.originalOrder.indexOf(draggedId);
    const newDraggedIndex = newOrder.indexOf(draggedId);

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

      totalOffset *= moveDirection;
      transforms.set('__placeholder__', isHorizontal
        ? { x: totalOffset, y: 0 }
        : { x: 0, y: totalOffset }
      );
    } else {
      transforms.set('__placeholder__', { x: 0, y: 0 });
    }

    this.originalOrder.forEach((id, oldIndex) => {
      if (id === draggedId) return;

      const newIndex = newOrder.indexOf(id);
      const indexDiff = newIndex - oldIndex;

      if (indexDiff !== 0) {
        const offset = (indexDiff < 0 ? -1 : 1) * draggedSize;
        transforms.set(id, isHorizontal ? { x: offset, y: 0 } : { x: 0, y: offset });
      } else {
        transforms.set(id, { x: 0, y: 0 });
      }
    });

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

    if (this.itemBounds.size > 0 && newPosition && e) {
      const draggedRect = new DOMRect(
        newPosition.left,
        newPosition.top,
        newPosition.width,
        newPosition.height
      );

      const newOrder = this.calculateNewOrder(i, e.clientX, e.clientY);
      const transforms = this.calculateTransforms(i, newOrder, draggedRect);

      flushSync(() => {
        this.setState({
          transforms: new Map(transforms),
          currentOrder: newOrder
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

      newLayout = sortFlexLayoutItemsByOrder(newLayout);
    }

    // Disable transitions immediately to prevent non-dragged items from animating.
    // The dragged item has its own animation via FlexItem's animating state.
    this.setState({
      transforms: new Map(),
      currentOrder: null,
      layout: newLayout,
      oldLayout: null,
      oldDragItem: null,
      disableTransitions: true
    });

    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
    this.transitionTimeout = setTimeout(() => {
      this.setState({ disableTransitions: false });
    }, 50);

    // Notify parent if layout changed
    this.onLayoutMaybeChanged(newLayout, oldLayout);

    return onDragStop(newLayout, l, l, null, e, node);
  };

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
      width,
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

    // Get transform offset for this item (for visual reordering)
    const transform = this.state.transforms.get(l.i) || { x: 0, y: 0 };

    // Get placeholder transform (where the dragged item will land)
    const placeholderTransform = this.state.transforms.get('__placeholder__') || { x: 0, y: 0 };

    return (
      <FlexItem
        key={child.key}
        i={l.i}
        order={l.order}
        grow={l.grow}
        shrink={l.shrink}
        basis={l.basis}
        alignSelf={l.alignSelf}
        minWidth={l.minWidth}
        maxWidth={l.maxWidth}
        minHeight={l.minHeight}
        maxHeight={l.maxHeight}
        containerWidth={width}
        static={l.static}
        isDraggable={draggable}
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
      >
        {child}
      </FlexItem>
    );
  }

  render(): ReactElement<"div"> {
    const { className, style, width, direction, justifyContent, alignItems, gap } = this.props;

    const mergedClassName = clsx(
      layoutClassName,
      className,
      {
        'react-flex-no-transition': this.state.disableTransitions
      }
    );
    const mergedStyle = {
      height: this.containerHeight(),
      width: `${width}px`,
      display: "flex",
      flexDirection: direction,
      justifyContent,
      alignItems,
      gap: `${gap}px`,
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
      </div>
    );
  }
}
