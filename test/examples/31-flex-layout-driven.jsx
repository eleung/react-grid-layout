import React from "react";
import _ from "lodash";
import { ReactFlexLayout, WidthProvider } from "react-grid-layout";

const FlexLayout = WidthProvider(ReactFlexLayout);

/**
 * This example demonstrates using data-flex attributes instead of the layout prop.
 * Items can be configured directly on children using data-flex, and changes to
 * data-flex will trigger re-renders and updates.
 */
export default class DataFlexExample extends React.PureComponent {
  static defaultProps = {
    className: "layout",
    onLayoutChange: function() {}
  };

  constructor(props) {
    super(props);

    this.state = {
      layout: [
        { i: "a", grow: 0, shrink: 1, order: 0 },
        { i: "b", grow: 1, shrink: 1, order: 1 },
        { i: "c", grow: 0, shrink: 1, order: 2 },
        { i: "d", grow: 0, shrink: 1, order: 3 },
        { i: "e", grow: 1, shrink: 1, order: 4 },
        { i: "f", grow: 0, shrink: 1, order: 5 }
      ]
    };
  }

  toggleGrow(key) {
    this.setState({
      layout: this.state.layout.map(item =>
        item.i === key ? { ...item, grow: item.grow === 0 ? 1 : 0 } : item
      )
    });
  }

  toggleShrink(key) {
    this.setState({
      layout: this.state.layout.map(item =>
        item.i === key ? { ...item, shrink: item.shrink === 1 ? 0 : 1 } : item
      )
    });
  }

  onLayoutChange(layout) {
    this.setState({ layout });
  }

  render() {
    return (
      <div>
        <div style={{ marginBottom: "20px", padding: "10px", background: "#f0f0f0", borderRadius: "4px" }}>
          <h4 style={{ marginTop: 0 }}>Using data-flex Attributes</h4>
          <p style={{ margin: "10px 0" }}>
            This example demonstrates using <code>data-flex</code> attributes on children
            instead of providing a <code>layout</code> prop. Click the buttons below to
            dynamically change flex properties - the changes will trigger re-renders.
          </p>
          <p style={{ margin: "10px 0", fontSize: "14px", color: "#666" }}>
            Try dragging items to reorder them, and toggle grow/shrink to see how items resize.
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f9f9", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Item</th>
                <th style={{ padding: "10px", textAlign: "center" }}>Grow</th>
                <th style={{ padding: "10px", textAlign: "center" }}>Shrink</th>
                <th style={{ padding: "10px", textAlign: "center" }}>Order</th>
                <th style={{ padding: "10px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {this.state.layout.map(item => (
                <tr key={item.i} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>{item.i.toUpperCase()}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      background: item.grow === 1 ? "#d4edda" : "#f0f0f0",
                      color: item.grow === 1 ? "#155724" : "#666"
                    }}>
                      {item.grow}
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      background: item.shrink === 1 ? "#d4edda" : "#f0f0f0",
                      color: item.shrink === 1 ? "#155724" : "#666"
                    }}>
                      {item.shrink}
                    </span>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{item.order}</td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => this.toggleGrow(item.i)}
                      style={{
                        marginRight: "5px",
                        padding: "5px 10px",
                        cursor: "pointer",
                        background: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "3px"
                      }}
                    >
                      Toggle Grow
                    </button>
                    <button
                      onClick={() => this.toggleShrink(item.i)}
                      style={{
                        padding: "5px 10px",
                        cursor: "pointer",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "3px"
                      }}
                    >
                      Toggle Shrink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <FlexLayout
          {...this.props}
          layout={this.state.layout}
          onLayoutChange={this.onLayoutChange.bind(this)}
          direction="row"
          justifyContent="flex-start"
          alignItems="stretch"
          gap={10}
          isDraggable={true}
          style={{ background: "#f9f9f9", minHeight: "150px", padding: "10px" }}
        >
          {this.state.layout.map(item => (
            <div
              key={item.i}
              style={{
                border: "1px solid #ddd",
                padding: "20px",
                background: item.grow === 1 ? "#d4edda" : "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column"
              }}
            >
              <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>
                {item.i.toUpperCase()}
              </span>
              <span style={{ fontSize: "12px", marginTop: "5px", color: "#666" }}>
                grow: {item.grow}, shrink: {item.shrink}
              </span>
            </div>
          ))}
        </FlexLayout>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(DataFlexExample));
}
