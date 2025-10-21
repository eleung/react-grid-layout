"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var React = _interopRequireWildcard(require("react"));
var _clsx = _interopRequireDefault(require("clsx"));
var _DragDropContext = _interopRequireDefault(require("../DragDropContext"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/*:: import type { DragDropContextValue } from "../DragDropContext";*/
/*:: import type { LayoutItem } from "../utils";*/
/*:: import type { Node as ReactNode } from "react";*/
/*:: type RenderProps = {
  isActive: boolean,
  isSource: boolean,
  draggedItem: ?LayoutItem,
  mouseX: ?number,
  mouseY: ?number
};*/
/*:: type Props = {
  // Required unique identifier
  id: string,

  // Control whether this droppable accepts items
  acceptsDrop?: boolean | ((item: LayoutItem, sourceId: string) => boolean),

  // Callback when item is dropped
  onDrop?: (item: LayoutItem, mouseX: number, mouseY: number) => void,

  // Optional drag event callbacks
  onDragEnter?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragOver?: (item: LayoutItem, mouseX: number, mouseY: number) => void,
  onDragLeave?: (item: LayoutItem) => void,

  // CSS classes
  className?: string,
  activeClassName?: string, // Applied when mouse is over this droppable
  sourceClassName?: string, // Applied when this is the drag source

  // Style
  style?: Object,

  // Children as render prop or React nodes
  children: ReactNode | ((props: RenderProps) => ReactNode)
};*/
/*:: type State = {
  mouseX: ?number,
  mouseY: ?number
};*/
/**
 * Droppable component - External drop target for grid items
 *
 * Registers as an external drop target in the DragDropProvider context.
 * Provides automatic CSS class management and drag event callbacks.
 *
 * @example
 * <Droppable
 *   id="trash"
 *   onDrop={(item) => console.log('Deleted:', item.i)}
 *   activeClassName="drop-active"
 * >
 *   {({ isActive, draggedItem }) => (
 *     <div>
 *       {isActive ? `Drop ${draggedItem?.i} to delete` : 'Drag items here to delete'}
 *     </div>
 *   )}
 * </Droppable>
 */
class Droppable extends React.Component /*:: <Props, State>*/{
  constructor() {
    super(...arguments);
    _defineProperty(this, "context", void 0);
    _defineProperty(this, "state", {
      mouseX: null,
      mouseY: null
    });
    _defineProperty(this, "containerRef", /*#__PURE__*/React.createRef());
    _defineProperty(this, "handleDragEnter", (item /*: LayoutItem*/, mouseX /*: number*/, mouseY /*: number*/) => /*: void*/{
      this.setState({
        mouseX,
        mouseY
      });
      if (this.props.onDragEnter) {
        this.props.onDragEnter(item, mouseX, mouseY);
      }
    });
    _defineProperty(this, "handleDragOver", (item /*: LayoutItem*/, mouseX /*: number*/, mouseY /*: number*/) => /*: void*/{
      this.setState({
        mouseX,
        mouseY
      });
      if (this.props.onDragOver) {
        this.props.onDragOver(item, mouseX, mouseY);
      }
    });
    _defineProperty(this, "handleDragLeave", (item /*: LayoutItem*/) => /*: void*/{
      this.setState({
        mouseX: null,
        mouseY: null
      });
      if (this.props.onDragLeave) {
        this.props.onDragLeave(item);
      }
    });
    _defineProperty(this, "handleDrop", (item /*: LayoutItem*/, mouseX /*: number*/, mouseY /*: number*/) => /*: void*/{
      this.setState({
        mouseX: null,
        mouseY: null
      });
      if (this.props.onDrop) {
        this.props.onDrop(item, mouseX, mouseY);
      }
    });
  }
  componentDidMount() {
    if (this.context && this.containerRef.current) {
      this.context.registerDropTarget(this.props.id, this.containerRef.current, 'external', {
        acceptsDrop: this.props.acceptsDrop || true,
        onDragEnter: this.handleDragEnter,
        onDragOver: this.handleDragOver,
        onDragLeave: this.handleDragLeave,
        onDrop: this.handleDrop
      });
    }
  }
  componentWillUnmount() {
    if (this.context && this.props.id) {
      this.context.unregisterDropTarget(this.props.id);
    }
  }
  componentDidUpdate(prevProps /*: Props*/) {
    // Update config if acceptsDrop changed
    if (this.context && prevProps.acceptsDrop !== this.props.acceptsDrop) {
      this.context.updateDropTargetConfig(this.props.id, {
        acceptsDrop: this.props.acceptsDrop || true
      });
    }
  }
  render() /*: ReactNode*/{
    const {
      className,
      activeClassName,
      sourceClassName,
      style,
      children
    } = this.props;

    // Get drop state from context
    const dropState = this.context?.getDropState ? this.context.getDropState(this.props.id) : {
      isSource: false,
      isActive: false,
      draggedItem: null
    };
    const {
      isActive,
      isSource,
      draggedItem
    } = dropState;
    const {
      mouseX,
      mouseY
    } = this.state;

    // Build CSS classes
    const finalClassName = (0, _clsx.default)(className, {
      [activeClassName || ""]: isActive && activeClassName,
      [sourceClassName || ""]: isSource && sourceClassName
    });

    // Render props for children function
    const renderProps /*: RenderProps*/ = {
      isActive,
      isSource,
      draggedItem,
      mouseX,
      mouseY
    };
    return /*#__PURE__*/React.createElement("div", {
      ref: this.containerRef,
      className: finalClassName,
      style: style
    }, typeof children === 'function' ? children(renderProps) : children);
  }
}
exports.default = Droppable;
_defineProperty(Droppable, "contextType", _DragDropContext.default);
_defineProperty(Droppable, "defaultProps", {
  acceptsDrop: true,
  activeClassName: "drop-active",
  sourceClassName: "drop-source"
});