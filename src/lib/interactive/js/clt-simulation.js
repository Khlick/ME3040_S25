// Global speed variable for controlling animation speed
let globalSpeed = 1; // Default speed
let circleRadius = 10;

let currentController = null;

// Add these animation control variables at the top with other globals
const ANIMATION_SETTINGS = {
  maxTotalPoints: 200,    // Maximum total points to show in animation
  sampleDuration: 320,    // Duration for samples to appear and move
  histogramDuration: 250  // Duration for histogram bars to grow
};

// Use the CANVAS class for the sampling animation
const canvas = new CANVAS({
  initialWidth: 900,
  initialHeight: 250,
  elementName: "samplingCanvas"
});

// Use the SVG class for the histogram visualization
const svg = new SVG({
  initialWidth: 900,
  initialHeight: 350,
  elementName: "histogram"
});

// Population "blob" rectangle dimensions
const blobX = 0;
const blobY = 0;
const blobWidth = canvas.width;
const blobHeight = 50;
let selectedDistribution = 'Uniform';
let previousDistribution = 'Uniform';

// Add after other global variables
let showTheoretical = false;
let theoreticalLine;

// Add after other global variables at the top of the file
let x = d3.scaleLinear().domain([0, 1]).range([0, svg.width]);
let y = d3.scaleLinear().range([svg.height, 0]);
const minNumBins = 41; // Minimum number of bins for the histogram

// Add to global variables
let selectedTheoretical = 'gaussian';

// Function to adjust animation speeds relative to globalSpeed
function getSpeedMultiplier() {
  return globalSpeed;
}

// Histogram setup with X and Y labels
// let numBins = 41; // Fixed number of bins for the histogram
// x = d3.scaleLinear().domain([0, 1]).range([0, svg.width]);
// y = d3.scaleLinear().range([svg.height, 0]);

const xAxis = svg.g.append("g")
  .attr("transform", `translate(0,${svg.height})`)
  .call(d3.axisBottom(x));

const yAxis = svg.g.append("g").call(d3.axisLeft(y).ticks());

// Initial setup for the X and Y labels and axes
svg.g.append("text")
  .attr("class", "x-axis-label")
  .attr("transform", `translate(${svg.width / 2},${svg.height + svg.margin.bottom - 10})`)
  .style("text-anchor", "middle")
  .text(getStatisticLabel('mean')); // Default to mean

svg.g.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - svg.margin.left + 1)
  .attr("x", 0 - (svg.height / 2))
  .attr("dy", "1em")
  .style("text-anchor", "middle")
  .text("Frequency");

let bins = [];
let histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(10));

let statType = 'mean';

// Input controls
const sampleSizeInput = document.getElementById("N");
sampleSizeInput.addEventListener("change", () => resetVisualization());
const statSelect = document.getElementById("statistic");
statSelect.addEventListener("change", () => {
  statType = statSelect.value;
  
  // Update x-axis label
  svg.g.select(".x-axis-label") // Add this class to the x-axis label
    .transition()
    .duration(300)
    .text(getStatisticLabel(statType));
    
  resetVisualization();
});

const sampleBtn = document.getElementById("sampleBtn");
sampleBtn.addEventListener("click", () => {
  runSimulation(1);
});

const manyBtn = document.getElementById("manyBtn");
manyBtn.addEventListener("click", () => {
  runSimulation(1000);
});

// Event listener for the distribution dropdown
const distributionSelect = document.getElementById("distribution");
distributionSelect.addEventListener("change", () => {
  previousDistribution = selectedDistribution; // Store the current distribution as the previous one
  selectedDistribution = distributionSelect.value; // Update the selected distribution

  resetVisualization(); // Clear the previous visualizations
  transitionPopulationBlob(); // Transition between the distributions
});

// Define a new color scale with a narrower range for the blues
const colorScale = d3.scaleSequential()
  .domain([0, 1]) // The domain of the x0 values
  .interpolator(t => d3.interpolateBlues(0.3 + t * 0.7)); // between 0.3 and 1

function getBlobShape(distribution) {
  const pdfValues = d3.range(0, 1, 0.001).map(x => {
    switch (distribution) {
      case 'Normal':
        return pdfNormal(x);
      case 'LeftSkewed':
        return pdfLeftSkewed(x);
      case 'RightSkewed':
        return pdfRightSkewed(x);
      case 'Uniform':
      default:
        return 1; // Flat for uniform
    }
  });

  // Normalize the values to ensure they are within a reasonable range
  const maxValue = d3.max(pdfValues);
  return pdfValues.map(d => d / maxValue); // Normalize to [0, 1]
}

// Transition the population blob to the selected distribution
function transitionPopulationBlob() {
  if (previousDistribution === selectedDistribution) {
    drawPopulationBlob();
    return
  }
  return new Promise((resolve) => {
    const duration = 300; // Duration of the transition (in ms)
    const startTime = Date.now(); // Start time for the animation

    // Get the blob shapes for both the previous and selected distributions
    const previousBlobShape = getBlobShape(previousDistribution);
    const newBlobShape = getBlobShape(selectedDistribution);

    // Function to interpolate between two shapes
    function interpolateBlobShape(startShape, endShape, t) {
      return startShape.map((startY, i) => startY + t * (endShape[i] - startY));
    }

    // Animation loop using requestAnimationFrame
    function animateBlob() {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1); // Ensure progress is capped at 1

      // Interpolate between the previous shape and the new shape
      const interpolatedShape = interpolateBlobShape(previousBlobShape, newBlobShape, progress);

      // Redraw the canvas with the interpolated shape
      drawBlobShape(interpolatedShape);

      // Continue the animation if progress is less than 1
      if (progress < 1) {
        requestAnimationFrame(animateBlob);
      } else {
        resolve();
      }
    }

    // Start the animation
    requestAnimationFrame(animateBlob);
  });
}

// Function to draw the blob shape on the canvas
function drawBlobShape(blobShape) {
  const ctx = canvas.ctx;
  const width = canvas.width;

  // Clear the canvas
  ctx.clearRect(0, 0, width, canvas.height);

  // Draw the rectangular top part of the blob
  ctx.fillStyle = "lightblue";
  ctx.fillRect(0, 0, width, blobHeight);

  // Draw the bottom part of the blob based on the shape
  ctx.beginPath();
  ctx.moveTo(0, blobHeight); // Start at the bottom-left corner

  const stepSize = width / (blobShape.length - 1); // Calculate step size

  // Draw the line for the bottom of the blob
  for (let i = 0; i < blobShape.length; i++) {
    const x = i * stepSize;
    const yValue = blobShape[i];
    const scaledHeight = blobHeight + yValue * 50; // Adjust the height scaling

    ctx.lineTo(x, scaledHeight);
  }

  ctx.lineTo(width, blobHeight); // End at the bottom-right corner of the rectangle
  ctx.closePath();
  ctx.fillStyle = "lightblue";
  ctx.fill();
}

// Define the PDFs for the different distributions
function pdfNormal(x) {
  const mean = 0.5;
  const std = 0.15;
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-Math.pow(x - mean, 2) / (2 * std * std));
}

function pdfRightSkewed(x) {
  const alpha = 2;
  const beta = 5;
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

function pdfLeftSkewed(x) {
  const alpha = 5;
  const beta = 2;
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

// Random variate generators for different distributions
function generateRandomUniform() {
  return Math.random(); // Uniform between [0,1]
}

function generateRandomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  
  // Fixed std regardless of sample size
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 0.15 + 0.5;
}

function generateRandomRightSkewed() {
  // Use a Beta distribution to generate left-skewed data (alpha < beta)
  const alpha = 2;
  const beta = 5;
  return jStat.beta.sample(alpha, beta); // Using a library like jStat for Beta distribution
}

function generateRandomLeftSkewed() {
  // Use a Beta distribution to generate right-skewed data (alpha > beta)
  const alpha = 5;
  const beta = 2;
  return jStat.beta.sample(alpha, beta); // Using a library like jStat for Beta distribution
}

// Draw the population blob based on the currently selected distribution
function drawPopulationBlob() {
  
  const ctx = canvas.ctx;
  const width = canvas.width;
  const height = canvas.height;

  // Clear the canvas
  ctx.clearRect(0, 0, width, height);

  // Draw the rectangular top part of the blob
  ctx.fillStyle = "lightblue";
  ctx.fillRect(0, 0, width, blobHeight);

  // Get the blob shape based on the current distribution
  const blobShape = getBlobShape(selectedDistribution);

  drawBlobShape(blobShape);
}

// Function to generate a random variate based on the selected distribution
function generateRandomVariate() {
  switch (selectedDistribution) {
    case 'Normal':
      return generateRandomNormal();
    case 'LeftSkewed':
      return generateRandomLeftSkewed();
    case 'RightSkewed':
      return generateRandomRightSkewed();
    case 'Uniform':
    default:
      return generateRandomUniform();
  }
}

// Function to generate samples (array of random variates)
function generateSamples(sampleSize) {
  const samples = [];
  for (let i = 0; i < sampleSize; i++) {
    samples.push(generateRandomVariate()); // Generate a random variate for each sample
  }
  return samples;
}

// Simplified runSimulation function
function runSimulation(b = 1) {
  if (currentController) {
    currentController.abort();
  }
  currentController = new AbortController();

  const sampleSize = parseInt(sampleSizeInput.value);
  // Calculate visible simulations to keep under maxTotalPoints
  const maxVisibleSimulations = Math.floor(ANIMATION_SETTINGS.maxTotalPoints / sampleSize);
  const visibleSimulations = Math.min(b, maxVisibleSimulations);
  
  // Generate all samples and calculate statistics upfront
  const allStats = [];
  for (let i = 0; i < b; i++) {
    const samples = generateSamples(sampleSize);
    allStats.push({
      samples,
      statistic: calculateStatistic(samples)
    });
  }

  // Split into visible and hidden statistics
  const visibleStats = allStats.slice(0, visibleSimulations);
  const hiddenStats = allStats.slice(visibleSimulations);

  // Create initial positions for visible samples
  const samplePoints = visibleStats.map(stat => 
    stat.samples.map(value => ({
      value,
      x: (x(value) / svg.width) * canvas.width,
      y: -20,
      targetY: canvas.height / 2,
      color: colorScale(value)
    }))
  );

  // Animate visible samples
  return animateSamples(samplePoints, visibleStats, currentController.signal)
    .then(() => {
      // Update histogram with all statistics at once
      const allStatistics = [...visibleStats, ...hiddenStats].map(s => s.statistic);
      updateHistogramBatch(allStatistics);
    })
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('Animation cancelled');
      } else {
        console.error('Simulation error:', error);
      }
    });
}

// Add helper function to constrain visualization values, but only if outside bounds
function constrainToCanvas(value, min = 0, max = 1) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Modify animateSamples to properly handle out-of-bounds points
function animateSamples(samplePoints, stats, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Animation aborted', 'AbortError'));
      return;
    }

    const startTime = performance.now();
    const meanPositions = stats.map(stat => ({
      x: (x(constrainToCanvas(stat.statistic)) / svg.width) * canvas.width,
      y: canvas.height + 20
    }));
    
    function animate(currentTime) {
      if (signal.aborted) {
        reject(new DOMException('Animation aborted', 'AbortError'));
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_SETTINGS.sampleDuration, 1);

      const ctx = canvas.ctx;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPopulationBlob();

      // Ease function for smooth animation
      const ease = d3.easeCubicInOut;
      const easedProgress = ease(progress);

      samplePoints.forEach((points, groupIndex) => {
        const meanX = meanPositions[groupIndex].x;
        const meanY = meanPositions[groupIndex].y;

        points.forEach(point => {
          // Only constrain points that are outside the canvas bounds
          const constrainedX = constrainToCanvas(point.value);
          const xPos = (x(constrainedX) / svg.width) * canvas.width;
          
          const currentX = progress < 0.5 
            ? xPos
            : xPos + (meanX - xPos) * ((progress - 0.5) * 2);
          
          const currentY = progress < 0.5
            ? -20 + (point.targetY + 20) * (progress * 2)
            : point.targetY + (meanY - point.targetY) * ((progress - 0.5) * 2);

          // Draw point
          ctx.beginPath();
          ctx.arc(currentX, currentY, circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = point.color;
          ctx.fill();
        });
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

// Add function to calculate theoretical distributions
function calculateTheoretical(x, mean, std, type) {
  if (type === 'gaussian') {
    // Calculate theoretical height based on histogram bin counts
    const zScore = (x - mean) / std;
    const height = (1 / (std * Math.sqrt(2 * Math.PI))) * 
                  Math.exp(-0.5 * zScore * zScore);
    
    // Scale to match histogram counts
    const totalSamples = bins.length;
    const binWidth = 1 / calculateNumBins(bins.length);
    return height * totalSamples * binWidth;
  } else { // student-t
    const df = 5;
    const t = (x - mean) / std;
    
    // Scale t distribution similarly
    const height = jStat.studentt.pdf(t, df) / std;
    const totalSamples = bins.length;
    const binWidth = 1 / calculateNumBins(bins.length);
    return height * totalSamples * binWidth;
  }
}

// Add function to calculate optimal number of bins
function calculateNumBins(sampleCount) {
  if (sampleCount < 2) return minNumBins;
  
  // Sort the data for quantile calculations
  const sortedData = [...bins].sort((a, b) => a - b);
  
  // Calculate IQR
  const q1 = d3.quantile(sortedData, 0.25);
  const q3 = d3.quantile(sortedData, 0.75);
  const iqr = q3 - q1;
  
  // Freedman-Diaconis rule for bin width: 2 * IQR * n^(-1/3)
  const binWidth = 2 * iqr * Math.pow(sampleCount, -1/3);
  
  // Calculate number of bins for the full [0,1] range
  const suggestedBins = Math.ceil(1 / binWidth);
  
  // Return max of minimum bins and suggested bins
  return Math.max(minNumBins, suggestedBins);
}

// Modify updateHistogramBatch to constrain only out-of-bounds values
function updateHistogramBatch(statistics) {
  // Constrain only out-of-bounds statistics for histogram display
  const constrainedStats = statistics.map(stat => constrainToCanvas(stat));
  
  // Add constrained statistics to bins
  constrainedStats.forEach(stat => bins.push(stat));

  // Calculate number of bins based on sample size
  const numBins = calculateNumBins(bins.length);
  
  // Update color scale for new number of bins
  const binColorScale = d3.scaleSequential()
    .domain([0, 1])
    .interpolator(t => d3.interpolateBlues(0.3 + t * 0.7));
  
  // Create uniform thresholds from 0 to 1
  const thresholds = Array.from({length: numBins + 1}, (_, i) => i / numBins);
  
  // Calculate new histogram data with dynamic bins
  const histogram = d3.histogram()
    .domain([0, 1])  // Explicitly set domain to [0,1]
    .thresholds(thresholds);
    
  const binData = histogram(bins);

  // Update y scale
  const maxBinCount = d3.max(binData, d => d.length);
  y.domain([0, maxBinCount]);

  // Animate histogram bars with updated colors
  const bars = svg.g.selectAll(".bar")
    .data(binData);

  bars.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.x0))
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("y", svg.height)
      .attr("height", 0)
      .attr("fill", d => binColorScale((d.x0 + d.x1) / 2)) // Use midpoint for color
      .call(enter => enter.transition()
        .duration(ANIMATION_SETTINGS.histogramDuration)
        .attr("y", d => y(d.length))
        .attr("height", d => svg.height - y(d.length))),
    update => update.call(update => update.transition()
      .duration(ANIMATION_SETTINGS.histogramDuration)
      .attr("x", d => x(d.x0))
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("y", d => y(d.length))
      .attr("height", d => svg.height - y(d.length))
      .attr("fill", d => binColorScale((d.x0 + d.x1) / 2))),
    exit => exit.remove()
  );

  // Update axes
  yAxis.transition()
    .duration(ANIMATION_SETTINGS.histogramDuration)
    .call(d3.axisLeft(y));

  // Update theoretical curve
  updateTheoreticalCurve();
}

// Update calculateTheoreticalCurve to fit the histogram data
function calculateTheoreticalCurve() {
  const points = 200;
  const data = [];
  
  if (bins.length >= 2) {
    // Calculate mean and std from the actual sampling distribution
    const binValues = bins.filter(x => !isNaN(x) && x !== null);
    
    if (binValues.length < 2) return [];
    
    // Calculate mean and std from the sampling distribution
    const mean = d3.mean(binValues);
    const std = Math.sqrt(d3.variance(binValues));
    
    if (isNaN(mean) || isNaN(std)) return [];
    
    // Use the actual std from the sampling distribution
    // Only set minimum to prevent division by zero
    const effectiveStd = std < 0.00001 ? 0.00001 : std;
    
    // Generate points using selected theoretical distribution
    for (let i = 0; i < points; i++) {
      const xVal = i / (points - 1);
      const yVal = calculateTheoretical(xVal, mean, effectiveStd, selectedTheoretical);
      
      if (!isNaN(yVal) && isFinite(yVal)) {
        data.push({x: xVal, y: yVal});
      }
    }
    
    if (data.length > 0) {
      return data;
    }
  }
  
  return [];
}

function updateTheoreticalCurve() {
  const theoreticalCheckbox = document.getElementById("theoretical");
  const theoreticalSelect = document.getElementById("theoreticalDist");
  
  if (bins.length < 2) {
    theoreticalCheckbox.disabled = true;
    theoreticalSelect.disabled = true;
    theoreticalCheckbox.checked = false;
    showTheoretical = false;
    if (theoreticalLine) {
      theoreticalLine.attr("opacity", 0);
    }
    return;
  }
  
  const curveData = calculateTheoreticalCurve();
  
  theoreticalCheckbox.disabled = curveData.length === 0;
  theoreticalSelect.disabled = curveData.length === 0;
  
  if (curveData.length === 0) {
    theoreticalCheckbox.checked = false;
    showTheoretical = false;
    if (theoreticalLine) {
      theoreticalLine.attr("opacity", 0);
    }
    return;
  } else {
    theoreticalCheckbox.disabled = false;
    theoreticalSelect.disabled = false;
  }

  if (!theoreticalLine) {
    theoreticalLine = svg.g.append("path")
      .attr("class", "theoretical-line")
      .attr("opacity", 0);
  }

  theoreticalLine
    .raise()
    .transition()
    .duration(ANIMATION_SETTINGS.histogramDuration)
    .attr("d", d3.line()
      .x(d => x(d.x))
      .y(d => y(d.y))
      .curve(d3.curveBasis)(curveData))
    .attr("opacity", showTheoretical ? 0.8 : 0);
}

function toggleTheoretical(bool=null) {
  if (bins.length < 2) {
    return;
  }
  if (bool === null) {
    showTheoretical = !showTheoretical;
  } else {
    showTheoretical = bool;
  }
  
  // Update the checkbox input element
  const theoreticalCheckbox = document.getElementById("theoretical");
  theoreticalCheckbox.checked = showTheoretical;
  
  if (showTheoretical) {
    selectedTheoretical = document.getElementById("theoreticalDist").value;
    updateTheoreticalCurve();
  }
}

// Add event listener for theoretical distribution change
document.getElementById("theoreticalDist").addEventListener("change", function(e) {
  selectedTheoretical = e.target.value;
  if (showTheoretical) {
    updateTheoreticalCurve();
  }
});

// Helper function to calculate the statistic based on statType
function calculateStatistic(samples) {
  const values = samples.map(sample => typeof sample === 'object' ? sample.value : sample);

  let statistic;
  switch (statType) {
    case 'mean':
      statistic = d3.mean(values);
      break;
    case 'median':
      statistic = d3.median(values);
      break;
    case 'q1q3':
      const q1 = d3.quantile(values, 0.25);
      const q3 = d3.quantile(values, 0.75);
      statistic = (q1 + q3) / 2;
      break;
    case 'range':
      const min = d3.min(values);
      const max = d3.max(values);
      statistic = (min + max) / 2;
      break;
    default:
      statistic = d3.mean(values);
  }
  return statistic; // Return unconstrained statistic
}

// Reset visualization
function resetVisualization() {
  // Clear the bins and reset samples
  bins = [];

  // Reset histogram bars to 0 height
  const bars = svg.g.selectAll(".bar").data([]);

  bars.join(
    enter => {
      enter.append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0))
        .attr("width", d => x(d.x1) - x(d.x0))
        .attr("y", svg.height)
        .attr("height", 0)
        .call(enter => {
          enter.transition()
            .duration(ANIMATION_SETTINGS.histogramDuration)
            .attr("y", svg.height)
            .attr("height", 0);
        });
    },
    update => {},
    exit => {
      exit.call(exit => {
        exit.transition()
          .duration(ANIMATION_SETTINGS.histogramDuration)
          .attr("y", svg.height)
          .attr("height", 0);
      }).remove();
    }
  );

  // Reset theoretical curve and checkbox
  const theoreticalCheckbox = document.getElementById("theoretical");
  theoreticalCheckbox.checked = false;
  theoreticalCheckbox.disabled = true;
  showTheoretical = false;
  
  if (theoreticalLine) {
    theoreticalLine.attr("opacity", 0);
  }
}

// Helper function to change the sample size input and trigger its change listener
function changeSampleSize(newValue) {
  // Change the value of the input element
  sampleSizeInput.value = newValue;

  // Manually call the change listener logic
  resetVisualization();
}

// Helper function to change the statistic dropdown and trigger its change listener
function changeStatistic(newValue) {
  const statSelect = document.getElementById("statistic");

  // Validate the newValue against the dropdown options
  const validOptions = Array.from(statSelect.options).map(option => option.value);

  if (validOptions.includes(newValue)) {
    // Change the selected value of the dropdown
    statSelect.value = newValue;

    // Update statType and reset visualization (same as the change listener)
    statType = newValue;
    resetVisualization();
  } else {
    console.error(`Invalid statistic value: ${newValue}. Must be one of: ${validOptions.join(', ')}`);
  }
}

// Helper function to change the distribution dropdown and trigger its change listener
function changeDistribution(newValue) {
  return new Promise((resolve, reject) => {
    const distributionSelect = document.getElementById("distribution");

    // Validate the newValue against the dropdown options
    const validOptions = Array.from(distributionSelect.options).map(option => option.value);

    if (validOptions.includes(newValue)) {
      // Set the previous distribution before updating the current selection
      previousDistribution = selectedDistribution; // Store the current value as the previous distribution

      // Change the selected value of the dropdown
      distributionSelect.value = newValue;

      // Update the selected distribution
      selectedDistribution = newValue;

      // Reset the visualization
      resetVisualization();

      // Transition the blob and resolve the promise once the transition is complete
      transitionPopulationBlob(previousDistribution, selectedDistribution)
        .then(() => {
          console.log(`Distribution changed to ${newValue}`);
          resolve(); // Resolve the promise after the transition completes
        })
        .catch((error) => {
          console.error(`Error during transition: ${error}`);
          reject(error); // Reject the promise if there's an issue during transition
        });

    } else {
      console.error(`Invalid distribution value: ${newValue}. Must be one of: ${validOptions.join(', ')}`);
      reject(`Invalid distribution value: ${newValue}`); // Reject the promise in case of invalid value
    }
  });
}

// Add a function to get the appropriate axis label
function getStatisticLabel(stat) {
  switch (stat) {
    case 'mean':
      return 'Sample Mean';
    case 'median':
      return 'Sample Median';
    case 'q1q3':
      return 'Sample IQR Midpoint ((Q1+Q3)/2)';
    case 'range':
      return 'Sample Range Midpoint ((min+max)/2)';
    default:
      return 'Sample Mean';
  }
}

// INITIALIZE
drawPopulationBlob(); // Initial population blob