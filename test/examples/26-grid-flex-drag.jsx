import React from "react";
import RGL, { WidthProvider, DragDropProvider } from "../../index-dev.js";
import ReactFlexLayout from "../../lib/ReactFlexLayout";

const ReactGridLayout = WidthProvider(RGL);

/**
 * Example demonstrating drag and drop between grids and flex layouts.
 * Items can be dragged from grids to flex layouts and vice versa.
 */
export default class GridFlexDrag extends React.Component {
  static defaultProps = {
    className: "layout",
    rowHeight: 30,
    cols: 12
  };

  state = {
    gridLayout: [
      { i: "a", x: 0, y: 0, w: 2, h: 2 },
      { i: "b", x: 2, y: 0, w: 2, h: 4 },
      { i: "c", x: 4, y: 0, w: 2, h: 2 },
      { i: "d", x: 6, y: 0, w: 2, h: 2 }
    ],
    flexLayout: [
      { i: "e", order: 0, grow: 0, shrink: 1 },
      { i: "f", order: 1, grow: 1, shrink: 1 },
      { i: "g", order: 2, grow: 0, shrink: 1 }
    ],
    flexLayout2: [
      { i: "h", order: 0, grow: 0, shrink: 1 },
      { i: "i", order: 1, grow: 0, shrink: 1 },
      { i: "j", order: 2, grow: 1, shrink: 1 }
    ]
  };

  onGridLayoutChange = layout => {
    this.setState({ gridLayout: layout });
  };

  onFlexLayoutChange = layout => {
    this.setState({ flexLayout: layout });
  };

  onFlexLayout2Change = layout => {
    this.setState({ flexLayout2: layout });
  };

  renderFlexLayout1DroppingItem = (item) => {
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: "20px",
        background: "#ffe6f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>
          {item.i.replace('__external__', '')}
        </span>
      </div>
    );
  };

  renderFlexLayout2DroppingItem = (item) => {
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: "20px",
        background: "#e6f7e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>
          {item.i.replace('__external__', '')}
        </span>
      </div>
    );
  };

  render() {
    return (
      <div>
        <style>{`
          .react-grid-layout.drop-active {
            outline: 2px solid #007bff;
          }

          .react-flex-layout.drop-active {
            outline: 2px solid #28a745;
          }

          .react-grid-layout.drop-source,
          .react-flex-layout.drop-source {
            outline: 2px dashed #999;
          }
        `}</style>

        <div>
          Drag items between the grid and flex layouts below. Items automatically transform between coordinate systems.
        </div>

        <DragDropProvider>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {/* Grid Layout */}
            <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
              <h3>Grid Layout (12 cols, 30px rows)</h3>
              <ReactGridLayout
                {...this.props}
                id="grid-1"
                enableCrossGridDrag={true}
                layout={this.state.gridLayout}
                onLayoutChange={this.onGridLayoutChange}
                style={{ background: "#f9f9f9", minHeight: "300px" }}
              >
                {this.state.gridLayout.map(item => (
                  <div key={item.i} style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    background: "#f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                  </div>
                ))}
              </ReactGridLayout>
            </div>

            {/* Flex Layout 1 (Row) */}
            <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
              <h3>Flex Layout (Row)</h3>
              <ReactFlexLayout
                width={400}
                direction="row"
                gap={10}
                id="flex-1"
                enableCrossGridDrag={true}
                isDraggable={true}
                layout={this.state.flexLayout}
                onLayoutChange={this.onFlexLayoutChange}
                renderDroppingItem={this.renderFlexLayout1DroppingItem}
                style={{ background: "#f9f9f9", minHeight: "300px", padding: "10px" }}
              >
                {this.state.flexLayout.map(item => (
                  <div key={item.i} style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    background: "#ffe6f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                  </div>
                ))}
              </ReactFlexLayout>
            </div>

            {/* Flex Layout 2 (Column) */}
            <div style={{ flex: "1 1 400px", minWidth: "300px" }}>
              <h3>Flex Layout (Column)</h3>
              <ReactFlexLayout
                width={400}
                direction="column"
                gap={10}
                id="flex-2"
                enableCrossGridDrag={true}
                isDraggable={true}
                layout={this.state.flexLayout2}
                onLayoutChange={this.onFlexLayout2Change}
                renderDroppingItem={this.renderFlexLayout2DroppingItem}
                style={{ background: "#f9f9f9", minHeight: "300px", padding: "10px" }}
              >
                {this.state.flexLayout2.map(item => (
                  <div key={item.i} style={{
                    border: "1px solid #ddd",
                    padding: "20px",
                    background: "#e6f7e6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                  </div>
                ))}
              </ReactFlexLayout>
            </div>
          </div>
        </DragDropProvider>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(GridFlexDrag));
}
