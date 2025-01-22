// CONSTANTS
let prob_locations = [0.75, 0.9, 0.95, 0.98, 0.998, 0.999, 0.9995];
let min_dof = 1;
let max_dof = 30;
let currentTValue = 0;

// SVG dimensions
const margin = { top: 20, right: 20, bottom: 50, left: 50 };
let h_0 = 570;
let w_0 = 960;

// Functions
/**
 * Calculate t-value for given degrees of freedom and significance level
 * @param {number} alpha - Significance level
 * @param {number} df - Degrees of freedom
 * @param {string} tail - "one" or "two", default is "two"
 * @returns {number} - t-value
 */
function tValue(alpha, df, tail = "two") {
  const alphaEffective = tail === "two" ? alpha / 2 : alpha;
  const t = jStat.studentt.inv(1 - alphaEffective, df);
  return t;
}

/**
 * Calculate the probability density function (PDF) of the t-distribution
 * @param {number} x - The value at which to evaluate the PDF
 * @param {number} df - Degrees of freedom
 * @returns {number} - PDF value
 */
function tDistributionPDF(x, df) {
  const numerator = jStat.gammafn((df + 1) / 2);
  const denominator = Math.sqrt(df * Math.PI) * jStat.gammafn(df / 2);
  const pdfValue = (numerator / denominator) * Math.pow(1 + (Math.pow(x, 2) / df), -((df + 1) / 2));
  return pdfValue;
}

/**
 * Generate data points for the t-distribution based on the given degrees of freedom
 * @param {number} dof - Degrees of freedom
 * @param {number} xMax - Maximum x-value
 * @param {number} samples - Number of samples
 * @returns {Array} - Array of data points {x, y}
 */
function generateTData(dof, xMax, samples = 500) {
  const data = [];
  const interval = 2 * xMax / samples;
  for (let x = -xMax; x <= xMax; x += interval) {
    const y = tDistributionPDF(x, dof);
    data.push({ x:x, y:y });
  }
  return data;
}

function generateTAreaData(xMax) {
  const dof = +d3.select("#dof-input").property("value");
  const tailness = d3.select("#tailness").property("value");
  let lims = [];
  if (tailness === "one") {
    if (currentTValue >= 0) {
      lims.push([currentTValue,xMax]);
    } else {
      lims.push([-xMax, currentTValue]);
    }
  } else {
    lims.push([-xMax, -Math.abs(currentTValue)]);
    lims.push([Math.abs(currentTValue), xMax]);
  }
  const data = [];
  lims.forEach(lim => { 
    let interval = (lim[1] - lim[0]) / 125;
    let internalData = [];
    for (let x = lim[0]; x <= lim[1]; x += interval) {
      const y = tDistributionPDF(x, dof);
      internalData.push({ x:x, y:y });
    }
    data.push(internalData);
  });
  return data;
}

// Function to update SVG dimensions
function updateSvgDimensions() {
  const svg = d3.select("#graphic-container");
  const aspectRatio = w_0 / h_0;  // Original width / Original height

  // Get new width and height based on the window size
  const newWidth = window.innerWidth * 0.75;  // 80% of window width
  const newHeight = newWidth / aspectRatio;

  // Update the SVG dimensions
  svg.attr("width", newWidth)
     .attr("height", newHeight);
}

/**
 * Populates the t-table with t-values based on degrees of freedom and confidence levels.
 *
 * @param {number} [dof_max=30] - The maximum degree of freedom to be displayed in the table.
 * @param {number[]} [perc_level=[0.5, 0.75, 0.9, 0.95, 0.98, 0.998, 0.999]] - An array of cdf values to calculate the inverse t-cdf.
 *
 * @example
 * // Populates the t-table with default parameters
 * populateTTable();
 *
 * @example
 * // Populates the t-table with custom parameters
 * populateTTable(100, [0.9, 0.95, 0.99]);
 */
function populateTTable(dof_min = 1, dof_max = 30, perc_level = [0.5, 0.75, 0.9, 0.95, 0.98, 0.998, 0.999, 0.9995]) {
  let tableHTML = '<table><thead><tr><th rowspan="3">df</th><th>Cum. Prob</th>';
  
  // Add t-value headers
  perc_level.forEach(level => {
    tableHTML += `<th id="l-${level.toFixed(4)}">${(level*100).toFixed(2)}%</th>`;
  });

  tableHTML += '</tr><tr><th id="p-one-tail">One-tail</th>';

  // Add one-tail headers
  perc_level.forEach(level => {
    tableHTML += `<th>${(1-level).toFixed(4)}</th>`;
  });

  tableHTML += '</tr><tr><th id="p-two-tail">Two-tail</th>';

  // Add two-tail headers
  perc_level.forEach(level => {
    tableHTML += `<th>${(2 * (1 - level)).toFixed(4)}</th>`;
  });

  tableHTML += '</tr></thead><tbody>';

  // Determine dof increments
  let dof_values = [];
  for (let i = dof_min; i <= dof_max; i++) {
    dof_values.push(i);
  }
  // if (dof_max > 30) {
  //   for (let i = 40; i <= Math.min(dof_max, 100); i += 10) {
  //     dof_values.push(i);
  //   }
  // }

  // Populate table rows
  dof_values.forEach(dof => {
    tableHTML += `<tr><td id="dof-${dof}"class="dof-col" colspan="2">${dof}</td>`;
    perc_level.forEach(level => {
      const t_val = jStat.studentt.inv(level, dof);  // Using jStat for t-value calculation
      tableHTML += `<td id="dof-${dof}-l-${level.toFixed(4)}-t-${t_val.toFixed(4)}">${t_val.toFixed(4)}</td>`;
    });
    tableHTML += '</tr>';
  });

  tableHTML += '</tbody></table>';

  document.getElementById('t-table').innerHTML = tableHTML;
}

/*************************************
 * INTERACTIVE CALLBACKS
 ************************************
*/

function updateTPValue() {
  const dof = +d3.select("#dof-input").property("value");
  const tailness = d3.select("#tailness").property("value");
  // Update current t-value and p-value text elements
  d3.select("#current-t-value").text(currentTValue.toFixed(4));
  // Calculate p-value based on tailness and currentTValue
  let pValue;
  if (tailness === "two") {
    pValue = 2 * jStat.studentt.cdf(-Math.abs(currentTValue), dof);
  } else {
    pValue = currentTValue >= 0 ? 
             1 - jStat.studentt.cdf(currentTValue, dof) : 
             jStat.studentt.cdf(currentTValue, dof);
  }
  // Update p-value text element
  d3.select("#current-p-value").text(pValue.toFixed(4));
}

function highlightTCrit() {
  const dof = +d3.select("#dof-input").property("value");
  // Remove existing highlights
  d3.selectAll(".highlight-green").classed("highlight-green", false);
  d3.selectAll(".highlight-orange").classed("highlight-orange", false);

  // Find closest t-value critical threshold and highlight corresponding row and column
  let closestTValue = null;
  let closestTValueId = null;
  let minDifference = Infinity;

  prob_locations.forEach(level => {
    const t_val = jStat.studentt.inv(level, dof);
    const difference = Math.abs(currentTValue) - t_val;
    if (difference < minDifference && t_val <= Math.abs(currentTValue)) {
      minDifference = difference;
      closestTValue = t_val;
      closestTValueId = `dof-${dof}-l-${level.toFixed(4)}-t-${t_val.toFixed(4)}`;
    }
  });

  // Highlight the closest t-value cell
  let cell = document.getElementById(`${closestTValueId}`);
  d3.select(cell).classed("highlight-green", true);

  // Highlight cells along the row from the left to the closestTValue
  prob_locations.forEach(level => {
    const t_val = jStat.studentt.inv(level, dof);
    if (t_val <= closestTValue) {
      const cellId = `dof-${dof}-l-${level.toFixed(4)}-t-${t_val.toFixed(4)}`;
      let thisCell = document.getElementById(cellId);
      if (thisCell.isEqualNode(cell)) return
      d3.select(thisCell).classed("highlight-orange", true);
    }
  });
}

function onDragStart(event, d) {
  d3.select(this).classed("dragging", true);  
}

function onDrag(event,d) {
  let t = xScale.invert(event.x);
  // truncate to the x-domain
  let xMin = xScale.domain()[0];
  let xMax = xScale.domain()[1];
  const areaData = generateTAreaData(xMax); // accounts for tailness
  // adjust t to prevent errors at extremes
  if (t < xMin) t = xMin;
  if (t > xMax) t = xMax;
  // update currentTValue
  currentTValue = t;
  const dof = +d3.select("#dof-input").property("value");
  const tailness = d3.select("#tailness").property("value");
  let curT = (tailness === "one") ?
    [currentTValue] :
    [-Math.abs(currentTValue), Math.abs(currentTValue)];
  // UPDATE T-BAR
  g.selectAll(".t-bar").data(curT)
    .join(
      enter => enter,
      update => update
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", d => yScale(tDistributionPDF(d,dof)))
        .attr("y2", d => yScale(0))
  );
  // UPDATE AREAS
  // Append the area-fill path to the svg.
  const area = (data, flag) => {
    let yh = flag ? (d) => yScale(d.y) : (d) => yScale(0);
    return d3.area()
      .x(d => xScale(d.x))
      .y0(yScale(0)-1)
      .y1(yh)
      (data)
  };
  g.selectAll(".area-fill").data(areaData)
    .join(
      enter => enter,
      update => update.attr("d", d => area(d, true))
    );
  // Update t and p value text
  updateTPValue();
  // HIGHLIGHT THE TABLE BASED ON NEW t-value
  highlightTCrit(); // single cell
  
}

function onDragEnd(event,d) {
  d3.select(this).classed("dragging", true);
}

const drag = d3.drag()
  .on("start", onDragStart)
  .on("drag", onDrag)
  .on("end", onDragEnd)


/*************************************
 * INITIALIZE SVG
 ************************************
*/

// Create SVG element
const svg = d3.select("#graphic-container")
  .append("svg")
  .attr("width", w_0)
  .attr("height", h_0)
  .attr("viewBox", `0 0 ${w_0} ${h_0}`);

const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

// defs for arrow head
const defs = svg.append("defs");
defs.append("marker")
  .attr("id", "arrow-head")
  .attr("orient", "auto-start-reverse")
  .attr("viewBox","0 0 15 15")
  .attr("markerWidth", "7")
  .attr("markerHeight", "4")
  .attr("refX", "6")
  .attr("refY", "5")
  .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z");

const g = svg.append("g")
  .attr("id", "canvas")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Define Scales
const xScale = d3.scaleLinear()
  .rangeRound([0, width])
  .clamp(true);

const yScale = d3.scaleLinear()
  .range([height, 0]);

// Define Axis
const xAxis = g.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale));
// x label
g.append("text")
  .attr("transform", `translate(${width / 2}, ${height + margin.bottom-5})`)
  .style("text-anchor", "middle")
  .style("font-size", "24pt")
  .text("t");


/**
 * Function to update the plot based on user input
 */
function onChangePlot() {
  // Get the new DOF and tailness
  const dof = +d3.select("#dof-input").property("value");
  const tailness = d3.select("#tailness").property("value");
    

  // Update the x domain based on the new DOF
  let p_max = prob_locations.slice(-1)[0];
  const newMax = jStat.studentt.inv(p_max + 0.0001, dof);
  
  // generate data
  const data = generateTData(dof, newMax, 250);
  const areaData = generateTAreaData(newMax);
  // 

  // UPDATE GRAPHIC
  // Update xScale and axis
  xScale.domain([-newMax, newMax]);
  yScale.domain([0, d3.max(data, d => d.y)]);

  const linegen = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));
  const amp = 1;
  const per = 0.3;
  const dur = 500;
  const animationEase = d3.easeElasticOut.amplitude(amp).period(per);
  
  // draw/update axis
  xAxis.transition()
    .ease(animationEase)
    .duration(dur)
    .call(d3.axisBottom(xScale));
  
  // Append the area-fill path to the svg.
  const area = (data, flag) => {
    let yh = flag ? (d) => yScale(d.y) : (d) => yScale(0);
    return d3.area()
      .x(d => xScale(d.x))
      .y0(yScale(0)-1) // 1px offset for axis line
      .y1(yh)
      (data)
  };
  g.selectAll(".area-fill").data(areaData)
    .join(
      enter => enter.append("path")
        .attr("class", "area-fill")
        .attr("shape-rendering", "optimizeQuality")
        .attr("d", d => area(d,false))
        .call(enter => enter.transition()
          .ease(animationEase)
          .duration(dur)
          .attr("d", d => area(d,true))),
      update => update.call(update => update.transition()
        .ease(animationEase)
        .duration(dur)
        .attr("d", d => area(d, true))),
      exit => exit.call(exit => exit.transition()
        .duration(dur / 2)
        .attr("d", d => area(d, false))
        .remove()
      )
    );
  // draw/update t-pdf
  const tline = g.selectAll("#t-curve")
    .data([data])
    .join(
      enter => enter.append("path")
        .attr("id", "t-curve")
        .attr("shape-rendering", "optimizeQuality")
        .attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(0)))
        .call(enter => enter.transition()
          .ease(animationEase)
          .duration(dur)
          .attr("d", linegen)),
      update => update.call(update => update.transition()
        .ease(animationEase)
        .duration(dur)
        .attr("d", linegen)),
      exit => exit.call(exit => exit.transition().duration(500).attr("d", d3.line().x(d => xScale(d.x)).y(d => yScale(0))).remove())
    );
  // draw/update vertical bars
  let curT = (tailness === "one") ? [currentTValue] : [-Math.abs(currentTValue), Math.abs(currentTValue)];
  const tbars = g.selectAll(".t-bar").data(curT)
    .join(
      enter => enter.append("line")
        .attr("class", "t-bar")
        .attr("marker-start", "url(#arrow-head)")
        .attr("marker-end", "url(#arrow-head)")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", d => yScale(tDistributionPDF(d,dof)))
        .attr("y2", d => yScale(tDistributionPDF(d,dof)))
        .call(
          enter => enter.transition()
            .ease(animationEase)
            .duration(dur)
            .attr("y2", d => yScale(0))
      ),
      update => update.call(
        update => update.transition()
          .ease(animationEase)
          .duration(dur)
          .attr("x1", d => xScale(d))
          .attr("x2", d => xScale(d))
          .attr("y1", d => yScale(tDistributionPDF(d,dof)))
          .attr("y2", d => yScale(0))
      ),
      exit => exit.call(exit => exit.transition()
        .ease(animationEase)
        .duration(dur)
        .attr("y2", d => yScale(tDistributionPDF(d,dof)))
        .remove()
      )
    
  );
  // Update t and p value text
  
  // nullify drag, then add the dragging functionality
  tbars.on(".drag", null);
  tbars.call(drag);
  // Update t and p value text
  updateTPValue();
  // HIGHLIGHT THE TABLE BASED ON NEW t-value
  highlightTCrit();
  // Highlight DOF and Tailness
  // Remove existing highlights
  d3.selectAll(".highlight-yellow").classed("highlight-yellow", false);
  d3.selectAll(".highlight-blue").classed("highlight-blue", false);
   // Highlight the tailness and dof in the t-table
   d3.select(`#p-${tailness}-tail`).classed("highlight-yellow", true);
   d3.select(`#dof-${dof}`).classed("highlight-blue", true);
}

