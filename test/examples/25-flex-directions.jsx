import React from "react";
import _ from "lodash";
import { ReactFlexLayout, WidthProvider } from "react-grid-layout";

const FlexLayout = WidthProvider(ReactFlexLayout);

export default class FlexDirectionsLayout extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    onLayoutChange: function() {}
  };

  constructor(props) {
    super(props);

    this.state = {
      direction: "row",
      justifyContent: "flex-start",
      alignItems: "stretch"
    };
  }

  generateLayout() {
    return _.map(new Array(6), function(item, i) {
      return {
        i: i.toString(),
        order: i,
        grow: 0,
        shrink: 1
      };
    });
  }

  generateDOM() {
    return _.map(_.range(6), function(i) {
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

  onLayoutChange(layout) {
    this.props.onLayoutChange(layout);
  }

  render() {
    const layout = this.generateLayout();
    const { direction, justifyContent, alignItems } = this.state;

    return (
      <div>
        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "inline-block", width: "120px" }}>Direction:</label>
            <select
              value={direction}
              onChange={(e) => this.setState({ direction: e.target.value })}
            >
              <option value="row">row</option>
              <option value="row-reverse">row-reverse</option>
              <option value="column">column</option>
              <option value="column-reverse">column-reverse</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "inline-block", width: "120px" }}>Justify Content:</label>
            <select
              value={justifyContent}
              onChange={(e) => this.setState({ justifyContent: e.target.value })}
            >
              <option value="flex-start">flex-start</option>
              <option value="flex-end">flex-end</option>
              <option value="center">center</option>
              <option value="space-between">space-between</option>
              <option value="space-around">space-around</option>
              <option value="space-evenly">space-evenly</option>
            </select>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "inline-block", width: "120px" }}>Align Items:</label>
            <select
              value={alignItems}
              onChange={(e) => this.setState({ alignItems: e.target.value })}
            >
              <option value="flex-start">flex-start</option>
              <option value="flex-end">flex-end</option>
              <option value="center">center</option>
              <option value="stretch">stretch</option>
              <option value="baseline">baseline</option>
            </select>
          </div>
        </div>

        <FlexLayout
          layout={layout}
          onLayoutChange={this.onLayoutChange.bind(this)}
          direction={direction}
          justifyContent={justifyContent}
          alignItems={alignItems}
          gap={10}
          isDraggable={true}
          style={{ background: "#f9f9f9", minHeight: "300px", padding: "10px" }}
          {...this.props}
        >
          {this.generateDOM()}
        </FlexLayout>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(FlexDirectionsLayout));
}
