import React from "react";
import _ from "lodash";
import { ReactFlexLayout, WidthProvider } from "react-grid-layout";

const FlexLayout = WidthProvider(ReactFlexLayout);

export default class BasicFlexLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    items: 12,
    onLayoutChange: function() {}
  };

  constructor(props) {
    super(props);

    const layout = this.generateLayout();
    this.state = { layout };
  }

  generateDOM() {
    return _.map(_.range(this.props.items), function(i) {
      return (
        <div key={i} style={{
          border: "1px solid #ddd",
          padding: "20px",
          background: "#f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{i}</span>
        </div>
      );
    });
  }

  generateLayout() {
    const p = this.props;
    return _.map(new Array(p.items), function(item, i) {
      // Create items with varying flex properties
      return {
        i: i.toString(),
        order: i,
        grow: i % 3 === 0 ? 1 : 0,  // Every 3rd item grows
        shrink: 1
      };
    });
  }

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  render() {
    return (
      <FlexLayout
        layout={this.state.layout}
        onLayoutChange={this.onLayoutChange.bind(this)}
        direction="row"
        justifyContent="flex-start"
        alignItems="stretch"
        gap={10}
        isDraggable={true}
        {...this.props}
      >
        {this.generateDOM()}
      </FlexLayout>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(BasicFlexLayout));
}
