import React from "react";
import { DragDropProvider, Droppable } from "../../index-dev.js";
import ReactFlexLayout from "../../lib/ReactFlexLayout";

/**
 * Example demonstrating drag and drop between flex layouts and external droppable containers.
 */
export default class FlexDroppable extends React.Component {
  state = {
    flexLayout1: [
      { i: "a", order: 0, grow: 0, shrink: 1 },
      { i: "b", order: 1, grow: 1, shrink: 1 },
      { i: "c", order: 2, grow: 0, shrink: 1 }
    ],
    flexLayout2: [
      { i: "d", order: 0, grow: 0, shrink: 1 },
      { i: "e", order: 1, grow: 0, shrink: 1 },
      { i: "f", order: 2, grow: 1, shrink: 1 }
    ],
    collectedItems: [],
    deletedItems: []
  };

  onFlexLayout1Change = layout => {
    this.setState({ flexLayout1: layout });
  };

  onFlexLayout2Change = layout => {
    this.setState({ flexLayout2: layout });
  };

  handleCollect = (item, mouseX, mouseY) => {
    this.setState(prev => ({
      collectedItems: [...prev.collectedItems, item]
    }));
  };

  handleDelete = (item, mouseX, mouseY) => {
    this.setState(prev => ({
      deletedItems: [...prev.deletedItems, item]
    }));
  };

  clearCollected = () => {
    this.setState({ collectedItems: [] });
  };

  clearDeleted = () => {
    this.setState({ deletedItems: [] });
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
          .react-flex-layout.drop-active {
            outline: 2px solid #28a745;
          }

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
          Drag items between flex layouts and to external drop zones.
        </div>

        <DragDropProvider>
          <div style={{ display: "flex", gap: "20px" }}>
            {/* Left side: Flex Layouts */}
            <div style={{ flex: "2", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Flex Layout 1 (Row) */}
              <div>
                <h3>Flex Layout 1 (Row Direction)</h3>
                <ReactFlexLayout
                  width={600}
                  direction="row"
                  gap={10}
                  id="flex-1"
                  enableCrossGridDrag={true}
                  isDraggable={true}
                  layout={this.state.flexLayout1}
                  onLayoutChange={this.onFlexLayout1Change}
                  renderDroppingItem={this.renderFlexLayout1DroppingItem}
                  style={{ background: "#f9f9f9", minHeight: "150px", padding: "10px" }}
                >
                  {this.state.flexLayout1.map(item => (
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
              <div>
                <h3>Flex Layout 2 (Column Direction)</h3>
                <ReactFlexLayout
                  width={600}
                  direction="column"
                  gap={10}
                  id="flex-2"
                  enableCrossGridDrag={true}
                  isDraggable={true}
                  layout={this.state.flexLayout2}
                  onLayoutChange={this.onFlexLayout2Change}
                  renderDroppingItem={this.renderFlexLayout2DroppingItem}
                  style={{ background: "#f9f9f9", minHeight: "250px", padding: "10px" }}
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

            {/* Right side: Drop zones */}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "20px", minWidth: "250px" }}>
              {/* Collection Zone */}
              <Droppable
                id="collection-zone"
                className="drop-zone"
                onDrop={this.handleCollect}
              >
                {({ isActive }) => (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0" }}>Collection Zone</h4>
                    <div style={{ color: "#666", fontSize: "14px" }}>
                      {isActive ? "Drop to collect" : "Drag items here to collect them"}
                    </div>
                    {this.state.collectedItems.length > 0 && (
                      <div style={{ marginTop: "10px", fontSize: "12px" }}>
                        <div style={{ marginBottom: "5px" }}>
                          <strong>Collected:</strong> {this.state.collectedItems.map(item => item.i).join(", ")}
                        </div>
                        <button onClick={this.clearCollected}>Clear</button>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Trash Zone */}
              <Droppable
                id="trash-zone"
                className="drop-zone"
                onDrop={this.handleDelete}
              >
                {({ isActive }) => (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0" }}>Trash Zone</h4>
                    <div style={{ color: "#666", fontSize: "14px" }}>
                      {isActive ? "Drop to delete" : "Drag items here to delete them"}
                    </div>
                    {this.state.deletedItems.length > 0 && (
                      <div style={{ marginTop: "10px", fontSize: "12px" }}>
                        <div style={{ marginBottom: "5px" }}>
                          <strong>Deleted:</strong> {this.state.deletedItems.map(item => item.i).join(", ")}
                        </div>
                        <button onClick={this.clearDeleted}>Clear</button>
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
  import("../test-hook.jsx").then(fn => fn.default(FlexDroppable));
}
