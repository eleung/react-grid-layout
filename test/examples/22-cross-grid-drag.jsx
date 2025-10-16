import React from "react";
import RGL, { WidthProvider, DragDropProvider } from "../../index-dev.js";

const ReactGridLayout = WidthProvider(RGL);

/**
 * Example demonstrating drag and drop between grids.
 * Items can be dragged between multiple grids with different configurations.
 */
export default class CrossGridDrag extends React.Component {
  static defaultProps = {
    className: "layout",
    rowHeight: 30,
    cols: 12
  };

  state = {
    layout1: [
      { i: "a", x: 0, y: 0, w: 2, h: 2 },
      { i: "b", x: 2, y: 0, w: 2, h: 4 },
      { i: "c", x: 4, y: 0, w: 2, h: 2 }
    ],
    layout2: [
      { i: "d", x: 0, y: 0, w: 3, h: 2 },
      { i: "e", x: 3, y: 0, w: 3, h: 2 }
    ],
    layout3: [
      { i: "f", x: 0, y: 0, w: 4, h: 2 },
      { i: "g", x: 4, y: 0, w: 4, h: 3 }
    ],
    grid3AcceptsDrop: true,
    usePredicateMode: false
  };

  onLayoutChange1 = layout => {
    this.setState({ layout1: layout });
  };

  onLayoutChange2 = layout => {
    this.setState({ layout2: layout });
  };

  onLayoutChange3 = layout => {
    this.setState({ layout3: layout });
  };

  toggleGrid3AcceptsDrop = () => {
    this.setState({ grid3AcceptsDrop: !this.state.grid3AcceptsDrop });
  };

  togglePredicateMode = () => {
    this.setState({ usePredicateMode: !this.state.usePredicateMode });
  };

  // Predicate function: Grid 3 only accepts items from Grid 1, not Grid 2
  grid3AcceptsDropPredicate = (item, sourceId) => {
    return sourceId === "grid-1";
  };

  render() {
    return (
      <div>
        <style>{`
          /* Grid that's a valid drop target (mouse is over it) */
          .react-grid-layout.drop-active {
            background: rgba(0, 123, 255, 0.08) !important;
            outline: 3px solid #007bff !important;
            outline-offset: -3px;
            box-shadow: 0 0 15px rgba(0, 123, 255, 0.4) !important;
            transition: all 0.2s ease-in-out;
          }

          /* Source grid (where item is being dragged from) */
          .react-grid-layout.drop-source {
            background: rgba(255, 193, 7, 0.05) !important;
            outline: 3px dashed #ffc107 !important;
            outline-offset: -3px;
            transition: all 0.2s ease-in-out;
          }

          /* Source grid when item is back over it (both classes) */
          .react-grid-layout.drop-source.drop-active {
            background: rgba(40, 167, 69, 0.08) !important;
            outline: 3px solid #28a745 !important;
            outline-offset: -3px;
            box-shadow: 0 0 15px rgba(40, 167, 69, 0.4) !important;
          }
        `}</style>

        <h2>Cross-Grid Drag and Drop Example</h2>
        <p>Drag items between the three grids below. Each grid has different configurations.</p>
        <p>
          <strong>Grid 1:</strong> 12 columns, 30px rows |
          <strong>Grid 2:</strong> 6 columns, 50px rows |
          <strong>Grid 3:</strong> 8 columns, 40px rows
        </p>

        <div style={{ padding: "10px", background: "#f0f0f0", marginBottom: "15px", borderRadius: "5px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={this.state.grid3AcceptsDrop}
              onChange={this.toggleGrid3AcceptsDrop}
              style={{ marginRight: "8px", cursor: "pointer" }}
              disabled={this.state.usePredicateMode}
            />
            <span>Grid 3 accepts drops (boolean mode)</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={this.state.usePredicateMode}
              onChange={this.togglePredicateMode}
              style={{ marginRight: "8px", cursor: "pointer" }}
            />
            <span>Use predicate mode (Grid 3 only accepts from Grid 1)</span>
          </label>
          <p style={{ fontSize: "13px", margin: "5px 0 0 24px", color: "#666" }}>
            {this.state.usePredicateMode
              ? "Predicate mode: Grid 3 will only accept items dragged from Grid 1, not Grid 2"
              : "Boolean mode: Toggle checkbox to enable/disable all drops to Grid 3"}
          </p>
        </div>

        <p><em>💡 Visual feedback:</em></p>
        <ul style={{ fontSize: "14px", lineHeight: "1.6" }}>
          <li><strong>Yellow dashed outline:</strong> Source grid (where you're dragging from)</li>
          <li><strong>Blue solid outline:</strong> Target grid (when dragging over it)</li>
          <li><strong>Green solid outline:</strong> Source grid when you drag the item back over it</li>
        </ul>

        <DragDropProvider>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {/* Grid 1 - 12 columns, 30px rows */}
            <div style={{ flex: "1 1 calc(33.333% - 20px)", minWidth: "300px", border: "2px solid #ddd", padding: "10px" }}>
              <h3>Grid 1 (12 cols, 30px rows)</h3>
              <ReactGridLayout
                {...this.props}
                id="grid-1"
                enableCrossGridDrag={true}
                layout={this.state.layout1}
                onLayoutChange={this.onLayoutChange1}
                style={{ background: "#f5f5f5", minHeight: "300px" }}
              >
                {this.state.layout1.map(item => (
                  <div key={item.i} style={{ background: "#69c", padding: "10px" }}>
                    <span className="text">{item.i}</span>
                  </div>
                ))}
              </ReactGridLayout>
            </div>

            {/* Grid 2 - 6 columns, 50px rows */}
            <div style={{ flex: "1 1 calc(33.333% - 20px)", minWidth: "300px", border: "2px solid #ddd", padding: "10px" }}>
              <h3>Grid 2 (6 cols, 50px rows)</h3>
              <ReactGridLayout
                className={this.props.className}
                cols={6}
                rowHeight={50}
                id="grid-2"
                enableCrossGridDrag={true}
                layout={this.state.layout2}
                onLayoutChange={this.onLayoutChange2}
                style={{ background: "#f5f5f5", minHeight: "300px" }}
              >
                {this.state.layout2.map(item => (
                  <div key={item.i} style={{ background: "#c69", padding: "10px" }}>
                    <span className="text">{item.i}</span>
                  </div>
                ))}
              </ReactGridLayout>
            </div>

            {/* Grid 3 - 8 columns, 40px rows */}
            <div style={{ flex: "1 1 calc(33.333% - 20px)", minWidth: "300px", border: "2px solid #ddd", padding: "10px" }}>
              <h3>
                Grid 3 (8 cols, 40px rows){" "}
                {this.state.usePredicateMode ? (
                  <span style={{ color: "#007bff", fontSize: "14px" }}>🔍 Predicate: Grid 1 only</span>
                ) : (
                  !this.state.grid3AcceptsDrop && <span style={{ color: "#999", fontSize: "14px" }}>🚫 Drops disabled</span>
                )}
              </h3>
              <ReactGridLayout
                className={this.props.className}
                cols={8}
                rowHeight={40}
                id="grid-3"
                enableCrossGridDrag={true}
                crossGridAcceptsDrop={this.state.usePredicateMode ? this.grid3AcceptsDropPredicate : this.state.grid3AcceptsDrop}
                layout={this.state.layout3}
                onLayoutChange={this.onLayoutChange3}
                style={{ background: "#f5f5f5", minHeight: "300px" }}
              >
                {this.state.layout3.map(item => (
                  <div key={item.i} style={{ background: "#9c6", padding: "10px" }}>
                    <span className="text">{item.i}</span>
                  </div>
                ))}
              </ReactGridLayout>
            </div>
          </div>
        </DragDropProvider>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(CrossGridDrag));
}
