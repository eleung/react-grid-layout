// @flow
import { deepEqual } from "fast-equals";
import React from "react";
import type {
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";

export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type FlexJustifyContent = "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
export type FlexAlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
export type FlexAlignSelf = FlexAlignItems | "auto";

export type FlexLayoutItem = {
  i: string,              // Unique ID
  order: number,          // Flex order
  grow: number,           // Flex-grow
  shrink: number,         // Flex-shrink
  alignSelf?: FlexAlignSelf,     // Override container's alignItems
  minWidth?: number,
  maxWidth?: number,
  minHeight?: number,
  maxHeight?: number,
  static?: boolean,       // Non-draggable
  isDraggable?: ?boolean,
  moved?: boolean,
  hidden?: boolean,       // For cross-grid collapse
  placeholder?: boolean   // For drag placeholder
};

export type FlexLayout = $ReadOnlyArray<FlexLayoutItem>;

export type FlexDragEvent = {
  e: Event,
  node: HTMLElement,
  newPosition: { left: number, top: number }
};

export type FlexEventCallback = (
  layout: FlexLayout,
  oldItem: ?FlexLayoutItem,
  newItem: ?FlexLayoutItem,
  placeholder: ?FlexLayoutItem,
  event: Event,
  ?HTMLElement
) => void;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Return the bottom coordinate of the layout.
 *
 * @param  {FlexLayout} layout Layout array.
 * @return {Number}             Bottom coordinate.
 */
export function bottom(layout: FlexLayout): number {
  let max = 0;
  for (let i = 0, len = layout.length; i < len; i++) {
    max = Math.max(max, layout[i].order);
  }
  return max;
}

/**
 * Clones a flex layout item.
 */
export function cloneFlexLayoutItem(layoutItem: FlexLayoutItem): FlexLayoutItem {
  return {
    i: layoutItem.i,
    order: layoutItem.order,
    grow: layoutItem.grow,
    shrink: layoutItem.shrink,
    alignSelf: layoutItem.alignSelf,
    minWidth: layoutItem.minWidth,
    maxWidth: layoutItem.maxWidth,
    minHeight: layoutItem.minHeight,
    maxHeight: layoutItem.maxHeight,
    static: layoutItem.static,
    isDraggable: layoutItem.isDraggable,
    moved: layoutItem.moved,
    hidden: layoutItem.hidden,
    placeholder: layoutItem.placeholder
  };
}

/**
 * Clone a flex layout.
 */
export function cloneFlexLayout(layout: FlexLayout): FlexLayout {
  const newLayout = Array(layout.length);
  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneFlexLayoutItem(layout[i]);
  }
  return newLayout;
}

/**
 * Get a layout item by ID.
 */
export function getFlexLayoutItem(
  layout: FlexLayout,
  id: string
): ?FlexLayoutItem {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].i === id) return layout[i];
  }
}

/**
 * Validate a flex layout. Throws errors.
 *
 * @param  {FlexLayout} layout        Array of flex layout items.
 * @param  {String} [contextName]     Context name for error messages.
 */
export function validateFlexLayout(
  layout: FlexLayout,
  contextName: string = "FlexLayout"
): void {
  const subProps = ["i", "order", "grow", "shrink"];
  if (!Array.isArray(layout))
    throw new Error(contextName + " must be an array!");
  for (let i = 0, len = layout.length; i < len; i++) {
    const item = layout[i];
    for (let j = 0; j < subProps.length; j++) {
      if (item[subProps[j]] === undefined) {
        throw new Error(
          "FlexLayout item at index " +
            i +
            ' is missing required property "' +
            subProps[j] +
            '"'
        );
      }
    }
  }
}

/**
 * Compare layouts for equality.
 */
export function flexLayoutsEqual(
  a: FlexLayout,
  b: FlexLayout
): boolean {
  return deepEqual(a, b);
}

/**
 * Given a layout, make sure all elements fit within the constraints.
 */
export function normalizeFlexLayout(
  layout: FlexLayout
): FlexLayout {
  const normalized = cloneFlexLayout(layout);

  // Ensure no negative orders
  for (let i = 0, len = normalized.length; i < len; i++) {
    const item = normalized[i];
    if (item.order < 0) item.order = 0;
    if (item.grow < 0) item.grow = 0;
    if (item.shrink < 0) item.shrink = 1;
  }

  return normalized;
}

/**
 * Sort layout items by order.
 */
export function sortFlexLayoutItemsByOrder(layout: FlexLayout): FlexLayout {
  return layout.slice(0).sort(function (a, b) {
    if (a.order > b.order) return 1;
    if (a.order < b.order) return -1;
    return 0;
  });
}

/**
 * Synchronize a flex layout with children.
 */
export function synchronizeFlexLayoutWithChildren(
  layout: FlexLayout,
  children: ReactChildrenArray<ReactElement<any>>,
  cols: number
): FlexLayout {
  // Ensure each child has a layout entry
  layout = layout || [];

  const newLayout = [];
  React.Children.forEach(children, (child: ReactElement<any>, i: number) => {
    if (!child || !child.key) return;

    const exists = getFlexLayoutItem(layout, String(child.key));
    if (exists) {
      newLayout.push(cloneFlexLayoutItem(exists));
    } else {
      if (!isProduction && child.props._grid) {
        console.warn(
          "`_grid` properties on children have been deprecated as of React 15.2. " +
            "Please use `data-flex` or add items to the `layout` prop."
        );
      }

      // New item - create default flex layout
      const defaultFlexItem: FlexLayoutItem = {
        i: String(child.key),
        order: i,
        grow: 0,
        shrink: 1
      };

      // Check for data-flex attribute
      if (child.props["data-flex"]) {
        newLayout.push({ ...defaultFlexItem, ...child.props["data-flex"] });
      } else {
        newLayout.push(defaultFlexItem);
      }
    }
  });

  return newLayout;
}

/**
 * Given two flex layouts, check if they have the same items (by id).
 */
export function childrenEqual(
  a: ReactChildrenArray<ReactElement<any>>,
  b: ReactChildrenArray<ReactElement<any>>
): boolean {
  return deepEqual(
    React.Children.map(a, (c) => c?.key),
    React.Children.map(b, (c) => c?.key)
  );
}

/**
 * Get all static elements.
 */
export function getFlexStatics(layout: FlexLayout): Array<FlexLayoutItem> {
  return layout.filter((l) => l.static);
}

/**
 * Perform a fast shallow prop equality check for FlexLayout props.
 */
export function fastFlexPropsEqual(a: Object, b: Object): boolean {
  // Fast check for common immutable props
  if (
    a.width !== b.width ||
    a.direction !== b.direction ||
    a.justifyContent !== b.justifyContent ||
    a.alignItems !== b.alignItems ||
    a.gap !== b.gap ||
    a.isDraggable !== b.isDraggable ||
    a.isDroppable !== b.isDroppable ||
    a.isBounded !== b.isBounded ||
    a.transformScale !== b.transformScale ||
    a.className !== b.className ||
    a.style !== b.style
  ) {
    return false;
  }

  // Deep check layout
  if (!flexLayoutsEqual(a.layout, b.layout)) return false;

  return true;
}

/**
 * No-op function.
 */
export function noop(): void {}

/**
 * Helper to modify a flex layout item in an immutable way.
 */
export function withFlexLayoutItem(
  layout: FlexLayout,
  itemKey: string,
  cb: (item: FlexLayoutItem) => FlexLayoutItem
): [FlexLayout, ?FlexLayoutItem] {
  let item: ?FlexLayoutItem;
  const newLayout = layout.map((l) => {
    if (l.i === itemKey) {
      item = cb({ ...l });
      return item;
    }
    return l;
  });
  return [newLayout, item];
}
