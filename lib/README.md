# Blurring Library

## How to build
```
npm install
npm run build
```

## How to use

1. Copy library code.

```
copy content of /dist folder
```

2. Use it to render something.

```
import { RenderPass, Preset } from '<index.js file location>';

const pass = new RenderPass(
  outputCanvas,
  htmlVideoElement);
const preset = new Preset(`Blur(Radius 15px)`);
pass.setPreset(preset);

pass.render();
```
