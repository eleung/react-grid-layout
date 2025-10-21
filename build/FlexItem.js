"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactDom = require("react-dom");
var _propTypes = _interopRequireDefault(require("prop-types"));
var _reactDraggable = require("react-draggable");
var _clsx = _interopRequireDefault(require("clsx"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/*:: import type { Element as ReactElement } from "react";*/
/*:: import type { FlexLayoutItem, FlexAlignSelf, FlexDragEvent } from "./flexUtils";*/
/*:: import type { DragDropContextValue } from "./DragDropContext";*/
/*:: type PartialPosition = { top: number, left: number, width: number, height: number };*/
/*:: type FlexPosition = { top: number, left: number };*/
/*:: type ReactDraggableCallbackData = {
  node: HTMLElement,
  x?: number,
  y?: number,
  deltaX: number,
  deltaY: number,
  lastX?: number,
  lastY?: number
};*/
/*:: type FlexItemCallback<Data: FlexDragEvent> = (
  i: string,
  order: number,
  Data
) => void;*/
/*:: type Props = {
  children: ReactElement<any>,
  className: string,
  style?: Object,

  // Flex properties
  order: number,
  grow: number,
  shrink: number,
  alignSelf?: FlexAlignSelf,

  // Constraints
  minWidth?: number,
  maxWidth?: number,
  minHeight?: number,
  maxHeight?: number,

  // Item identifier
  i: string,

  // Flags
  isDraggable: boolean,
  isBounded?: boolean,
  static?: boolean,
  useCSSTransforms?: boolean,
  transformScale: number,

  // Draggability
  cancel: string,
  handle: string,

  // Callbacks
  onDrag?: FlexItemCallback<FlexDragEvent>,
  onDragStart?: FlexItemCallback<FlexDragEvent>,
  onDragStop?: FlexItemCallback<FlexDragEvent>,

  // Visual reordering transform offset
  transformOffset?: {x: number, y: number},

  // Placeholder transform offset (where dragged item will land)
  placeholderTransform?: {x: number, y: number},

  // Hide placeholder (when dragging over external target)
  hidePlaceholder?: boolean,

  // Is this an external placeholder item (for showing placeholder without drag)
  isExternalPlaceholder?: boolean,

  // External placeholder size (for sizing placeholder like internal drag)
  externalSize?: {width: number, height: number},

  // Disable transitions (for external items to pop into place)
  disableTransitions?: boolean,

  // Cross-container drag
  flexId?: ?string,
  enableCrossGridDrag?: boolean,
  dragDropContext?: ?DragDropContextValue
};*/
/*:: type State = {
  dragging: ?PartialPosition,
  animating: ?PartialPosition,
  originalFlexPosition: ?FlexPosition,
  disableTransitions: boolean
};*/
/*:: type DefaultProps = {
  className: string,
  cancel: string,
  handle: string,
  transformScale: number
};*/
/**
 * An individual item within a ReactFlexLayout.
 */
class FlexItem extends _react.default.Component /*:: <Props, State>*/{
  constructor() {
    super(...arguments);
    _defineProperty(this, "state", {
      dragging: null,
      animating: null,
      originalFlexPosition: null,
      disableTransitions: false
    });
    _defineProperty(this, "animationTimeout", null);
    _defineProperty(this, "transitionTimeout", null);
    _defineProperty(this, "mounted", false);
    _defineProperty(this, "elementRef", /*#__PURE__*/_react.default.createRef());
    /**
     * onDragStart event handler
     */
    _defineProperty(this, "onDragStart", (e, _ref) => {
      let {
        node
      } = _ref;
      const {
        onDragStart
      } = this.props;
      if (!onDragStart) return;

      // Clear any pending animation timeout from previous drag
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
        this.animationTimeout = null;
      }

      // Get position relative to parent using offsetLeft/offsetTop
      // This gives us the position as rendered in the flex container
      const {
        offsetParent
      } = node;
      if (!offsetParent) return;

      // Get the actual visual size using getBoundingClientRect
      const rect = node.getBoundingClientRect();

      // Save the original flex position BEFORE we start dragging
      const originalFlexPosition /*: FlexPosition*/ = {
        left: node.offsetLeft,
        top: node.offsetTop
      };

      // Use offsetLeft/offsetTop which accounts for flex positioning
      // Use getBoundingClientRect for the actual visual size
      const newPosition /*: PartialPosition*/ = {
        left: node.offsetLeft,
        top: node.offsetTop,
        width: rect.width,
        height: rect.height
      };
      this.setState({
        dragging: newPosition,
        originalFlexPosition,
        animating: null,
        disableTransitions: false
      });

      // Notify drag-drop context
      if (this.props.enableCrossGridDrag && this.props.dragDropContext && this.props.flexId) {
        const flexItem = {
          i: this.props.i,
          order: this.props.order,
          grow: this.props.grow,
          shrink: this.props.shrink,
          alignSelf: this.props.alignSelf,
          minWidth: this.props.minWidth,
          maxWidth: this.props.maxWidth,
          minHeight: this.props.minHeight,
          maxHeight: this.props.maxHeight,
          // Include dimensions for transformation
          width: rect.width,
          height: rect.height
        };

        // Calculate offset from item's top-left to mouse position
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        this.props.dragDropContext.startDrag(this.props.flexId, flexItem, e.clientX, e.clientY, offsetX, offsetY);
      }

      // Call callback
      return onDragStart.call(this, this.props.i, this.props.order, {
        e,
        node,
        newPosition
      });
    });
    /**
     * onDrag event handler
     */
    _defineProperty(this, "onDrag", (e, _ref2) => {
      let {
        node,
        deltaX,
        deltaY
      } = _ref2;
      const {
        onDrag,
        isBounded
      } = this.props;
      if (!onDrag) return;
      if (!this.state.dragging) {
        throw new Error("onDrag called before onDragStart.");
      }
      let top = this.state.dragging.top + deltaY;
      let left = this.state.dragging.left + deltaX;
      const {
        width,
        height
      } = this.state.dragging;

      // Boundary calculations - keep item within container
      if (isBounded) {
        const {
          offsetParent
        } = node;
        if (offsetParent) {
          // Clamp to container boundaries
          const bottomBoundary = offsetParent.clientHeight - height;
          top = Math.max(0, Math.min(top, bottomBoundary));
          const rightBoundary = offsetParent.clientWidth - width;
          left = Math.max(0, Math.min(left, rightBoundary));
        }
      }
      const newPosition /*: PartialPosition*/ = {
        top,
        left,
        width,
        height
      };

      // Use flushSync for immediate update
      (0, _reactDom.flushSync)(() => {
        this.setState({
          dragging: newPosition
        });
      });

      // Update drag-drop context with mouse position
      if (this.props.enableCrossGridDrag && this.props.dragDropContext && e.clientX != null && e.clientY != null) {
        this.props.dragDropContext.updateDrag(e.clientX, e.clientY);
      }

      // Call callback
      return onDrag.call(this, this.props.i, this.props.order, {
        e,
        node,
        newPosition
      });
    });
    /**
     * onDragStop event handler
     */
    _defineProperty(this, "onDragStop", (e, _ref3) => {
      let {
        node
      } = _ref3;
      const {
        onDragStop,
        placeholderTransform
      } = this.props;
      if (!onDragStop) return;
      if (!this.state.dragging) {
        throw new Error("onDragStop called before onDragStart.");
      }
      const {
        width,
        height
      } = this.state.dragging;
      const {
        originalFlexPosition
      } = this.state;
      const newPosition /*: PartialPosition*/ = {
        top: this.state.dragging.top,
        left: this.state.dragging.left,
        width,
        height
      };

      // Notify drag-drop context about drag end
      // The context will determine if this was dropped on a target (grid, flex, or external)
      let isMovingToAnotherTarget = false;
      if (this.props.enableCrossGridDrag && this.props.dragDropContext && this.props.flexId) {
        // Determine which drop target we're over based on mouse position
        let targetId = null;
        if (this.props.dragDropContext.dragState) {
          // Check if mouse is over a different drop target
          for (const [id, targetConfig] of this.props.dragDropContext.dropTargets.entries()) {
            if (id !== this.props.flexId && targetConfig.element) {
              const rect = targetConfig.element.getBoundingClientRect();
              if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                targetId = id;
                isMovingToAnotherTarget = true;
                break;
              }
            }
          }
        }
        this.props.dragDropContext.endDrag(targetId);

        // If moving to another target, the component will unmount, so skip setState
        if (isMovingToAnotherTarget) {
          return;
        }
      }
      if (!originalFlexPosition) {
        this.setState({
          dragging: null,
          animating: null,
          originalFlexPosition: null
        });
        return;
      }

      // Calculate final position: original position + placeholder transform offset
      const finalLeft = originalFlexPosition.left + (placeholderTransform?.x || 0);
      const finalTop = originalFlexPosition.top + (placeholderTransform?.y || 0);
      const finalPosition /*: PartialPosition*/ = {
        left: finalLeft,
        top: finalTop,
        width,
        height
      };
      this.setState({
        dragging: null,
        animating: finalPosition
      });

      // After animation completes (200ms), disable transitions to prevent flash when
      // switching from absolute positioning back to flex layout
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
      }
      if (this.transitionTimeout) {
        clearTimeout(this.transitionTimeout);
      }
      this.animationTimeout = setTimeout(() => {
        if (!this.mounted) return;
        this.setState({
          animating: null,
          originalFlexPosition: null,
          disableTransitions: true
        });
        this.transitionTimeout = setTimeout(() => {
          if (!this.mounted) return;
          this.setState({
            disableTransitions: false
          });
        }, 50);
      }, 200);
      return onDragStop.call(this, this.props.i, this.props.order, {
        e,
        node,
        newPosition
      });
    });
  }
  /**
   * Create flex item styles.
   */
  createStyle() /*: Object*/{
    const {
      order,
      grow,
      shrink,
      alignSelf,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      useCSSTransforms,
      style
    } = this.props;
    const {
      dragging,
      animating
    } = this.state;

    // If dragging or animating, use absolute positioning with transforms
    const positionOverride = dragging || animating;
    if (positionOverride && useCSSTransforms) {
      const translate = `translate(${positionOverride.left}px, ${positionOverride.top}px)`;
      return {
        ...style,
        position: "absolute",
        // Force border-box so width/height include padding and border
        boxSizing: "border-box",
        width: `${positionOverride.width}px`,
        height: `${positionOverride.height}px`,
        transform: translate,
        WebkitTransform: translate,
        MozTransform: translate,
        msTransform: translate,
        OTransform: translate,
        top: 0,
        left: 0,
        // Preserve flex properties for when we return to flex layout
        order,
        flexGrow: grow,
        flexShrink: shrink
      };
    }

    // Base flex styles (normal positioning)
    const flexStyles = {
      order,
      flexGrow: grow,
      flexShrink: shrink
    };

    // Add alignSelf if specified
    if (alignSelf) {
      flexStyles.alignSelf = alignSelf;
    }

    // Add constraints
    if (minWidth != null) flexStyles.minWidth = `${minWidth}px`;
    if (maxWidth != null) flexStyles.maxWidth = `${maxWidth}px`;
    if (minHeight != null) flexStyles.minHeight = `${minHeight}px`;
    if (maxHeight != null) flexStyles.maxHeight = `${maxHeight}px`;
    const {
      transformOffset
    } = this.props;
    if (transformOffset && useCSSTransforms && (transformOffset.x !== 0 || transformOffset.y !== 0)) {
      this.setTransformStyle(flexStyles, transformOffset.x, transformOffset.y);
    }
    return {
      ...flexStyles,
      ...style
    };
  }
  setTransformStyle(styleObj /*: Object*/, x /*: number*/, y /*: number*/) {
    const translate = `translate(${x}px, ${y}px)`;
    styleObj.transform = translate;
    styleObj.WebkitTransform = translate;
    styleObj.MozTransform = translate;
    styleObj.msTransform = translate;
    styleObj.OTransform = translate;
  }
  componentDidMount() {
    this.mounted = true;
  }
  componentWillUnmount() {
    this.mounted = false;
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
    }
  }

  /**
   * Mix a Draggable instance into a child.
   */
  mixinDraggable(child /*: ReactElement<any>*/, isDraggable /*: boolean*/) /*: ReactElement<any>*/{
    return /*#__PURE__*/_react.default.createElement(_reactDraggable.DraggableCore, {
      disabled: !isDraggable,
      onStart: this.onDragStart,
      onDrag: this.onDrag,
      onStop: this.onDragStop,
      handle: this.props.handle,
      cancel: this.props.cancel,
      scale: this.props.transformScale,
      nodeRef: this.elementRef
    }, child);
  }
  render() /*: ReactElement<any>*/{
    const {
      children,
      isDraggable,
      static: isStatic,
      className,
      useCSSTransforms,
      order,
      grow,
      shrink,
      alignSelf,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight
    } = this.props;
    const {
      dragging,
      animating
    } = this.state;

    // Disable transitions if prop is set OR if state disables them
    const shouldDisableTransitions = this.props.disableTransitions || this.state.disableTransitions;

    // Create class names following the same pattern as GridItem
    const classes = (0, _clsx.default)("react-flex-item", className, {
      static: isStatic,
      "react-draggable": isDraggable,
      "react-draggable-dragging": Boolean(dragging),
      "react-flex-animating": Boolean(animating),
      "react-flex-no-transition": shouldDisableTransitions,
      cssTransforms: useCSSTransforms
    });

    // Clone child with our styles and classes
    const childStyle = {
      ...children.props.style,
      ...this.createStyle()
    };

    // For external placeholders, hide the content but keep in flex flow
    // This allows the item to participate in flex-grow/shrink calculations
    if (this.props.isExternalPlaceholder) {
      childStyle.opacity = 0;
      childStyle.pointerEvents = 'none';
      // DON'T position absolute - stay in flex flow!
    }
    let newChild = /*#__PURE__*/_react.default.cloneElement(children, {
      ref: this.elementRef,
      className: (0, _clsx.default)(children.props.className, classes),
      "data-rgl-item-id": this.props.i,
      // For reliable DOM -> layout item matching
      style: childStyle
    });

    // Wrap with Draggable support
    newChild = this.mixinDraggable(newChild, isDraggable);

    // If dragging or animating, render a placeholder to hold the space in flex layout
    // External items DON'T get placeholder here - they're rendered separately in ReactFlexLayout
    // Don't show placeholder if hidePlaceholder prop is true (dragging over external target)
    const showPlaceholder = (dragging || animating) && !this.props.isExternalPlaceholder && !this.props.hidePlaceholder;
    if (showPlaceholder) {
      // Use same sizing logic for internal drags
      const sizeSource = dragging || animating;
      const placeholderStyle = {
        order,
        flexGrow: 0,
        // Fixed size - don't grow (placeholder is empty, can't flex like real content)
        flexShrink: 0,
        // Fixed size - don't shrink
        flexBasis: 'auto',
        boxSizing: 'border-box'
      };

      // Use sizeSource dimensions
      // Only set size in main axis - let flexbox stretch in cross axis
      if (sizeSource) {
        const {
          direction
        } = this.props;
        const isHorizontal = direction === 'row' || direction === 'row-reverse';
        if (isHorizontal) {
          // Row: set width (main axis), let height stretch (cross axis)
          placeholderStyle.width = `${sizeSource.width}px`;
        } else {
          // Column: set height (main axis), let width stretch (cross axis)
          placeholderStyle.height = `${sizeSource.height}px`;
        }
      }
      if (alignSelf) placeholderStyle.alignSelf = alignSelf;
      const {
        placeholderTransform
      } = this.props;
      if (placeholderTransform && useCSSTransforms && (placeholderTransform.x !== 0 || placeholderTransform.y !== 0)) {
        this.setTransformStyle(placeholderStyle, placeholderTransform.x, placeholderTransform.y);
      }
      const placeholder = /*#__PURE__*/_react.default.createElement("div", {
        key: "placeholder",
        className: "react-flex-item react-flex-placeholder placeholder-dragging",
        style: placeholderStyle
      });
      return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, newChild, placeholder);
    }
    return newChild;
  }
}
exports.default = FlexItem;
_defineProperty(FlexItem, "propTypes", {
  children: _propTypes.default.element,
  // Flex properties
  order: _propTypes.default.number.isRequired,
  grow: _propTypes.default.number.isRequired,
  shrink: _propTypes.default.number.isRequired,
  alignSelf: _propTypes.default.oneOf(["auto", "flex-start", "flex-end", "center", "stretch", "baseline"]),
  direction: _propTypes.default.oneOf(["row", "column", "row-reverse", "column-reverse"]).isRequired,
  // Constraints
  minWidth: _propTypes.default.number,
  maxWidth: _propTypes.default.number,
  minHeight: _propTypes.default.number,
  maxHeight: _propTypes.default.number,
  // Item identifier
  i: _propTypes.default.string.isRequired,
  // Flags
  isDraggable: _propTypes.default.bool.isRequired,
  isBounded: _propTypes.default.bool,
  static: _propTypes.default.bool,
  useCSSTransforms: _propTypes.default.bool,
  transformScale: _propTypes.default.number,
  // Draggability
  cancel: _propTypes.default.string,
  handle: _propTypes.default.string,
  className: _propTypes.default.string.isRequired,
  style: _propTypes.default.object,
  // Placeholder
  isExternalPlaceholder: _propTypes.default.bool,
  externalSize: _propTypes.default.shape({
    width: _propTypes.default.number,
    height: _propTypes.default.number
  }),
  // Callbacks
  onDrag: _propTypes.default.func,
  onDragStart: _propTypes.default.func,
  onDragStop: _propTypes.default.func
});
_defineProperty(FlexItem, "defaultProps", {
  className: "",
  cancel: "",
  handle: "",
  transformScale: 1
});