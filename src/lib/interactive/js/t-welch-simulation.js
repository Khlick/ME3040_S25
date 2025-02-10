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
  let sampleA = Array.from({ length: NA }, () => jStat.normal.sample(0, Math.sqrt(varA)));
  // Center at 0 then shift to desired mean
  const currentMeanA = d3.mean(sampleA);
  sampleA = sampleA.map(x => x - currentMeanA + meanA);
  
  // Generate random samples for group B 
  let sampleB = Array.from({ length: NB }, () => jStat.normal.sample(0, Math.sqrt(varB)));
  // Center at 0 then shift to desired mean
  const currentMeanB = d3.mean(sampleB);
  sampleB = sampleB.map(x => x - currentMeanB + meanB);

  // Create separate color scales for A and B
  const colorScaleA = chroma.scale(['#800000', '#ff9999'])  // dark red to light red
    .mode('lab')
    .domain([d3.min(sampleA), d3.max(sampleA)])
    .gamma(0.5);  // Adjust gamma to control the midpoint
  
  const colorScaleB = chroma.scale(['#000080', '#9999ff'])  // dark blue to light blue
    .mode('lab')
    .domain([d3.min(sampleB), d3.max(sampleB)])
    .gamma(0.5);  // Adjust gamma to control the midpoint

  // Add group A data points
  for (let i = 0; i < NA; i++) {
    data.push({
      type: 'A',
      group: 1,
      id: `A${i}`,
      color: colorScaleA(sampleA[i]).hex(),
      value: sampleA[i],
      demeaned: false
    });
  }

  // Add group B data points
  for (let i = 0; i < NB; i++) {
    data.push({
      type: 'B',
      group: 2,
      id: `B${i}`,
      color: colorScaleB(sampleB[i]).hex(),
      value: sampleB[i],
      demeaned: false
    });
  }

  return data;
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
  .range([0, -dots.width / 6, dots.width / 6, -dots.width / 3, dots.width / 3, -dots.width / 6, dots.width / 6, -dots.width / 8, dots.width / 8, 0])
  .domain(d3.range(10))

const simulation = d3.forceSimulation(data)
  .force("xGroup", d3.forceX().x(d => forceXScaleGroup(d.group)))
  .force("yGroup", d3.forceY().y(d => {
    if (d.group <= 2) return -dots.height/4;  // Original groups at top
    if (d.group <= 4) return -dots.height/6;  // Initial resampled position
    if (d.group <= 6) return 0;               // Midline position
    if (d.group <= 8) return dots.height/4;   // Mean points position
    return dots.height/3;                     // Final coalescence position
  }))
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

// Calculate percentile confidence interval
function calculatePercentileCI(data, alpha = 0.05) {
  const sortedData = [...data].sort((a, b) => a - b);
  const n = sortedData.length;
  const lowerIndex = Math.floor((alpha / 2) * n);
  const upperIndex = Math.floor((1 - alpha / 2) * n);
  return {
    lower: sortedData[lowerIndex],
    upper: sortedData[upperIndex]
  };
}

// Update the histogram and overlay
function updateHistInfo() {
  const showEffects = document.getElementById('showEffects').checked;
  
  let limits;
  if (showEffects && histData.length > 0) {
    // Use percentile CI for effects distribution
    const ci = calculatePercentileCI(histData);
    limits = [ci.lower, ci.upper];
  } else {
    // Use observed difference for null distribution
    const meanA = parseFloat(document.getElementById('barA').value);  
    const meanB = parseFloat(document.getElementById('barB').value);
    const difAB = meanB - meanA;
    limits = [-difAB, difAB];
  }

  // Update or create the vertical lines
  hist.g.selectAll(".limit")
    .data(limits)
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

  // Update or create the text labels
  hist.g.selectAll(".textChartDif")
    .data(limits)
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
  
  // Get the observed difference
  const meanA = parseFloat(document.getElementById('barA').value);
  const meanB = parseFloat(document.getElementById('barB').value);
  const observedDiff = meanB - meanA;
  
  // Ensure extent includes both the observed difference and its negative
  extent = [
    Math.min(extent[0], -Math.abs(observedDiff), -2),
    Math.max(extent[1], Math.abs(observedDiff), 2)
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

// Add a function to update group positions based on centered state
function updateGroupPositions(centered) {
  const basePosition = centered ? dots.width / 12 : dots.width / 6;  // Changed from /7 to /12 for closer positioning
  forceXScaleGroup.range([
    0,                    // center
    -basePosition,        // group A
    basePosition,         // group B
    -dots.width / 3,      // resampled A
    dots.width / 3,       // resampled B
    -dots.width / 6,      // midline A
    dots.width / 6,       // midline B
    -dots.width / 8,      // mean A
    dots.width / 8,       // mean B
    0                     // collision
  ]);
  updateSimulation(data);
}

function recenterGroups() {
  // Only recenter if not already recentered
  if (data[0].demeaned) return;

  // Ensure simulation has settled before starting animation
  simulation.alpha(1).restart();
  
  return new Promise(resolve => {
    // Wait for simulation to settle
    setTimeout(() => {
      // Store original positions and calculate new target positions
      const originalPositions = data.map(d => ({ x: d.x, y: d.y }));
      const originalBasePosition = dots.width / 6;
      const newBasePosition = dots.width / 12;

      // Recenter group A
      const groupA = data.filter(d => d.type === 'A');
      const meanA = d3.mean(groupA, d => d.value);
      
      // Recenter group B
      const groupB = data.filter(d => d.type === 'B');
      const meanB = d3.mean(groupB, d => d.value);

      // Demean all values
      data.forEach(d => {
        const mean = d.type === 'A' ? meanA : meanB;
        d.originalValue = d.value;
        d.value = d.value - mean;
        d.demeaned = true;
      });

      // Create new color scale for demeaned values
      const allValues = data.map(d => d.value);
      const extent = d3.extent(allValues);
      const negativeScale = chroma.scale(['#ffb6c1', '#800080'])
        .mode('lab')
        .domain([extent[0], 0]);
      
      const positiveScale = chroma.scale(['#006400', '#90ee90'])
        .mode('lab')
        .domain([0, extent[1]]);

      // Update colors
      data.forEach(d => {
        d.color = (d.value < 0 ? negativeScale(d.value) : positiveScale(d.value)).hex();
      });

      // Calculate target positions for each group
      const targetA = -newBasePosition;
      const targetB = newBasePosition;

      // Create animation
      let startTime = Date.now();
      const duration = 400;
      const maxExplosionRadius = dots.width / 8;  // Maximum explosion radius

      function animate() {
        const progress = Math.min(1, (Date.now() - startTime) / duration);
        const eased = d3.easeCubicIn(progress);
        const explosionEased = d3.easeCubicOut(Math.min(1, progress * 2));  // Faster explosion
        const contractionEased = d3.easeCubicIn(Math.max(0, (progress - 0.5) * 2));  // Delayed contraction

        // Calculate the current explosion radius
        const explosionRadius = maxExplosionRadius * explosionEased * (1 - contractionEased);

        data.forEach((d, i) => {
          const isGroupA = d.type === 'A';
          const targetX = isGroupA ? targetA : targetB;
          const originalX = originalPositions[i].x;
          
          // Calculate angle based on original position and target
          const angleOffset = isGroupA ? Math.PI : 0;
          const angle = (i % (data.length / 2)) / (data.length / 2) * Math.PI + angleOffset;
          
          // Combine explosion with inward movement
          const explosionX = Math.cos(angle) * explosionRadius;
          const explosionY = Math.sin(angle) * explosionRadius;
          
          // Interpolate between original position, explosion, and target
          d.x = originalX + explosionX + (targetX - originalX) * eased;
          d.y = originalPositions[i].y + explosionY;
        });

        // Update forceXScaleGroup range
        const currentBasePosition = d3.interpolate(originalBasePosition, newBasePosition)(eased);
        forceXScaleGroup.range([
          0,                    // center
          -currentBasePosition, // group A
          currentBasePosition,  // group B
          -dots.width / 3,     // resampled A
          dots.width / 3,      // resampled B
          -dots.width / 6,     // midline A
          dots.width / 6,      // midline B
          -dots.width / 8,     // mean A
          dots.width / 8,      // mean B
          0                    // collision
        ]);

        ticked();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          updateSimulation(data);
          resolve();
        }
      }

      requestAnimationFrame(animate);
    }, 100); // Wait 100ms for simulation to settle
  });
}

function bootstrap(n) {
  // Store all sample means for later addition to histogram
  let allSampleMeans = [];
  const showEffects = document.getElementById('showEffects').checked;
  
  // Create a promise chain for the animations
  return new Promise(async (resolve) => {
    // If not showing effects and data isn't recentered, recenter it first
    if (!showEffects && !data[0].demeaned) {
      await recenterGroups();
    }
    
    // Calculate all sample means upfront
    for (let i = 0; i < n; i++) {
      const dataA = data.filter(d => d.type === 'A');
      const dataB = data.filter(d => d.type === 'B');
      const NA = parseInt(document.getElementById('NA').value, 10);
      const NB = parseInt(document.getElementById('NB').value, 10);
      const sampleA = getRandom(dataA, NA, true);
      const sampleB = getRandom(dataB, NB, true);
      
      // Use original or demeaned values based on current state
      const meanA = d3.mean(sampleA, d => data[0].demeaned ? d.value : d.originalValue || d.value);
      const meanB = d3.mean(sampleB, d => data[0].demeaned ? d.value : d.originalValue || d.value);
      allSampleMeans.push(meanB - meanA);
    }

    // Determine how many samples to animate
    const samplesToAnimate = Math.min(10, n);

    // Function to perform one bootstrap sample
    async function performOneSample(isLast) {
      // Get current data points
      const dataA = data.filter(d => d.type === 'A');
      const dataB = data.filter(d => d.type === 'B');

      // Random sample with replacement
      const NA = parseInt(document.getElementById('NA').value, 10);
      const NB = parseInt(document.getElementById('NB').value, 10);
      const sampleA = getRandom(dataA, NA, true);
      const sampleB = getRandom(dataB, NB, true);

      // Calculate means
      const meanA = d3.mean(sampleA, d => data[0].demeaned ? d.value : d.originalValue || d.value);
      const meanB = d3.mean(sampleB, d => data[0].demeaned ? d.value : d.originalValue || d.value);
      
      // Only create new color scales if recentered
      let negativeScale, positiveScale;
      if (data[0].demeaned) {
        const extent = [Math.min(meanA, meanB), Math.max(meanA, meanB)];
        negativeScale = chroma.scale(['#ffb6c1', '#800080'])
          .mode('lab')
          .domain([extent[0], 0]);
        
        positiveScale = chroma.scale(['#006400', '#90ee90'])
          .mode('lab')
          .domain([0, extent[1]]);
      }

      // Add sampled points to data with new groups
      sampleA.forEach(d => {
        d.group = 3;
        if (!data[0].demeaned) {
          d.value = d.originalValue || d.value;
        }
      });
      sampleB.forEach(d => {
        d.group = 4;
        if (!data[0].demeaned) {
          d.value = d.originalValue || d.value;
        }
      });

      // Add new points to data array and update simulation
      data = [...data.filter(d => d.group <= 2), ...sampleA, ...sampleB];
      updateSimulation(data);

      if (!isLast) {
        // For non-last samples, just wait for a quick spread then remove
        await new Promise(resolve => setTimeout(resolve, 150));
        data = data.filter(d => d.group <= 2);
        updateSimulation(data);
        return;
      }

      // For the last sample, perform the full animation
      await new Promise(resolve => {
        setTimeout(() => {
          // Store the current positions of all sample points
          const sampleAPositions = sampleA.map(d => ({ x: d.x, y: d.y }));
          const sampleBPositions = sampleB.map(d => ({ x: d.x, y: d.y }));

          function animateToMeans(progress) {
            const eased = d3.easeCubicInOut(progress);
            
            // Calculate mean positions for each group
            const meanAX = d3.mean(sampleAPositions, d => d.x);
            const meanAY = d3.mean(sampleAPositions, d => d.y);
            const meanBX = d3.mean(sampleBPositions, d => d.x);
            const meanBY = d3.mean(sampleBPositions, d => d.y);
            
            // Move sample points toward their means
            sampleA.forEach((d, i) => {
              d.x = d3.interpolate(sampleAPositions[i].x, meanAX)(eased);
              d.y = d3.interpolate(sampleAPositions[i].y, meanAY)(eased);
            });
            
            sampleB.forEach((d, i) => {
              d.x = d3.interpolate(sampleBPositions[i].x, meanBX)(eased);
              d.y = d3.interpolate(sampleBPositions[i].y, meanBY)(eased);
            });
            
            ticked();
          }

          let startTime = Date.now();
          let duration = 250;

          function animateCoalescing() {
            let progress = Math.min(1, (Date.now() - startTime) / duration);
            
            animateToMeans(progress);
            
            if (progress < 1) {
              requestAnimationFrame(animateCoalescing);
            } else {
              const meanPointA = {
                type: 'A',
                group: 7,
                value: meanA,
                color: data[0].demeaned ? 
                  (meanA < 0 ? negativeScale(meanA) : positiveScale(meanA)).hex() :
                  sampleA[0].color,
                x: d3.mean(sampleA, d => d.x),
                y: d3.mean(sampleA, d => d.y)
              };
              
              const meanPointB = {
                type: 'B',
                group: 8,
                value: meanB,
                color: data[0].demeaned ? 
                  (meanB < 0 ? negativeScale(meanB) : positiveScale(meanB)).hex() :
                  sampleB[0].color,
                x: d3.mean(sampleB, d => d.x),
                y: d3.mean(sampleB, d => d.y)
              };

              data = [...data.filter(d => d.group <= 2), meanPointA, meanPointB];
              ticked();

              startTime = Date.now();
              duration = 350;

              function animateCollision() {
                let progress = Math.min(1, (Date.now() - startTime) / duration);
                const eased = d3.easeCubicIn(progress);
                
                meanPointA.x = d3.interpolate(meanPointA.x, 0)(eased);
                meanPointB.x = d3.interpolate(meanPointB.x, 0)(eased);
                meanPointA.y = d3.interpolate(meanPointA.y, dots.height/3)(eased);
                meanPointB.y = d3.interpolate(meanPointB.y, dots.height/3)(eased);
                
                if (progress > 0.8) {
                  dots.ctx.globalAlpha = 1 - ((progress - 0.8) / 0.2);
                }
                
                ticked();
                
                if (progress < 1) {
                  requestAnimationFrame(animateCollision);
                } else {
                  dots.ctx.globalAlpha = 1;
                  data = data.filter(d => d.group <= 2);
                  ticked();
                  resolve();
                }
              }

              requestAnimationFrame(animateCollision);
            }
          }

          requestAnimationFrame(animateCoalescing);
        }, 500);
      });
    }

    // Perform animated samples
    for (let i = 0; i < samplesToAnimate; i++) {
      await performOneSample(i === samplesToAnimate - 1);
    }

    // After all samples are done, update histogram with all means
    histData.push(...allSampleMeans);
    document.getElementById("bootcount").innerHTML = histData.length;
    
    // Calculate p-value based on whether we're in effects mode or not
    const meanA = parseFloat(document.getElementById('barA').value);
    const meanB = parseFloat(document.getElementById('barB').value);
    const observedDiff = meanB - meanA;
    
    let pValue;
    if (showEffects) {
      // For effects mode: proportion of values as extreme or more extreme than 0
      if (observedDiff > 0) {
        pValue = d3.sum(histData.map(d => d <= 0)) / histData.length;
      } else {
        pValue = d3.sum(histData.map(d => d >= 0)) / histData.length;
      }
    } else {
      // For null distribution: proportion of values as extreme or more extreme than observed difference
      pValue = d3.sum(histData.map(d => Math.abs(d) >= Math.abs(observedDiff))) / histData.length;
    }
    
    document.getElementById("pvalue").innerHTML = pValue.toFixed(3);
    
    updateHistogram();
    updateHistInfo();
    
    // Restart simulation for remaining points
    simulation.nodes(data);
    simulation.alpha(1).restart();
    
    resolve();
  });
}


// RUN
// Initialize the tooltip
initTooltip();
updateHistInfo();
updateHistogram();


// SETUP Event Listeners
async function resetAll() {
  histData = [];
  data = generateData();
  updateGroupPositions(false);
  const showEffects = document.getElementById('showEffects').checked;
  if (!showEffects) {
    await recenterGroups();
  }
  // Reset counts
  document.getElementById("bootcount").innerHTML = "0";
  document.getElementById("pvalue").innerHTML = "-";
  updateHistInfo();
  updateHistogram();
}

function toggleEffects(override = null) {
  const checkbox = document.getElementById('showEffects');
  
  // If override provided and already matches checkbox state, exit early
  if (override !== null && checkbox.checked === override) {
    return;
  }

  // Set checkbox based on override if provided, otherwise toggle
  checkbox.checked = override !== null ? override : !checkbox.checked;
  resetAll();
}


// Attach event listeners to input elements
document.getElementById('NA').addEventListener('change', resetAll);
document.getElementById('barA').addEventListener('change', resetAll);
document.getElementById('sigmaA2').addEventListener('change', resetAll);
document.getElementById('sigmaB2').addEventListener('change', resetAll);
document.getElementById('barB').addEventListener('change', resetAll);
document.getElementById('NB').addEventListener('change', resetAll);

function set_A(N, meanVal, varVal, doReset = false) {
  document.getElementById('NA').value = N;
  document.getElementById('barA').value = meanVal;
  document.getElementById('sigmaA2').value = varVal;
  if (doReset) {
    resetAll();
  }
}

function set_B(N, meanVal, varVal, doReset = false) {
  document.getElementById('NB').value = N;
  document.getElementById('barB').value = meanVal;
  document.getElementById('sigmaB2').value = varVal;
  if (doReset) {
    resetAll();
  }
}


// Add event listener for effects checkbox
document.getElementById('showEffects').addEventListener('change', function() {
  resetAll();
});
