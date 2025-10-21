"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _propTypes = _interopRequireDefault(require("prop-types"));
var _react = _interopRequireDefault(require("react"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/*:: import type {
  Ref,
  ChildrenArray as ReactChildrenArray,
  Element as ReactElement
} from "react";*/
/*:: import type {
  FlexEventCallback,
  FlexDirection,
  FlexJustifyContent,
  FlexAlignItems,
  FlexLayout,
  FlexLayoutItem
} from "./flexUtils";*/
/*:: export type Props = {|
  className: string,
  style: Object,

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
  crossGridTransform?: (item: FlexLayoutItem, sourceConfig: any, targetConfig: any) => FlexLayoutItem,
  renderDroppingItem?: (item: FlexLayoutItem) => ReactElement<any>,

  // Callbacks
  onLayoutChange: FlexLayout => void,
  onDrag: FlexEventCallback,
  onDragStart: FlexEventCallback,
  onDragStop: FlexEventCallback,
  onDrop: (layout: FlexLayout, item: ?FlexLayoutItem, e: Event) => void,

  children: ReactChildrenArray<ReactElement<any>>,
  innerRef?: Ref<"div">
|};*/
/*:: export type DefaultProps = $Diff<
  Props,
  {
    children: ReactChildrenArray<ReactElement<any>>
  }
>;*/
var _default = exports.default = {
  //
  // Basic props
  //
  className: _propTypes.default.string,
  style: _propTypes.default.object,
  //
  // Flex-specific props
  //
  direction: (_propTypes.default.oneOf(["row", "column", "row-reverse", "column-reverse"]) /*: ReactPropsChainableTypeChecker*/),
  justifyContent: (_propTypes.default.oneOf(["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"]) /*: ReactPropsChainableTypeChecker*/),
  alignItems: (_propTypes.default.oneOf(["flex-start", "flex-end", "center", "stretch", "baseline"]) /*: ReactPropsChainableTypeChecker*/),
  gap: _propTypes.default.number,
  // A selector that will not be draggable.
  draggableCancel: _propTypes.default.string,
  // A selector for the draggable handler
  draggableHandle: _propTypes.default.string,
  // layout is an array of object with the format:
  // {i: String, order: Number, grow: Number, shrink: Number}
  layout: function (props /*: Props*/) {
    var layout = props.layout;
    if (layout === undefined) return;
    require("./flexUtils").validateFlexLayout(layout, "layout");
  },
  //
  // Flags
  //
  isBounded: _propTypes.default.bool,
  isDraggable: _propTypes.default.bool,
  useCSSTransforms: _propTypes.default.bool,
  transformScale: _propTypes.default.number,
  isDroppable: _propTypes.default.bool,
  // Cross-grid drag and drop
  id: _propTypes.default.string,
  enableCrossGridDrag: _propTypes.default.bool,
  crossGridAcceptsDrop: _propTypes.default.oneOfType([_propTypes.default.bool, _propTypes.default.func]),
  crossGridTransform: _propTypes.default.func,
  renderDroppingItem: _propTypes.default.func,
  //
  // Callbacks
  //
  onLayoutChange: _propTypes.default.func,
  onDragStart: _propTypes.default.func,
  onDrag: _propTypes.default.func,
  onDragStop: _propTypes.default.func,
  onDrop: _propTypes.default.func,
  // Children must not have duplicate keys.
  children: function (props /*: Props*/, propName /*: string*/) {
    const children = props[propName];

    // Check children keys for duplicates. Throw if found.
    const keys = {};
    _react.default.Children.forEach(children, function (child) {
      if (child?.key == null) return;
      if (keys[child.key]) {
        throw new Error('Duplicate child key "' + child.key + '" found! This will cause problems in ReactFlexLayout.');
      }
      keys[child.key] = true;
    });
  },
  // Optional ref for getting a reference for the wrapping div.
  innerRef: _propTypes.default.any
};