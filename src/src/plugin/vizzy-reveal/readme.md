# Vizzy Plugin for Reveal.js

Vizzy is a plugin for Reveal.js that allows you to embed iframes and interact with external content seamlessly within your presentations. 

## Features

- Embed external web pages within your slides.
- Automatically manage iframe loading and transitions.
- Support for fragments to handle step-by-step animations and transitions.

## Motivation

While a graduate student at UCLA, I had the opportunity to teach statistics to other graduate students and undergraduates. During this time, I met Dr. Guillaume Calmettes, who shared my vision of improving how we teach statistics, particularly to pre-med students. We found that PowerPoint lacked the interactivity we needed to drive home points about statistical distributions, resampling methods, and probability. Moreover, we found that Jupyter notebooks and R Shiny applications were too difficult to share.

I loved Reveal.js and had been experimenting with embedding Shiny apps in the presentations, but that was too much work. We turned to D3.js and initially wrote scripts for our visualizations directly in the presentation, but this also became cumbersome and difficult to share and maintain. Guillaume discovered the plugin by Joscha Legewie ([reveal.js-d3js-plugin](https://github.com/jlegewie/reveal.js-d3js-plugin)) and started developing his own version ([reveal.js-d3](https://github.com/gcalmettes/reveal.js-d3)). This allowed us to work on visualizations independently and place them in the presentation cleanly.

Fast-forward 7 years, I found myself teaching again, this time as an adjunct professor at California State University, Los Angeles, teaching Experimental Methods to Mechanical Engineering students and Mechanisms of Neural Plasticity to Kinesiology students. Realizing that Reveal.js had evolved, I needed the same functionality but found several issues that required constant patching and tweaking. Eventually, I set out to create Vizzy.

Vizzy is based on the reveal.js-d3 and reveal.js-d3js plugins, incorporating similar functionality but with key differences in syntax and under-the-hood approaches. Vizzy works with both Reveal.js 4 and 5, integrates with Reveal's lazy-load mechanisms, allows for further customization of the iframe container, and better integrates with the fragments mechanism to allow for auto-running fragments when traversing backwards through slide decks. Vizzy is available in both module and non-module versions. Future directions include a mechanism to control fragments in the Vizzy source from the host and properly registering Vizzy elements. This first version is primarily a proof of concept and an upgrade from previous plugins, and I hope to optimize it further and gather insights from other developers.

## Installation

Install Vizzy via npm:

```sh
npm install vizzy-reveal
```

## Usage

### Basic Setup

Add the Vizzy plugin to your Reveal.js presentation:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reveal.js Presentation</title>
  <link rel="stylesheet" href="reveal.css">
  <script src="reveal.js"></script>
  <script src="vizzy.js"></script>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <section>
        <h2>A Vizzy Slide!</h2>
        <p class="fragment" data-fragment-index="1">With fragments!</p>
        <vizzy data-src="lib/visualizations/collision-detection.html" style="height:600px;"></vizzy>
      </section>
    </div>
  </div>
  <script>
    Reveal.initialize({
      plugins: [ Vizzy ]
    });
  </script>
</body>
</html>
```

### Adding Vizzy Elements

You can add Vizzy elements to your slides using the `<vizzy>` tag. Set the `data-src` attribute to the URL of the content you want to embed. Customize the vizzy element like you would a `div` element, adding classes or styles.

```html
<section>
  <h2>Vizzy with Fragments</h2>
  <vizzy data-src="lib/visualizations/collision-detection.html" style="height:600px;"></vizzy>
</section>
```

The plugin will inject the following css into the document head (future iterations will use the shadow dom). You may use inline styles, or custom css classes/ids to restyle your elements. The main point here is to ensure the embedded iframe fills the vizzy element. Typically, you might define a specific size for the vizzy element, or place it in an element whose dimensions are calculated/static. Note the css selectors are specific enough to override reveal's default iframe styling, but not so specific to make it impossible to generalize your own css.

```html
<style>
  vizzy {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    margin: 0 auto;
    overflow: hidden;
  }
  .reveal vizzy iframe {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height:100%;
    z-index: 1;
    border: 0;
    overflow: hidden;
  }
</style>
```

You may add custom inline styles or set other attributes directly on the embedded iframe by using the `data-` prefix on the vizzy element. For example, to set the `scrolling` attribute on the embedded iframe to `'no'`, you may use `data-scrolling="no"` on the vizzy element.

```html
<section>
  <h2>Embed a Website in an Iframe</h2>
  <div class="grid-container" style="grid-template-columns: 1fr 1fr;">
    <div class="grid-item" style="width:400px;">
      <vizzy data-src="https://khrisgriffis.com" style="height:428px;" data-scrolling="no"></vizzy>
    </div>
    <div class="grid-item" style="width:400px;">
      <vizzy data-src="https://khrisgriffis.com" style="height:428px;" ></vizzy>
    </div>
  </div>
</section>
```


### Using Fragments with Vizzy

You can use fragments to create step-by-step transitions within your Vizzy iframes. Define the `_fragments` array in your iframe content. _Note: You may also define the _fragments object in the global scope with `var`._

```html
<!-- collision-detection.html -->
<script>
  window._fragments = [
    {
      activate: () => {
        console.log("Fragment 1 activated");
        // Do something to animation
      },
      reverse: () => {
        console.log("Fragment 1 reversed");
        // Undo something in animation
      },
      index: 0
    },
    {
      activate: () => {
        console.log("Fragment 2 activated");
        // Do another thing in animation
      },
      reverse: () => {
        console.log("Fragment 2 reversed");
        // Undo another thing in animation
      },
      index: 1
    }
  ];
</script>
```

### Advanced Fragments with Vizzy

In addition to defining the `_fragments` array directly within the iframe content, Vizzy allows you to define fragments directly within the `<vizzy>` element. This advanced feature provides greater flexibility by enabling the dynamic creation of fragments, which can interact with the iframe's content.

#### Defining Fragments in the Vizzy Element

When defining fragments directly within the `<vizzy>` element, ensure the following:

1. **Return an Array of Objects:** The code must return an array of objects where each object contains `activate` (required), `reverse` (optional), `deactivate` (optional), and `index` (required) fields. These fields should align with the usage of the `window._fragments` array. _Note: When defining the `index`, use `-1` to create an auto-run step from within the `<vizzy>` element._

2. **Accessing the Content Window:** The iframe's `contentWindow` is passed automatically as `window`, allowing you to access any functions or objects defined within the iframe. This enables seamless interaction between the fragment definitions and the iframe's content.

#### Example Usage

Here's an example of how to define fragments directly within the `<vizzy>` element:

```html
<vizzy data-src="lib/viz/bar-chart.html" class="grid-item">
  [
    { 
      activate: () => window.render("math"), 
      reverse: () => window.render("language"), 
      index: 1 
    },
    { 
      activate: () => window.render("science"), 
      reverse: () => window.render("math"),
      index: 2 
    }
  ]
</vizzy>
```

In this example:

- **Activate and Reverse Functions:** The `activate` and `reverse` functions are executed within the context of the iframe's `contentWindow`, allowing you to directly call functions like `window.render()` which are defined within the iframe's content.
- **Indexing:** Each fragment is indexed similarly to how it would be within the `_fragments` array. The index determines the order in which the fragments are activated as the user progresses through the slide.

#### Key Considerations

- **Encapsulation:** By defining fragments in the `<vizzy>` element, you encapsulate the fragment logic within the element itself, leading to a more modular and maintainable codebase.
- **Error Handling:** If the fragment definition contains errors, or if the `contentWindow` is not accessible, Vizzy will log the error but continue to operate without crashing.

This feature is particularly useful for advanced users who need dynamic fragment creation or who want to keep their fragment logic closely tied to specific instances of the `<vizzy>` element.

## Configuration

You can configure Vizzy by passing options to the plugin during the `Reveal.initialize()` method, as shown below.

```javascript
Reveal.initialize({
  plugins: [ Vizzy ],
  vizzy: {
    autoRunTransitions: true,  // Automatically run transitions
    autoTransitionDelay: 100,  // Delay between transitions (ms)
    devMode: false,            // Enable development mode
    onSlideChangedDelay: 0     // Delay before handling slide change (ms)
  }
});
```

### Options

| Option               | Type    | Default | Description                                                                                                                                 |
|----------------------|---------|---------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `autoRunTransitions` | Boolean | `false` | If set to `true`, Vizzy will automatically run all transitions on a slide when navigating backwards and when in `print` mode.                                         |
| `autoTransitionDelay`| Number  | `100`   | The delay in milliseconds between each automatic transition. This delay helps to control the speed of the transitions.                       |
| `devMode`            | Boolean | `false` | Enables development mode which provides additional logging and debugging information in the console.                                          |
| `onSlideChangedDelay`| Number  | `0`     | The delay in milliseconds before handling a slide change. This delay can be useful for ensuring that all content is fully loaded before running transitions on vizzies. |

These configuration options give you control over the behavior and performance of Vizzy in your Reveal.js presentations. Adjust the settings according to your needs to create a smooth and interactive presentation experience.


## License

This project is licensed under the [MIT License](LICENSE).
