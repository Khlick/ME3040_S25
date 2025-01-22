/**
 * SVG Class for creating and managing an SVG element using D3.js.
 * 
 * This class is designed to create an SVG element that automatically fills 
 * its parent container and updates its dimensions when the window is resized.
 * 
 * @class
 * @property {Object} margin - Margin around the SVG.
 * @property {number} initialWidth - Initial width of the SVG.
 * @property {number} initialHeight - Initial height of the SVG.
 * @property {number} aspectRatio - Aspect ratio of the SVG, calculated as initialHeight / initialWidth.
 * @property {Object} svg - The D3 selection of the SVG element.
 * @property {number} width - Width of the inner drawing area.
 * @property {number} height - Height of the inner drawing area.
 * @property {Object} g - The main SVG group element.
 * @property {Object} container - The D3 selection of the parent container element.
 */
class SVG {
  /**
   * Creates an SVG instance.
   * 
   * @constructor
   * @param {Object} [options] - Configuration options for the SVG instance.
   * @param {Object} [options.margin={ top: 20, right: 20, bottom: 50, left: 50 }] - Margin around the SVG.
   * @param {number} [options.initialWidth=960] - Initial width of the SVG.
   * @param {number} [options.initialHeight=570] - Initial height of the SVG.
   * @param {string} [options.elementName=null] - The ID of the HTML element to bind the SVG to. Defaults to 'body' if not provided.
   */
  constructor({
    margin = { top: 20, right: 20, bottom: 50, left: 50 },
    initialWidth = 960,
    initialHeight = 570,
    elementName = null
  } = {}) {
    this.margin = margin;
    this.initialWidth = initialWidth || 1;
    this.initialHeight = initialHeight || 1;
    this.aspectRatio = this.initialHeight / this.initialWidth;

    // Bind to the specified element or the body tag
    const selector = elementName ? `#${elementName}` : "body";
    this.container = d3.select(selector);
    this.svg = this.container.append("svg")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${this.initialWidth} ${this.initialHeight}`);

    this.width = this.initialWidth - this.margin.left - this.margin.right;
    this.height = this.initialHeight - this.margin.top - this.margin.bottom;

    // Add defs for arrow head
    const defs = this.svg.append("defs");
    defs.append("marker")
      .attr("id", "arrow-head")
      .attr("orient", "auto-start-reverse")
      .attr("viewBox", "0 0 15 15")
      .attr("markerWidth", "7")
      .attr("markerHeight", "4")
      .attr("refX", "6")
      .attr("refY", "5")
      .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");

    this.g = this.svg.append("g")
      .attr("id", "canvas")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // Bind the updateSvgDimensions method to window resize event
    this.updateSvgDimensions();
    window.addEventListener("resize", () => this.updateSvgDimensions());
  }

  /**
   * Updates the dimensions of the SVG based on its parent container's size.
   * 
   * This method calculates the new dimensions of the SVG to ensure it fills 
   * the parent container while maintaining the aspect ratio. It is called 
   * when the window is resized.
   */
  updateSvgDimensions() {
    // Get the bounding box of the parent container
    const bbox = this.container.node().getBoundingClientRect();
    const newWidth = bbox.width;
    const newHeight = bbox.height;
    
    // Update the SVG's viewBox to maintain the aspect ratio
    this.svg.attr("viewBox", `0 0 ${newWidth} ${newHeight}`);

    // Update the width and height properties to reflect the inner drawing area
    this.width = newWidth - this.margin.left - this.margin.right;
    this.height = newHeight - this.margin.top - this.margin.bottom;
  }
}


/**
 * DynamicCanvas Class for creating and managing a resizable canvas element.
 * 
 * This class creates a canvas element that automatically fills its parent container
 * and updates its dimensions while maintaining the aspect ratio when the window is resized.
 * 
 * @class
 * @property {number} initialWidth - Initial width of the canvas.
 * @property {number} initialHeight - Initial height of the canvas.
 * @property {number} aspectRatio - Aspect ratio of the canvas, calculated as initialWidth / initialHeight.
 * @property {Object} canvas - The canvas element.
 * @property {Object} ctx - The canvas rendering context.
 * @property {Object} container - The parent container of the canvas element.
 */
class CANVAS {
  /**
   * Creates a DynamicCanvas instance.
   * 
   * @constructor
   * @param {Object} [options] - Configuration options for the DynamicCanvas instance.
   * @param {number} [options.initialWidth=960] - Initial width of the canvas.
   * @param {number} [options.initialHeight=570] - Initial height of the canvas.
   * @param {string} [options.elementName=null] - The ID of the HTML element to bind the canvas to. Defaults to 'body' if not provided.
   */
  constructor({
    initialWidth = 960,
    initialHeight = 570,
    elementName = null
  } = {}) {
    this.initialWidth = initialWidth;
    this.initialHeight = initialHeight;
    this.aspectRatio = this.initialWidth / this.initialHeight;

    // Bind to the specified element or the body tag
    const selector = elementName ? `#${elementName}` : "body";
    this.container = document.querySelector(selector);
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Initialize the canvas dimensions and bind the resize event
    this.updateCanvasDimensions();
    window.addEventListener("resize", () => this.updateCanvasDimensions());
  }

  /**
   * Updates the canvas dimensions based on the parent container's size while maintaining the aspect ratio.
   * 
   * This method is automatically called when the window is resized.
   */
  updateCanvasDimensions() {
    // Get the bounding box of the parent container
    const bbox = this.container.getBoundingClientRect();
    const newWidth = bbox.width;
    const newHeight = newWidth / this.aspectRatio;

    // Update the canvas dimensions
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
  }

  /**
   * Gets the current width of the canvas.
   * 
   * @returns {number} The width of the canvas.
   */
  get width() {
    return this.canvas.width;
  }

  /**
   * Gets the current height of the canvas.
   * 
   * @returns {number} The height of the canvas.
   */
  get height() {
    return this.canvas.height;
  }
}

