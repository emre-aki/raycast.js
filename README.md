<p align="center">
  <img src="https://github.com/emre-aki/raycast.js/blob/master/images/RayCast.js-medium.png?raw=true"></img>
  <img src="https://media4.giphy.com/media/agn2uFHzPWa4TLWQwx/giphy.gif"></img>
</p>

RayCast.js is an implementation of the once-popular 3-D rendering technique known as [ray-casting](https://en.wikipedia.org/wiki/Ray_casting) which was famously featured in 1991's popular video game hit Wolfenstein 3D.

The graphics are rendered in a 640x480 HTML5 canvas, using the `2d` graphics context. The rendering routine, at its core, is made up of vertical lines of texture-mapped walls at constant-Z, and perspective-correct texture-mapping for flat surfaces. An offscreen frame buffer is utilized to optimize per-pixel rendering.


### Setting up
#### Requirements
- Node.js
- `ejs`
- `express`

After cloning the repository, navigate to the root folder and install the dependencies using `npm`.

```bash
$ npm install
```

Once all the dependencies are installed, you can start up an Express development server with:

```bash
$ npm run start
```


### Controls

| **Action**             | **Keys**                                                                          |
|------------------------|-----------------------------------------------------------------------------------|
| Movement               | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>                               |
| Free-look              | <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> <kbd>←</kbd>, or the mouse<sup>__*__</sup> |
| Change elevation       | <kbd>Q</kbd> <kbd>E</kbd>, or <kbd>![MSW]</kbd><sup>__*__</sup>                   |
| Shoot                  | <kbd>⎵</kbd>, or <kbd>![LMB]</kbd><sup>__*__</sup>                                |
| Interact               | <kbd>⏎</kbd>                                                                      |
| Toggle fullscreen mode | <kbd>F</kbd>                                                                      |

  *<sup>__\*__</sup> You should first click <kbd>![LMB]</kbd> on the `canvas` to activate mouse controls.*


### Live Demo

You can check out the live demo [here](https://raycast-js.herokuapp.com), and follow the latest updates [here](https://www.youtube.com/watch?v=iX-yo-U8l5o&list=PLmmhlHT3LkQw6AK3LfPpzxSeb_4RTyIRX)!


### Map Editor GUI

*Coming soon...*


### Features include
- "1.5" degrees of camera freedom (pitch is achieved via a process called y-shearing)
- Different levels of camera elevation
- Fully texture-mapped walls, floors & ceiling
- Alpha-blending
- 360 parallaxed skies for outdoor spaces
- Light diminishing (distance/depth-based shading)
- A custom collision system that supports collisions against non-axis-aligned geometries as well, like diagonal walls
- Doors
- Diagonal walls
- Mini-map display


### TODOs
- 2-D sprites for in-game `thing`s
- Translucent surfaces
- Sloped surfaces
- Blocks of varying widths, heights & depth (`free-form block`s)


[LMB]: https://github.com/emre-aki/raycast.js/blob/master/images/lmb.png?raw=true (left mouse button)
[MSW]: https://github.com/emre-aki/raycast.js/blob/master/images/msw.png?raw=true (mouse scroll whell)
