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
const h_0_h = 180;

// histogram
const nBins = 25;

// initialize variables
let data;
let histData = [];
let isGathered = false;
let hoveredNode = null;

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
  if (d.opacity !== undefined) {
    dots.ctx.globalAlpha = d.opacity;
  }
  const r = d.radius || radius;
  dots.ctx.moveTo(d.x + r, d.y);
  dots.ctx.arc(d.x, d.y, r, 0, 2 * Math.PI);
  
  // Change color if this is the hovered node
  if (d === hoveredNode) {
    dots.ctx.fillStyle = '#ff8c00'; // Bright orange for hover
    dots.ctx.lineWidth = 2;
    dots.ctx.strokeStyle = '#fff';
    dots.ctx.stroke();
  } else {
    dots.ctx.fillStyle = d.color;
  }
  
  dots.ctx.fill();
  dots.ctx.globalAlpha = 1;
}

function updateSimulation(nodes) {
  simulation.nodes(nodes);
  simulation.alpha(1).restart();
}

function gatherGroups() {
  if (isGathered) return;
  data.forEach(d => {
    if (d.group > 2) { return }
    d.group = 0
  });
  isGathered = true;
  updateSimulation(data);
}

function splitGroups() {
  if (!isGathered) return;
  data.forEach(d => {
    if (d.group > 2) { return }
    d.group = d["type"] === "A" ? 1 : 2
  });
  isGathered = false;
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
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none");
}

// Function to handle mouse move events on the canvas
function handleMouseMove(e) {
  const rect = dots.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Convert to simulation coordinates
  const x = mouseX - dots.width / 2;
  const y = mouseY - dots.height / 2;
  
  // Find if we're hovering over a node
  let foundNode = null;
  for (let d of data) {
    const dx = x - d.x;
    const dy = y - d.y;
    const r = d.radius || radius;
    if (dx * dx + dy * dy < r * r) {
      foundNode = d;
      break;
    }
  }
  
  // Update hover state and tooltip
  if (foundNode !== hoveredNode) {
    hoveredNode = foundNode;
    if (foundNode) {
      tooltip.transition()
        .duration(50)
        .style("opacity", 0.9);
      tooltip.html(`Type: ${foundNode.type}<br/>Value: ${foundNode.value.toFixed(2)}`)
        .style("left", (e.clientX + 10) + "px")
        .style("top", (e.clientY - 10) + "px");
    } else {
      tooltip.transition()
        .duration(100)
        .style("opacity", 0);
    }
    ticked(); // Redraw with new hover state
  } else if (foundNode) {
    // Just update tooltip position if still on same node
    tooltip.style("left", (e.clientX + 10) + "px")
           .style("top", (e.clientY - 10) + "px");
  }
}

// Function to handle mouse leaving canvas
function handleMouseLeave() {
  hoveredNode = null;
  tooltip.transition()
    .duration(100)
    .style("opacity", 0);
  ticked(); // Redraw to remove hover effect
}

// Add event listeners
dots.canvas.addEventListener('mousemove', handleMouseMove);
dots.canvas.addEventListener('mouseleave', handleMouseLeave);

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
  // Get the actual difference for setting minimum range
  const meanA = parseFloat(document.getElementById('barA').value);
  const meanB = parseFloat(document.getElementById('barB').value);
  const actualDiff = meanB - meanA;
  
  // Set minimum range to be at least ±2 times the actual difference
  const minRange = Math.max(4, Math.abs(actualDiff) * 2);
  
  // Calculate extent, ensuring it's at least as wide as minRange
  let extent = histData.length ? d3.extent(histData) : [-minRange/2, minRange/2];
  extent = [
    Math.min(extent[0], -minRange/2, -Math.abs(actualDiff)),
    Math.max(extent[1], minRange/2, Math.abs(actualDiff))
  ];
  
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

  // Calculate all bootstrap samples upfront
  const allBootstraps = [];
  for (let i = 0; i < n; i++) {
    const sampA = getRandom(data, NA, true);
    const sampB = getRandom(data, NB, true);
    allBootstraps.push({
      A: sampA,
      B: sampB,
      meanA: d3.mean(sampA.map(d => d.value)),
      meanB: d3.mean(sampB.map(d => d.value))
    });
  }

  // Create a promise to handle the animation sequence
  return new Promise(async (resolve) => {
    // First animation: gather groups only if not already gathered
    if (!isGathered) {
      await new Promise(resolve => {
        gatherGroups();
        setTimeout(resolve, 500); // Wait for gather animation
      });
    }

    // Determine how many animations to show (max 10)
    const animationCount = Math.min(10, n);
    
    // Run quick animations for all but the last sample
    for (let i = 0; i < animationCount - 1; i++) {
      const bootstrap = allBootstraps[i];
      
      // Add sampled points with new groups
      const tempA = bootstrap.A.map(d => ({...d, group: 3}));
      const tempB = bootstrap.B.map(d => ({...d, group: 4}));
      
      data = [...data.filter(d => d.group <= 2), ...tempA, ...tempB];
      updateSimulation(data);

      // Wait for points to spread out briefly
      await new Promise(resolve => setTimeout(resolve, 200));

      // Remove the temporary points
      data = data.filter(d => d.group <= 2);
      updateSimulation(data);
    }

    // For the last animation, do the full sequence
    const lastBootstrap = allBootstraps[animationCount - 1];
    gA = lastBootstrap.A;
    gB = lastBootstrap.B;

    // Add sampled points with new groups
    gA.forEach(d => {
      d.group = 3;
      data.push(d);
    });
    gB.forEach(d => {
      d.group = 4;
      data.push(d);
    });
    updateSimulation(data);

    // Wait for points to spread out
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create mean points
    const meanPointA = {
      type: 'A',
      group: 5,
      value: lastBootstrap.meanA,
      color: gA[0].color,
      radius: radius * 1.5
    };
    const meanPointB = {
      type: 'B',
      group: 6,
      value: lastBootstrap.meanB,
      color: gB[0].color,
      radius: radius * 1.5
    };

    // Animate coalescence to mean points
    await new Promise(resolve => {
      const startPositions = {
        A: gA.map(d => ({ x: d.x, y: d.y })),
        B: gB.map(d => ({ x: d.x, y: d.y }))
      };
      const startTime = Date.now();
      const duration = 500;

      function animateCoalescence() {
        const progress = Math.min(1, (Date.now() - startTime) / duration);
        const eased = d3.easeCubicInOut(progress);

        // Calculate mean positions
        const meanAX = d3.mean(startPositions.A, d => d.x);
        const meanAY = d3.mean(startPositions.A, d => d.y);
        const meanBX = d3.mean(startPositions.B, d => d.x);
        const meanBY = d3.mean(startPositions.B, d => d.y);

        // Update positions
        gA.forEach((d, i) => {
          d.x = d3.interpolate(startPositions.A[i].x, meanAX)(eased);
          d.y = d3.interpolate(startPositions.A[i].y, meanAY)(eased);
          d.radius = d3.interpolate(radius, 0)(eased);
        });
        gB.forEach((d, i) => {
          d.x = d3.interpolate(startPositions.B[i].x, meanBX)(eased);
          d.y = d3.interpolate(startPositions.B[i].y, meanBY)(eased);
          d.radius = d3.interpolate(radius, 0)(eased);
        });

        if (progress === 1) {
          // Replace sample points with mean points
          data = [...data.filter(d => d.group <= 2), meanPointA, meanPointB];
          meanPointA.x = meanAX;
          meanPointA.y = meanAY;
          meanPointB.x = meanBX;
          meanPointB.y = meanBY;
          updateSimulation(data);
          resolve();
        } else {
          ticked();
          requestAnimationFrame(animateCoalescence);
        }
      }
      requestAnimationFrame(animateCoalescence);
    });

    // Animate collision of mean points
    await new Promise(resolve => {
      const startTime = Date.now();
      const duration = 300;
      const startPositions = {
        A: { x: meanPointA.x, y: meanPointA.y },
        B: { x: meanPointB.x, y: meanPointB.y }
      };

      function animateCollision() {
        const progress = Math.min(1, (Date.now() - startTime) / duration);
        const eased = d3.easeCubicIn(progress);

        // Move points toward center
        meanPointA.x = d3.interpolate(startPositions.A.x, 0)(eased);
        meanPointA.y = d3.interpolate(startPositions.A.y, 0)(eased);
        meanPointB.x = d3.interpolate(startPositions.B.x, 0)(eased);
        meanPointB.y = d3.interpolate(startPositions.B.y, 0)(eased);

        // Fade out points near collision
        if (progress > 0.8) {
          meanPointA.opacity = meanPointB.opacity = 1 - ((progress - 0.8) / 0.2);
        }

        if (progress === 1) {
          // Remove mean points and update display
          data = data.filter(d => d.group <= 2);
          updateSimulation(data);
          resolve();
        } else {
          ticked();
          requestAnimationFrame(animateCollision);
        }
      }
      requestAnimationFrame(animateCollision);
    });

    // Add all bootstrap differences to histogram
    histData.push(...allBootstraps.map(b => b.meanB - b.meanA));

    // Update display elements
    document.getElementById("bootcount").innerHTML = histData.length;
    document.getElementById("pvalue").innerHTML = 
      (d3.sum(histData.map(d => (d >= Math.abs(difAB)) | (d <= -Math.abs(difAB)))) / histData.length).toFixed(3);
    updateHistogram();
    updateHistInfo();
    resolve();
  });
}


// RUN
// Initialize the tooltip
initTooltip();
updateHistInfo();
updateHistogram();


// SETUP Event Listeners
// Parameter setter functions
function setNA(value, doReset = false) {
  document.getElementById('NA').value = value;
  if (doReset) resetAll();
}

function setNB(value, doReset = false) {
  document.getElementById('NB').value = value;
  if (doReset) resetAll();
}

function setBarA(value, doReset = false) {
  document.getElementById('barA').value = value;
  if (doReset) resetAll();
}

function setBarB(value, doReset = false) {
  document.getElementById('barB').value = value;
  if (doReset) resetAll();
}

function setSigmaA2(value, doReset = false) {
  document.getElementById('sigmaA2').value = value;
  if (doReset) resetAll();
}

function setSigmaB2(value, doReset = false) {
  document.getElementById('sigmaB2').value = value;
  if (doReset) resetAll();
}

// Make functions available globally
window.setNA = setNA;
window.setNB = setNB;
window.setBarA = setBarA;
window.setBarB = setBarB;
window.setSigmaA2 = setSigmaA2;
window.setSigmaB2 = setSigmaB2;

function resetAll() {
  isGathered = false;
  splitGroups();
  histData = [];
  data = generateData();
  updateSimulation(data);
  updateHistInfo();
  updateHistogram();
  document.getElementById("bootcount").innerHTML = "0";
  document.getElementById("pvalue").innerHTML = "-";
}
// Attach event listeners to input elements
document.getElementById('NA').addEventListener('change', resetAll);
document.getElementById('barA').addEventListener('change', resetAll);
document.getElementById('sigmaA2').addEventListener('change', resetAll);
document.getElementById('sigmaB2').addEventListener('change', resetAll);
document.getElementById('barB').addEventListener('change', resetAll);
document.getElementById('NB').addEventListener('change', resetAll);
