var Hist = function(opts) {
    // load in arguments from config object
    this.data    = opts.data;
    this.element = opts.element;
    // Adjust margins - reduce right margin, keep left margin small
    this.margin  = opts.margin || {top: 10, right: 20, bottom: 30, left: 30};
    this.exists  = false;
    this.bounds = opts.bounds || [];
    this.hasHist = false;
    this.bins = opts.bins || [];
    if (this.data.length){
        if (!this.validateBins()) { return; }
        this.draw();    
    }
}

Hist.prototype.draw = function() {
    // Clear any existing SVG first
    d4.select(this.element).selectAll('svg').remove();
    
    this.exists = true;
    
    // Get container dimensions - reduce width to 90% of container
    this.width = (this.element.offsetWidth * 0.9) - (this.margin.left + this.margin.right);
    this.height = this.element.offsetHeight - (this.margin.top + this.margin.bottom);

    var svg = d4.select(this.element).append('svg')
        .attr('width', this.width + (this.margin.left + this.margin.right))
        .attr('height', this.height + (this.margin.top + this.margin.bottom));

    this.plot = svg.append('g')
        .attr('class', 'hist-box')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.constructHist();
}

Hist.prototype.constructHist = function(){
    var that = this;
    var formatC = d4.format(',.0f');
    
    // Clear existing plot content but keep the SVG and base group
    this.plot.selectAll('.hist-bar').remove();
    this.plot.selectAll('.axis').remove();
    
    // Set x-scale with fixed domain based on NPUPS
    this.scaleX = d4.scaleLinear()
        .rangeRound([0, this.width])
        .domain([-1, NPUPS + 1]); // Extended to show full first bin

    // Generate histogram data with bins centered on integers
    var bins = d4.histogram()
        .domain([-0.5, NPUPS + 0.5])  // Data domain includes full first bin
        .thresholds(d4.range(-0.5, NPUPS + 0.5, 1)) // Stop at NPUPS + 0.5
        (this.data);
    
    // Calculate bin width in pixels
    var binWidth = Math.abs(this.scaleX(1) - this.scaleX(0));
    
    // Y scale with extra padding for text
    var scaleY = d4.scaleLinear()
        .domain([0, d4.max(bins, function(d) { return d.length; }) * 1.2]) // More padding for text
        .range([this.height, 0]);
    
    // Draw bars
    var bar = this.plot.selectAll('.hist-bar')
        .data(bins);
    
    var barGroups = bar.enter()
        .append('g')
        .attr('class', 'hist-bar bar')
        .attr('transform', function(d) {
            // Position at bin center
            return 'translate(' + that.scaleX(d.x0 + 0.5) + ',' + scaleY(d.length) + ')';
        });

    // Add rectangles to bars
    barGroups.append('rect')
        .attr('x', -binWidth/2)
        .attr('width', binWidth - 1)
        .attr('height', function(d) { 
            return that.height - scaleY(d.length);
        });

    // Add text to bars with more space above
    barGroups.append('text')
        .attr('dy', '-0.5em') // Move text up a bit more
        .attr('y', 0)
        .attr('x', 0)
        .attr('text-anchor', 'middle')
        .text(function(d) { 
            return formatC(d.length);
        });

    // Add x-axis with integer ticks
    var xAxis = d4.axisBottom(this.scaleX)
        .tickFormat(d4.format('d'))
        .tickValues(d4.range(0, NPUPS + 1));
    
    this.plot.append('g')
        .attr('class', 'axis axis--x hist-axis')
        .attr('transform', 'translate(0,' + this.height + ')')
        .call(xAxis);

    this.hasHist = true;
}

// Convenience methods
Hist.prototype.formatC = function(num) {
    return d4.format(',.0f')(num);
}

Hist.prototype.validateBins = function(){
    if (!this.bins || !this.bins.length){
        return true;
    }
    return false;
}

// Update setData to maintain histogram size
Hist.prototype.setData = function(newData){
    if (!newData.length) return;
    
    this.data = newData;

    if (!this.exists) {
        this.draw();
        return;
    }
    
    // Just update the histogram with new data
    this.constructHist();
}

Hist.prototype.reset = function(){
    if (!this.exists) { return; }
    // Properly remove all SVG elements
    d4.select(this.element).selectAll('svg').remove();
    this.hasHist = false;
    this.exists = false;
}

// Update the resize method
Hist.prototype.resize = function() {
    if (!this.exists) { return; }
    
    // Update dimensions based on container
    this.width = this.element.offsetWidth - (this.margin.left + this.margin.right);
    this.height = this.element.offsetHeight - (this.margin.top + this.margin.bottom);
    
    // Update SVG size
    d4.select(this.element).select('svg')
        .attr('width', this.width + (this.margin.left + this.margin.right))
        .attr('height', this.height + (this.margin.top + this.margin.bottom));

    // Redraw histogram with new dimensions
    this.constructHist();
}