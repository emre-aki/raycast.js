<img src="https://github.com/emre-aki/raycast.js/blob/master/images/RayCast.js-medium.png?raw=true"></img>

<img src="https://media4.giphy.com/media/agn2uFHzPWa4TLWQwx/giphy.gif"></img>

This is an implementation of the once-popular 3-D rendering technique known as [raycasting](https://en.wikipedia.org/wiki/Ray_casting) which was famously featured in 1991's popular video game hit Wolfenstein 3D.

All of the rendering is carried out within a single 640x480 canvas at ~30 frames per second. The rendering at its core is basically comprised of vertical slices of texture-mapped walls at constant-Z and per-pixel rendered ceiling and floor textures. An offscreen frame buffer is utilized to optimize per-pixel rendering.

This little project was inspired by a video on YouTube posted by a fellow seasoned programmer who goes by the name 'javidx9.' You can follow [this link](https://youtu.be/xW8skO7MFYw) to refer to his tutorial of ray-casting done entirely on a command-line window!


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
- Use keys <kbd>W</kbd> and <kbd>S</kbd> on your keyboard to move forwards and backwards, respectively.
- Key <kbd>←</kbd> rotates player counter-clockwise, and key <kbd>→</kbd> rotates player clockwise.
- Use keys <kbd>A</kbd> and <kbd>D</kbd> to strafe left and right, respectively.
- You may use either <kbd>![MSW]</kbd><sup>__*__</sup>, or the keys <kbd>E</kbd> and <kbd>Q</kbd> to raise and lower the player, respectively.
- Use keys <kbd>↑</kbd> and <kbd>↓</kbd> to look up and down, respectively.
- You may use either <kbd>![LMB]</kbd><sup>__*__</sup>, or <kbd>SPACE</kbd> to shoot.
- Use <kbd>ENTER</kbd> to open/close doors.
- You may also use the mouse<sup>__*__</sup> for free-look.

  *<sup>__\*__</sup> You should first click <kbd>![LMB]</kbd> on the `canvas` to activate mouse controls.*


### Live Demo

You can check out the live demo [here](https://raycast-js.herokuapp.com)!


### Map Editor GUI

*Coming soon...*

### Features include
- AABB collision detection & resolution
- Walking animation
- Ability to look up & down
- Player elevation
- Texture-mapped walls, floors & ceiling
- Alpha-blending
- Skybox rendering for outdoors
- Shading with depth
- Doors
- Mini-map display

### TODOs
- Diagonal walls
- World-object sprites
- Transparent walls
- *Pseudo portal-rendering*

[LMB]: https://github.com/emre-aki/raycast.js/blob/master/images/lmb.png?raw=true (left mouse button)
[MSW]: https://github.com/emre-aki/raycast.js/blob/master/images/msw.png?raw=true (mouse scroll whell)
