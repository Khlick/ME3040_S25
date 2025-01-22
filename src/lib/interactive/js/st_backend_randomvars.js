//*******************************************************************************//
//Random Variable
//*******************************************************************************//
function random_variable() {
  //Adapted from: https://bl.ocks.org/mbostock/5249328
  //              http://bl.ocks.org/mbostock/7833311

  var widthRV = 500,
      heightRV = 400
      radiusRV = 20,
      borderRV = 1,
      possible_colors = ['#FF9B3C', '#00D0A2', '#64BCFF', '#FF4A3C', '#FFFF00', 
		                 '#7272FF', '#55D733', '#1263D2', '#FF0080', '#A1FF00',
		                 '#FF1300', '#03899C', '#FFC500', '#2419B2', '#4169E1']
      colors = possible_colors,
      color_map = {0:"white"};

  var hexbin = d3.hexbin()
      .size([widthRV, heightRV])
      .radius(radiusRV);

  var svgRV = d3.select("#svgRV").append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", "0 0 " + widthRV + " " + heightRV)
                    .attr("preserveAspectRatio", "xMidYMid meet");


  svgRV.append("path")
      .attr("class", "mesh")
      .attr("d", hexbin.mesh());

  var hexagon = svgRV.append("g")
      .attr("class", "hexagon")
    .selectAll("path")
      .data(hexbin(hexbin.centers()))
    .enter().append("path")
      .attr("d", hexbin.hexagon(radiusRV - borderRV/2))
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .attr("id", function(d) { d.fixed = 0; d.value = 0; d.fill = 0; return 'bin-' + d.i + '-' + d.j; })
      .on("mousedown", mousedown)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup);

  var mousing = 0;

  function mousedown(d) {
    mousing = d.fill ? -1 : +1;
    mousemove.apply(this, arguments);
  }

  function mousemove(d) {
    if (mousing & (d.fixed == 0)) {
      d.fill = mousing > 0;
      d3.select(this).style("fill", d.fill ? "#c7c7c7" : "white");
    }
  }

  function mouseup() {
    mousemove.apply(this, arguments);
    mousing = 0;
  }

  function addColor(color, value) {
    $('#rvMap').append("<tr class='prob_map'>\
      <td><img class='hexagon' src='./img/hexagon.svg' width='20px' style='background-color:" + color + "'/></td>\
      <td>"+ value +"</td>\
      </tr>");
  }

  function fixColor(color, value) {
    hexagon.each(function(d){
      if (d.fill) {
        d.fill = 0;
        d.value = value;
        d.fixed = 1;
        d3.select(this)
          .style("fill", color)
          .style('stroke', color)
          .style("stroke-width", borderRV);
      }
    });
  }

  //Handle value submit
  $("#rvNewMap").submit(function(e) {
    e.preventDefault();
    if (colors.length) {
      value = parseFloat($("#mapValue").val());
      var color;
      if (color_map[value] == undefined) {
        index = Math.floor(Math.random()*colors.length)
        color = colors.splice(index, 1)[0];
        color_map[value] = color;
        addColor(color, value);
      } else {
        color = color_map[value];
      }
      fixColor(color, value);
    }
    reset_samples();
  });

  //Handles start and stop buttons
  var sample;
  $('.sampleBtns').on('click', function(){
    var button = d3.select(this).attr('id');
    clearInterval(sample);
  	sample = setInterval(function() {
  	        var randomX = Math.random()*widthRV,
  	            randomY = Math.random()*heightRV,
  	            pos = [randomX,randomY]
  	            bin = hexbin([pos]),
  	            hex = d3.select('#bin-' + bin[0].i + '-' + bin[0].j),
  	            color = hex.style('fill'),
  	            value = hex.data()[0].value;
  	        addPoint(pos, color, value);
  	      }, 100);
  })

  function reset_samples() {
  	Values = {};
    total = 0;
    addRect('white', 0);
    clearInterval(sample);
  }

  // Reset button
  $('#resetRV').on('click', function(){
    reset_samples();
    $(".prob_map").remove();
    hexagon.each(function(d){
        d.fill = 0;
        d.value = 0;
        d.fixed = 0;
        d3.select(this)
          .style("fill", "white")
          .style("stroke", "white")
          .style("stroke-width", borderRV);
    });
    colors = possible_colors;
  });


  var Values = {}
      total = 0;
  //Add sample point
  function addPoint(pos, color, value) {
    if (Values[value] == undefined) {
      Values[value] = 1;
      addRect(color, value);
    } else {
      Values[value] += 1;
      updateRect();
    };
    total += 1;
    svgRV.append('circle')
        .attr('cx', pos[0])
        .attr('cy', pos[1])
        .attr('r', 5)
        .style('fill', 'black')
        .attr('opacity', '1')
        .transition()
        .style('fill', color)
        .duration(1000)
        .each('end', function(d){ d3.select(this).remove(); });
  }


  //Tool Tip
  var tipRVD = d3.tip().attr('class', 'd3-tip')
                        .offset([-10, 0])
                        .html(function(d,i) { return round(Values[d] / total, 2); });

  //Constants RV Dist
  var widthRVD = 350,
      heightRVD = 200,
      padRVD = 30;

  //Create SVG and SVG elements
  var svgRVD = d3.select("#rvDist")
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", "0 0 " + widthRVD + " " + heightRVD)
                    .attr("preserveAspectRatio", "xMidYMid meet")
                    .call(tipRVD);

  //Create Container
  var containerRVD = svgRVD.append("g").attr("transform", "translate(" + padRVD + "," + padRVD + ")");

  ////xScale & yScale
  var xScaleRVD = d3.scale.ordinal().rangeRoundBands([0, widthRVD - 2*padRVD], .5);
  var yScaleRVD = d3.scale.linear().domain([0,1]).range([heightRVD - 2*padRVD, 0]);

  //xAxis
  var xAxisRVD = d3.svg.axis().scale(xScaleRVD).orient("bottom").ticks(0);
  var axisRVD = svgRVD.append("g")
                      .attr("class", "x axis")
                      .attr("transform", "translate(" + padRVD + "," + (heightRVD-padRVD) + ")")
                      .call(xAxisRVD);
  //yAxis
  var yAxisRVD = d3.svg.axis().scale(yScaleRVD).orient("left").ticks(3);
  var axisYRVD = svgRVD.append("g")
                      .attr("class", "y axis")
                      .attr("transform", "translate(" + padRVD + "," + padRVD + ")")
                      .call(yAxisRVD);

  //Add new bar and update axis
  function addRect(color, value) {
    var key = Object.keys(Values);
    var range = key.sort(function sortNumber(a, b) {
        return a - b;
    });

    xScaleRVD.domain(range)
    xAxisRVD.ticks(range.length);
    axisRVD.call(xAxisRVD);

    var RVRects = containerRVD.selectAll("rect").data(key, function(d) { return d; });

    RVRects.enter().append("rect")
      .attr("id",function(d) {return 'bar'+d;})
      .attr('fill', color)
      .attr('opacity', 0.6)
      .on('mouseover', function(d){tipRVD.show(d,this)})
      .on('mouseout', tipRVD.hide);

    RVRects.exit().remove();

    updateRect();
  }


  //Update Coin Bar Chart
  function updateRect() {

    containerRVD.selectAll("rect").transition()
        .attr("x",function(d,i) {return xScaleRVD(d);})
        .attr("y",function(d,i) {return yScaleRVD(Values[d]/Math.max(total, 1));})
        .attr("height",function(d,i) {return yScaleRVD(1 - Values[d]/Math.max(total, 1));})
        .attr("width",xScaleRVD.rangeBand());
  }
}