// @flow
import React from "react";
import { flushSync } from "react-dom";
import PropTypes from "prop-types";
import { DraggableCore } from "react-draggable";
import clsx from "clsx";
import type { Element as ReactElement } from "react";
import type { FlexLayoutItem, FlexAlignSelf, FlexDragEvent } from "./flexUtils";

type PartialPosition = { top: number, left: number, width: number, height: number };
type FlexPosition = { top: number, left: number };
type ReactDraggableCallbackData = {
  node: HTMLElement,
  x?: number,
  y?: number,
  deltaX: number,
  deltaY: number,
  lastX?: number,
  lastY?: number
};

type FlexItemCallback<Data: FlexDragEvent> = (
  i: string,
  order: number,
  Data
) => void;

type Props = {
  children: ReactElement<any>,
  className: string,
  style?: Object,

  // Flex properties
  order: number,
  grow: number,
  shrink: number,
  basis: string | number,
  alignSelf?: FlexAlignSelf,

  // Constraints
  minWidth?: number,
  maxWidth?: number,
  minHeight?: number,
  maxHeight?: number,

  // Container width for boundary calculations
  containerWidth?: number,

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
  placeholderTransform?: {x: number, y: number}
};

type State = {
  dragging: ?PartialPosition,
  animating: ?PartialPosition,
  originalFlexPosition: ?FlexPosition,
  disableTransitions: boolean
};

type DefaultProps = {
  className: string,
  cancel: string,
  handle: string,
  transformScale: number
};

/**
 * An individual item within a ReactFlexLayout.
 */
export default class FlexItem extends React.Component<Props, State> {
  static propTypes = {
    children: PropTypes.element,

    // Flex properties
    order: PropTypes.number.isRequired,
    grow: PropTypes.number.isRequired,
    shrink: PropTypes.number.isRequired,
    basis: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    alignSelf: PropTypes.oneOf([
      "auto",
      "flex-start",
      "flex-end",
      "center",
      "stretch",
      "baseline"
    ]),

    // Constraints
    minWidth: PropTypes.number,
    maxWidth: PropTypes.number,
    minHeight: PropTypes.number,
    maxHeight: PropTypes.number,

    containerWidth: PropTypes.number,

    // Item identifier
    i: PropTypes.string.isRequired,

    // Flags
    isDraggable: PropTypes.bool.isRequired,
    isBounded: PropTypes.bool,
    static: PropTypes.bool,
    useCSSTransforms: PropTypes.bool,
    transformScale: PropTypes.number,

    // Draggability
    cancel: PropTypes.string,
    handle: PropTypes.string,

    className: PropTypes.string.isRequired,
    style: PropTypes.object,

    // Callbacks
    onDrag: PropTypes.func,
    onDragStart: PropTypes.func,
    onDragStop: PropTypes.func
  };

  static defaultProps: DefaultProps = {
    className: "",
    cancel: "",
    handle: "",
    transformScale: 1
  };

  state: State = {
    dragging: null,
    animating: null,
    originalFlexPosition: null,
    disableTransitions: false
  };

  animationTimeout: ?TimeoutID = null;

  elementRef: { current: null | HTMLElement } = React.createRef();

  /**
   * Create flex item styles.
   */
  createStyle(): Object {
    const {
      order,
      grow,
      shrink,
      basis,
      alignSelf,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      useCSSTransforms,
      style
    } = this.props;

    const { dragging, animating } = this.state;

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
        flexShrink: shrink,
        flexBasis: typeof basis === "number" ? `${basis}px` : basis
      };
    }

    // Base flex styles (normal positioning)
    const flexStyles = {
      order,
      flexGrow: grow,
      flexShrink: shrink,
      flexBasis: typeof basis === "number" ? `${basis}px` : basis
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

    const { transformOffset } = this.props;
    if (transformOffset && useCSSTransforms && (transformOffset.x !== 0 || transformOffset.y !== 0)) {
      this.setTransformStyle(flexStyles, transformOffset.x, transformOffset.y);
    }

    return { ...flexStyles, ...style };
  }

  setTransformStyle(styleObj: Object, x: number, y: number) {
    const translate = `translate(${x}px, ${y}px)`;
    styleObj.transform = translate;
    styleObj.WebkitTransform = translate;
    styleObj.MozTransform = translate;
    styleObj.msTransform = translate;
    styleObj.OTransform = translate;
  }

  /**
   * onDragStart event handler
   */
  onDragStart: (Event, ReactDraggableCallbackData) => void = (e, { node }) => {
    const { onDragStart } = this.props;
    if (!onDragStart) return;

    // Clear any pending animation timeout from previous drag
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    // Get position relative to parent using offsetLeft/offsetTop
    // This gives us the position as rendered in the flex container
    const { offsetParent } = node;
    if (!offsetParent) return;

    // Get the actual visual size using getBoundingClientRect
    const rect = node.getBoundingClientRect();

    // Save the original flex position BEFORE we start dragging
    const originalFlexPosition: FlexPosition = {
      left: node.offsetLeft,
      top: node.offsetTop
    };

    // Use offsetLeft/offsetTop which accounts for flex positioning
    // Use getBoundingClientRect for the actual visual size
    const newPosition: PartialPosition = {
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

    // Call callback
    return onDragStart.call(this, this.props.i, this.props.order, {
      e,
      node,
      newPosition
    });
  };

  /**
   * onDrag event handler
   */
  onDrag: (Event, ReactDraggableCallbackData) => void = (
    e,
    { node, deltaX, deltaY }
  ) => {
    const { onDrag, isBounded, containerWidth } = this.props;
    if (!onDrag) return;

    if (!this.state.dragging) {
      throw new Error("onDrag called before onDragStart.");
    }

    let top = this.state.dragging.top + deltaY;
    let left = this.state.dragging.left + deltaX;
    const { width, height } = this.state.dragging;

    // Boundary calculations - keep item within container
    if (isBounded && containerWidth) {
      const { offsetParent } = node;
      if (offsetParent) {
        // Clamp to container boundaries
        const bottomBoundary = offsetParent.clientHeight - height;
        top = Math.max(0, Math.min(top, bottomBoundary));

        const rightBoundary = containerWidth - width;
        left = Math.max(0, Math.min(left, rightBoundary));
      }
    }

    const newPosition: PartialPosition = { top, left, width, height };

    // Use flushSync for immediate update
    flushSync(() => {
      this.setState({ dragging: newPosition });
    });

    // Call callback
    return onDrag.call(this, this.props.i, this.props.order, {
      e,
      node,
      newPosition
    });
  };

  /**
   * onDragStop event handler
   */
  onDragStop: (Event, ReactDraggableCallbackData) => void = (e, { node }) => {
    const { onDragStop, placeholderTransform } = this.props;
    if (!onDragStop) return;

    if (!this.state.dragging) {
      throw new Error("onDragStop called before onDragStart.");
    }

    const { width, height } = this.state.dragging;
    const { originalFlexPosition } = this.state;

    const newPosition: PartialPosition = {
      top: this.state.dragging.top,
      left: this.state.dragging.left,
      width,
      height
    };

    if (!originalFlexPosition) {
      this.setState({ dragging: null, animating: null, originalFlexPosition: null });
      return;
    }

    // Calculate final position: original position + placeholder transform offset
    const finalLeft = originalFlexPosition.left + (placeholderTransform?.x || 0);
    const finalTop = originalFlexPosition.top + (placeholderTransform?.y || 0);

    const finalPosition: PartialPosition = {
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
    this.animationTimeout = setTimeout(() => {
      this.setState({
        animating: null,
        originalFlexPosition: null,
        disableTransitions: true
      });

      setTimeout(() => {
        this.setState({ disableTransitions: false });
      }, 50);
    }, 200);

    return onDragStop.call(this, this.props.i, this.props.order, {
      e,
      node,
      newPosition
    });
  };

  componentWillUnmount() {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

  /**
   * Mix a Draggable instance into a child.
   */
  mixinDraggable(
    child: ReactElement<any>,
    isDraggable: boolean
  ): ReactElement<any> {
    return (
      <DraggableCore
        disabled={!isDraggable}
        onStart={this.onDragStart}
        onDrag={this.onDrag}
        onStop={this.onDragStop}
        handle={this.props.handle}
        cancel={this.props.cancel}
        scale={this.props.transformScale}
        nodeRef={this.elementRef}
      >
        {child}
      </DraggableCore>
    );
  }

  render(): ReactElement<any> {
    const {
      children,
      isDraggable,
      static: isStatic,
      className,
      useCSSTransforms,
      order,
      grow,
      shrink,
      basis,
      alignSelf,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight
    } = this.props;

    const { dragging, animating, disableTransitions } = this.state;

    // Create class names following the same pattern as GridItem
    const classes = clsx(
      "react-flex-item",
      className,
      {
        static: isStatic,
        "react-draggable": isDraggable,
        "react-draggable-dragging": Boolean(dragging),
        "react-flex-animating": Boolean(animating),
        "react-flex-no-transition": disableTransitions,
        cssTransforms: useCSSTransforms
      }
    );

    // Clone child with our styles and classes
    let newChild = React.cloneElement(children, {
      ref: this.elementRef,
      className: clsx(children.props.className, classes),
      "data-rgl-item-id": this.props.i, // For reliable DOM -> layout item matching
      style: {
        ...children.props.style,
        ...this.createStyle()
      }
    });

    // Wrap with Draggable support
    newChild = this.mixinDraggable(newChild, isDraggable);

    // If dragging or animating, render a placeholder to hold the space in flex layout
    const showPlaceholder = dragging || animating;
    if (showPlaceholder) {
      const sizeSource = dragging || animating;
      const placeholderStyle = {
        order,
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 'auto',
        width: `${sizeSource.width}px`,
        height: `${sizeSource.height}px`,
        boxSizing: 'border-box'
      };

      if (alignSelf) placeholderStyle.alignSelf = alignSelf;

      const { placeholderTransform } = this.props;
      if (placeholderTransform && useCSSTransforms && (placeholderTransform.x !== 0 || placeholderTransform.y !== 0)) {
        this.setTransformStyle(placeholderStyle, placeholderTransform.x, placeholderTransform.y);
      }

      const placeholder = (
        <div
          key="placeholder"
          className="react-flex-item react-flex-placeholder placeholder-dragging"
          style={placeholderStyle}
        />
      );

      return (
        <React.Fragment>
          {newChild}
          {placeholder}
        </React.Fragment>
      );
    }

    return newChild;
  }
}
