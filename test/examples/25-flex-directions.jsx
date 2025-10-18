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
        shrink: 1,
        basis: "120px"
      };
    });
  }

  generateDOM() {
    return _.map(_.range(6), function(i) {
      const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];
      return (
        <div key={i} style={{
          border: "2px solid #333",
          padding: "30px",
          background: colors[i],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "20px"
        }}>
          {i}
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
        <div style={{ marginBottom: "20px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
          <h3 style={{ marginTop: 0 }}>Flex Controls</h3>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "150px", fontWeight: "bold" }}>Direction:</label>
            <select
              value={direction}
              onChange={(e) => this.setState({ direction: e.target.value })}
              style={{ padding: "5px", fontSize: "14px" }}
            >
              <option value="row">row</option>
              <option value="row-reverse">row-reverse</option>
              <option value="column">column</option>
              <option value="column-reverse">column-reverse</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "150px", fontWeight: "bold" }}>Justify Content:</label>
            <select
              value={justifyContent}
              onChange={(e) => this.setState({ justifyContent: e.target.value })}
              style={{ padding: "5px", fontSize: "14px" }}
            >
              <option value="flex-start">flex-start</option>
              <option value="flex-end">flex-end</option>
              <option value="center">center</option>
              <option value="space-between">space-between</option>
              <option value="space-around">space-around</option>
              <option value="space-evenly">space-evenly</option>
            </select>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "inline-block", width: "150px", fontWeight: "bold" }}>Align Items:</label>
            <select
              value={alignItems}
              onChange={(e) => this.setState({ alignItems: e.target.value })}
              style={{ padding: "5px", fontSize: "14px" }}
            >
              <option value="flex-start">flex-start</option>
              <option value="flex-end">flex-end</option>
              <option value="center">center</option>
              <option value="stretch">stretch</option>
              <option value="baseline">baseline</option>
            </select>
          </div>
        </div>

        <div style={{ border: "2px dashed #999", padding: "10px", minHeight: "300px" }}>
          <FlexLayout
            layout={layout}
            onLayoutChange={this.onLayoutChange.bind(this)}
            direction={direction}
            justifyContent={justifyContent}
            alignItems={alignItems}
            gap={15}
            isDraggable={true}
            {...this.props}
          >
            {this.generateDOM()}
          </FlexLayout>
        </div>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(FlexDirectionsLayout));
}
