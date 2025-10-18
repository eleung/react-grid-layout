// @flow
import PropTypes from "prop-types";
import React from "react";
import type {
  Ref,
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";
import type {
  FlexEventCallback,
  FlexDirection,
  FlexJustifyContent,
  FlexAlignItems,
  FlexLayout,
  FlexLayoutItem
} from "./flexUtils";

export type Props = {|
  className: string,
  style: Object,
  width: number,
  autoSize: boolean,

  // Flex-specific props
  direction: FlexDirection,
  justifyContent: FlexJustifyContent,
  alignItems: FlexAlignItems,
  gap: number,

  // Draggable props
  draggableCancel: string,
  draggableHandle: string,
  layout: FlexLayout,

  // Flags
  isBounded: boolean,
  isDraggable: boolean,
  isDroppable: boolean,
  useCSSTransforms: boolean,
  transformScale: number,

  // Cross-grid drag and drop
  id?: string,
  enableCrossGridDrag?: boolean,
  crossGridAcceptsDrop?: boolean | ((item: FlexLayoutItem, sourceId: string) => boolean),

  // Callbacks
  onLayoutChange: FlexLayout => void,
  onDrag: FlexEventCallback,
  onDragStart: FlexEventCallback,
  onDragStop: FlexEventCallback,
  onDrop: (layout: FlexLayout, item: ?FlexLayoutItem, e: Event) => void,

  children: ReactChildrenArray<ReactElement<any>>,
  innerRef?: Ref<"div">
|};

export type DefaultProps = $Diff<
  Props,
  {
    children: ReactChildrenArray<ReactElement<any>>,
    width: number
  }
>;

export default {
  //
  // Basic props
  //
  className: PropTypes.string,
  style: PropTypes.object,
  width: PropTypes.number,
  autoSize: PropTypes.bool,

  //
  // Flex-specific props
  //
  direction: (PropTypes.oneOf([
    "row",
    "column",
    "row-reverse",
    "column-reverse"
  ]): ReactPropsChainableTypeChecker),

  justifyContent: (PropTypes.oneOf([
    "flex-start",
    "flex-end",
    "center",
    "space-between",
    "space-around",
    "space-evenly"
  ]): ReactPropsChainableTypeChecker),

  alignItems: (PropTypes.oneOf([
    "flex-start",
    "flex-end",
    "center",
    "stretch",
    "baseline"
  ]): ReactPropsChainableTypeChecker),

  gap: PropTypes.number,

  // A selector that will not be draggable.
  draggableCancel: PropTypes.string,
  // A selector for the draggable handler
  draggableHandle: PropTypes.string,

  // layout is an array of object with the format:
  // {i: String, order: Number, grow: Number, shrink: Number, basis: String|Number}
  layout: function (props: Props) {
    var layout = props.layout;
    if (layout === undefined) return;
    require("./flexUtils").validateFlexLayout(layout, "layout");
  },

  //
  // Flags
  //
  isBounded: PropTypes.bool,
  isDraggable: PropTypes.bool,
  useCSSTransforms: PropTypes.bool,
  transformScale: PropTypes.number,
  isDroppable: PropTypes.bool,

  // Cross-grid drag and drop
  id: PropTypes.string,
  enableCrossGridDrag: PropTypes.bool,
  crossGridAcceptsDrop: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),

  //
  // Callbacks
  //
  onLayoutChange: PropTypes.func,
  onDragStart: PropTypes.func,
  onDrag: PropTypes.func,
  onDragStop: PropTypes.func,
  onDrop: PropTypes.func,

  // Children must not have duplicate keys.
  children: function (props: Props, propName: string) {
    const children = props[propName];

    // Check children keys for duplicates. Throw if found.
    const keys = {};
    React.Children.forEach(children, function (child) {
      if (child?.key == null) return;
      if (keys[child.key]) {
        throw new Error(
          'Duplicate child key "' +
            child.key +
            '" found! This will cause problems in ReactFlexLayout.'
        );
      }
      keys[child.key] = true;
    });
  },

  // Optional ref for getting a reference for the wrapping div.
  innerRef: PropTypes.any
};
