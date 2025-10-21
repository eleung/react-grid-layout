import React from "react";
import RGL, { WidthProvider, DragDropProvider, Droppable } from "../../index-dev.js";
import ReactFlexLayout from "../../lib/ReactFlexLayout";

const ReactGridLayout = WidthProvider(RGL);

/**
 * Comprehensive example demonstrating all drag and drop scenarios:
 * - Grid ↔ Grid
 * - Flex ↔ Flex
 * - Grid ↔ Flex
 * - Grid/Flex → External Droppable
 */
export default class ComprehensiveDrag extends React.Component {
  static defaultProps = {
    className: "layout",
    rowHeight: 30,
    cols: 12
  };

  state = {
    grid1: [
      { i: "g1", x: 0, y: 0, w: 2, h: 2 },
      { i: "g2", x: 2, y: 0, w: 2, h: 3 }
    ],
    grid2: [
      { i: "g3", x: 0, y: 0, w: 3, h: 2 },
      { i: "g4", x: 3, y: 0, w: 2, h: 2 }
    ],
    flexRow: [
      { i: "f1", order: 0, grow: 0, shrink: 1 },
      { i: "f2", order: 1, grow: 1, shrink: 1 },
      { i: "f3", order: 2, grow: 0, shrink: 1 }
    ],
    flexCol: [
      { i: "f4", order: 0, grow: 0, shrink: 1 },
      { i: "f5", order: 1, grow: 0, shrink: 1 },
      { i: "f6", order: 2, grow: 1, shrink: 1 }
    ],
    archived: []
  };

  onGrid1Change = layout => this.setState({ grid1: layout });
  onGrid2Change = layout => this.setState({ grid2: layout });
  onFlexRowChange = layout => this.setState({ flexRow: layout });
  onFlexColChange = layout => this.setState({ flexCol: layout });

  handleArchive = (item, mouseX, mouseY) => {
    this.setState(prev => ({
      archived: [...prev.archived, item]
    }));
  };

  clearArchived = () => {
    this.setState({ archived: [] });
  };

  renderFlexRowDroppingItem = (item) => {
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: "20px",
        background: "#d4edda",
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

  renderFlexColDroppingItem = (item) => {
    return (
      <div style={{
        border: "1px solid #ddd",
        padding: "20px",
        background: "#fff3cd",
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

          .drop-zone {
            border: 2px dashed #ccc;
            padding: 20px;
            min-height: 120px;
            background: #fafafa;
          }

          .drop-zone.drop-active {
            border-color: #007bff;
            border-style: solid;
          }
        `}</style>

        <div>
          Drag items between grids, flex layouts, and external drop zones. All combinations supported.
        </div>

        <DragDropProvider>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
            {/* Main Content Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Grids Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                {/* Grid 1 */}
                <div>
                  <h3>Grid 1 (12 cols)</h3>
                  <ReactGridLayout
                    {...this.props}
                    id="grid-1"
                    enableCrossGridDrag={true}
                    layout={this.state.grid1}
                    onLayoutChange={this.onGrid1Change}
                    style={{ background: "#f9f9f9", minHeight: "200px" }}
                  >
                    {this.state.grid1.map(item => (
                      <div key={item.i} style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        background: "#cfe2ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                      </div>
                    ))}
                  </ReactGridLayout>
                </div>

                {/* Grid 2 */}
                <div>
                  <h3>Grid 2 (6 cols)</h3>
                  <ReactGridLayout
                    className={this.props.className}
                    cols={6}
                    rowHeight={40}
                    id="grid-2"
                    enableCrossGridDrag={true}
                    layout={this.state.grid2}
                    onLayoutChange={this.onGrid2Change}
                    style={{ background: "#f9f9f9", minHeight: "200px" }}
                  >
                    {this.state.grid2.map(item => (
                      <div key={item.i} style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        background: "#f8d7da",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                      </div>
                    ))}
                  </ReactGridLayout>
                </div>
              </div>

              {/* Flex Layouts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                {/* Flex Row */}
                <div>
                  <h3>Flex Row</h3>
                  <ReactFlexLayout
                    direction="row"
                    gap={10}
                    id="flex-row"
                    enableCrossGridDrag={true}
                    isDraggable={true}
                    layout={this.state.flexRow}
                    onLayoutChange={this.onFlexRowChange}
                    renderDroppingItem={this.renderFlexRowDroppingItem}
                    style={{ background: "#f9f9f9", minHeight: "150px", padding: "10px", width: "500px" }}
                  >
                    {this.state.flexRow.map(item => (
                      <div key={item.i} style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        background: "#d4edda",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <span className="text" style={{ fontSize: "24px", fontWeight: "bold" }}>{item.i}</span>
                      </div>
                    ))}
                  </ReactFlexLayout>
                </div>

                {/* Flex Column */}
                <div>
                  <h3>Flex Column</h3>
                  <ReactFlexLayout
                    direction="column"
                    gap={10}
                    id="flex-col"
                    enableCrossGridDrag={true}
                    isDraggable={true}
                    layout={this.state.flexCol}
                    onLayoutChange={this.onFlexColChange}
                    renderDroppingItem={this.renderFlexColDroppingItem}
                    style={{ background: "#f9f9f9", minHeight: "200px", padding: "10px", width: "350px" }}
                  >
                    {this.state.flexCol.map(item => (
                      <div key={item.i} style={{
                        border: "1px solid #ddd",
                        padding: "20px",
                        background: "#fff3cd",
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
            </div>

            {/* Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {/* Archive Zone */}
              <Droppable
                id="archive"
                className="drop-zone"
                onDrop={this.handleArchive}
              >
                {({ isActive }) => (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0" }}>Archive</h4>
                    <div style={{ color: "#666", fontSize: "14px" }}>
                      {isActive ? "Drop to archive" : "Drop items here from any container"}
                    </div>
                    {this.state.archived.length > 0 && (
                      <div style={{ marginTop: "10px", fontSize: "12px" }}>
                        <div style={{ marginBottom: "5px" }}>
                          <strong>Archived:</strong> {this.state.archived.map(item => item.i).join(", ")}
                        </div>
                        <button onClick={this.clearArchived}>Clear</button>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

            </div>
          </div>
        </DragDropProvider>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(ComprehensiveDrag));
}
