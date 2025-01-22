// import {
//   SVG,
//   CANVAS
// } from './dynamicContainers.js';

/**
 * Constants
 */
const radius = 10; // radius for simulation
const w_0 = 960;
const h_0_d = 250;
const h_0_h = 200;

// histogram
const nBins = 25;

// initialize variables
let data;
let histData = [];

/**
 * Generate random data for groups A and B based on input values.
 *
 * @returns {Array} An array of objects containing sampled data points.
 */
function generateData() {
  // Read values from input fields
  const NA = parseInt(document.getElementById('NA').value, 10);
  const meanA = parseFloat(document.getElementById('barA').value);
  const varA = parseFloat(document.getElementById('sigmaA2').value);

  const NB = parseInt(document.getElementById('NB').value, 10);
  const meanB = parseFloat(document.getElementById('barB').value);
  const varB = parseFloat(document.getElementById('sigmaB2').value);

  // Initialize data array
  const data = [];

  // Generate random samples for group A
  let sampleA = Array.from({ length: NA }, () => jStat.normal.sample(meanA, Math.sqrt(varA)));
  sampleA = sampleA.map(v => v - d3.mean(sampleA) + meanA);
  
  const colA = getColorScale(sampleA, "Reds", [0.2, 0.2], 3);
  for (let i = 0; i < NA; i++) {
    data.push({
      type: 'A',
      group: 1,
      id: `A${i}`,
      color: colA(sampleA[i]).hex(),
      value: sampleA[i]
    });
  }

  // Generate random samples for group B
  let sampleB = Array.from({ length: NB }, () => jStat.normal.sample(meanB, Math.sqrt(varB)));
  sampleB = sampleB.map(v => v - d3.mean(sampleB) + meanB);
  const colB = getColorScale(sampleB, "Blues",[0.2,0.2],0.5);
  for (let i = 0; i < NB; i++) {
    data.push({
      type: 'B',
      group: 2,
      id: `B${i}`,
      color: colB(sampleB[i]).hex(),
      value: sampleB[i]
    });
  }

  return data;
}


/**
 * 
 * @param {Array} d data array
 * @param {string} grp name of data field to get color range for.
 * @returns color scale from chroma
 */
function getColorScale(d, scl, pd, gm) {
  return chroma
    .scale(scl)
    .padding(pd)
    .gamma(gm)
    .domain(d3.extent(d));
}

/**
 * INITIALIZE DATA
 */

data = generateData();


/**
 * SETUP FIGURES
 */
// CANVAS
const dots = new CANVAS({
  initialWidth: w_0,
  initialHeight: h_0_d,
  elementName: "simulation"
});
const forceXScaleGroup = d3.scaleOrdinal()
  .range([0, -dots.width / 4, dots.width / 4, -dots.width / 2.5, dots.width / 2.5])
  .domain(d3.range(5))

const simulation = d3.forceSimulation(data)
  .force("xGroup", d3.forceX().x(d => forceXScaleGroup(d.group)))
  .force("yGroup", d3.forceY().y(d => d.group > 2 ? 0 : -dots.height/4))
  .force("charge", d3.forceManyBody().strength(-1.5 * radius))
  .on("tick", ticked);

function ticked() {
  dots.ctx.clearRect(0, 0, dots.width, dots.height);
  dots.ctx.save();
  dots.ctx.translate(dots.width / 2, dots.height / 2);
  data.forEach(drawNode);
  dots.ctx.restore();
}

function drawNode(d) {
  dots.ctx.beginPath();
  dots.ctx.moveTo(d.x + 3, d.y);
  dots.ctx.arc(d.x, d.y, radius, 0, 2 * Math.PI);
  dots.ctx.fillStyle = d.color;
  dots.ctx.fill();
}

function updateSimulation(nodes) {
  simulation.nodes(nodes);
  simulation.alpha(1).restart();
}

function gatherGroups() {
  data.forEach(d => {
    if (d.group > 2) { return }
    d.group = 0
  });
  updateSimulation(data)
}
function splitGroups() {
  data.forEach(d => {
    if (d.group > 2) { return }
    d.group = d["type"] === "A" ? 1 : 2
  });
  updateSimulation(data);
}


// listen for resize and restart simulation
window.addEventListener("resize", () => {
  dots.updateCanvasDimensions();
  updateSimulation(data);
});

let tooltip = null; // Tooltip element

// Initialize tooltip
function initTooltip() {
  tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
}

// Function to show tooltip
function showTooltip(d, x, y) {
  tooltip.transition()
    .duration(200)
    .style("opacity", .9);
  tooltip.html(`ID: ${d.id}<br/>Value: ${d.value}<br/>Type: ${d.type}`)
    .style("left", (x + 10) + "px")  // Offset by 10 pixels for better visibility
    .style("top", (y - 10) + "px");  // Offset by -10 pixels to appear slightly above the cursor
}

// Function to hide tooltip
function hideTooltip() {
  tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

// Function to check if mouse is over a data point
function handleMouseMove(e) {
  const rect = dots.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - dots.width / 2;
  const y = e.clientY - rect.top - dots.height / 3;
  
  for (let d of data) {
    const dx = x - d.x;
    const dy = y - d.y;
    if (dx * dx + dy * dy < radius * radius) {
      showTooltip(d, e.clientX, e.clientY);
      return;
    }
  }
  hideTooltip();
}


// Listen for mouse move events on the canvas
dots.canvas.addEventListener('mousemove', handleMouseMove);

// HISTOGRAM
const hist = new SVG({
  initialWidth: w_0,
  initialHeight: h_0_h,
  elementName: "histogram"
});

// scales
const xHistScale = d3.scaleLinear()
    .rangeRound([0, hist.width])
    .domain([-6, 6]);

const yHistScale = d3.scaleLinear()
    .range([hist.height, 0]);

const gHist = hist.g.append("g").attr("class","hist-internal");
// append top-layer information
const xAxis = hist.g.append("g")
  .attr("class", "axis axis--x")
  .attr("transform", `translate(0,${hist.height})`)
  .call(d3.axisBottom(xHistScale));

hist.g.append("text")
  .attr("class", "x-label")
  .text("Mean Difference")
  .attr('class', 'label')
  .attr('dx', hist.width / 2)
  .attr('dy', hist.height + hist.margin.bottom);

// Update the histogram and overlay
function updateHistInfo() {
  // Read values from input fields
  const meanA = parseFloat(document.getElementById('barA').value);  
  const meanB = parseFloat(document.getElementById('barB').value);
  const difAB = meanB - meanA;
  hist.g.selectAll(".limit")
    .data([-difAB, difAB])
    .join(
      enter => enter.append("line")
        .attr("class", "limit")
        .attr('x1', d => xHistScale(0))
        .attr('x2', d => xHistScale(0))
        .attr('y1', 0)
        .attr('y2', hist.height)
        .attr('stroke', 'black')
        .attr('stroke-dasharray', (d, i) => i < 1 ? "0, 0" : "10, 2")
        .attr('stroke-width', 2)
        .call(enter => enter.transition()
          .duration(500)
          .attr('x1', d => xHistScale(d))
          .attr('x2', d => xHistScale(d))
        )
      ,
      update => update.call(update => update.transition()
        .duration(500)
        .attr('x1', d => xHistScale(d))
        .attr('x2', d => xHistScale(d))
      ),
      exit => exit.remove()
  );
  hist.g.selectAll(".textChartDif")
    .data([-difAB, difAB])
    .join(
      enter => enter.append("text")
        .text(d => d.toFixed(2))
        .attr('class', 'textChartDif')
        .attr('dx', d => xHistScale(0) + Math.sign(d) * 10)
        .attr('dy', 5)
        .attr("text-anchor", d => d < 0 ? "end" : "beginning")
        .call(enter => enter.transition()
          .duration(500)
          .attr('dx', d => xHistScale(d) + Math.sign(d) * 10)
        )
      ,
      update => update.call(
        update => update.transition()
          .duration(500)
          .text(d => d.toFixed(2))
          .attr('dx', d => xHistScale(d) + Math.sign(d) * 10)
      ),
      exit => exit.remove()
    );
}
function updateHistogram() {
  let extent = histData.length ? d3.extent(histData) : [-10, 10];
  xHistScale.domain(extent);
  xAxis.transition().duration(200).call(d3.axisBottom(xHistScale));
  const h = d3.histogram()
    .domain(xHistScale.domain())
    .thresholds(xHistScale.ticks(nBins));
  const bins = h(histData);
  // update yscale
  yHistScale.domain([0, d3.max(bins, d => d.length)]);
  // update bins
  gHist.selectAll(".bar").data(bins)
    .join(
      enter => enter
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xHistScale(d.x0))
        .attr("width", d => d.length ? xHistScale(d.x1) - xHistScale(d.x0) : 0)
        .attr("y", d => yHistScale(0))
        .attr("height", d => 0)
        .call(enter => enter
          .transition()
          .duration(100)
          .attr("y", d => d.length ? yHistScale(d.length) : yHistScale(0))
          .attr("height", d => d.length ? hist.height - yHistScale(d.length) : 0)
        )
      ,
      update => update.call(
        enter => enter
          .transition()
          .duration(100)
          .attr("x", d => xHistScale(d.x0))
          .attr("width", d => xHistScale(d.x1) - xHistScale(d.x0))
          .attr("y", d => d.length ? yHistScale(d.length) : yHistScale(0))
          .attr("height", d => d.length ? hist.height - yHistScale(d.length) : 0)
      )
      ,
      exit => exit.call(
        exit => exit.transition()
          .duration(100)
          .attr("height", 0)
          .remove()
      )
    );
}


// BOOTSTRAPPING
const getRandom = (arr, n, replace=true) => {
  let result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (!replace) {
    if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
      let x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
  } else {
    while (n--) {
      let x = Math.floor(Math.random() * len);
      result[n] = structuredClone(arr[x]);
    }
  }
  return result;
}
function bootstrap(n) {
  // random sample from data nodes with group <= 2 
  data = data.filter(d => d.group <= 2);
  const NA = parseInt(document.getElementById('NA').value, 10);
  const NB = parseInt(document.getElementById('NB').value, 10);
  const meanA = parseFloat(document.getElementById('barA').value);  
  const meanB = parseFloat(document.getElementById('barB').value);
  const difAB = meanB - meanA;
  let gA, gB;
  for (let i = 0; i < n; i++){
    gA = getRandom(data, NA, replace = true);
    gB = getRandom(data, NB, replace = true);
    histData.push(d3.mean(gB.map(d => d.value)) - d3.mean(gA.map(d => d.value)));
  }
  
  // use the last iteration for the visualization
  gA.forEach(d => {
    d.group = 3;
    data.push(d);
  });
  gB.forEach(d => {
    d.group = 4;
    data.push(d);
  });
  document.getElementById("bootcount").innerHTML = histData.length;
  document.getElementById("pvalue").innerHTML = (d3.sum(histData.map(d => (d >= Math.abs(difAB)) | (d <= -Math.abs(difAB)))) / histData.length).toFixed(3);
  updateHistogram();
  updateHistInfo()
  updateSimulation(data);
}


// RUN
// Initialize the tooltip
initTooltip();
updateHistInfo();
updateHistogram();


// SETUP Event Listeners
function resetAll() {
  splitGroups();
  histData = [];
  data = generateData();
  updateSimulation(data);
  updateHistInfo();
  updateHistogram();
}
// Attach event listeners to input elements
document.getElementById('NA').addEventListener('change', resetAll);
document.getElementById('barA').addEventListener('change', resetAll);
document.getElementById('sigmaA2').addEventListener('change', resetAll);
document.getElementById('sigmaB2').addEventListener('change', resetAll);
document.getElementById('barB').addEventListener('change', resetAll);
document.getElementById('NB').addEventListener('change', resetAll);
