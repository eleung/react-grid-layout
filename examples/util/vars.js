"use strict";

module.exports = [
  {
    title: "Showcase",
    source: "showcase",
    paragraphs: [
      "React-Grid-Layout is a grid layout system for React. It features auto-packing, draggable and resizable " +
        "widgets, static widgets, a fluid layout, and separate layouts per responsive breakpoint.",
      "Try it out! Drag some boxes around, resize them, and resize the window to see the responsive breakpoints."
    ]
  },
  {
    title: "Basic",
    source: "basic",
    paragraphs: [
      "Try dragging the elements around.",
      "This is a basic, non-responsive layout with dragging and resizing. Usage is very simple."
    ]
  },
  {
    title: "No Dragging",
    source: "no-dragging",
    paragraphs: [
      "This particular example has dragging and resizing turned off."
    ]
  },
  {
    title: "Messy",
    source: "messy",
    paragraphs: [
      "This demo shows what happens when elements are placed randomly all over the layout.",
      "RGL does not auto-pack in the same fashion as other projects, such as jQuery Masonry. Packing is only done " +
        "in the vertical dimension. If objects all have the same width, they will be packed efficiently.",
      "If a layout is fed to RGL that has items with incorrect dimensions (width too big, overlapping other elements, " +
        "out of bounds, etc), they will be automatically corrected on startup. See the " +
        "source of this demo, where elements are placed randomly in the layout."
    ]
  },
  {
    title: "Grid Item Properties",
    source: "grid-property",
    paragraphs: [
      "This demo uses a layout assigned on the grid items themselves as the <code>data-grid</code> property."
    ]
  },
  {
    title: "Static Elements",
    source: "static-elements",
    paragraphs: [
      "This demo sets an item to <code>static</code>. Static elements cannot be moved or resized. Other elements " +
        "move themselves around a static element."
    ]
  },
  {
    title: "Dynamic Add/Remove",
    source: "dynamic-add-remove",
    paragraphs: [
      "This demo shows what happens when items are dynamically added and removed.",
      'You can remove an item by clicking its "x", and add a new one with the button.',
      "To further illustration RGL's capacities, this particular example is responsive. Trying resizing the window."
    ]
  },
  {
    title: "LocalStorage",
    source: "localstorage",
    paragraphs: [
      "This simple demo synchronizes to localStorage.",
      "Try moving and resizing elements, then reloading."
    ]
  },
  {
    title: "Responsive with LocalStorage",
    source: "localstorage-responsive",
    paragraphs: [
      "This simple demo synchronizes to localStorage for each responsive breakpoint.",
      "Try moving and resizing elements, changing window width, moving some more, and refreshing.",
      "Each breakpoint has a separate layout. The <code>onLayoutChange</code> callback calls back with " +
        "a hash of breakpoints to layouts, which is then synchronized to localStorage."
    ]
  },
  {
    title: "Minimum and Maximum Width/Height",
    source: "min-max-wh",
    paragraphs: [
      "You can set min and max dimensions on a grid item by using the `minW`, `maxW`, `minH`, and `maxH` properties.",
      "In this demo, the min and max dimensions are generated automatically. Try resizing the items below.",
      "If your mins and maxes collide: for example min > max, or the initial dimensions are out of range, " +
        "an error will be thrown."
    ]
  },
  {
    title: "Dynamic Minimum and Maximum Width/Height",
    source: "dynamic-min-max-wh",
    paragraphs: [
      "Your application may have more complex rules for determining an element's mins and maxes. This demo " +
        "demonstrates how to use the `onResize` handler to accomplish this.",
      "In this grid, all elements are allowed a max width of 2 if the height < 3, " +
        "and a min width of 2 if the height >= 3."
    ]
  },
  {
    title: "No Vertical Compacting (Free Movement)",
    source: "no-vertical-compact",
    paragraphs: [
      "You may want to turn off vertical compacting so items can be placed anywhere in the grid. Set the " +
        "property `compactType` to `null` to achieve this effect."
    ]
  },
  {
    title: "Prevent Collision",
    source: "prevent-collision",
    paragraphs: [
      "You may want to turn off rearrangement so items don't move arround when dragging. Set the " +
        "property `preventCollision` to `true` to achieve this effect. " +
        "It's particularly useful with `compactType` set to `null`."
    ]
  },
  {
    title: "Error Case",
    source: "error-case",
    paragraphs: [
      "This is an extra test case for a collision bug fixed in November 2017. When you drag 1 over 2, it should not " +
        "move over 3."
    ]
  },
  {
    title: "Toolbox",
    source: "toolbox",
    paragraphs: [
      "This demonstrates how to implement a toolbox to add and remove widgets. Click the 'X' on a widget to move it into the toolbox."
    ]
  },
  {
    title: "Drag From Outside",
    source: "drag-from-outside",
    paragraphs: [
      "This demo shows what happens when an item is added from outside of the grid.",
      "Once you drop the item within the grid you'll get its coordinates/properties and can perform actions with " +
        "it accordingly."
    ]
  },
  {
    title: "Bounded",
    source: "bounded",
    paragraphs: [
      "Try dragging the elements around. They can only be moved within the grid, the draggable placeholder will not show outside it."
    ]
  },
  {
    title: "Bootstrap-style Responsive Grid",
    source: "responsive-bootstrap-style",
    paragraphs: [
      "This demonstrates how to use ResponsiveGridLayout to create a Bootstrap-style responsive grid."
    ]
  },
  {
    title: "Scale",
    source: "scale",
    paragraphs: [
      "This demonstrates how to compensate for a scaled parent."
    ]
  },
  {
    title: "Allow Overlap",
    source: "allow-overlap",
    paragraphs: [
      "This demonstrates how to overlap grid items."
    ]
  },
  {
    title: "All Resizable Handles",
    source: "resizable-handles",
    paragraphs: [
      "This shows a grid with all resizable handles enabled. See the prop `resizableHandles` on the grid and grid items in the README."
    ]
  },
  {
    title: "Single Row Horizontal",
    source: "horizontal",
    paragraphs: [
      "This demonstrates how to constrain the elements to a single row."
    ]
  },
  {
    title: "Cross-Grid Drag and Drop",
    source: "cross-grid-drag",
    paragraphs: [
      "This demonstrates how to drag items between multiple grids.",
      "Items stay in their source grid during drag and show a placeholder in the target grid."
    ]
  },
  {
    title: "External Droppable Containers",
    source: "external-droppable",
    paragraphs: [
      "This demonstrates how to drag items from grids to external drop zones using the Droppable component.",
      "Items can be dropped into collection zones, trash zones, or any custom container.",
      "Drop zones provide automatic CSS class management and drag event callbacks for complete control."
    ]
  },
  {
    title: "Basic Flex Layout",
    source: "basic-flex",
    paragraphs: [
      "This demonstrates the new ReactFlexLayout component using flexbox for layout.",
      "Items are arranged using flex properties (grow, shrink, basis) instead of grid coordinates.",
      "Every third item has flex-grow: 1 to demonstrate flexible sizing.",
      "Try dragging items around - they will animate back to their original positions on drop."
    ]
  },
  {
    title: "Flex Layout Directions",
    source: "flex-directions",
    paragraphs: [
      "This interactive demo shows how ReactFlexLayout supports all flexbox properties.",
      "Use the controls to change direction, justifyContent, alignItems properties.",
      "Notice how the layout responds to different flex container settings.",
      "Try dragging items - they smoothly return to their flex positions when dropped."
    ]
  },
  {
    title: "Grid ↔ Flex Drag and Drop",
    source: "grid-flex-drag",
    paragraphs: [
      "This demonstrates drag and drop between grids and flex layouts. Items automatically transform between coordinate systems."
    ]
  },
  {
    title: "Flex ↔ Flex + Droppable",
    source: "flex-droppable",
    paragraphs: [
      "This demonstrates drag and drop between flex layouts and external droppable containers."
    ]
  },
  {
    title: "Comprehensive Drag & Drop",
    source: "comprehensive-drag",
    paragraphs: [
      "This demonstrates all drag and drop combinations: Grid ↔ Grid, Grid ↔ Flex, Flex ↔ Flex, and dragging to external drop zones."
    ]
  },
  {
    title: "Data-Flex Attributes",
    source: "data-flex",
    paragraphs: [
      "This demonstrates using data-flex attributes on children instead of providing a layout prop.",
      "Click the buttons to dynamically change flex properties (grow/shrink) - the changes will trigger re-renders.",
      "Try dragging items to reorder them, and toggle grow/shrink to see how items resize."
    ]
  },
  {
    title: "Flex Layout - No Dragging",
    source: "flex-no-dragging",
    paragraphs: [
      "This demonstrates ReactFlexLayout with dragging disabled.",
      "Items are displayed in a flex layout but cannot be moved.",
      "Every third item has flex-grow: 1 to demonstrate flexible sizing."
    ]
  },
  {
    title: "Flex Layout-Driven Rendering",
    source: "flex-layout-driven",
    paragraphs: [
      "This example uses layout as the single source of truth - items are rendered directly from layout state.",
      "This tests React reconciliation behavior when children array changes during drag operations.",
      "Try the buttons to trigger children changes, then immediately drag items forward (to higher order) and backward (to lower order).",
      "Open the browser console to see detailed lifecycle logs from FlexItem components and ReactFlexLayout state changes."
    ]
  },
];
