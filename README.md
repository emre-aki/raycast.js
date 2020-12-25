Raycasting performed in an HTML5 canvas using nothing but plain Javascript, with zero-dependencies! 🌞🕶

# Raycasting.js

<img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS00.png?raw=true"></img> | <img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS01.png?raw=true"></img>
 ----------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------------------
<img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS02.png?raw=true"></img> | <img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS03.png?raw=true"></img>

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
- Use keys <kbd>E</kbd> and <kbd>Q</kbd> to raise and lower the player, respectively.
- Use keys <kbd>↑</kbd> and <kbd>↓</kbd> to look up and down, respectively.
- Use <kbd>SPACE</kbd> to shoot.
- Use <kbd>ENTER</kbd> to open/close doors.


### Live Demo

You can check out the live demo [here](https://raycasting-js.herokuapp.com)!


### Map Editing

Even though this is still mostly a WIP, if you would like to edit the game map to your liking, and do all sorts of crazy stuff, you can do so by using the integrated command-line level editor. Simply run the following command from the root of the project.

```bash
$ npm run leveledit
```

### Features include
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
