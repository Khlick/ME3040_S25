// functions:
function normalCDF(z) {
  const invSqrt2Pi = 0.3989422804014337;
  let sum = z;
  let term = z;
  for (let i = 1; i < 20; i++) {
    term *= z * z / (2 * i + 1);
    sum += term;
  }
  return 0.5 + invSqrt2Pi * sum * Math.exp(-0.5 * z * z);
}
function normalDistribution(x) {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

// Function to update SVG dimensions
function updateSvgDimensions() {
  const svg = d3.select("#graphic-container");
  const aspectRatio = 960 / 500;  // Original width / Original height

  // Get new width and height based on the window size
  const newWidth = window.innerWidth * 0.75;  // 80% of window width
  const newHeight = newWidth / aspectRatio;

  // Update the SVG dimensions
  svg.attr("width", newWidth)
     .attr("height", newHeight);
}


// Build z-score table
const z_max = 5.5; //3.5
const tableContainer = document.getElementById('z-table');

// Create table and headers
let tableHTML = '<table><thead><tr><th>Z</th>';
for (let i = 0; i <= 9; i++) {
  tableHTML += `<th>${i / 100}</th>`;
}
tableHTML += '</tr></thead><tbody>';

// Create rows
for (let z = 0; z <= z_max; z += 0.1) {
  tableHTML += '<tr>';
  tableHTML += `<td class="row-label">${z.toFixed(1)}</td>`;
  for (let i = 0; i <= 9; i++) {
    const zValue = z + i / 100;
    const probability = normalCDF(zValue);
    tableHTML += `<td id="z-${probability.toFixed(4)}">${probability.toFixed(4)}</td>`;
  }
  tableHTML += '</tr>';
}

tableHTML += '</tbody></table>';
tableContainer.innerHTML = tableHTML;


// D3.js Graphic
let h_0 = 500;
let w_0 = 960;

const graphicContainer = d3.select("#graphic-container")
  .append("svg")
  .attr("width", w_0)
  .attr("height", h_0)
  .attr("viewBox", `0 0 ${w_0} ${h_0}`);

// Update dimensions initially
updateSvgDimensions();

const margin = {top: 20, right: 20, bottom: 50, left: 50};
const width = +graphicContainer.attr("width") - margin.left - margin.right;
const height = +graphicContainer.attr("height") - margin.top - margin.bottom;

const g = graphicContainer.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);


const x = d3.scaleLinear()
  .domain([-z_max, z_max])
  .range([0, width]);

const y = d3.scaleLinear()
  .domain([0, 0.5])
  .range([height, 0]);

const xAxis = d3.axisBottom(x)
  .tickValues(d3.range(-3, 4, 1))
  .tickFormat(d => `${d}${d?'σ':''}`);

const yAxis = d3.axisLeft(y);

g.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(xAxis);

// g.append("g")
//   .call(yAxis);

const line = d3.line()
  .x(d => x(d.x))
  .y(d => y(d.y));

const data = d3.range(-z_max, z_max, 0.01).map(d => ({x: d, y: normalDistribution(d)}));

g.append("path")
  .datum(data)
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("stroke-width", 2)
  .attr("d", line);


let barX = 0;

const bar = g.append("rect")
  .attr("class", "z-bar")
  .attr("x", x(barX)-2.5)
  .attr("y", y(normalDistribution(barX)))
  .attr("width", 5)
  .attr("height", height - y(normalDistribution(barX)))
  .attr("fill", "green");

const area = g.append("path")
  .attr("fill", "rgba(0, 255, 0, 0.2)");

function updateArea() {
  const areaData = [{x: -z_max, y: 0}, ...data.filter(d => d.x <= barX), {x: barX, y: 0}];
  area.attr("d", line(areaData));
}

updateArea();

function dragstarted(event) {
  d3.select(this).style("cursor", "ew-resize");
  d3.select(this).raise();
}

let previousBarX = null;

function dragged(event) {
  barX = x.invert(event.x);
  bar.attr("x", x(barX)-2.5)
    .attr("y", y(normalDistribution(barX)))
    .attr("height", height - y(normalDistribution(barX)));
  updateArea();

  if (previousBarX !== null && Math.abs(barX - previousBarX) < 0.01) {
    return;
  }
  previousBarX = barX;
  
  document.querySelectorAll('.highlight-green, .highlight-red').forEach(cell => cell.classList.remove('highlight-green', 'highlight-red'));

  const zProb = normalCDF(+barX.toFixed(2)).toFixed(4); // Using the normalCDF function to get the CDF value
  let pcontainer = document.getElementById("p-value");
  let zcontainer = document.getElementById("z-value");
  if (barX >= 0 && barX < z_max) {
    document.getElementById(`z-${zProb}`).classList.add('highlight-green');
    area.attr("fill", "rgba(0, 255, 0, 0.2)");
    bar.attr("fill", "green");
    pcontainer.innerHTML = zProb;
    pcontainer.classList.add('highlight-green');
    zcontainer.innerHTML = barX.toFixed(2);
    zcontainer.classList.add('highlight-green');
  } else if (barX < 0 && barX > -z_max) {
    document.getElementById(`z-${(1 - zProb).toFixed(4)}`).classList.add('highlight-red');
    area.attr("fill", "rgba(255, 0, 0, 0.2)");
    bar.attr("fill", "red");
    pcontainer.innerHTML = `1 - ${(1 - zProb).toFixed(4)} = ${zProb}`;
    pcontainer.classList.add('highlight-red');
    zcontainer.innerHTML = barX.toFixed(2);
    zcontainer.classList.add('highlight-red');
  }
}

function dragended(event) {
  d3.select(this).style("cursor", "default");
}

bar.call(d3.drag()
  .on("start", dragstarted)
  .on("drag", dragged)
  .on("end", dragended));

window.addEventListener("resize", updateSvgDimensions);

// Highlight 0.5000 initially
document.getElementById(`z-0.5000`).classList.add('highlight-green');
document.getElementById("p-value").classList.add('highlight-green');
document.getElementById("z-value").classList.add('highlight-green');

function setZ(z) {
  const round = (x, n) => 
    Number(parseFloat(Math.round(x * Math.pow(10, n)) / Math.pow(10, n)).toFixed(n));
  barX = round(z, 2);
  bar.attr("x", x(barX)-2.5)
    .attr("y", y(normalDistribution(barX)))
    .attr("height", height - y(normalDistribution(barX)));
  updateArea();
  previousBarX = barX;
  document.querySelectorAll('.highlight-green, .highlight-red').forEach(cell => cell.classList.remove('highlight-green', 'highlight-red'));

  const zProb = normalCDF(+barX.toFixed(2)).toFixed(4); // Using the normalCDF function to get the CDF value
  let pcontainer = document.getElementById("p-value");
  let zcontainer = document.getElementById("z-value");
  if (barX >= 0 && barX < z_max) {
    document.getElementById(`z-${zProb}`).classList.add('highlight-green');
    area.attr("fill", "rgba(0, 255, 0, 0.2)");
    bar.attr("fill", "green");
    pcontainer.innerHTML = zProb;
    pcontainer.classList.add('highlight-green');
    zcontainer.innerHTML = barX.toFixed(2);
    zcontainer.classList.add('highlight-green');
  } else if (barX < 0 && barX > -z_max) {
    document.getElementById(`z-${(1 - zProb).toFixed(4)}`).classList.add('highlight-red');
    area.attr("fill", "rgba(255, 0, 0, 0.2)");
    bar.attr("fill", "red");
    pcontainer.innerHTML = `1 - ${(1 - zProb).toFixed(4)} = ${zProb}`;
    pcontainer.classList.add('highlight-red');
    zcontainer.innerHTML = barX.toFixed(2);
    zcontainer.classList.add('highlight-red');
  }
}

window.setZ = setZ;