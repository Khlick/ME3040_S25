// Constants
const ptRadius = 5;
const circRadius = 40;
const initOverlap = 0.5;
const labelOffset = 8;
const scaledDiameter = circRadius * 2; // Diameter in scaled units
const wDomain = [-100, 100];
const hDomain = [-100, 100];
const center = { x: 0, y: 0 };

// Create an SVG instance
const canvas = new SVG({
  elementName: "vennDiagram",
  initialWidth: window.innerWidth * 0.8,
  initialHeight: window.innerHeight * 0.8,
  margin: { top: 5, right: 5, bottom: 5, left: 5 },
});

// Scales
const wScale = d3.scaleLinear().rangeRound([0, canvas.width]).domain(wDomain);

const hScale = d3.scaleLinear().range([canvas.height, 0]).domain(hDomain);

// Graphical Elements
const svgRadius = Math.abs(wScale(scaledDiameter / 2) - wScale(0)); // Radius in SVG units (pixels)

const U = canvas.g.append("g").attr("class", "set-u");
const I = canvas.g.append("g").attr("class", "intersection-area");
const X = canvas.g.append("g").attr("class", "set-x");
const Y = canvas.g.append("g").attr("class", "set-y");

// Function to update the position of set labels
function updateLabelPosition(label, cx, cy, offset) {
  label.attr("x", cx + offset.x).attr("y", cy + offset.y);
}
function transitionLabelPosition(label, cx, cy, offset, t) {
  label
    .transition(t())
    .attr("x", cx + offset.x)
    .attr("y", cy + offset.y);
}

// Function to handle dragging of circles
function dragCircle(d) {
  return d3
    .drag()
    .on("drag", function (event) {
      const dragGroup = d3.select(this.parentNode);
      const filledCircle = dragGroup.select(".filled");
      const outlineCircle = dragGroup.select(".outline");
      const label = dragGroup.select(".label-text");
      const radius = parseFloat(filledCircle.attr("r"));
      const minX = wScale(-90) + radius;
      const maxX = wScale(90) - radius;
      const minY = hScale(90) + radius;
      const maxY = hScale(-90) - radius;

      let newX = parseFloat(filledCircle.attr("cx")) + event.dx;
      let newY = parseFloat(filledCircle.attr("cy")) + event.dy;

      // Constrain the movement within the universal set
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      filledCircle.attr("cx", newX).attr("cy", newY);
      outlineCircle.attr("cx", newX).attr("cy", newY);
      d.xDomain = wScale.invert(newX);
      d.yDomain = hScale.invert(newY);

      // Update label position
      d.labelOffset.y =
        parseFloat(label.attr("y")) > newY
          ? radius + labelOffset
          : -radius - labelOffset;
      updateLabelPosition(d.label, newX, newY, d.labelOffset);
      // Call the onDragEnd callback, if provided
      if (d.onDragEnd) {
        d.onDragEnd();
      }
    })
    .on("end", function () {
      // Call the onDragEnd callback, if provided
      if (d.onEnd) {
        d.onEnd();
      }
    });
}

// Draw the Universal Set (U)
const uRect = U.append("rect")
  .attr("x", wScale(-90))
  .attr("y", hScale(90))
  .attr("width", Math.max(wScale(90) - wScale(-90),1))
  .attr("height", Math.max(hScale(-90) - hScale(90),1))
  .attr("stroke", "black")
  .attr("stroke-width", 4)
  .attr("fill", "none")
  .attr("rx", 10)
  .attr("ry", 10);

const uLabel = U.append("text")
  .attr("class", "label-text")
  .attr("x", wScale(-90) - 5)
  .attr("y", hScale(90))
  .attr("text-anchor", "end")
  .attr("dominant-baseline", "hanging")
  .text("ξ");

// Fills
const xCircleFill = X.append("circle")
  .attr("class", "filled")
  .attr("cx", wScale(center.x))
  .attr("cy", hScale(center.y))
  .attr("r", svgRadius)
  .attr("fill", "transparent")
  .attr("opacity", 0.5);
const yCircleFill = Y.append("circle")
  .attr("class", "filled")
  .attr("cx", wScale(center.x))
  .attr("cy", hScale(center.y))
  .attr("r", svgRadius)
  .attr("fill", "transparent")
  .attr("opacity", 0.5);

const xCircleOutline = X.append("circle")
  .attr("class", "outline")
  .attr("cx", wScale(center.x))
  .attr("cy", hScale(center.y))
  .attr("r", svgRadius)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 2);

const xLabel = X.append("text")
  .attr("class", "label-text")
  .attr("x", wScale(center.x))
  .attr("y", hScale(center.y))
  .text("X")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "hanging");

// Draw Set Y
const yCircleOutline = Y.append("circle")
  .attr("class", "outline")
  .attr("cx", wScale(center.x))
  .attr("cy", hScale(center.y))
  .attr("r", svgRadius)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 2);

const yLabel = Y.append("text")
  .attr("class", "label-text")
  .attr("x", wScale(center.x))
  .attr("y", hScale(center.y))
  .text("Y")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "auto");

// Function to check if intersection needs to be updated
function checkAndUpdateIntersection() {
  const radioButton = d3.select('input[name="setOperation"]:checked').node();
  const selectedValue = radioButton ? radioButton.value : "none";
  switch (selectedValue) {
    case "subset":
      placeYtoX(yCircleFill, yCircleOutline, xCircleFill, true, true);
      break;
    case "notSubset":
      placeYtoX(yCircleFill, yCircleOutline, xCircleFill, false, true);
      break;
    case "exclusiveOr":
      separateCircles();
      break;
    case "symmetricDifference":
      updateSymmetricalDiff("steelblue");
      break;
    case "intersectionXY":
      updateIntersection("steelblue");
      break;
    case "complementIntersection":
      updateIntersection("white");
      break;
    case "complementXIntersectionY":
      updateAsymDiff("steelblue");
      break;
    default:
      // console.log(`Unset action for "${selectedValue}"`);
  }
}

// Function to reset circles to their initial state
function resetCircles(tailFx = null) {
  // Reset Set X
  X.select(".filled")
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("cx", wScale(center.x) - svgRadius * (1 - initOverlap))
    .attr("cy", hScale(center.y))
    .attr("r", svgRadius);

  X.select(".outline")
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("cx", wScale(center.x) - svgRadius * (1 - initOverlap))
    .attr("cy", hScale(center.y))
    .attr("r", svgRadius);

  // Update label position for Set X
  xLabel
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("x", wScale(center.x) - svgRadius * (1 - initOverlap))
    .attr("y", hScale(center.y) + svgRadius + labelOffset);

  // Reset Set Y
  Y.select(".filled")
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("cx", wScale(center.x) + svgRadius * (1 - initOverlap))
    .attr("cy", hScale(center.y))
    .attr("r", svgRadius)
    .on("end", checkAndUpdateIntersection);

  Y.select(".outline")
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("cx", wScale(center.x) + svgRadius * (1 - initOverlap))
    .attr("cy", hScale(center.y))
    .attr("r", svgRadius);

  // Update label position for Set Y
  yLabel
    .transition()
    .duration(500)
    .ease(d3.easeBounce)
    .attr("x", wScale(center.x) + svgRadius * (1 - initOverlap))
    .attr("y", hScale(center.y) - (svgRadius + labelOffset))
    .on("end", () => {
      typeof tailFx === "function" ? tailFx() : "";
    });
}

// Function to handle zoom (scroll wheel) interaction
function zoomCircle(d) {
  return d3
    .zoom()
    .scaleExtent([0.25, 1.1]) // Set the scale range for zooming (up to 10% larger)
    .on("zoom", function (event) {
      const dragGroup = d3.select(this.parentNode);
      const filledCircle = dragGroup.select(".filled");
      const outlineCircle = dragGroup.select(".outline");
      const label = dragGroup.select(".label-text");

      const newRadius = Math.max(
        d.originalRadius * 0.25,
        Math.min(d.originalRadius * 1.1, d.originalRadius * event.transform.k)
      );
      filledCircle.attr("r", newRadius);
      outlineCircle.attr("r", newRadius);
      const thisY = parseFloat(filledCircle.attr("cy"));
      d.labelOffset.y =
        parseFloat(label.attr("y")) > thisY
          ? newRadius + labelOffset
          : -(newRadius + labelOffset);

      // Update label position if needed
      updateLabelPosition(
        d.label,
        parseFloat(filledCircle.attr("cx")),
        parseFloat(filledCircle.attr("cy")),
        d.labelOffset
      );
      // Call the onZoomEnd callback, if provided
      if (d.onZoomEnd) {
        d.onZoomEnd();
      }
    })
    .on("end", function () {
      // Call the onDragEnd callback, if provided
      if (d.onEnd) {
        d.onEnd();
      }
    });
}

// Setup behaviors
xCircleFill.call(
  dragCircle({
    xDomain: center.x - svgRadius * (1 - initOverlap),
    yDomain: center.y,
    label: xLabel,
    labelOffset: { x: 0, y: svgRadius - labelOffset },
  })
);
yCircleFill.call(
  dragCircle({
    xDomain: center.x + svgRadius * (1 - initOverlap),
    yDomain: center.y,
    label: yLabel,
    labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
  })
);

// Apply the zoom behavior to Set X circles
xCircleFill.call(
  zoomCircle({
    originalRadius: svgRadius,
    label: xLabel,
    labelOffset: { x: 0, y: svgRadius - labelOffset },
  })
);

// Apply the zoom behavior to Set Y circles
yCircleFill.call(
  zoomCircle({
    originalRadius: svgRadius,
    label: yLabel,
    labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
  })
);

// Callback function for radio button changes
function onRadioButtonChange() {
  const radioButton = d3.select('input[name="setOperation"]:checked').node();
  const selectedValue = radioButton ? radioButton.value : "none";
  setState(selectedValue);
  if (isFree) { return; }
  var descriptionElement = document.getElementById("setTheoryDescription");
  descriptionElement.innerHTML = getSetTheoryDescription(selectedValue);
  // Force MathJax to re-evaluate the new content
  if (window.MathJax) {
    MathJax.typesetPromise([descriptionElement])
      .then(() => {
        // console.log("MathJax typesetting complete");
      })
      .catch((err) => {
        // console.error("MathJax typesetting error:", err);
      });
  }
}

// Callback function for the "Clear" button
function onClearButtonClick() {
  // Uncheck all radio buttons
  d3.selectAll('input[name="setOperation"]').property("checked", false);
  // Call the radio button change handler
  onRadioButtonChange();
}

// Event listener for radio button changes
d3.selectAll('input[name="setOperation"]').on("change", onRadioButtonChange);

// Event listener for the "Clear" button
d3.select("#clearButton").on("click", onClearButtonClick);

// Add double-click listener to the SVG
canvas.svg.on("dblclick", resetCircles);

// Initialize object locations
resetCircles(onRadioButtonChange);

// Function to calculate the intersection points of two circles
function circleIntersection(x0, y0, r0, x1, y1, r1) {
  const d = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  if (d > r0 + r1 || d < Math.abs(r0 - r1) || (d === 0 && r0 === r1)) {
    return []; // No intersection
  }

  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(r0 * r0 - a * a);
  const xm = x0 + (a * (x1 - x0)) / d;
  const ym = y0 + (a * (y1 - y0)) / d;
  const xs1 = xm + (h * (y1 - y0)) / d;
  const xs2 = xm - (h * (y1 - y0)) / d;
  const ys1 = ym - (h * (x1 - x0)) / d;
  const ys2 = ym + (h * (x1 - x0)) / d;

  // Check for uniqueness with a small tolerance
  const epsilon = 1e-6;
  const arePointsEqual = (p1, p2) =>
    Math.abs(p1.x - p2.x) < epsilon && Math.abs(p1.y - p2.y) < epsilon;

  const point1 = { x: xs1, y: ys1 };
  const point2 = { x: xs2, y: ys2 };

  if (arePointsEqual(point1, point2)) {
    return [point1]; // Return only one point if they are essentially equal
  }

  return [point1, point2]; // Return both points
}

// Function to create the intersection path
function createIntersectionPath(x0, y0, r0, x1, y1, r1) {
  // Calculate the distance (d) between the circle centers
  const d = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);

  // If one circle is inside the other, return the entire smaller circle as the path
  if (d <= Math.abs(r0 - r1)) {
    const insideCircle =
      r0 < r1 ? { x: x0, y: y0, r: r0 } : { x: x1, y: y1, r: r1 };
    return `M ${insideCircle.x}, ${insideCircle.y}
             m -${insideCircle.r}, 0
             a ${insideCircle.r},${insideCircle.r} 0 1,0 ${insideCircle.r * 2},0
             a ${insideCircle.r},${insideCircle.r} 0 1,0 -${
      insideCircle.r * 2
    },0`;
  }

  // If there's no intersection, return an empty string
  if (d > r0 + r1 || d === 0) {
    return "";
  }

  // Intersection points exist
  const points = circleIntersection(x0, y0, r0, x1, y1, r1);

  // Check if there is an actual area between the points, if not, return empty string
  if (points.length < 2) {
    return "";
  }

  // Calculate angles for intersection points
  const angleStart0 = Math.atan2(points[0].y - y0, points[0].x - x0);
  const angleEnd0 = Math.atan2(points[1].y - y0, points[1].x - x0);
  const angleStart1 = Math.atan2(points[1].y - y1, points[1].x - x1);
  const angleEnd1 = Math.atan2(points[0].y - y1, points[0].x - x1);

  // Define the large arc flags
  const angle0Dif = angleEnd0 - angleStart0;
  const angle1Dif = angleEnd1 - angleStart1;
  // const largeArcFlag0 = angle0Dif > Math.PI ? 1 : 0;
  const largeArcFlag0 =
    angle0Dif > Math.PI
      ? 1
      : angle0Dif <= Math.PI && angle0Dif >= 0
      ? 0
      : angle0Dif > -Math.PI && angle0Dif < 0
      ? 1
      : 0; // If angle0Dif <= -Math.PI
  const largeArcFlag1 =
    angle1Dif > Math.PI
      ? 1
      : angle1Dif <= Math.PI && angle1Dif >= 0
      ? 0
      : angle1Dif > -Math.PI && angle1Dif < 0
      ? 1
      : 0; // If angle1Dif <= -Math.PI
  // Create the path for the intersection area
  const pathData = [
    "M",
    x0 + r0 * Math.cos(angleStart0),
    y0 + r0 * Math.sin(angleStart0),
    "A",
    r0,
    r0,
    0,
    largeArcFlag0,
    1,
    x0 + r0 * Math.cos(angleEnd0),
    y0 + r0 * Math.sin(angleEnd0),
    "L",
    x1 + r1 * Math.cos(angleEnd1),
    y1 + r1 * Math.sin(angleEnd1),
    "A",
    r1,
    r1,
    0,
    largeArcFlag1,
    0,
    x1 + r1 * Math.cos(angleStart1),
    y1 + r1 * Math.sin(angleStart1),
    "Z",
  ].join(" ");

  return pathData;
}
// Update the intersection with the specified fill color
function updateIntersection(fillColor) {
  const xCircleCenter = {
    x: parseFloat(xCircleFill.attr("cx")),
    y: parseFloat(xCircleFill.attr("cy")),
  };
  const yCircleCenter = {
    x: parseFloat(yCircleFill.attr("cx")),
    y: parseFloat(yCircleFill.attr("cy")),
  };
  const xRadius = parseFloat(xCircleFill.attr("r"));
  const yRadius = parseFloat(yCircleFill.attr("r"));

  const intersectionPathD = createIntersectionPath(
    xCircleCenter.x,
    xCircleCenter.y,
    xRadius,
    yCircleCenter.x,
    yCircleCenter.y,
    yRadius
  );
  const intersectionPath = I.selectAll(".intersection-path")
    .data([0])
    .join("path")
    .attr("class", "intersection-path")
    .attr("d", intersectionPathD)
    .attr("fill", fillColor)
    .attr("fill-opacity", 1);
}

// SYMMETRICAL DIFFERENCE --------------------------------------------------->
// Functions for symmetrical difference
function createSymmetricalDiffPath(X, Y, fillColor) {
  // Calculate intersection symPoints
  const symPoints = circleIntersection(X.x, X.y, X.r, Y.x, Y.y, Y.r);

  // Check if one circle is inside the other and not touching
  const d = Math.sqrt((X.x - Y.x) ** 2 + (Y.y - X.y) ** 2);
  if (d + Math.min(X.r, Y.r) <= Math.max(X.r, Y.r)) {
    // One circle is inside the other
    cols = [fillColor, "white"];
    const inside = X.r < Y.r ? X : Y;
    const outside = X.r < Y.r ? Y : X;
    return [
      createFullCirclePath(outside.x, outside.y, outside.r),
      createFullCirclePath(inside.x, inside.y, inside.r),
    ].map((d, i) => ({ d: d, color: cols[i] }));
  }

  // Check if there is no overlap
  if (symPoints.length <= 1) {
    // No overlap; return full circles for both X and Y
    return [
      createFullCirclePath(X.x, X.y, X.r),
      createFullCirclePath(Y.x, Y.y, Y.r),
    ].map((d) => ({ d: d, color: fillColor }));
  }

  // Partial overlap; return paths with overlap areas cut out
  return [
    createPartialCirclePath(X, Y, symPoints, "x"),
    createPartialCirclePath(Y, X, symPoints, "y"),
  ].map((d) => ({ d: d, color: fillColor }));
}

function createFullCirclePath(cx, cy, r) {
  return `M ${cx - r}, ${cy} A ${r}, ${r} 0 1, 0 ${
    cx + r
  }, ${cy} A ${r}, ${r} 0 1, 0 ${cx - r}, ${cy}`;
}

function createPartialCirclePath(circle, otherCircle, symPoints, src) {
  // Calculate angles for intersection symPoints
  const angles = calculateIntersectionAngles(circle, otherCircle, symPoints);
  if (src == "y") {
    angles.sweepFlag1 = +!angles.sweepFlag1;
    angles.sweepFlag0 = +!angles.sweepFlag1;
    angles.largeArcFlag1 = +!angles.largeArcFlag1;
    angles.largeArcFlag0 = +!angles.largeArcFlag0;
  }

  // Construct the path for the partial circle to exclude the intersection
  const pathData = [
    // Start at one intersection point
    "M",
    otherCircle.x + otherCircle.r * Math.cos(angles.angleStart1),
    otherCircle.y + otherCircle.r * Math.sin(angles.angleStart1),
    // Draw arc of other circle to the second intersection point
    "A",
    otherCircle.r,
    otherCircle.r,
    0,
    angles.largeArcFlag1,
    angles.sweepFlag1,
    otherCircle.x + otherCircle.r * Math.cos(angles.angleEnd1),
    otherCircle.y + otherCircle.r * Math.sin(angles.angleEnd1),
    "A",
    circle.r,
    circle.r,
    0,
    angles.largeArcFlag0,
    angles.sweepFlag0,
    otherCircle.x + otherCircle.r * Math.cos(angles.angleStart1),
    otherCircle.y + otherCircle.r * Math.sin(angles.angleStart1),
    // Close the path
    "Z",
  ].join(" ");

  return pathData;
}

function calculateIntersectionAngles(circle, otherCircle, points) {
  // Calculate angles for intersection points
  const angleStart0 = Math.atan2(
    points[0].y - circle.y,
    points[0].x - circle.x
  );
  const angleEnd0 = Math.atan2(points[1].y - circle.y, points[1].x - circle.x);
  const angleStart1 = Math.atan2(
    points[1].y - otherCircle.y,
    points[1].x - otherCircle.x
  );
  const angleEnd1 = Math.atan2(
    points[0].y - otherCircle.y,
    points[0].x - otherCircle.x
  );

  // Define the large arc flags
  const angle0Dif = angleEnd0 - angleStart0;
  const angle1Dif = angleEnd1 - angleStart1;
  // Works for x ---->
  const largeArcFlag0 =
    angle0Dif > Math.PI
      ? 0
      : angle0Dif <= Math.PI && angle0Dif >= 0
      ? 1
      : angle0Dif > -Math.PI && angle0Dif < 0
      ? 0
      : 1; // If angle0Dif <= -Math.PI

  const largeArcFlag1 =
    angle1Dif > Math.PI
      ? 1
      : angle1Dif <= Math.PI && angle1Dif >= 0
      ? 0
      : angle1Dif > -Math.PI && angle1Dif < 0
      ? 1
      : 0; // If angle1Dif <= -Math.PI
  // ------>
  // Set up sweep flags
  const sweepFlag0 = 0; //(circle.x < otherCircle.x) ? 0 : 1;
  const sweepFlag1 = 1; //(circle.x > otherCircle.x) ? 0 : 1;

  return {
    angleStart0,
    angleEnd0,
    angleStart1,
    angleEnd1,
    largeArcFlag0,
    largeArcFlag1,
    sweepFlag0,
    sweepFlag1,
  };
}

function updateSymmetricalDiff(fillColor) {
  const xCircleData = {
    x: parseFloat(xCircleFill.attr("cx")),
    y: parseFloat(xCircleFill.attr("cy")),
    r: parseFloat(xCircleFill.attr("r")),
  };
  const yCircleData = {
    x: parseFloat(yCircleFill.attr("cx")),
    y: parseFloat(yCircleFill.attr("cy")),
    r: parseFloat(yCircleFill.attr("r")),
  };

  // Get paths
  const pathsD = createSymmetricalDiffPath(xCircleData, yCircleData, fillColor);

  //Draw the paths
  I.selectAll(".symmetrical-difference")
    .data(pathsD)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "symmetrical-difference")
          .attr("d", (o) => o.d)
          .attr("fill", (o) => o.color)
          .attr("opacity", 0)
          .call((enter) =>
            enter.transition(transitionLinear()).attr("opacity", 1)
          ),
      (update) => update.attr("d", (o) => o.d).attr("fill", (o) => o.color),
      (exit) =>
        exit.call((exit) =>
          exit.transition(transitionLinear()).attr("opacity", 0).remove()
        )
    );
}

// ASYMMETRICAL DIFFERENCE
function createAsymDiffPath(X, Y, fillColor) {
  // For this, we always highlight Y
  // Calculate intersection symPoints
  const symPoints = circleIntersection(X.x, X.y, X.r, Y.x, Y.y, Y.r);

  // Check if one circle is inside the other and not touching
  const d = Math.sqrt((X.x - Y.x) ** 2 + (Y.y - X.y) ** 2);
  if (d + Math.min(X.r, Y.r) <= Math.max(X.r, Y.r)) {
    // Determine which circle is inside the other
    const isXInsideY = X.r < Y.r && d + X.r <= Y.r;
    const isYInsideX = Y.r < X.r && d + Y.r <= X.r;

    // Define colors or styles for each case
    let pathStyles;
    if (isXInsideY) {
      // X is inside Y
      return [
        { d: createFullCirclePath(Y.x, Y.y, Y.r), color: fillColor },
        { d: createFullCirclePath(X.x, X.y, X.r), color: "white" },
      ];
    }
    if (isYInsideX) {
      // Y is inside X
      return [{ d: createFullCirclePath(Y.x, Y.y, Y.r), color: "white" }];
    }
  }

  // Check if there is no overlap
  if (symPoints.length <= 1) {
    // No overlap; return full circles for Y
    return [createFullCirclePath(Y.x, Y.y, Y.r)].map((d) => ({
      d: d,
      color: fillColor,
    }));
  }

  // Partial overlap; return paths with overlap areas cut out
  return [createPartialCirclePath(Y, X, symPoints, "y")].map((d) => ({
    d: d,
    color: fillColor,
  }));
}

function updateAsymDiff(fillColor) {
  const xCircleData = {
    x: parseFloat(xCircleFill.attr("cx")),
    y: parseFloat(xCircleFill.attr("cy")),
    r: parseFloat(xCircleFill.attr("r")),
  };
  const yCircleData = {
    x: parseFloat(yCircleFill.attr("cx")),
    y: parseFloat(yCircleFill.attr("cy")),
    r: parseFloat(yCircleFill.attr("r")),
  };

  // Get paths
  const pathsD = createAsymDiffPath(xCircleData, yCircleData, fillColor);

  //Draw the paths
  I.selectAll(".asymmetrical-difference")
    .data(pathsD)
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "asymmetrical-difference")
          .attr("d", (o) => o.d)
          .attr("fill", (o) => o.color)
          .attr("opacity", 1),
      (update) => update.attr("d", (o) => o.d).attr("fill", (o) => o.color),
      (exit) => exit.remove()
    );
}

function removeSymmetricalDiff() {
  I.selectAll(".symmetrical-difference").remove();
}
// Function to start the intersection behavior and create the fill
function setSymmetricalDiff(fillColor) {
  // Call updateSymmetricalDiff initially and on drag/zoom events
  updateSymmetricalDiff(fillColor);
  // Setup behaviors
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onDragEnd: () => updateSymmetricalDiff(fillColor),
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onDragEnd: () => updateSymmetricalDiff(fillColor),
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onZoomEnd: () => updateSymmetricalDiff(fillColor),
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onZoomEnd: () => updateSymmetricalDiff(fillColor),
    })
  );
}

// ASYMMETRICAL DIFFERENCE compliment A intersect B
function removeAsymDiff() {
  I.selectAll(".asymmetrical-difference").remove();
}
// Function to start the intersection behavior and create the fill
function setAsymDiff(fillColor) {
  // Call updateSymmetricalDiff initially and on drag/zoom events
  updateAsymDiff(fillColor);
  // Setup behaviors
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onDragEnd: () => updateAsymDiff(fillColor),
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onDragEnd: () => updateAsymDiff(fillColor),
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onZoomEnd: () => updateAsymDiff(fillColor),
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onZoomEnd: () => updateAsymDiff(fillColor),
    })
  );
}
// Function to stop the intersection behavior and set the shape to transparent
function removeIntersection() {
  // Set the intersection shape to transparent and remove event handlers
  I.selectAll(".intersection-path").remove();
}

// Function to start the intersection behavior and create the fill
function setIntersection(fillColor) {
  // Call updateIntersection initially and on drag/zoom events
  updateIntersection(fillColor);
  // Setup behaviors
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onDragEnd: () => updateIntersection(fillColor),
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onDragEnd: () => updateIntersection(fillColor),
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onZoomEnd: () => updateIntersection(fillColor),
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onZoomEnd: () => updateIntersection(fillColor),
    })
  );
}

function setExclusive() {
  // Setup behaviors
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onEnd: () => separateCircles(),
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onEnd: () => separateCircles(),
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onEnd: () => separateCircles(),
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onEnd: () => separateCircles(),
    })
  );
}

// YSUBSETX ---------------------------------------------------------->
function setSubset(Y, Yo, X, toInside = true, canBeEqual = true) {
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onEnd: () => placeYtoX(Y, Yo, X, toInside, canBeEqual),
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onEnd: () => placeYtoX(Y, Yo, X, toInside, canBeEqual),
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
      onEnd: () => placeYtoX(Y, Yo, X, toInside, canBeEqual),
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
      onEnd: () => placeYtoX(Y, Yo, X, toInside, canBeEqual),
    })
  );
}

function placeYtoX(Y, Yo, X, toInside = true, canBeEqual = true) {
  // Current positions and radii of X and Y
  const xCircleData = {
    x: parseFloat(X.attr("cx")),
    y: parseFloat(X.attr("cy")),
    r: parseFloat(X.attr("r")),
  };
  const yCircleData = {
    x: parseFloat(Y.attr("cx")),
    y: parseFloat(Y.attr("cy")),
    r: parseFloat(Y.attr("r")),
  };
  // Calculate the distance and angle between the centers of X and Y
  const dx = yCircleData.x - xCircleData.x;
  const dy = yCircleData.y - xCircleData.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  let newYRadius, newX, newY;
  if (!toInside) {
    // is inside, move to outside
    newYRadius = yCircleData.r; // Use Y's radius for calculation
    if (distance - newYRadius <= xCircleData.r) {
      // Y is inside X, so move Y outside
      newX = xCircleData.x + (xCircleData.r + newYRadius) * Math.cos(angle);
      newY = xCircleData.y + (xCircleData.r + newYRadius) * Math.sin(angle);
    } else {
      // Y is already outside X, do nothing
      return;
    }
  } else {
    // move to inside if outside
    // Adjust Y's radius to be smaller than X's radius
    newYRadius = Math.min(
      yCircleData.r,
      xCircleData.r * (canBeEqual ? 1 : 0.975)
    );
    if (distance + newYRadius >= xCircleData.r) {
      // Y is outside X, so move Y inside
      newX = xCircleData.x + (xCircleData.r - newYRadius) * Math.cos(angle);
      newY = xCircleData.y + (xCircleData.r - newYRadius) * Math.sin(angle);
    } else {
      // Y is already inside X, do nothing
      return;
    }
  }
  // update graphical elements
  Y.transition(transitionBounce())
    .attr("cx", newX)
    .attr("cy", newY)
    .attr("r", newYRadius);
  Yo.transition(transitionBounce())
    .attr("cx", newX)
    .attr("cy", newY)
    .attr("r", newYRadius);

  // Update label position for Y
  transitionLabelPosition(
    yLabel,
    newX,
    newY,
    { x: 0, y: -(newYRadius + labelOffset) },
    transitionBounce
  );
}

// helpers ---------->

// Define a reusable transition
function transitionLinear() {
  return d3.transition().duration(700).ease(d3.easeLinear);
}
function transitionBounce() {
  return d3.transition().duration(500).ease(d3.easeBounce);
}
// color set shortcuts
function setOutlines(colorSpec) {
  xCircleOutline.transition(transitionLinear()).attr("stroke", colorSpec);
  yCircleOutline.transition(transitionLinear()).attr("stroke", colorSpec);
}
function setCircleFills(colorSpec, opacityVal) {
  // Transition Set X to a distinct color
  xCircleFill
    .transition(transitionLinear())
    .attr("fill", colorSpec)
    .attr("opacity", opacityVal);

  // Transition Set Y to a distinct color
  yCircleFill
    .transition(transitionLinear())
    .attr("fill", colorSpec)
    .attr("opacity", opacityVal);
}
function uFill(colorSpec) {
  uRect.transition(transitionLinear()).attr("fill", colorSpec);
}

// Function to check if circles overlap and move them apart if they do
function separateCircles() {
  // Current positions and radii
  const xCircleData = {
    x: parseFloat(xCircleFill.attr("cx")),
    y: parseFloat(xCircleFill.attr("cy")),
    r: parseFloat(xCircleFill.attr("r")),
  };
  const yCircleData = {
    x: parseFloat(yCircleFill.attr("cx")),
    y: parseFloat(yCircleFill.attr("cy")),
    r: parseFloat(yCircleFill.attr("r")),
  };

  // Calculate distance between circle centers
  const dx = xCircleData.x - yCircleData.x;
  const dy = xCircleData.y - yCircleData.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Check for overlap
  if (distance < xCircleData.r + yCircleData.r) {
    // Calculate the overlap
    const overlap = xCircleData.r + yCircleData.r - distance;

    // Calculate the separation needed along the x and y axis
    const separationX = overlap * (dx / distance);
    const separationY = overlap * (dy / distance);

    // Update positions to remove overlap
    xCircleFill
      .transition(transitionBounce())
      .attr("cx", xCircleData.x + separationX / 2)
      .attr("cy", xCircleData.y + separationY / 2);
    xCircleOutline
      .transition(transitionBounce())
      .attr("cx", xCircleData.x + separationX / 2)
      .attr("cy", xCircleData.y + separationY / 2);

    yCircleFill
      .transition(transitionBounce())
      .attr("cx", yCircleData.x - separationX / 2)
      .attr("cy", yCircleData.y - separationY / 2);
    yCircleOutline
      .transition(transitionBounce())
      .attr("cx", yCircleData.x - separationX / 2)
      .attr("cy", yCircleData.y - separationY / 2);

    // Update label positions
    // parseFloat(label.attr("y")) > newY ? radius + labelOffset : -radius - labelOffset
    transitionLabelPosition(
      xLabel,
      xCircleData.x + separationX / 2,
      xCircleData.y + separationY / 2,
      { x: 0, y: parseFloat(xCircleData.r) + labelOffset },
      transitionBounce
    );
    transitionLabelPosition(
      yLabel,
      yCircleData.x - separationX / 2,
      yCircleData.y - separationY / 2,
      { x: 0, y: -(parseFloat(yCircleData.r) + labelOffset) },
      transitionBounce
    );
  }
}

function removeBehavior() {
  // Setup behaviors
  xCircleFill.call(
    dragCircle({
      xDomain: center.x - svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
    })
  );
  yCircleFill.call(
    dragCircle({
      xDomain: center.x + svgRadius * (1 - initOverlap),
      yDomain: center.y,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
    })
  );

  // Apply the zoom behavior to Set X circles
  xCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: xLabel,
      labelOffset: { x: 0, y: svgRadius - labelOffset },
    })
  );
  // Apply the zoom behavior to Set Y circles
  yCircleFill.call(
    zoomCircle({
      originalRadius: svgRadius,
      label: yLabel,
      labelOffset: { x: 0, y: -(svgRadius + labelOffset) },
    })
  );
}

// Set the state based on the selected radio button's value
function setState(selectedValue) {
  // remove all behaviors
  removeBehavior();
  removeIntersection();
  removeAsymDiff();
  removeSymmetricalDiff();

  switch (selectedValue) {
    case "universalSet":
      // Apply the reusable transition to the universal set rectangle
      uFill("steelblue");
      // Apply the reusable transition to the filled circles of sets X and Y
      setCircleFills("transparent", 0.5);
      // set outline colors
      setOutlines("black");
      break;
    case "setX":
      // Transition the universal set rectangle and Set Y to transparent
      uFill("transparent");
      yCircleFill
        .transition(transitionLinear())
        .attr("fill", "transparent")
        .attr("opacity", 0.5);

      // Transition Set X to blue
      xCircleFill
        .transition(transitionLinear())
        .attr("fill", "steelblue")
        .attr("opacity", 1);
      // set outline colors
      setOutlines("black");
      break;
    case "complementX":
      // Transition Set X to stark white (fully opaque)
      xCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "white");
      // Transition the universal set rectangle to steelblue
      uFill("steelblue");
      // Transition Set Y to transparent (if needed)
      yCircleFill
        .transition(transitionLinear())
        .attr("opacity", 0.5)
        .attr("fill", "transparent");
      // set outline colors
      setOutlines("black");
      break;
    case "intersectionXY":
      // Set the intersection point and setup behavior
      setIntersection("steelblue");
      // Transition the non-intersection areas of Set X and Set Y to transparent
      setCircleFills("transparent", 0.5);
      // set outline colors
      setOutlines("black");
      // Transition the universal set rectangle to transparent
      uFill("transparent");
      break;
    case "unionXY":
      setCircleFills("steelblue", 1);
      setOutlines("steelblue");
      // Transition the universal set rectangle to transparent
      uFill("transparent");
      break;
    case "complementUnion":
      setCircleFills("white", 1);
      setOutlines("white");
      // Transition the universal set rectangle to transparent
      uFill("steelblue");
      break;
    case "complementIntersection":
      // Set the intersection point and setup behavior
      setIntersection("white");
      // Transition the non-intersection areas of Set X and Set Y to transparent
      setCircleFills("transparent", 0.5);
      // set outline colors
      setOutlines("black");
      // Transition the universal set rectangle to transparent
      uFill("steelblue");
      break;
    case "complementXUnionY":
      xCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "white");
      yCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "steelblue");
      uFill("steelblue");
      setOutlines("black");
      break;
    case "exclusiveOr":
      setExclusive();
      setCircleFills("steelblue", 0.5);
      setOutlines("black");
      uRect
        .transition(transitionLinear())
        .attr("fill", "transparent")
        .on("end", separateCircles);
      break;
    case "symmetricDifference":
      setOutlines("black");
      setCircleFills("transparent");
      setSymmetricalDiff("steelblue");
      break;
    case "complementXIntersectionY":
      setOutlines("black");
      setCircleFills("transparent");
      setAsymDiff("steelblue");
      break;
    case "subset":
      setSubset(yCircleFill, yCircleOutline, xCircleFill, true, false, true);
      uFill("transparent");
      setOutlines("black");
      xCircleFill
        .transition(transitionLinear())
        .attr("opacity", 0.5)
        .attr("fill", "transparent");
      yCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "steelblue")
        .on("end", () =>
          placeYtoX(yCircleFill, yCircleOutline, xCircleFill, true, true)
        );
      break;
    case "notSubset":
      setSubset(yCircleFill, yCircleOutline, xCircleFill, false, true);
      uFill("transparent");
      setOutlines("black");
      xCircleFill
        .transition(transitionLinear())
        .attr("opacity", 0.5)
        .attr("fill", "transparent");
      yCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "steelblue")
        .on("end", () =>
          placeYtoX(yCircleFill, yCircleOutline, xCircleFill, false, true)
        );
      break;
    case "none":
      // Transition to set all fills to transparent
      uRect
        .transition(transitionLinear())
        .attr("fill", "transparent");
      xCircleFill
        .transition(transitionLinear())
        .attr("opacity", 0.5)
        .attr("fill", "transparent");
      yCircleFill
        .transition(transitionLinear())
        .attr("opacity", 1)
        .attr("fill", "transparent")
        .on("end", () => resetCircles());
      break;
    default:
      console.log("Unknown state:", selectedValue);
  }
}

function getSetTheoryDescription(operation) {
  var description = "";
  switch (operation) {
    case "universalSet":
      description =
        "<p>Universal Set ($\\xi$)</p>" +
        "<p>The universal set, denoted as $\\xi$, represents the entire set of all possible elements in the given context. It contains every element under consideration.</p>" +
        "<p>$$ P(\\xi) = 1 $$</p>";
      break;
    case "setX":
      description =
        "<p>Set X ($X$)</p>" +
        "<p>Set X, denoted as $X$, is a specific subset of the universal set. It contains elements defined by a particular property or condition.</p>" +
        "<p>$$ P(X) = \\frac{\\text{N outcomes in } X}{\\text{Total outcomes in } \\xi} $$</p>";
      break;
    case "complementX":
      description =
        "<p>Complement of Set X ($X'$)</p>" +
        "<p>The complement of Set X, denoted as $X'$, includes all elements of the universal set that are not in Set X.</p>" +
        "<p>$$ P(X') = 1 - P(X) $$</p>";
      break;
    case "intersectionXY":
      description =
        "<p>Intersection of Sets X and Y ($X \\cap Y$)</p>" +
        "<p>The intersection of Sets X and Y, denoted as $X \\cap Y$, represents the set of elements that are common to both Set X and Set Y.</p>" +
        "<p>$$ P(X \\cap Y) = P(X) \\times P(Y) $$</p>";
      break;
    case "complementIntersection":
      description =
        "<p>Complement of X and Y Intersection ($(X \\cap Y)$')</p>" +
        "<p>The complement of the intersection of Sets X and Y, denoted as $(X \\cap Y)'$, includes all elements of the universal set that are not in the intersection of Set X and Set Y. It represents the elements that are either in Set X but not in Set Y, in Set Y but not in Set X, or in neither Set X nor Set Y.</p>" +
        "<p>$$ P((X \\cap Y)') = 1 - P(X \\cap Y) $$</p>";
      break;
    case "unionXY":
      description =
        "<p>Union of Sets X and Y ($X \\cup Y$)</p>" +
        "<p>The union of Sets X and Y, denoted as $X \\cup Y$, consists of all elements that are in Set X, Set Y, or both.</p>" +
        "<p>$$ P(X \\cup Y) = P(X) + P(Y) - P(X \\cap Y) $$</p>";
      break;
    case "complementUnion":
      // Description for Complement of the Union of Sets X and Y ((X ∪ Y)')
      description =
        "<p>Complement of Sets X and Y Union ($(X \\cup Y)'$)</p>" +
        "<p>The complement of the union of Sets X and Y, denoted as $(X \\cup Y)'$, consists of all elements in the universal set that are not in either Set X or Set Y. It represents the elements that are in neither Set X nor Set Y.</p>" +
        "<p>$$ P((X \\cup Y)') = 1 - P(X \\cup Y) $$</p>";
      break;
    case "complementXUnionY":
      // Description for Complement of X Union Y (X' ∪ Y)
      description =
        "<p>Complement of X Union Y ($(X' \\cup Y)$)</p>" +
        "<p>The complement of X Union Y, denoted as $(X' \\cup Y)$, includes all elements in the universal set that are in Set X's complement or in Set Y. It represents elements not in Set X but possibly in Set Y, or in both sets.</p>" +
        "<p>$$ P(X' \\cup Y) = P(X') + P(Y) - P(X' \\cap Y) $$</p>";
      break;
    case "exclusiveOr":
      // Description for Exclusive Or (X ⊕ Y)
      description =
        "<p>Exclusive Or of Sets X and Y ($(X \\oplus Y)$)</p>" +
        "<p>The Exclusive Or (XOR) of Sets X and Y, denoted as $(X \\oplus Y)$, includes all elements that are in either Set X or Set Y, but not in both. In this operation, Sets X and Y are considered mutually exclusive, meaning there is no overlap (no intersection), so the term $2P(X \\cap Y)$ goes to zero.</p>" +
        "<p>$$\\require{cancel}P(X \\oplus Y) = P(X) + P(Y) - \\cancelto{0}{2P(X \\cap Y)}$$</p>";
      break;
    case "symmetricDifference":
      // Description for Symmetric Difference (X △ Y)
      description =
        "<p>Symmetric Difference of Sets X and Y ($X \\triangle Y$)</p>" +
        "<p>The Symmetric Difference of Sets X and Y, denoted as $(X \\triangle Y)$, includes all elements that are in either Set X or Set Y, but not in both. It is equivalent to the Exclusive Or (XOR) of the two sets and represents the elements unique to Set X or Set Y.</p>" +
        "<p>$$ P(X \\triangle Y) = P(X) + P(Y) - 2P(X \\cap Y) $$</p>";
      break;
    case "complementXIntersectionY":
      // Description for Complement of X Intersection Y (X' ∩ Y)
      description =
        "<p>Complement of X Intersection Y ($(X' \\cap Y)$)</p>" +
        "<p>The Complement of X Intersection Y, denoted as $(X' \\cap Y)$, includes all elements in the universal set that are in Set Y but not in Set X. It represents the elements unique to Set Y when excluding those in Set X.</p>" +
        "<p>$$ P(X' \\cap Y) = P(Y) - P(X \\cap Y) $$</p>";
      break;
    case "subset":
      // Description for Subset (Y ⊆ X)
      description =
        "<p>Subset (Y ⊆ X)</p>" +
        "<p>The Subset relationship, denoted as $(Y \\subseteq X)$, indicates that every element of Set Y is also an element of Set X. In other words, Set Y is contained within or is equal to Set X.</p>" +
        "<p>$$ P(Y \\subseteq X) = P(Y) \\leq P(X) $$</p>";
      break;
    case "notSubset":
      // Description for Not Subset (Y ⊈ X)
      description =
        "<p>Not Subset (Y ⊈ X)</p>" +
        "<p>The Not Subset relationship, denoted as $(Y \\nsubseteq X)$, indicates that Set Y is not a subset of Set X. This means there are elements in Set Y that are not contained in Set X.</p>" +
        "<p>There is no direct probability formula for this relationship, as it is defined by the absence of the subset condition.</p>";
      break;
    default:
      description =
        "<p></p>" +
        "<p>Select a set operation to see its description and formula.</p>" +
        "<p></p>";
  }
  return description;
}
