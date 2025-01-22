/**
 * Requires, d3v7.8, interval-tree-1d, search-bounds
 */
/**
 * Constants
 */
const radius = 10; // radius for simulation
const w_0 = 700;
const h_0 = 520;
const dataFile = "./data/CO2Plants.csv";

// Global category and value columns
const CAT1 = "Type";
const CAT2 = "Treatment";
const VALUE = "uptake";
// Global layout settings
const legendSize = 20;
const padding = 0.5;

/**
 * currentView map:
 * 0 -> shows cat1 on x axis, splits internal groups by cat2 (legend is cat2 split)
 * 1 -> Merges cat2 into only cat 1
 * 2 -> swaps cat2 to x axis and merges cat1.
 */
let currentView = 0;


// DATA Storage
let yExtent, yScale, xScale, 
  groupedStats, dataArray, groupedData, 
  nMain, nSecondary, nTotal, 
  colFxn,
  cat1Values, cat2Values,
  meansDisplayed = false;

// Flag for interaction lines display
let interactionsDisplayed = false;
/**
 * Generates a color scale based on the categories of CAT2, with brightness adjustments based on CAT1.
 * 
 * @param {Array} cat1Values Array of unique values for CAT1.
 * @param {Array} cat2Values Array of unique values for CAT2.
 * @returns {Function} A function that takes a data point and returns a color.
 */
function createColorScale(cat1Values, cat2Values) {
  // Define base colors for CAT2 levels.
  const baseColors = ['orange', 'steelblue', 'purple'];

  // Create a color scale for each CAT2 group.
  const cat2ColorScales = cat2Values.map((cat2Value, index) => {
    const color = baseColors[index % baseColors.length];
    return chroma.scale([chroma(color).brighten(), chroma(color).darken()]);
  });

  // Map each CAT2 group to its color scale.
  const colorScaleMap = new Map(
    cat2Values.map(
      (cat2Value, index) => [cat2Value, cat2ColorScales[index]]
      )
    );
  // Return a function to get color for a data point.
  return (d) => {
    const scale = colorScaleMap.get(d[CAT2]);
    const cat1Index = cat1Values.indexOf(d[CAT1]);
    const cat1DomainLength = cat1Values.length;
    // Scale the domain of CAT1 to [0, 1] for the color scale.
    const scaledCat1Value = cat1Index / (cat1DomainLength - 1);
    return scale(scaledCat1Value);
  };
}


// AXES and static graphical containers/selections
const ax = new SVG({
  initialWidth: w_0,
  initialHeight: h_0,
  elementName: "graphic-container"
});

const xAxis = ax.g.append("g")
  .attr("class", "axis axis--x")
  .attr("transform", `translate(0,${ax.height})`);
const yAxis = ax.g.append("g")
  .attr("class", "axis axis--y")
  .attr("transform", `translate(0,0)`);
const circles = ax.g.append("g").attr("class", "data-plot");
const meanPoints = ax.g.append("g").attr("class", "mean-data");
const legend = ax.g.append("g").attr("class", "legend-box").attr("transform",`translate(10,-${legendSize})`);

function ticked() {
  circles.selectAll(".dot")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
}

const simulation = d3.forceSimulation()
    .on("tick",ticked);

d3.csv(dataFile).then(data => {
  // setup scales
  yExtent = d3.extent(data, d => +d[VALUE]).map((v,i) => i?v+1:v-1);
  yExtent[0] = d3.min([0,yExtent[0]]);
  yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([ax.height,0])
    .nice();
  yAxis.transition().duration(200).call(d3.axisLeft(yScale));

  // Get unique CAT1 and CAT2 values for the domain of the x-scale
  // Assumes balanced design
  cat1Values = Array.from(new Set(data.map(d => d[CAT1])));
  cat2Values = Array.from(new Set(data.map(d => d[CAT2])));
  colFxn = createColorScale(cat1Values,cat2Values)
  
  // create the data array
  dataArray = data.map((d,i) => {
    d[VALUE] = +d[VALUE];
    d.color = colFxn(d);
    d.id = i;
    return d;
  });
  // setup the view
  updateView();
});

// setup listeners
// listen for resize and restart simulation
window.addEventListener("resize", () => {
  ax.updateSvgDimensions();
  updateView();
});

function updateView(){
  // group data by key/value
  let legendFlag = true;
  switch (currentView){
    case 0:
      groupedStats = d3.flatRollup(
        dataArray, 
        f => ({mean:d3.mean(f, d => d[VALUE]),sdev:d3.deviation(f, d=> d[VALUE])}), 
        d => d[CAT1], 
        d => d[CAT2]
        );
      groupedData = d3.group(dataArray, d => d[CAT1], d => d[CAT2]);
      break;
    case 1:
      groupedStats = d3.flatRollup(
        dataArray, 
        f => ({mean:d3.mean(f, d => d[VALUE]),sdev:d3.deviation(f, d=> d[VALUE])}), 
        d => d[CAT1]
        );
        groupedData = d3.group(dataArray, d => d[CAT1]);
      break;
    case 2:
      groupedStats = d3.flatRollup(
        dataArray, 
        f => ({mean:d3.mean(f, d => d[VALUE]),sdev:d3.deviation(f, d=> d[VALUE])}), 
        d => d[CAT2]
        );
        groupedData = d3.group(dataArray, d => d[CAT2]);
        legendFlag = false;
      break;
    case 3:
      groupedStats = d3.flatRollup(
        dataArray,
        f => ({ mean: d3.mean(f, d => d[VALUE]), sdev: d3.deviation(f, d => d[VALUE]) }),
        d => d[CAT2],
        d => d[CAT1]
      );
      groupedData = d3.group(dataArray, d => d[CAT2], d => d[CAT1]);
      legendFlag = false;
      break;
  }
  xScale = d3.scaleLinear()
    .domain([-0.5, groupedData.size - 0.5])
    .range([0,ax.width]);
  let axLabels = [];
  groupedData.forEach((v,k) => {
    axLabels.push(k);
  });
  xAxis.transition().duration(100).call(
    d3.axisBottom()
      .scale(xScale)
      .tickValues(d3.range(0,axLabels.length))
      .tickFormat((d,i) => axLabels[i])
  );
  // Select data points
  let centerCount = 0;
  groupedData.forEach((subgroups, group) => {
    let groupCenter = centerCount++;

    let numOfSubgroups = subgroups.size;
    let radius = numOfSubgroups > 1 ? 6 : 12; // Adjust radius based on nesting
    
    let subgroupCenters = {};
    if (numOfSubgroups > 1) {
      let subgroupIndex = 0;
      subgroups.forEach((data, subgroup) => {
        // Calculate the center for each subgroup
        let spread = 1 / (numOfSubgroups+2); // Reduced spread range
        subgroupCenters[subgroup] = groupCenter - spread / 2 + (spread / (numOfSubgroups - 1)) * subgroupIndex;
        subgroupIndex++;
  
        // Update dataArray with the center for each data point in this subgroup
        data.forEach(d => {
          d.center = subgroupCenters[subgroup];
          d.radius = radius;
        });
        let statsObject = groupedStats.find(stat => stat[0] === group && stat[1] === subgroup);
        if (statsObject) {
          statsObject[statsObject.length - 1].center = subgroupCenters[subgroup];
        }
      });
    } else {
      // If only one group, use the group center
      subgroups.forEach(d => {
        d.center = groupCenter;
        d.radius = radius;
      });
      let statsObject = groupedStats.find(stat => stat[0] === group);
      if (statsObject) {
        statsObject[statsObject.length - 1].center = groupCenter;
      }
    }
  });
  
  // Now dataArray has been updated with a 'center' field for each data point
  circles.selectAll(".dot")
   .data(dataArray, d => d.id) // Using the updated dataArray
   .join(
    enter => enter
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.center)) // Use the 'center' field for the x position
      .attr("cy", d => yScale(d[VALUE]))
      .attr("r", d => d.radius)
      .style("fill", d => d.color) // Set the fill color based on the color field in the data
      .style("opacity", 0)
      .call(
        enter => enter
        .transition()
        .duration(200)
        .style("opacity", 0.8)
        ),
    update => update.call(
      update => update
      .transition()
      .duration(200)
      .attr("cy", d => yScale(d[VALUE]))
      .attr("cx", d => xScale(d.center))
      .attr("r", d => d.radius)
      ),
    exit => exit.call(exit => exit.transition().style("opacity",0).remove())
  );
  // update simulation
  simulation
    .nodes(dataArray)
    .force("x", d3.forceX((d) => xScale(d.center)).strength(0.2)) // Strength can be adjusted
    .force("collide", d3.forceCollide().radius((d) => d.radius + padding / 2).strength(0.4))
    .force("y", d3.forceY((d) => yScale(d[VALUE])).strength(5));

  simulation.alpha(0.8).restart();
  updateLegend(legendFlag);
  if (meansDisplayed) drawMeans();
  if (interactionsDisplayed) drawInteractions();
}

function updateLegend(isCat2OnXAxis) {
  // Clear existing legend
  legend.selectAll(".legend").remove();

  const legendSel = legend.append("g")
      .attr("class", "legend");

  let legendValues = isCat2OnXAxis ? cat2Values : cat1Values;
  let xOffset = 0; // Start at 0 and dynamically increase

  legendValues.forEach((value, index) => {
    let legendItem = legendSel.append("g")
        .attr("transform", `translate(${xOffset}, 0)`);

    if (isCat2OnXAxis) {
      // First half-square for CAT1
      legendItem.append("rect")
          .attr("width", legendSize / 2)
          .attr("height", legendSize / 1.5)
          .style("fill", colFxn({ [CAT2]: value, [CAT1]: cat1Values[0] }));

      // Second half-square for CAT2
      legendItem.append("rect")
          .attr("x", legendSize / 2)
          .attr("width", legendSize / 2)
          .attr("height", legendSize / 1.5)
          .style("fill", colFxn({ [CAT2]: value, [CAT1]: cat1Values[1] }));
    } else {
      // First half-square for CAT1
      legendItem.append("rect")
          .attr("width", legendSize / 2)
          .attr("height", legendSize / 1.5)
          .style("fill", colFxn({ [CAT1]: value, [CAT2]: cat2Values[0] }));

      // Second half-square for CAT2
      legendItem.append("rect")
          .attr("x", legendSize / 2)
          .attr("width", legendSize / 2)
          .attr("height", legendSize / 1.5)
          .style("fill", colFxn({ [CAT1]: value, [CAT2]: cat2Values[1] }));
    }

    legendItem.append("text")
        .attr("x", legendSize + 5)
        .attr("y", legendSize / 2)
        .text(value);

    // Calculate width of this legend item for dynamic spacing
    const itemWidth = legendItem.node().getBBox().width;
    xOffset += itemWidth + 10; // 10 is additional spacing between items
  });
}

function toggleMeans() {
  if (meansDisplayed) {
    meanPoints.selectAll(".mean-circle, .stddev-line, .interaction-line").remove();
    meansDisplayed = false;
  } else {
    drawMeans();
    meansDisplayed = true;
    if (interactionsDisplayed) {
      drawInteractions();
    }
  }
}

function toggleInteractions() {
  interactionsDisplayed = !interactionsDisplayed;
  
  if (interactionsDisplayed && meansDisplayed) {
    drawInteractions();
  } else {
    meanPoints.selectAll(".interaction-line").remove();
  }
}


function drawMeans() {
  meanPoints.selectAll(".mean-circle")
    .data(groupedStats)
    .join(
      enter => enter.append("circle")
        .attr("class", "mean-circle")
        .attr("cx", group => xScale(group[group.length - 1].center))
        .attr("cy", group => yScale(group[group.length - 1].mean))
        .attr("r", 14)
        .style("opacity", 0)
        .call(enter => enter.transition().duration(400).style("opacity",0.85))
      ,
      update => update.call(
        update => update.transition().duration(400)
          .attr("cx", group => xScale(group[group.length - 1].center))
          .attr("cy", group => yScale(group[group.length - 1].mean))
        ),
      exit => exit.call(
        exit => exit.transition().duration(100).style("opacity", 0).remove()
      )
    );
  meanPoints.selectAll(".stddev-line")
    .data(groupedStats)
    .join(
      enter => enter.append("line")
        .attr("class", "stddev-line")
        .attr("x1", group => xScale(group[group.length - 1].center))
        .attr("y1", group => yScale(group[group.length - 1].mean - group[group.length - 1].sdev))
        .attr("x2", group => xScale(group[group.length - 1].center))
        .attr("y2", group => yScale(group[group.length - 1].mean + group[group.length - 1].sdev))
        .style("opacity", 0)
        .call(enter => enter.transition().duration(400).style("opacity",0.85))
      ,
      update => update.call(update => update.transition().duration(200)
        .attr("x1", group => xScale(group[group.length - 1].center))
        .attr("y1", group => yScale(group[group.length - 1].mean - group[group.length - 1].sdev))
        .attr("x2", group => xScale(group[group.length - 1].center))
        .attr("y2", group => yScale(group[group.length - 1].mean + group[group.length - 1].sdev)))
      ,
      exit => exit.call(
        exit => exit.transition().duration(100).style("opacity", 0).remove()
      )
    );
}

function drawInteractions() {
  // Only proceed if both meansDisplayed and interactionsDisplayed are true
  if (!meansDisplayed || !interactionsDisplayed) return;

  // Determine the pairs of indices we need to connect in `groupedStats`
  const interactionPairs = [];
  for (let i = 0; i < groupedStats.length / 2; i++) {
    let rIndex = ~~(groupedStats.length / 2) + i;
    if (groupedStats[i]) {
      interactionPairs.push({
        start: groupedStats[i][groupedStats[i].length - 1],   // Last element, contains center and mean
        end: groupedStats[rIndex][groupedStats[rIndex].length - 1] // Last element of next pair
      });
    }
  }

  // Draw interaction lines for each pair in `interactionPairs`
  meanPoints.selectAll(".interaction-line")
    .data(interactionPairs)
    .join(
      enter => enter.append("line")
        .attr("class", "interaction-line")
        .attr("x1", d => xScale(d.start.center))
        .attr("y1", d => yScale(d.start.mean))
        .attr("x2", d => xScale(d.end.center))
        .attr("y2", d => yScale(d.end.mean))
        .style("opacity", 0)
        .call(enter => enter.transition().duration(400).style("opacity", 0.8)),
      update => update.call(update => update.transition().duration(200)
        .attr("x1", d => xScale(d.start.center))
        .attr("y1", d => yScale(d.start.mean))
        .attr("x2", d => xScale(d.end.center))
        .attr("y2", d => yScale(d.end.mean))),
      exit => exit.call(exit => exit.transition().duration(100).style("opacity", 0).remove())
    );
}
