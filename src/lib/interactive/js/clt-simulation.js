// Global speed variable for controlling animation speed
let globalSpeed = 1; // Default speed
let circleRadius = 10;

let animations = []; // To track ongoing animations

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

// Function to adjust animation speeds relative to globalSpeed
function getSpeedMultiplier() {
  return globalSpeed;
}

// Histogram setup with X and Y labels
let numBins = 41; // Fixed number of bins for the histogram
x = d3.scaleLinear().domain([0, 1]).range([0, svg.width]);
y = d3.scaleLinear().range([svg.height, 0]);

const xAxis = svg.g.append("g")
  .attr("transform", `translate(0,${svg.height})`)
  .call(d3.axisBottom(x));

const yAxis = svg.g.append("g").call(d3.axisLeft(y).ticks());

// Initial setup for the X and Y labels and axes
svg.g.append("text")
  .attr("transform", `translate(${svg.width / 2},${svg.height + svg.margin.bottom - 10})`)
  .style("text-anchor", "middle")
  .text("Sample Mean");

svg.g.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - svg.margin.left + 10)
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
  const variance = 0.05;
  return (1 / Math.sqrt(2 * Math.PI * variance)) * Math.exp(-Math.pow(x - mean, 2) / (2 * variance));
}

function pdfLeftSkewed(x) {
  const alpha = 2;
  const beta = 5;
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

function pdfRightSkewed(x) {
  const alpha = 5;
  const beta = 2;
  return Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
}

// Random variate generators for different distributions
function generateRandomUniform() {
  return Math.random(); // Uniform between [0,1]
}

function generateRandomNormal() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // Avoid zero
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * 0.1 + 0.5; // Normal around 0.5 with small variance
}

function generateRandomLeftSkewed() {
  // Use a Beta distribution to generate left-skewed data (alpha < beta)
  const alpha = 2;
  const beta = 5;
  return jStat.beta.sample(alpha, beta); // Using a library like jStat for Beta distribution
}

function generateRandomRightSkewed() {
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


// Animate the samples
function animateSamples(sampleCircles) {
  return new Promise((resolve) => {
    let progress = 0;
    const animationSpeed = 0.05 * getSpeedMultiplier();

    function drawAndUpdate() {
      const ctx = canvas.ctx;
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
      drawPopulationBlob(); // Redraw the population blob

      progress += animationSpeed;

      // Update positions and draw circles
      sampleCircles.forEach(circle => {
        circle.y = progress * (canvas.height / 2 - 10); // Fall to the midline
        drawSampleCircle(circle);
      });

      if (progress < 1) {
        requestAnimationFrame(drawAndUpdate);
      } else {
        resolve(); // Resolve when all circles have reached the midline
      }
    }

    requestAnimationFrame(drawAndUpdate); // Start the animation
  });
}


// Draw a sample circle
function drawSampleCircle(circle) {
  const ctx = canvas.ctx;
  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circleRadius, 0, 2 * Math.PI);
  ctx.fillStyle = circle.color;
  ctx.fill();
}

// Helper function to calculate the statistic based on statType
function calculateStatistic(samples) {
  // Ensure that we're only working with numeric values
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
      statistic = d3.mean(values); // Default to mean if no statType is selected
  }
  return statistic;
}

// Coalesce samples over the selected statistic
function coalesceSamples(sampleCircles, allSamples) {
  return new Promise((resolve) => {
    const ctx = canvas.ctx;
    const animationSpeed = 0.08 * getSpeedMultiplier();
    let progress = 0;

    // Calculate the target x positions for each sample group
    const targetXMap = new Map();
    allSamples.forEach((sampleArray, index) => {
      const statistic = calculateStatistic(sampleArray);
      const targetX = statistic * canvas.width; // The target x-coordinate for this sample's statistic
      targetXMap.set(index, targetX); // Map the index to the target x position
    });

    // Assign the target x positions to the circles based on their id (sample group)
    sampleCircles.forEach((circle, idx) => {
      const sampleIndex = Math.floor(idx / allSamples[0].length); // Determine which sample the circle belongs to
      circle.targetX = targetXMap.get(sampleIndex); // Assign the target x position based on the sample's statistic
    });

    function moveToStatistic() {
      progress += animationSpeed;

      // Only clear the area where the circles are being drawn, not the whole canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPopulationBlob(); // Keep the population blob visible

      // Move each circle to its calculated target x-coordinate
      sampleCircles.forEach(circle => {
        circle.x = circle.x + (circle.targetX - circle.x) * progress;
        drawSampleCircle(circle);
      });

      // Continue the animation until progress reaches 1 (animation complete)
      if (progress < 1) {
        requestAnimationFrame(moveToStatistic);
      } else {
        dropSamples(sampleCircles).then(resolve); // Resolve when the dropping is complete
      }
    }

    requestAnimationFrame(moveToStatistic);
  });
}

// Drop the samples and make them disappear (no fade, just drop out of view)
function dropSamples(sampleCircles) {
  return new Promise((resolve) => {
    let progress = 0;
    const animationSpeed = 0.15 * getSpeedMultiplier();
    const ctx = canvas.ctx;

    function drop() {
      progress += animationSpeed;

      // Clear only the area where the circles are being drawn, not the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPopulationBlob(); // Keep the population blob visible

      // Move each circle down without fading them out
      sampleCircles.forEach(circle => {
        // Move the circle down based on progress
        circle.y = (canvas.height / 2 - 10) + progress * (canvas.height / 2); // Drop the circles
        drawSampleCircle(circle); // Redraw each circle with updated position
      });

      // Continue the animation until all circles have dropped out of view
      if (progress < 1) {
        requestAnimationFrame(drop);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPopulationBlob(); // Keep the population blob visible
        resolve(); // Resolve the promise when the dropping is complete
      }
    }

    requestAnimationFrame(drop);
  });
}

// Update the histogram with the new statistic
function updateHistogram(statistic) {
  bins.push(statistic);

  // Fixed number of bins (21)
  const binData = d3.histogram()
    .domain(x.domain())
    .thresholds(numBins)(bins);

  // Set y-axis domain based on maximum bin count
  const maxBinCount = d3.max(binData, d => d.length);
  y.domain([0, maxBinCount]);

  // Set custom ticks for the y-axis based on the maximum bin count
  const tickCount = 5; // You can adjust this number based on the desired appearance
  const tickValues = d3.ticks(0, maxBinCount, tickCount); // Generate nicely spaced ticks

  // Format large tick values
  const formatTicks = d3.format(".2s"); // Use SI units (e.g., 1k for 1000)

  const bars = svg.g.selectAll(".bar")
    .data(binData);

  // Use the `.join()` method to handle enter, update, and exit selections
  bars.join(
    enter => enter.append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.x0))
    .attr("width", d => x(d.x1) - x(d.x0))
    .attr("y", svg.height) // Start at the bottom of the chart
    .attr("height", 0) // Start with height 0
    .call(enter => enter.transition().duration(400) // Transition for entering bars
      .attr("y", d => y(d.length)) // Move to the correct y position based on data
      .attr("height", d => svg.height - y(d.length)) // Set height based on data
      .attr("fill", d => colorScale(d.x0)) // Use the adjusted color scale
    ),
    update => update.call(update => update.transition().duration(400) // Transition for updated bars
      .attr("x", d => x(d.x0))
      .attr("width", d => x(d.x1) - x(d.x0))
      .attr("y", d => y(d.length)) // Move to new y position
      .attr("height", d => svg.height - y(d.length)) // Update height based on data
      .attr("fill", d => colorScale(d.x0)) // Update color based on data
    ),
    exit => exit.call(exit => exit.transition().duration(400) // Transition for exiting bars
      .attr("y", svg.height) // Move to the bottom
      .attr("height", 0) // Set height to 0
      .remove() // Remove the element after transition
    )
  );

  // Update the Y-axis with nicely spaced ticks and formatted large numbers
  yAxis.transition().duration(200)
    .call(d3.axisLeft(y)
      .ticks(tickCount) // Set the number of ticks
      .tickValues(tickValues) // Use custom tick values
      .tickFormat(formatTicks)); // Format large tick values (e.g., 1k for 1000)

  // Update X-axis
  xAxis.transition().duration(200)
    .call(d3.axisBottom(x));
}


function runSimulation(b = 1) {
  const sampleSize = parseInt(sampleSizeInput.value); // Get the sample size from the dropdown
  const allSamples = []; // Array to hold all sample arrays (each sample array is a batch of N values)

  // Generate samples for all b simulations (each simulation generates a batch of sampleSize)
  for (let i = 0; i < b; i++) {
    const sampleValues = generateSamples(sampleSize); // Generate an array of N samples
    allSamples.push(sampleValues); // Store each sample array in the allSamples array
  }

  // Split the samples into visual (first 30) and batch processing (remaining)
  const visibleSamples = allSamples.slice(0, 30); // First 30 simulations to be animated
  const hiddenSamples = allSamples.slice(30); // Remaining simulations to be processed without animation

  // Animate the first 30 simulations
  if (visibleSamples.length > 0) {
    const allSampleCircles = visibleSamples.flat().map((value, idx) => ({
      id: `circle-${idx}`, // Assign a unique ID to each circle
      value: value, // Store the sample value
      x: value * canvas.width, // Initial x based on the value
      y: 0, // Start at the top
      color: colorScale(value) // Color based on value
    }));

    return animateSamples(allSampleCircles) // Animate the generated circles
      .then(() => coalesceSamples(allSampleCircles, visibleSamples)) // Coalesce the circles to their statistic
      .then(() => {
        // Recalculate statistics for all visible samples and update the histogram
        visibleSamples.forEach((sampleArray) => {
          const statistic = calculateStatistic(sampleArray); // Calculate statistic for each sample array
          updateHistogram(statistic); // Update the histogram with the batch's statistic
        });

        // Now process the remaining hidden samples in chunks
        processRemainingSamples(hiddenSamples, 50); // Process in chunks of 50
      })
      .catch((error) => {
        console.error('Error during simulation:', error);
      });
  } else {
    // If there are no visible samples, process all samples without animation
    processRemainingSamples(hiddenSamples, 50);
  }
}


// Function to process the remaining samples in small chunks and update the histogram
function processRemainingSamples(hiddenSamples, chunkSize = 50) {
  console.log(`Processing ${hiddenSamples.length} samples without animation in chunks`);

  let index = 0; // Keep track of the current index of samples being processed

  function processChunk() {
    const endIndex = Math.min(index + chunkSize, hiddenSamples.length); // Define the chunk size
    for (let i = index; i < endIndex; i++) {
      const sampleArray = hiddenSamples[i];
      const statistic = calculateStatistic(sampleArray); // Calculate statistic for each sample array
      updateHistogram(statistic); // Update the histogram with the batch's statistic
    }

    index = endIndex; // Move the index forward

    if (index < hiddenSamples.length) {
      // If there are more samples to process, schedule the next chunk
      setTimeout(processChunk, 0); // Use setTimeout to yield control back to the browser
    } else {
      console.log('All remaining samples processed and histogram updated');
    }
  }

  // Start processing the first chunk
  processChunk();
}

// Reset visualization
function resetVisualization() {
  // Clear the bins and reset samples
  bins = [];

  // Reset histogram bars to 0 height
  const bars = svg.g.selectAll(".bar").data([]);

  // bars.enter().append("rect")
  // .attr("class", "bar")
  // .attr("x", d => x(d.x0))
  // .attr("width", d => x(d.x1) - x(d.x0))
  // .attr("y", svg.height)
  // .attr("height", 0)
  // .merge(bars)
  // .transition()
  // .duration(500)
  // .attr("y", svg.height)
  // .attr("height", 0);

  // bars.exit().remove();
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
            .duration(500)
            .attr("y", svg.height)
            .attr("height", 0);
        });
    },
    update => {},
    exit => {
      exit.call(exit => {
        exit.transition()
          .duration(500)
          .attr("y", svg.height)
          .attr("height", 0);
      }).remove();
    }
  );
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

// INITIALIZE
drawPopulationBlob(); // Initial population blob