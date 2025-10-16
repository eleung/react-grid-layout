// @flow
import * as React from "react";
import clsx from "clsx";
import DragDropContext from "../DragDropContext";
import type { DragDropContextValue } from "../DragDropContext";
import type { LayoutItem } from "../utils";
import type { Node as ReactNode } from "react";

type RenderProps = {
  isActive: boolean,
  isSource: boolean,
  draggedItem: ?LayoutItem,
  mouseX: ?number,
  mouseY: ?number
};

type Props = {
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
};

type State = {
  mouseX: ?number,
  mouseY: ?number
};

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
export default class Droppable extends React.Component<Props, State> {
  static contextType = DragDropContext;
  context: ?DragDropContextValue;

  static defaultProps = {
    acceptsDrop: true,
    activeClassName: "drop-active",
    sourceClassName: "drop-source"
  };

  state: State = {
    mouseX: null,
    mouseY: null
  };

  containerRef: { current: ?HTMLElement } = React.createRef();

  componentDidMount() {
    if (this.context && this.containerRef.current) {
      this.context.registerDropTarget(
        this.props.id,
        this.containerRef.current,
        'external',
        {
          acceptsDrop: this.props.acceptsDrop || true,
          onDragEnter: this.handleDragEnter,
          onDragOver: this.handleDragOver,
          onDragLeave: this.handleDragLeave,
          onDrop: this.handleDrop
        }
      );
    }
  }

  componentWillUnmount() {
    if (this.context && this.props.id) {
      this.context.unregisterDropTarget(this.props.id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Update config if acceptsDrop changed
    if (this.context && prevProps.acceptsDrop !== this.props.acceptsDrop) {
      this.context.updateDropTargetConfig(this.props.id, {
        acceptsDrop: this.props.acceptsDrop || true
      });
    }
  }

  handleDragEnter = (item: LayoutItem, mouseX: number, mouseY: number): void => {
    this.setState({ mouseX, mouseY });
    if (this.props.onDragEnter) {
      this.props.onDragEnter(item, mouseX, mouseY);
    }
  };

  handleDragOver = (item: LayoutItem, mouseX: number, mouseY: number): void => {
    this.setState({ mouseX, mouseY });
    if (this.props.onDragOver) {
      this.props.onDragOver(item, mouseX, mouseY);
    }
  };

  handleDragLeave = (item: LayoutItem): void => {
    this.setState({ mouseX: null, mouseY: null });
    if (this.props.onDragLeave) {
      this.props.onDragLeave(item);
    }
  };

  handleDrop = (item: LayoutItem, mouseX: number, mouseY: number): void => {
    this.setState({ mouseX: null, mouseY: null });
    if (this.props.onDrop) {
      this.props.onDrop(item, mouseX, mouseY);
    }
  };

  render(): ReactNode {
    const { className, activeClassName, sourceClassName, style, children } = this.props;

    // Get drop state from context
    const dropState = this.context?.getDropState
      ? this.context.getDropState(this.props.id)
      : { isSource: false, isActive: false, draggedItem: null };

    const { isActive, isSource, draggedItem } = dropState;
    const { mouseX, mouseY } = this.state;

    // Build CSS classes
    const finalClassName = clsx(
      className,
      {
        [activeClassName || ""]: isActive && activeClassName,
        [sourceClassName || ""]: isSource && sourceClassName
      }
    );

    // Render props for children function
    const renderProps: RenderProps = {
      isActive,
      isSource,
      draggedItem,
      mouseX,
      mouseY
    };

    return (
      <div
        ref={this.containerRef}
        className={finalClassName}
        style={style}
      >
        {typeof children === 'function'
          ? children(renderProps)
          : children
        }
      </div>
    );
  }
}
