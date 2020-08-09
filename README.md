Raycasting performed in an HTML5 canvas using nothing but plain Javascript, with zero-dependencies! 🌞🕶

# Raycasting.js

<img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS00.png?raw=true"></img> | <img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS01.png?raw=true"></img>
 ----------------------------------------- | ------------------------------------------
<img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS02.png?raw=true"></img> | <img src="https://github.com/emre-aki/raycasting.js/blob/master/images/SS03.png?raw=true"></img>

This is an implementation of the once-popular 3-D rendering technique known as [raycasting](https://en.wikipedia.org/wiki/Ray_casting) which was famously featured in 1991's popular video game hit Wolfenstein 3D.

All of the rendering is carried out within a single 512x384 canvas at ~24 frames per second. The rendering at its core is basically comprised of vertical slices of wall textures and per-pixel rendered ceiling and floor textures--all of which at constant Z. An offscreen frame buffer is utilized to optimize per-pixel rendering.

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

### Live Demo

You can check out the live demo [here](https://emres-junkyard.herokuapp.com/raycasting-demo)!

### Controls
- Use keys `W` and `S` on your keyboard to move forwards and backwards, respectively.
- Key `A` rotates player counter-clockwise, and key `D` rotates player clockwise. 
- Use keys `Q` and `E` to strafe left and right, respectively.
- Use keys `↑` and `↓` to look up and down, respectively.
- Use `SPACE` to shoot.
- Use `ENTER` to open/close doors.

### Features include
- Walking animation
- Ability to look up & down
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
