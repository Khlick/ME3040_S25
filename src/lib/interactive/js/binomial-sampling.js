// binomial-sampling.js

// For interactivity
var _fragments;
// Adjustable parameters
const parameters = {
  n: 28, // Number of trials
  ha: 19/28, // Probability of success in each trial
  h0: 0.5, // Null hypothesis for each head
  nSamples: 1 // Number of consecutive simulation to run
};
// Dimensions
const width_0 = 960;
const height_0 = width_0 * (10 / 16);

//---------------------------------------------------- FUNCTIONS -------------->
// Generate null distribution data based on binomial probabilities
function generateData({ n, h0, ha }) {
  let data = [];
  for (let k = 0; k <= n; k++) {
    let probability = jStat.binomial.pdf(k, n, h0);
    data.push({ k, probability });
  }
  return data;
}




// DATA STUFF HERE

// data containers
const nullDist = generateData(parameters);
const samples = [];
const samplingDist = [];


// Build the visualization
const svg = new SVG({
  initialWidth: window.innerWidth*0.85,
  initialHeight: window.innerHeight*0.8,
  margin: { top: 10, right: 10, bottom: 60, left: 70 },
  elementName: "histogram"
});

// Scales
// Scales
const xScale = d3.scaleLinear()
    .domain([0, parameters.n])
    .range([0, svg.width]);

const yScale = d3.scaleLinear()
    .domain([0, d3.max(nullDist, d => d.probability)])
    .range([svg.height, 0]);

// g element to hold the sampling distribution
const g_null = svg.g.append("g")
  .attr("class", "null-stem");
const g_samples = svg.g.append("g").attr("class", "sample-stem");
const g_sampling = svg.g.append("g").attr("class", "sampling-theoretical");

// Axes
const xAxis = svg.g.append("g")
  .attr("class", "axis axis--x")
  .attr("transform", `translate(0,${svg.height})`)
  .call(d3.axisBottom(xScale));
const yAxis = svg.g.append("g")
  .attr("class", "axis axis--y")
  .attr("transform", "translate(0,0)")
  .call(d3.axisLeft(yScale).ticks(5));

  // Axes Labels
const axLabels = svg.g.append("g")
  .attr("class", "axes-labels");
axLabels
  .append("text")
  .attr("class", "label x-label-text")
  .text("Count of Interest")
  .attr('dx', svg.width / 2)
  .attr('dy', svg.height + svg.margin.bottom);
axLabels
  .append("text")
  .attr("class", "label y-label")
  .attr("transform", "rotate(-90)")
  .attr("dy", "1em")
  .attr("x", -svg.height / 2 - svg.margin.top)
  .attr("y", -svg.margin.left)
  .text("Probability");



// update visualization
function updateVisualization() {
  // UPDATE NULL DISTRIBUTION
  g_null.selectAll(".null-stem").data(nullDist)
    .join(
      enter => enter
        .append("rect")
        .attr("class", "stem null-stem")
        .attr("x", d => xScale(d.k)-1.3)
        .attr("y", yScale(0))
        .attr("width", 3)
        .attr("height", 0)
        .attr("shape-rendering", "crispEdges")
        .call(
          e => e.transition(transitionBounce())
            .attr("y", d => yScale(d.probability))
            .attr("height", d => svg.height - yScale(d.probability))
        ),
      update => update.call(
        u => u.transition(transitionBounce())
          .attr("x", d => xScale(d.k)-1.3)
          .attr("y", d => yScale(d.probability))
          .attr("height", d => svg.height - yScale(d.probability))
      ),
      exit => exit.call(
        x => x.transition(transitionBounce())
          .attr("y", yScale(0))
          .attr("height", 0)
          .remove()
      )
  );
  g_null.selectAll(".null-marker").data(nullDist)
    .join(
      enter => enter
        .append("circle")
        .attr("class", "marker null-marker")
        .attr("cx", d => xScale(d.k))
        .attr("cy", yScale(0))
        .call(
          e => e.transition(transitionBounce())
            .attr("cy", d => yScale(d.probability))
        ),
      update => update.call(
        u => u.transition(transitionBounce())
          .attr("cx", d => xScale(d.k))
          .attr("cy", d => yScale(d.probability))
      ),
      exit => exit.call(
        x => x.transition(transitionBounce())
          .attr("cy", yScale(0))
          .remove()
      )
    );
  // UPDATE CURRENT SAMPLE
}

// create a new N samples
function takeSample(N=1) {

}



// Main function to run the visualization
function main() {
  // svg.updateSvgDimensions();
  updateVisualization();
}

// Go
main();

// UPDATE DOM Add Callbacks
function updateInfoPanel() {
  // Update simulations count
  document.getElementById("simulations-count").textContent = samples.length;
  // Update current outcome count (assuming last sample is the most recent outcome)
  let lastOutcome = samples.length > 0 ? samples[samples.length - 1] : 0;
  document.getElementById("current-outcome-count").textContent = lastOutcome;
  // Update current outcome probability (update the MathJax content and reprocess)
  let probability = jStat.binomial.pdf(lastOutcome, parameters.n, parameters.h0).toFixed(3);
  let formula = `\\(P(X = ${lastOutcome}) = \\binom{${parameters.n}}{${lastOutcome}} \\cdot (${parameters.h0})^{${lastOutcome}} \\cdot (1-${parameters.h0})^{${parameters.n}-${lastOutcome}} = ${probability}\\)`;
  document.getElementById("current-outcome-prob").innerHTML = formula;
  
  // Use MathJax.typesetPromise() to re-typeset the updated formula
  MathJax.typesetPromise().then(() => {
    // Optional: Perform actions after typesetting is complete
  }).catch((err) => console.error('Typesetting failed: ', err));
}


document.getElementById("toggle-info").addEventListener("click", function() {
  let infoContent = document.getElementById("info-content");
  let newHeight = window.innerHeight * 0.95;
  if (infoContent.style.display === "none") {
    infoContent.style.display = "block";
    newHeight = 500;
  } else {
    infoContent.style.display = "none";
  }
  svg.updateSvgDimensions();
});

document.getElementById("submit-button").addEventListener("click", function() {
  // Apply changes from inputs
  parameters.n = parseInt(document.getElementById("experiment-size").value, 10);
  parameters.ha = parseFloat(document.getElementById("expected-ha").value);
  parameters.h0 = parseFloat(document.getElementById("expected-h0").value);
  parameters.nSamples = parseInt(document.getElementById("samples-per-simulation").value, 10);
  
  // You might want to re-generate data or update visualizations here
  updateVisualization();
  updateInfoPanel();
});

document.getElementById("reset-button").addEventListener("click", function() {
  // Reset to default or initial values
  document.getElementById("experiment-size").value = 28;
  document.getElementById("expected-ha").value = 0.68;
  document.getElementById("expected-h0").value = 0.5;
  document.getElementById("samples-per-simulation").value = 1;
  
  // Resetting the parameters object might be necessary, then update
  updateVisualization();
  updateInfoPanel();
});

// Checkbox event listener for showing/hiding the theoretical distribution
document.getElementById("toggle-theoretical").addEventListener("change", function() {
  // Implementation depends on how you're managing the theoretical distribution visualization
});

document.getElementById("run-simulation-button").addEventListener("click", function() {
  // Assuming takeSample is accessible and correctly implemented
  takeSample(parameters.nSamples);
  updateInfoPanel(); // Update the info panel to reflect the new simulation results
});

// Helpers
// Define the transition for the bounce effect
function transitionBounce() {
  return d3.transition().duration(500).ease(d3.easeBounce);
}