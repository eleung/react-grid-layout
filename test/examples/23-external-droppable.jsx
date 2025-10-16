import React from "react";
import RGL, { WidthProvider, DragDropProvider, Droppable } from "../../index-dev.js";

const ReactGridLayout = WidthProvider(RGL);

/**
 * Example demonstrating external Droppable containers.
 * Items can be dragged from grids to external drop zones.
 */
export default class ExternalDroppable extends React.Component {
  static defaultProps = {
    className: "layout",
    rowHeight: 30,
    cols: 12
  };

  state = {
    layout1: [
      { i: "a", x: 0, y: 0, w: 2, h: 2 },
      { i: "b", x: 2, y: 0, w: 2, h: 4 },
      { i: "c", x: 4, y: 0, w: 2, h: 2 },
      { i: "d", x: 6, y: 0, w: 2, h: 2 }
    ],
    layout2: [
      { i: "e", x: 0, y: 0, w: 3, h: 2 },
      { i: "f", x: 3, y: 0, w: 3, h: 2 },
      { i: "g", x: 0, y: 2, w: 3, h: 2 }
    ],
    collectedItems: [],
    deletedItems: []
  };

  onLayoutChange1 = layout => {
    this.setState({ layout1: layout });
  };

  onLayoutChange2 = layout => {
    this.setState({ layout2: layout });
  };

  handleCollect = (item, mouseX, mouseY) => {
    this.setState(prev => ({
      collectedItems: [...prev.collectedItems, {
        ...item,
        timestamp: new Date().toLocaleTimeString()
      }]
    }));
  };

  handleDelete = (item, mouseX, mouseY) => {
    this.setState(prev => ({
      deletedItems: [...prev.deletedItems, {
        ...item,
        timestamp: new Date().toLocaleTimeString()
      }]
    }));
  };

  clearCollected = () => {
    this.setState({ collectedItems: [] });
  };

  clearDeleted = () => {
    this.setState({ deletedItems: [] });
  };

  render() {
    return (
      <div>
        <style>{`
          .react-grid-layout.drop-source {
            background: rgba(255, 193, 7, 0.05) !important;
            outline: 3px dashed #ffc107 !important;
            outline-offset: -3px;
            transition: all 0.2s ease-in-out;
          }

          .drop-zone {
            border: 3px dashed #ccc;
            padding: 20px;
            min-height: 150px;
            border-radius: 8px;
            transition: all 0.2s ease-in-out;
            background: #fafafa;
            position: relative;
          }

          .drop-zone.drop-active {
            background: rgba(0, 123, 255, 0.08);
            border-color: #007bff;
            border-style: solid;
            box-shadow: 0 0 20px rgba(0, 123, 255, 0.4);
          }

          .drop-zone.trash-zone {
            border-color: #dc3545;
          }

          .drop-zone.trash-zone.drop-active {
            background: rgba(220, 53, 69, 0.08);
            border-color: #dc3545;
            box-shadow: 0 0 20px rgba(220, 53, 69, 0.4);
          }

          .drop-zone.collection-zone {
            border-color: #28a745;
          }

          .drop-zone.collection-zone.drop-active {
            background: rgba(40, 167, 69, 0.08);
            border-color: #28a745;
            box-shadow: 0 0 20px rgba(40, 167, 69, 0.4);
          }

          .drop-placeholder {
            position: absolute;
            background: rgba(0, 123, 255, 0.2);
            border: 2px dashed #007bff;
            border-radius: 4px;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #007bff;
          }

          .item-list {
            margin-top: 10px;
            max-height: 100px;
            overflow-y: auto;
          }

          .item-badge {
            display: inline-block;
            padding: 4px 8px;
            margin: 2px;
            background: #007bff;
            color: white;
            border-radius: 4px;
            font-size: 12px;
          }

          .item-badge.deleted {
            background: #dc3545;
          }

          .item-badge.collected {
            background: #28a745;
          }
        `}</style>

        <h2>External Droppable Containers Example</h2>
        <p>Drag items from the grids below to the drop zones on the right.</p>

        <DragDropProvider>
          <div style={{ display: "flex", gap: "20px" }}>
            {/* Left side: Grids */}
            <div style={{ flex: "2", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Grid 1 */}
              <div style={{ border: "2px solid #ddd", padding: "10px", borderRadius: "5px" }}>
                <h3>Grid 1 (12 cols, 30px rows)</h3>
                <ReactGridLayout
                  {...this.props}
                  id="grid-1"
                  enableCrossGridDrag={true}
                  layout={this.state.layout1}
                  onLayoutChange={this.onLayoutChange1}
                  style={{ background: "#f5f5f5", minHeight: "200px" }}
                >
                  {this.state.layout1.map(item => (
                    <div key={item.i} style={{ background: "#69c", padding: "10px", borderRadius: "4px" }}>
                      <span className="text" style={{ color: "white", fontWeight: "bold" }}>{item.i}</span>
                    </div>
                  ))}
                </ReactGridLayout>
              </div>

              {/* Grid 2 */}
              <div style={{ border: "2px solid #ddd", padding: "10px", borderRadius: "5px" }}>
                <h3>Grid 2 (6 cols, 50px rows)</h3>
                <ReactGridLayout
                  className={this.props.className}
                  cols={6}
                  rowHeight={50}
                  id="grid-2"
                  enableCrossGridDrag={true}
                  layout={this.state.layout2}
                  onLayoutChange={this.onLayoutChange2}
                  style={{ background: "#f5f5f5", minHeight: "200px" }}
                >
                  {this.state.layout2.map(item => (
                    <div key={item.i} style={{ background: "#c69", padding: "10px", borderRadius: "4px" }}>
                      <span className="text" style={{ color: "white", fontWeight: "bold" }}>{item.i}</span>
                    </div>
                  ))}
                </ReactGridLayout>
              </div>
            </div>

            {/* Right side: Drop zones */}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "20px", minWidth: "250px" }}>
              {/* Collection Zone */}
              <Droppable
                id="collection-zone"
                className="drop-zone collection-zone"
                onDrop={this.handleCollect}
              >
                {({ isActive, draggedItem, mouseX, mouseY }) => (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", color: "#28a745" }}>
                      📦 Collection Zone
                    </h4>
                    {isActive ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: "32px", marginBottom: "10px" }}>⬇️</div>
                        <div style={{ fontWeight: "bold", color: "#28a745" }}>
                          Drop {draggedItem?.i} to collect
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#666" }}>
                        <p>Drag items here to collect them</p>
                        <div style={{ fontSize: "24px", opacity: 0.3 }}>📦</div>
                      </div>
                    )}
                    {this.state.collectedItems.length > 0 && (
                      <div className="item-list">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                          <small style={{ fontWeight: "bold" }}>Collected:</small>
                          <button onClick={this.clearCollected} style={{ fontSize: "10px", padding: "2px 6px" }}>Clear</button>
                        </div>
                        {this.state.collectedItems.map((item, idx) => (
                          <div key={idx} className="item-badge collected">
                            {item.i} <small>({item.timestamp})</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Trash Zone */}
              <Droppable
                id="trash-zone"
                className="drop-zone trash-zone"
                onDrop={this.handleDelete}
              >
                {({ isActive, draggedItem }) => (
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", color: "#dc3545" }}>
                      🗑️ Trash Zone
                    </h4>
                    {isActive ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: "32px", marginBottom: "10px" }}>⬇️</div>
                        <div style={{ fontWeight: "bold", color: "#dc3545" }}>
                          Drop {draggedItem?.i} to delete
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#666" }}>
                        <p>Drag items here to delete them</p>
                        <div style={{ fontSize: "24px", opacity: 0.3 }}>🗑️</div>
                      </div>
                    )}
                    {this.state.deletedItems.length > 0 && (
                      <div className="item-list">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                          <small style={{ fontWeight: "bold" }}>Deleted:</small>
                          <button onClick={this.clearDeleted} style={{ fontSize: "10px", padding: "2px 6px" }}>Clear</button>
                        </div>
                        {this.state.deletedItems.map((item, idx) => (
                          <div key={idx} className="item-badge deleted">
                            {item.i} <small>({item.timestamp})</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>

              {/* Info Box */}
              <div style={{ border: "2px solid #17a2b8", padding: "15px", borderRadius: "5px", background: "#e7f7f9" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#17a2b8" }}>💡 Features</h4>
                <ul style={{ fontSize: "12px", lineHeight: "1.6", margin: 0, paddingLeft: "20px" }}>
                  <li>Drag items from grids to drop zones</li>
                  <li>Visual feedback when hovering</li>
                  <li>Source grid highlighted in yellow</li>
                  <li>Drop zones change color when active</li>
                  <li>Items are removed from source on drop</li>
                  <li>Collection zone saves items</li>
                  <li>Trash zone deletes items</li>
                </ul>
              </div>
            </div>
          </div>
        </DragDropProvider>
      </div>
    );
  }
}

if (process.env.STATIC_EXAMPLES === true) {
  import("../test-hook.jsx").then(fn => fn.default(ExternalDroppable));
}
