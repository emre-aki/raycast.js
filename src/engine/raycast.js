/*******************************************************************
 *                        RayCast.js                               *
 *                            by                                   *
 *                      Emre Akı, 2018.                            *
 *                                                                 *
 *   This is an implementation of the once-popular 3-D rendering   *
 * technique known as "ray-casting" which was famously featured in *
 * 1991's popular video game hit Wolfenstein 3D.                   *
 *                                                                 *
 *   All of the rendering is carried out within a single 640x480   *
 * canvas at ~30 frames per second. The rendering at its core is   *
 * basically comprised of vertical slices of texture-mapped walls  *
 * at constant-Z and per-pixel rendered ceiling & floor textures.  *
 * An offscreen frame buffer is utilized to optimize per-pixel     *
 * rendering.                                                      *
 *                                                                 *
 *   This little project was inspired by a video on YouTube posted *
 * by a fellow seasoned programmer who goes by the name 'javidx9.' *
 * You can follow the link below to refer to his tutorial of       *
 * ray-casting done entirely on a command-line window!             *
 *                                                                 *
 *   https://youtu.be/xW8skO7MFYw                                  *
 *                                                                 *
 *   Features include:                                             *
 *     - Fully texture-mapped walls, floors & ceilings             *
 *     - Alpha-blending                                            *
 *     - 360 parallaxed skies for outdoor spaces                   *
 *     - Diminishing lighting (distance/depth-based shading)       *
 *     - Doors                                                     *
 *     - Diagonal walls                                            *
 *     - Walls of varying widths, heights & depths                 *
 *     - Sloped surfaces                                           *
 *     - 2-D sprites for in-game `thing`s                          *
 *     - Freelook (perspective-incorrect, achieved via y-shearing) *
 *     - Player elevation                                          *
 *     - Mini-map display                                          *
 *                                                                 *
 * Last updated: 12.24.2021                                        *
 *******************************************************************/

// res: 640x480 - scan: 160x120 - fps: 30
// res: 512x384 - scan: 256x192 - fps: 30
(function() {
  // game canvas
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // offscreen canvas used for buffering the frame
  const offscreenBuffer = document.createElement("canvas");
  const offscreenBufferCtx = offscreenBuffer.getContext("2d");
  let offscreenBufferW, offscreenBufferH, offscreenBufferData; // initialized at setup

  // minimap canvas used for rendering the bird's-eye view of the map
  const minimapCanvas = document.createElement("canvas");
  const minimapCanvasCtx = minimapCanvas.getContext("2d");

  const fs = {
    "__dirname__": "/engine/",
    "__file__": "/engine/raycast.js",
    "__sprites__": "/sprites/",
    "__textures__": "/textures/",
    "__audio__": "/audio/"
  };
  const game = {
    "res": [640, 480],
    "FPS": 30,
    "FOV": Math.PI / 3, // < Math.PI
    "MAP_TILE_SIZE": 240, // FIXME: move to self.const
    "DRAW_TILE_SIZE": {}, // initialized in setup // FIXME: move to self.const
    "DRAW_DIST": -1,      // initialized in setup
    "STEP_SIZE": 0.15,    // FIXME: move to self.const
    "keyState": {
      "W": 0,
      "A": 0,
      "S": 0,
      "D": 0,
      "Q": 0,
      "E": 0,
      "SPC": 0,
      "RTN": 0,
      "ARW_UP": 0,
      "ARW_DOWN": 0,
      "ARW_LEFT": 0,
      "ARW_RIGHT": 0
    },
    "mouseButtonState": {
      "LEFT": 0,
      "MIDDLE": 0,
      "RIGHT": 0,
      "BRWS_BWD": 0,
      "BRWS_FWD": 0,
    },
    "map": window.__map__.MAP,
    "mapLegend": window.__map__.LEGEND,
    "mRows": 240,
    "mCols": 320,
    "nRows": window.__map__.N_ROWS,
    "nCols": window.__map__.N_COLS,
    "doors": {},
    "pickables": {},
    "inventory": [],
    "player": {
      "rotation": window.__player__.ROTATION,
      "anim": {
        "shooting": {"index": -1, "animating": 0},
        "walking": {"index": 0, "reverse": 0, "apex": 50},
        "weaponBob": {"index": 0, "reverse": 0, "apex": 5}
      },
      "tilt": 0,
      "kneeHeight": window.__player__.KNEE_HEIGHT,
      "viewport": window.__player__.Z,
      "feet": window.__player__.Z,
      "head": 0, // re-initialized at setup
      "x": window.__player__.X,
      "y": window.__player__.Y,
      "invhead": 0,
      "invselected": 0,
    },
    "assets": {
      "sprites": {
        "menu": {
          "skull": {
            "img": new Image(),
            "name": "menu_skull.png",
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "activeFrames": [0],
            // `locOnScreen` initialized at setup
            "frames": [
              {
                "offset": 0,
                "width": 30,
                "height": 34
              },
              {
                "offset": 30,
                "width": 30,
                "height": 34
              }
            ]
          }
        },
        "playerWeapons": {
          "shotgun": {
            "img": new Image(),
            "name": "shotgun.png",
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "activeFrames": [0],
            "frames": [
              {
                "width": 237,
                "height": 180,
                "offset": 0,
                "locOnScreen": {"x": 0, "y": 0},       // initialized at setup
                "defaultLocOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 237,
                "height": 219,
                "offset": 237,
                "locOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 237,
                "height": 246,
                "offset": 474,
                "locOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 357,
                "height": 363,
                "offset": 711,
                "locOnScreen": {"x": 0, "y": 0}, // initialized at setup
                "setLocOnScreen": function(self, frame) {
                  return {"x": 0, "y": self.res[1] - frame.height};
                }
              },
              {
                "width": 261,
                "height": 453,
                "offset": 1068,
                "locOnScreen": {"x": 0, "y": 0}, // initialized at setup
                "setLocOnScreen": function(self, frame) {
                  return {"x": 0, "y": self.res[1] - frame.height};
                }
              },
              {
                "width": 339,
                "height": 393,
                "offset": 1329,
                "locOnScreen": {"x": 0, "y": 0}, // initialized at setup
                "setLocOnScreen": function(self, frame) {
                  return {"x": 0, "y": self.res[1] - frame.height};
                }
              }
            ]
          }
        },
        "images": Array(window.__sprites__.length),
        "animations": {
          "playerWeapons": {"shotgun": [1, 2, 0, 3, 4, 5, 4, 3, 0]},
          "thing": {}
        },
        "setup": function(self, keys) {
          const loadSprite = function(i, resolve, reject) {
            if (i === keys.length) return resolve(self.assets.sprites);
            const sprite = keys[i].split(".").reduce(function(acc, curr) {
              return acc[curr];
            }, self.assets.sprites);
            sprite.img.onload = function() {
              if (sprite.frames) {
                sprite.frames.forEach(function(frame) {
                  if (frame.setLocOnScreen && frame.locOnScreen) {
                    const locOnScreen = frame.setLocOnScreen(self, frame);
                    frame.locOnScreen.x = locOnScreen.x;
                    frame.locOnScreen.y = locOnScreen.y;
                  } else if (frame.locOnScreen) {
                    frame.locOnScreen.x = (self.res[0] - frame.width) * 0.5;
                    frame.locOnScreen.y = self.res[1] - frame.height * 0.75;
                  }
                  if (frame.locOnScreen && frame.defaultLocOnScreen) {
                    frame.defaultLocOnScreen.x = frame.locOnScreen.x;
                    frame.defaultLocOnScreen.y = frame.locOnScreen.y;
                  }
                });
              }
              if (Array.isArray(sprite.bitmap)) {
                sprite.bitmap = self.util.getBitmap(self, sprite.img);
                sprite.width = sprite.img.width;
                sprite.height = sprite.img.height;
                delete sprite.img;
              }
              loadSprite(i + 1, resolve, reject);
            };
            sprite.img.onerror = function() {
              reject(sprite);
            };
            sprite.img.src = fs.__sprites__ + sprite.name;
          };
          return new Promise(function(resolve, reject) {
            loadSprite(0, resolve, reject);
          });
        },
        "setupImages": function(self, names) {
          return Promise.all(names.map((name, id) =>
            new Promise(function loadSprite(resolve, reject) {
              const sprite = {
                img: new Image(),
                bitmap: undefined,
                width: 0,
                height: 0,
                name: "",
                worldHeight: 10,        // TODO
                FPS: 0,                 // TODO
                activeFrame: undefined, // TODO
                frames: []              // TODO
              };

              sprite.img.onload = function() {
                self.assets.sprites.images[id] = sprite;
                sprite.bitmap = self.util.getBitmap(self, sprite.img);
                sprite.width = sprite.img.width;
                sprite.height = sprite.img.height;
                delete sprite.img;
                resolve();
              };

              sprite.img.onerror = function() {
                reject(sprite);
              };

              sprite.name = name;
              sprite.img.src = fs.__sprites__ + name;
            }))
          ).then(() => self.assets.sprites);
        }
      },
      "textures": {
        "images": Array(window.__textures__.length),
        "sky": undefined,
        // "animations": {"w_slime": [0, 1, 2, 1, 0], "f_slime": [0, 1, 2, 1, 0]},
        "animations": {},
        "setup": function(self, names) {
          return Promise.all(names.map((name, id) =>
            new Promise(function loadTexture(resolve, reject) {
              const texture = {
                img: new Image(),
                bitmap: undefined,
                width: 0,
                height: 0,
                name: "",
                worldHeight: 10,        // TODO
                FPS: 0,                 // TODO
                activeFrame: undefined, // TODO
                frames: []              // TODO
              };

              texture.img.onload = function() {
                if (texture.name === "s_sky.png")
                  self.assets.textures.sky = texture;
                self.assets.textures.images[id] = texture;
                texture.bitmap = self.util.getBitmap(self, texture.img);
                texture.width = texture.img.width;
                texture.height = texture.img.height;
                delete texture.img;
                resolve();
              };

              texture.img.onerror = function() {
                reject(texture);
              };

              texture.name = name;
              texture.img.src = fs.__textures__ + name;
            }))
          ).then(() => self.assets.textures);
        }
      },
      "themes": {
        "main": {
          "audio": new Audio(),
          "name": "theme.mp3",
          "status": "INIT"
        },
        "setup": function(self, path) {
          const theme = path.split(".").reduce(function(acc, curr) {
            return acc[curr];
          }, self.assets.themes);
          return new Promise(function(resolve, reject) {
            theme.audio.onended = function() {
              theme.status = "READY";
              this.currentTime = 0;
              self.exec.playAudio(self, theme);
            };
            theme.audio.onerror = function() {
              theme.status = "INIT";
              reject();
            };
            theme.audio.oncanplaythrough = function() {
              theme.status = "READY";
              resolve(theme);
            };
            document.addEventListener("keydown", function() {
              self.exec.playAudio(self, theme);
            });
            theme.audio.src = fs.__audio__ + theme.name;
          });
        }
      }
    },
    "intervals": {}, // used to store global intervals
    "const": {
      "math": {
        // TODO: Make sin/cos && sqrt tables for optimization
        "RAD_TO_DEG": 180 / Math.PI,
        "RAD_90": 0.5 * Math.PI,
        "RAD_360": 2 * Math.PI,
        "CLOCKWISE": [0, 1, 3, 2]
      },
      "TYPE_TILES": {
        "FREE": 0,
        "WALL": 1,
        "WALL_DIAG": 2,
        "V_DOOR": 3,
        "H_DOOR": 4,
        "THING": 5,
        "FREEFORM": 6
      },
      "OFFSET_DIAG_WALLS": [
        [[0, 1], [1, 0]], // #/
        [[0, 0], [1, 1]], // \#
        [[1, 0], [0, 1]], // /#
        [[1, 1], [0, 0]]  // #\
      ],
      "MINIMAP_COLORS": [
        "#001027", // 0: FREE
        "#003753", // 1: WALL
        "#FFFFFF", // 2: WALL_DIAG
        "#264E73", // 3: V_DOOR
        "#264E73", // 4: H_DOOR
        "#7d9aa9", // 5: THING
        "#002138"  // 6: FREEFORM
      ],
      "WEAPONS": {"SHOTGUN": "shotgun"},
      "PLAYER_HEIGHT": 0, // initialized in setup
      "MAX_TILT": 80,
      "FLATS": 1,
      "SHOOTING_ANIM_INTERVAL": {"shotgun": 110},
      "DOOR_ANIM_INTERVAL": 20,
      "DOOR_RESET_DELAY": 3000,
      "MARGIN_TO_WALL": 0.4,
      "DRAW_DIST": 15,
      "H_SOLID_WALL": 10,
      "H_MAX_WORLD": 480,
      "R_MINIMAP": 12,
      "TILE_SIZE_MINIMAP": 4,
      "MAX_INVENTORY_SIZE": 3
    },
    "api": {
      "animation": function(self, onFrame, interval, shouldEnd, onEnd) {
        // private domain
        const uid = function(candidate) {
          const cand = candidate || "(anonymous)";
          return self.intervals[cand] ? uid(cand + "_1") : cand;
        };

        let iFrame = 0;
        const id = uid(arguments.callee.caller.name);

        const cleanUp = function() {
          clearInterval(self.intervals[id]);
          delete self.intervals[id];
          if (onEnd) onEnd();
        };

        const animate = function() {
          if (shouldEnd && shouldEnd(iFrame)) cleanUp();
          else onFrame(iFrame);
          iFrame += 1;
        };

        // public domain
        return {
          "start": function() {
            self.intervals[id] = setInterval(animate, interval);
          },
          "cancel": function() { cleanUp(); },
          "isAnimating": function() { return !!self.intervals[id]; }
        };
      }
    },
    "util": {
      "getWalkingPlayerHeight": function(self) {
        const walkingState = self.player.anim.walking;
        const index = walkingState.index + (walkingState.reverse ? 5 : -5);
        walkingState.reverse = index === -1 * walkingState.apex ? 1 : index === 0
          ? 0
          : walkingState.reverse;
        walkingState.index = index;
        return self.player.feet + self.const.PLAYER_HEIGHT + index;
      },
      "getWeaponBob": function(self) {
        const bobState = self.player.anim.weaponBob;
        const x = bobState.index + (bobState.reverse ? -0.5 : 0.5);
        const y = -1.75 * x * x;
        bobState.reverse = x === bobState.apex ? 1 : x === -1 * bobState.apex
          ? 0
          : bobState.reverse;
        bobState.index = x;
        return {"x": 4 * x, "y": y};
      },
      "normalizeAngle": function(self, angle) {
        const RAD_360 = self.const.math.RAD_360;
        return ((angle % RAD_360) + RAD_360) % RAD_360;
      },
      "rad2Deg": function(self, rad) {
        return ((rad % self.const.math.RAD_360) + self.const.math.RAD_360)
          % self.const.math.RAD_360 * self.const.math.RAD_TO_DEG;
      },
      "toFixed": function(nDigits) {
        const cNDigits = Math.pow(10, nDigits);
        return Math.round(this * cNDigits) / cNDigits;
      },
      "eucDist": function(ux, uy, vx, vy, pseudo, multiplier) {
        multiplier = multiplier ? multiplier : 1;
        const pseudoDist = ((vx - ux) * (vx - ux) + (vy - uy) * (vy - uy)) *
                           multiplier * multiplier;
        return pseudo ? pseudoDist : Math.sqrt(pseudoDist);
      },
      "clamp": function(number, lower, upper) {
        return Math.min(Math.max(number, lower), upper);
      },
      "getIntersect": function(l0x0, l0y0, l0x1, l0y1, l1x0, l1y0, l1x1, l1y1, seg) {
        const vec2dCross = (u, v) => u[0] * v[1] - u[1] * v[0]; // FIXME: remove as a separate function
        const l0 = [l0x1 - l0x0, l0y1 - l0y0], l1 = [l1x1 - l1x0, l1y1 - l1y0];
        const denom = vec2dCross(l0, l1);
        const numer = [l1x0 - l0x0, l1y0 - l0y0];
        const X = vec2dCross(numer, l1) / denom, safeX = X.toFixedNum(5);
        if (seg) {
          const Y = vec2dCross(numer, l0) / denom, safeY = Y.toFixedNum(5);
          // if given vectors l0 and l1 are line segments, their intersection
          // parameters X and Y must be within the range [0, 1], that is,
          // the point of intersection must be sitting on both line segments
          if (safeX < 0 || safeX > 1 || safeY < 0 || safeY > 1) return;
        }
        // if the vectors do not intersect at a single point, they are either
        // parallel or on the same line – thus, return early
        if (!Number.isFinite(X)) return;
        return [l0x0 + X * l0[0], l0y0 + X * l0[1]];
      },
      "isOnTheLeft": function(x0, y0, x1, y1, x, y) {
          return ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)).toFixedNum(5) < 0;
      },
      "collision": {
        "pointVsRect": function(xr, yr, w, h, x, y) {
          return x > xr && x < xr + w && y > yr && y < yr + h;
        },
        "pointVsPolygon": function(self, x, y, linedefs) {
          const getIntersect = self.util.getIntersect;
          const nLines = linedefs.length;
          let nColls = 0;
          for (let i = 0; i < nLines; ++i) {
            const v0 = linedefs[i][0], v1 = linedefs[i][1];
            const x0 = v0[0], y0 = v0[1], x1 = v1[0], y1 = v1[1];
            const colln = getIntersect(x, y, x || -1, y, x0, y0, x1, y1, 1);
            if (!colln) continue;
            /* determine if the collision classifies as an "inside" collision */
            const collnX = colln[0], collnY = colln[1];
            if (
              // if the intersection is on either one of the vertices of the
              // polygon edge, the other vertex of the edge should be situated
              // below the ray, for the collision to count as "inside"
              collnX === x0 && collnY === y0 && y0 < y1 ||
              collnX === x1 && collnY === y1 && y0 > y1 ||
              // the collision is "inside" if the intersection is on neither
              // one of the vertices of the polygon edge
              (collnX !== x0 || collnY !== y0) &&
              (collnX !== x1 || collnY !== y1)
            ) ++nColls;
          }
          return nColls & 1;
        },
        "rectVsRect": function(x0, y0, w0, h0, x1, y1, w1, h1) {
          /* TODO: could there have been a better way so that we could avoid
           * `toFixedNum`ing every step of the way?
           */
          const X0 = x0.toFixedNum(5), Y0 = y0.toFixedNum(5);
          const X1 = x1.toFixedNum(5), Y1 = y1.toFixedNum(5);
          return X0 + w0 > X1 && X1 + w1 > X0 && Y0 + h0 > Y1 && Y1 + h1 > Y0;
        },
        "pointVsTileHeight": function(self, x, y, tx, ty, tw, th) {
          const MAP_LEGEND = self.mapLegend;
          const TYPE_TILES = self.const.TYPE_TILES;
          const H_MAX_WORLD = self.const.H_MAX_WORLD;
          const clamp = self.util.clamp;
          /* */
          const tile = self.map[self.nCols * Math.floor(ty) + Math.floor(tx)];
          if (tile[MAP_LEGEND.TYPE_TILE] !== TYPE_TILES.FREEFORM) return [0, 0];
          /* */
          const H_MAX_WORLD_10 = H_MAX_WORLD * 0.1;
          const isVerticalSlope = tile[MAP_LEGEND.FFT_SLOPE_DIR];
          const floorStart = tile[MAP_LEGEND.H_FFT_LOWER_SLOPE_START];
          const floorEnd = tile[MAP_LEGEND.H_FFT_LOWER_SLOPE_END];
          const deltaFloor = floorEnd - floorStart;
          const ceilStart = tile[MAP_LEGEND.H_FFT_UPPER_SLOPE_START];
          const ceilEnd = tile[MAP_LEGEND.H_FFT_UPPER_SLOPE_END];
          const deltaCeil = ceilEnd - ceilStart;
          const offset = isVerticalSlope
            ? clamp((y - ty) / th, 0, 1)
            : clamp((x - tx) / tw, 0, 1);
          return [(floorStart + offset * deltaFloor) * H_MAX_WORLD_10,
                  (ceilStart + offset * deltaCeil) * H_MAX_WORLD_10];
        },
        "rectVsMapHeight": function(self, x, y, w, h) {
          const MAP_LEGEND = self.mapLegend;
          const TYPE_TILES = self.const.TYPE_TILES;
          const CLOCKWISE = self.const.math.CLOCKWISE;
          const rectVsRect = self.util.collision.rectVsRect;
          const pointVsTileHeight = self.util.collision.pointVsTileHeight;
          /* */
          let maxHeight = 0;
          for (let i = 0; i < 4; ++i) {
            const vx = x + ((CLOCKWISE[i] & 1) ? w : 0);
            const vy = y + ((CLOCKWISE[i] & 2) ? h : 0);
            /* */
            const tx = Math.floor(vx), ty = Math.floor(vy);
            const tile = self.map[self.nCols * ty + tx];
            // bounds-check
            if (!(tile && tile[MAP_LEGEND.TYPE_TILE] === TYPE_TILES.FREEFORM))
              continue;
            /* */
            const tX = tx + tile[MAP_LEGEND.MARGIN_FFT_X] * 0.1;
            const tY = ty + tile[MAP_LEGEND.MARGIN_FFT_Y] * 0.1;
            const tW = tile[MAP_LEGEND.LEN_FFT_X] * 0.1;
            const tH = tile[MAP_LEGEND.LEN_FFT_Y] * 0.1;
            if (!rectVsRect(x, y, w, h, tX, tY, tW, tH)) continue;
            /* */
            const height = pointVsTileHeight(self, vx, vy, tX, tY, tW, tH)[0];
            maxHeight = Math.max(height, maxHeight);
          }
          return maxHeight;
        },
        "vectorVsMap": function(self, px, py, sx, sy, dx, dy) {
          const N_COLS = self.nCols, N_ROWS = self.nRows;
          const MAP = self.map;
          const MAP_LEGEND = self.mapLegend;
          const TYPE_TILES = self.const.TYPE_TILES;
          const OFFSET_DIAG_WALLS = self.const.OFFSET_DIAG_WALLS;
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const KNEE_HEIGHT = self.player.kneeHeight;
          const PLAYER_HEIGHT = self.const.PLAYER_HEIGHT;
          const CLOCKWISE = self.const.math.CLOCKWISE;
          const pointVsRect = self.util.collision.pointVsRect;
          const eucDist = self.util.eucDist;
          const getIntersect = self.util.getIntersect;
          const isOnTheLeft = self.util.isOnTheLeft;
          const isBlockingMapCell = self.util.isBlockingMapCell;
          const pointVsTileHeight = self.util.collision.pointVsTileHeight;
          /* calculate the properties for the movement ray */
          const deltaX = dx - sx, deltaY = dy - sy;
          const rayDirX = Math.sign(deltaX), rayDirY = Math.sign(deltaY);
          const raySlope = deltaY / deltaX, raySlope_ = deltaX / deltaY;
          // start casting the movement ray from the starting position
          let hitX = sx, hitY = sy;
          let tileX = Math.floor(hitX), tileY = Math.floor(hitY);
          /* vertical & horizontal tracers:
           * iterate over vertical and horizontal grid lines that intersect
           * with the movement ray
           */
          let vTraceX = rayDirX > 0 ? Math.floor(sx + 1) : tileX;
          let vTraceY = sy + (vTraceX - sx) * raySlope;
          let hTraceY = rayDirY > 0 ? Math.floor(sy + 1) : tileY;
          let hTraceX = sx + (hTraceY - sy) * raySlope_;
          /* how much each tracer will advance at each iteration */
          const vStepX = rayDirX, vStepY = vStepX * raySlope;
          const hStepY = rayDirY, hStepX = hStepY * raySlope_;
          let distCovered = 0; // the distance covered by the "closer" tracer
          let hitSolid = 0; // whether we hit a solid geometry or not
          let isVerticalHit;
          // how much distance the step the player took will cover
          const distanceToCover = eucDist(sx, sy, dx, dy, 1);
          /* the tile data we are currently inspecting */
          let tile = MAP[N_COLS * tileY + tileX];
          let typeTile;
          if (tile) typeTile = tile[MAP_LEGEND.TYPE_TILE]; // bounds-check
          else hitSolid = 1;                               //
          while (!hitSolid && distCovered < distanceToCover &&
                 pointVsRect(-1, -1, N_COLS + 1, N_ROWS + 1, tileX, tileY)) {
            hitSolid = isBlockingMapCell(self, tileX, tileY) ? 1 : 0;
            if (typeTile === TYPE_TILES.WALL_DIAG) {
              const dOffsets = OFFSET_DIAG_WALLS[tile[MAP_LEGEND.FACE_DIAG]];
              const x0 = tileX + dOffsets[0][0], y0 = tileY + dOffsets[0][1];
              const x1 = tileX + dOffsets[1][0], y1 = tileY + dOffsets[1][1];
              /* check all 4 vertices of the player AABB against collisions with
               * the diagonal wall when moving towards the goal
               */
              let iGX, iGY, distTrespassEarlistHit;
              for (let i = 0; i < 4; ++i) {
                const offsetX = MARGIN_TO_WALL * ((CLOCKWISE[i] & 1) ? 1 : -1);
                const offsetY = MARGIN_TO_WALL * ((CLOCKWISE[i] & 2) ? 1 : -1);
                const iDX = px + deltaX + offsetX, iDY = py + deltaY + offsetY;
                const isDInside = isOnTheLeft(x0, y0, x1, y1, iDX, iDY);
                /* is the player attempting to clip through the diagonal wall? */
                if (isDInside) {
                  const iSX = iDX - deltaX, iSY = iDY - deltaY;
                  const isect = getIntersect(x0, y0, x1, y1, iSX, iSY, iDX, iDY);
                  /* FIXME: do not skip resolving, maybe, come up with a better
                   * resolution approach??
                   */
                  // if the movement vector and the diagonal wall are parallel
                  if (!isect) continue;
                  const isectX = isect[0], isectY = isect[1];
                  // how far did the current vertex clipped through (trespassed)
                  // the diagonal wall
                  const distTrespass = eucDist(isectX, isectY, iDX, iDY);
                  /* we need to resolve the collision for the vertex that had
                   * clipped the farthest through the diagonal wall, as the
                   * farther a vertex has trespassed the diagonal wall, the
                   * earlier it must have collided with it
                   */
                  if ((distTrespassEarlistHit || 0) < distTrespass) {
                    distTrespassEarlistHit = distTrespass;
                    hitX = isectX; hitY = isectY;
                    iGX = iDX; iGY = iDY;
                  }
                }
              }
              /* if a valid collision has been found, calculate the normal
               * on the surface of the diagonal wall, and return immediately
               */
              if (distTrespassEarlistHit)
                // TODO: generalize for other rotations of non-axis-aligned walls
                return [Math.SQRT1_2 * (y0 - y1), Math.SQRT1_2 * (x1 - x0),
                        hitX, hitY, iGX, iGY];
              // no collisions has been found, continue with the ray-casting
              hitSolid = 0;
            } else if (typeTile === TYPE_TILES.FREEFORM) {
              // TODO: detect freeform tile collisions
              /* calculate the "virtual" bounds of the free-form tile */
              const tX = tileX + tile[MAP_LEGEND.MARGIN_FFT_X] * 0.1 - MARGIN_TO_WALL;
              const tY = tileY + tile[MAP_LEGEND.MARGIN_FFT_Y] * 0.1 - MARGIN_TO_WALL;
              const tW = tile[MAP_LEGEND.LEN_FFT_X] * 0.1 + 2 * MARGIN_TO_WALL;
              const tH = tile[MAP_LEGEND.LEN_FFT_Y] * 0.1 + 2 * MARGIN_TO_WALL;
              /* is the player (potentially) attempting to clip through the
               * free-form tile?
               */
              const gx = px + deltaX, gy = py + deltaY;
              let isXTrespassing, isYTrespassing;
              if (rayDirX > 0) isXTrespassing = gx > tX;
              else if (rayDirX < 0) isXTrespassing = gx < tX + tW;
              else isXTrespassing = gx > tX && gx < tX + tW;
              if (rayDirY > 0) isYTrespassing = gy > tY;
              else if (rayDirY < 0) isYTrespassing = gy < tY + tH;
              else isYTrespassing = gy > tY && gy < tY + tH;
              /* */
              if (isXTrespassing && isYTrespassing) {
                /* */
                let vX, vSY, vEY;
                if (rayDirX > 0) { vX = tX; vSY = tY; vEY = tY + tH; }
                else if (rayDirX < 0) { vX = tX + tW; vSY = tY + tH; vEY = tY; }
                /* */
                let hSX, hEX, hY;
                if (rayDirY > 0) { hSX = tX + tW; hEX = tX; hY = tY; }
                else if (rayDirY < 0) { hSX = tX; hEX = tX + tW; hY = tY + tH; }
                /* */
                let horizontalHit, verticalHit, fftHit, isVerticalFFTHit = 0;
                if (rayDirX)
                  verticalHit = getIntersect(vX, vSY, vX, vEY,
                                             px, py, gx, gy, 1);
                if (rayDirY)
                  horizontalHit = getIntersect(hSX, hY, hEX, hY,
                                               px, py, gx, gy, 1);
                /* corner case */
                if (verticalHit && horizontalHit) {
                  // FIXME: `isBlockingMapCell` may not cut it here unless the tile
                  // being tested against is a solid tile
                  if (isBlockingMapCell(self, px + rayDirX, py)) {
                    fftHit = verticalHit;
                    isVerticalFFTHit = 1;
                  }
                  else fftHit = horizontalHit;
                } else if (verticalHit) {
                  fftHit = verticalHit;
                  isVerticalFFTHit = 1;
                }
                else if (horizontalHit)
                  fftHit = horizontalHit;
                /* */
                if (fftHit) {
                  // const adjX = vX + rayDirX * MARGIN_TO_WALL;
                  // const adjY = hY + rayDirY * MARGIN_TO_WALL;
                  // fftHit = isVerticalFFTHit
                  //   ? getIntersect(sx, sy, dx, dy, adjX, vSY, adjX, vEY)
                  //   : getIntersect(sx, sy, dx, dy, hSX, adjY, hEX, adjY);
                  const heights = pointVsTileHeight(self, fftHit[0], fftHit[1],
                                                    tX + MARGIN_TO_WALL,
                                                    tY + MARGIN_TO_WALL,
                                                    tW - 2 * MARGIN_TO_WALL,
                                                    tH - 2 * MARGIN_TO_WALL);
                  const yFloor = heights[0];
                  const yCeil = self.const.H_MAX_WORLD - heights[1];
                  const walkApex = self.player.anim.walking.apex;
                  /* */
                  if (yFloor - self.player.feet > KNEE_HEIGHT ||
                      yFloor + PLAYER_HEIGHT + walkApex > yCeil)
                    return isVerticalFFTHit
                        ? [-rayDirX, 0, fftHit[0], fftHit[1], gx, gy]
                        : [0, -rayDirY, fftHit[0], fftHit[1], gx, gy];
                        // ? [-rayDirX, 0, fftHit[0], fftHit[1]]
                        // : [0, -rayDirY, fftHit[0], fftHit[1]];
                }
              }
              // no collisions has been found, continue with the ray-casting
              hitSolid = 0;
            }
            /* advance tracers unless a solid geometry has been already hit */
            if (!hitSolid) {
              /* calculate the distances covered on the ray by each tracer */
              const vDist = eucDist(sx, sy, vTraceX, vTraceY, 1);
              const hDist = eucDist(sx, sy, hTraceX, hTraceY, 1);
              /* determine whether the hit is on the vertical axis */
              isVerticalHit = Number.isNaN(vDist) || vDist > hDist
                ? 0
                : vDist === hDist ? isVerticalHit : 1;
              distCovered = isVerticalHit ? vDist : hDist;
              // just break out of the loop if we're past the goal point
              if (distCovered >= distanceToCover) continue;
              if (isVerticalHit) {
                hitX = vTraceX; hitY = vTraceY; // hit by vertical tracer
                vTraceX += vStepX; vTraceY += vStepY; // advance the tracer
                tileX += rayDirX; // advance vertically to the next tile
              } else {
                hitX = hTraceX; hitY = hTraceY; // hit by horizontal tracer
                hTraceX += hStepX; hTraceY += hStepY; // advance the tracer
                tileY += rayDirY; // advance horizontally to the next tile
              }
              // bounds-check
              if (0 <= tileX && tileX < N_COLS && 0 <= tileY && tileY < N_ROWS)
              {
                tile = MAP[N_COLS * tileY + tileX];
                typeTile = tile[MAP_LEGEND.TYPE_TILE];
              }
              else
              {
                hitSolid = 1;
              }
            }
          }
          if (!hitSolid) return; // early return if there was no collision
          /* the ray hit a solid wall, calculate the unit normal of the
           * collided geometry
           */
          let normalX = 0, normalY = 0;
          const testX = hitX.toFixedNum(5), testY = hitY.toFixedNum(5);
          const isHitOnVertical = (testX === tileX || testX === tileX + 1) &&
                                  (px - testX) * rayDirX <= 0;
          const isHitOnHorizontal = (testY === tileY || testY === tileY + 1) &&
                                    (py - testY) * rayDirY <= 0;
          if (isHitOnVertical && rayDirX) {
            /* CORNER CASE: if the movement vector collides with a corner of the
             * tile, resolve the collision against the other axis of the
             * movement vector unless that would cause another collision
             */
            // FIXME: `isBlockingMapCell` may not cut it here unless the tile
            // being tested against is a solid tile
            if (isHitOnHorizontal && !isBlockingMapCell(self, px + rayDirX, py))
              normalY -= rayDirY;
            // EDGE CASE: resolve collision against the vertical edge of the
            // tile that has been hit
            else normalX -= rayDirX;
          } else if (isHitOnHorizontal && rayDirY) {
            /* CORNER CASE: the same as above */
            // FIXME: `isBlockingMapCell` may not cut it here unless the tile
            // being tested against is a solid tile
            if (isHitOnVertical && !isBlockingMapCell(self, px, py + rayDirY))
              normalX -= rayDirX;
            // EDGE CASE: resolve collision against the horizontal edge of the
            // tile that has been hit
            else normalY -= rayDirY;
          }
          // return `undefined` if the normal vector is of zero length, as that
          // means there's actually no collisions to resolve
          if (!(normalX || normalY)) return;
          return [normalX, normalY, testX, testY];
        },
        "collisionResponse": function(self, px, py, gx, gy) {
          const CLOCKWISE = self.const.math.CLOCKWISE;
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const eucDist = self.util.eucDist;
          const vectorVsMap = self.util.collision.vectorVsMap;
          const rectVsMapHeight = self.util.collision.rectVsMapHeight;
          const collisionResponse = self.util.collision.collisionResponse;
          /* check all 4 vertices of the player AABB against collisions along
           * the movement vector
           */
          const vx = gx - px, vy = gy - py;
          /* use the first vertex of the player AABB that collides with a
           * blocking geometry to resolve the collision
           */
          let goalX, goalY, closestCollision, distTrespassEarlistHit;
          for (let i = 0; i < 4; ++i) {
            const offsetX = MARGIN_TO_WALL * ((CLOCKWISE[i] & 1) ? 1 : -1);
            const offsetY = MARGIN_TO_WALL * ((CLOCKWISE[i] & 2) ? 1 : -1);
            const sx = px + offsetX, sy = py + offsetY;
            let dx = sx + vx, dy = sy + vy;
            const collision = vectorVsMap(self, px, py, sx, sy, dx, dy);
            if (collision) {
              const hitX = collision[2], hitY = collision[3];
              /* if the 4th and 5th elements in the collision data are occupied,
               * that means the actual collision had occurred at some other
               * vertex of player AABB than the current (ith) vertex
               */
              if (Number.isFinite(collision[4]) &&
                  Number.isFinite(collision[5])) {
                dx = collision[4]; dy = collision[5];
              }
              const distTrespass = eucDist(hitX, hitY, dx, dy, 1);
              if ((distTrespassEarlistHit || 0) < distTrespass) {
                distTrespassEarlistHit = distTrespass;
                closestCollision = collision;
                goalX = dx; goalY = dy;
              }
            }
          }
          /* return the goal position, i.e., the position to travel to had there
           * been no collisions whatsoever
           */
          if (!closestCollision)
            return [gx, gy, rectVsMapHeight(self,
                                            gx - MARGIN_TO_WALL,
                                            gy - MARGIN_TO_WALL,
                                            MARGIN_TO_WALL * 2,
                                            MARGIN_TO_WALL * 2)];
          /* resolve the collision with the sliding-against-the-wall response */
          const normalX = closestCollision[0], normalY = closestCollision[1];
          const hitX = closestCollision[2], hitY = closestCollision[3];
          const lenRes = (hitX - goalX) * normalX + (hitY - goalY) * normalY;
          const resolveX = normalX * lenRes, resolveY = normalY * lenRes;
          const newX = gx + resolveX, newY = gy + resolveY;
          // FIXME: consider converting this routine into a loop, instead of
          // using recursion
          // repeat the process recursively until all collisions are resolved
          return collisionResponse(self, px, py, newX, newY);
        }
      },
      "isBlockingMapCell": function(self, x, y, pickable = 0) {
        const N_COLS = self.nCols, N_ROWS = self.nRows;
        const X = Math.floor(x), Y = Math.floor(y);
        // bounds-check
        if (X < 0 || X >= N_COLS || Y < 0 || Y >= N_ROWS) return true;
        const typeCell = self.map[self.nCols * Y + X][self.mapLegend.TYPE_TILE];
        return typeCell === self.const.TYPE_TILES.WALL ||
          typeCell === self.const.TYPE_TILES.WALL_DIAG ||
          (!pickable && typeCell === self.const.TYPE_TILES.FREEFORM) ||
          typeCell === self.const.TYPE_TILES.THING ||
          (typeCell === self.const.TYPE_TILES.V_DOOR ||
            typeCell === self.const.TYPE_TILES.H_DOOR) &&
            (self.doors[self.util.coords2Key(X, Y)].state || pickable);
      },
      "getThingCollnData": function(self, player, pTile, pHit, vRay) {
        const THING_TYPE = self.const.TYPE_TILES.THING;
        const MAP_LEGEND = self.mapLegend;
        const MAP_TILE_SIZE = self.MAP_TILE_SIZE;
        const H_MAX_WORLD = self.const.H_MAX_WORLD;
        const pointVsRect = self.util.collision.pointVsRect;
        const getIntersect = self.util.getIntersect;
        const isOnTheLeft = self.util.isOnTheLeft;
        const eucDist = self.util.eucDist;

        const playerX = player.x, playerY = player.y;
        const playerRot = player.rotation;
        const tileX = pTile.x, tileY = pTile.y;
        let hitX = pHit.x, hitY = pHit.y;
        /* HACK: for correctly calculating the intersection when the player is
         * currently situated in the thing tile
         */
        if (vRay) {
          const rayX = vRay.x, rayY = vRay.y;
          const raySlope = rayY / rayX, raySlope_ = rayX / rayY;
          const rayDirX = Math.sign(rayX), rayDirY = Math.sign(rayY);
          if (Math.abs(raySlope) < 1) {
            hitX += rayDirX; hitY += rayDirX * raySlope;
          } else {
            hitY += rayDirY; hitX += rayDirY * raySlope_;
          }
        }
        // the pivot around which the thing should rotate
        const pivotX = tileX + 0.5, pivotY = tileY + 0.5;
        const tile = self.map[self.nCols * tileY + tileX]; // read the tile data
        /* the sprite should always be perfectly facing the player */
        const playerRotX = Math.cos(playerRot);
        const playerRotY = Math.sin(playerRot);
        const thingSlope = 0 - playerRotX / playerRotY;
        const thingSlope_ = 0 - playerRotY / playerRotX;
        // whether the sprite intersects with the tile on the horizontal axis
        const isHorizHit = Math.abs(thingSlope) > 1;
        let intersect; // where the current ray hits the sprite
        if (isHorizHit) {
          const deltaX = 0.5 * thingSlope_;
          intersect = getIntersect(playerX, playerY, hitX, hitY,
                                   pivotX - deltaX, tileY,
                                   pivotX + deltaX, tileY + 1,
                                   vRay ? 1 : 0);
        } else {
          const deltaY = 0.5 * thingSlope;
          intersect = getIntersect(playerX, playerY, hitX, hitY,
                                   tileX, pivotY - deltaY,
                                   tileX + 1, pivotY + deltaY,
                                   vRay ? 1 : 0);
        }
        /* proceed only if the sprite is actually hit */
        if (!intersect) return;
        const intersectX = intersect[0], intersectY = intersect[1];
        if (!pointVsRect(tileX, tileY, 1, 1, intersectX, intersectY)) return;
        const distToSprite = eucDist(playerX, playerY, intersectX, intersectY,
                                     1, MAP_TILE_SIZE);
        // the world-height of the thing
        const hThing = tile[MAP_LEGEND.WOH] * 0.1 * H_MAX_WORLD;
        const sprite = self.assets.sprites.images[tile[MAP_LEGEND.WOTYPE]];
        let offsetLeft; // the sampling offset for the thing sprite
        let intsectTile0X, intsectTile0Y, intsectTile1X, intsectTile1Y;
        if (isHorizHit) {
          /* where exactly does the slope of the thing hit the north and south
           * faces of the tile?
           */
          intsectTile0Y = tileY; intsectTile1Y = tileY + 1;
          intsectTile0X = pivotX - 0.5 * thingSlope_;
          intsectTile1X = tileX + 1 - (intsectTile0X - tileX);
        } else {
          /* where exactly does the slope of the thing hit the west and east
           * faces of the tile?
           */
          intsectTile0X = tileX, intsectTile1X = tileX + 1;
          intsectTile0Y = pivotY - 0.5 * thingSlope;
          intsectTile1Y = tileY + 1 - (intsectTile0Y - tileY);
        }
        /* determine on which side of the thing the player is currently
         * standing, to be able to determine the starting and ending vertices
         * of the thing
         */
        const isStandingOnTheLeft = isOnTheLeft(intsectTile0X, intsectTile0Y,
                                                intsectTile1X, intsectTile1Y,
                                                playerX, playerY);
        let startThingX, startThingY, endThingX, endThingY;
        if (isStandingOnTheLeft) {
          startThingX = intsectTile1X; startThingY = intsectTile1Y;
          endThingX = intsectTile0X; endThingY = intsectTile0Y;
        } else {
          startThingX = intsectTile0X; startThingY = intsectTile0Y;
          endThingX = intsectTile1X; endThingY = intsectTile1Y;
        }
        // the distance between the starting and ending vertices of the thing
        const lenBeam = eucDist(startThingX, startThingY, endThingX, endThingY);
        // the distance between the starting vertex of the thing and the
        // point of intersection of the current ray and the thing
        const lenCovered = eucDist(startThingX, startThingY,
                                   intersectX, intersectY);
        /* restrict the length of the thing to the unit length */
        const spriteStart = (lenBeam - 1) * 0.5;
        const spriteEnd = (lenBeam + 1) * 0.5;
        if (lenCovered >= spriteStart && lenCovered < spriteEnd)
          offsetLeft = lenCovered - spriteStart;
        // do not sample if the current ray does not intersect with the sprite
        // dead-on
        else return;
        return {
          type: THING_TYPE,
          meta: { slope: thingSlope, passesThru: { x: pivotX, y: pivotY } },
          height: hThing,
          pseudoDistToPlayer: distToSprite,
          offsetLeft: offsetLeft,
          sprite: sprite
        };
      },
      // FIXME: refactor & dissect this function into reasonable sub-routines
      "getFreeformTileCollnData": function(self, pPlayer, pTile, ray) {
        const pointVsTileHeight = self.util.collision.pointVsTileHeight;
        // read tile data
        const tile = self.map[self.nCols * pTile.y + pTile.x];
        const tMargX = tile[self.mapLegend.MARGIN_FFT_X] * 0.1;
        const tMargY = tile[self.mapLegend.MARGIN_FFT_Y] * 0.1;
        const tLenX = tile[self.mapLegend.LEN_FFT_X] * 0.1;
        const tLenY = tile[self.mapLegend.LEN_FFT_Y] * 0.1;
        // check for collisions with the freeform tile
        const intersections = [];
        const collNY = pTile.y + tMargY;
        const collNX = pPlayer.x + (collNY - pPlayer.y) / ray.slope;
        const collEX = pTile.x + tMargX + tLenX;
        const collEY = pPlayer.y + (collEX - pPlayer.x) * ray.slope;
        const collSY = pTile.y + tMargY + tLenY;
        const collSX = pPlayer.x + (collSY - pPlayer.y) / ray.slope;
        const collWX = pTile.x + tMargX;
        const collWY = pPlayer.y + (collWX - pPlayer.x) * ray.slope;
        if (collNX >= pTile.x + tMargX && collNX < pTile.x + tMargX + tLenX) intersections.push([collNX, collNY]);
        if (collEY >= pTile.y + tMargY && collEY < pTile.y + tMargY + tLenY) intersections.push([collEX, collEY]);
        if (collSX >= pTile.x + tMargX && collSX < pTile.x + tMargX + tLenX) intersections.push([collSX, collSY]);
        if (collWY >= pTile.y + tMargY && collWY < pTile.y + tMargY + tLenY) intersections.push([collWX, collWY]);
        // early return if there were no collisions with the tile
        if (intersections.length < 2) return;

        // comparing either one of the direction components will suffice because
        // the sign of the other component will always conform to ray's slope
        const signRayDirX = Math.sign(ray.dir.x);
        const signCollnX = Math.sign(intersections[0][0] - intersections[1][0]);
        // sort points of intersection:
        // index 0: front-wall intersection, index 1: rear-wall instersection
        if (signRayDirX === signCollnX) {
          const aux = intersections[0];
          intersections[0] = intersections[1];
          intersections[1] = aux;
        }

        // check if player is right below/above the freeform tile
        const isInTile = self.util.collision.pointVsRect(pTile.x + tMargX,
                                                         pTile.y + tMargY,
                                                         tLenX,
                                                         tLenY,
                                                         pPlayer.x,
                                                         pPlayer.y);

        // determine edges hit
        const hitF = intersections[0], hitR = intersections[1];
        const hitType_F = hitF[0] === pTile.x + tMargX ||
            hitF[0] === pTile.x + tMargX + tLenX
          ? "vertical"
          : "horizontal";
        // unused
        // const hitType_R = hitR[0] === pTile.x + tMargX ||
        //     hitR[0] === pTile.x + tMargX + tLenX
        //   ? "vertical"
        //   : "horizontal";

        // calculate distance(s) to edge(s) hit
        const pseudoDistF = self.util.eucDist(
          pPlayer.x,
          pPlayer.y,
          hitF[0],
          hitF[1],
          true,
          self.MAP_TILE_SIZE
        );
        const pseudoDistR = self.util.eucDist(
          pPlayer.x,
          pPlayer.y,
          hitR[0],
          hitR[1],
          true,
          self.MAP_TILE_SIZE
        );

        // calculate the horizontal offset for the sampling of the wall texture
        const texWall =
          self.assets.textures.images[tile[self.mapLegend.TEX_FFT_WALL]];

        let offsetLeft;
        switch (hitType_F) {
          case "vertical":
            offsetLeft =       // TODO 👇
              (texWall[hitType_F]?.offset ?? 0) + texWall.width /
                tLenY * (hitF[0] === pTile.x + tMargX
                  ? hitF[1] - pTile.y - tMargY
                  : pTile.y + tMargY + tLenY - hitF[1]);
            break;

          case "horizontal":
            offsetLeft =        // TODO 👇
              (texWall[hitType_F]?.offset ?? 0) + texWall.width /
                tLenX * (hitF[0] - pTile.x - tMargX);
            break;

          default:
            break;
        }

        const texCeil =
          self.assets.textures.images[tile[self.mapLegend.TEX_FFT_CEIL]];
        const texFloor =
          self.assets.textures.images[tile[self.mapLegend.TEX_FFT_FLOOR]];

        const tx = pTile.x + tMargX, ty = pTile.y + tMargY;
        const heights_F = pointVsTileHeight(self, hitF[0], hitF[1],
                                            tx, ty, tLenX, tLenY);
        const heights_R = pointVsTileHeight(self, hitR[0], hitR[1],
                                            tx, ty, tLenX, tLenY);

        return {
          "shouldTryVisplanes": isInTile || pseudoDistF < pseudoDistR,
          "shouldTryWall": !isInTile && pseudoDistF < pseudoDistR,
          "hUpper": [heights_F[1], heights_R[1]],
          "hLower": [heights_F[0], heights_R[0]],
          "meta": {"isInTile": isInTile, "pTile": pTile},
          "offsetLeft": offsetLeft,
          /* falling back to a distance of 1 here to avoid divide-by-zero
           * when projecting to screen coordinates
           */
          "pseudoDistToPlayer": pseudoDistF || 1,
          "pseudoDistToPlayerRear": pseudoDistR || 1,
          "textures": [texCeil, texWall, texFloor],
          "type": self.const.TYPE_TILES.FREEFORM
        };
      },
      "getBitmap": function(self, img) {
        const buffCanvas = document.createElement("canvas");
        const buffCtx = buffCanvas.getContext("2d");
        const imgWidth = img.width, imgHeight = img.height;
        buffCanvas.width = imgWidth; buffCanvas.height = imgHeight;
        buffCtx.drawImage(img, 0, 0);
        return self.util.transposeBitmap(
          buffCtx.getImageData(0, 0, imgWidth, imgHeight).data,
          imgWidth, imgHeight
        );
      },
      "transposeBitmap": function(bitmap, w, h) {
        const bitmapTransposed = new Uint8ClampedArray(4 * w * h);
        for (let x = 0; x < w; x += 1) {
          for (let y = 0; y < h; y += 1) {
            const idxTransposed = 4 * (h * x + y);
            const idxNormal = 4 * (w * y + x);
            bitmapTransposed[idxTransposed] = bitmap[idxNormal];
            bitmapTransposed[idxTransposed + 1] = bitmap[idxNormal + 1];
            bitmapTransposed[idxTransposed + 2] = bitmap[idxNormal + 2];
            bitmapTransposed[idxTransposed + 3] = bitmap[idxNormal + 3];
          }
        }
        return bitmapTransposed;
      },
      "deepcopy": function(obj) {
        const clone = function(object) {
          const cloned = Array.isArray(object)
            ? []
            : typeof({}) === typeof(object)
              ? {}
              : object;
          for (const key in object) {
            if (object.hasOwnProperty(key)) {
              const prop = object[key];
              if (typeof(prop) === typeof({})) cloned[key] = clone(prop);
              else cloned[key] = prop;
            }
          }
          return cloned;
        };
        return clone(obj);
      },
      "merge": function(self) {
        const mergeTwo = function(accumulator, current) {
          const local = self.util.deepcopy(accumulator) ||
            (Array.isArray(current) ? [] : {});
          for (const key in current) {
            if (current.hasOwnProperty(key)) {
              const prop = current[key];
              if (typeof(prop) === typeof({}))
                local[key] = mergeTwo(local[key], current[key]);
              else local[key] = prop;
            }
          }
          return local;
        };
        return Array.prototype.slice.call(arguments, 1).reduce(
          function(acc, curr) {
            return mergeTwo(acc, curr);
          },
          {}
        );
      },
      "coords2Key": function() {
        return arguments.length === 1
          ? arguments[0].x.toString() + "_" + arguments[0].y.toString()
          : arguments[0].toString() + "_" + arguments[1].toString();
      },
      "handleAsyncKeyState": function(self, type, key) {
        if (type !== "keydown" && type !== "keyup") return;
        const pressing = type === "keydown";
        switch (key) {
          case 49: self.keyState["1"] = pressing ? 1 : 0; break;
          case 50: self.keyState["2"] = pressing ? 1 : 0; break;
          case 51: self.keyState["3"] = pressing ? 1 : 0; break;
          case 87: self.keyState.W = pressing ? 1 : 0; break;
          case 65: self.keyState.A = pressing ? 1 : 0; break;
          case 83: self.keyState.S = pressing ? 1 : 0; break;
          case 68: self.keyState.D = pressing ? 1 : 0; break;
          case 81: self.keyState.Q = pressing ? 1 : 0; break;
          case 69: self.keyState.E = pressing ? 1 : 0; break;
          case 32: self.keyState.SPC = pressing ? 1 : 0; break;
          case 13: self.keyState.RTN = pressing ? 1 : 0; break;
          case 37: self.keyState.ARW_LEFT = pressing ? 1 : 0; break;
          case 38: self.keyState.ARW_UP = pressing ? 1 : 0; break;
          case 39: self.keyState.ARW_RIGHT = pressing ? 1 : 0; break;
          case 40: self.keyState.ARW_DOWN = pressing ? 1 : 0; break;
          default: break;
        }
      },
      "handleAsyncMouseButtonState": function(self, type, button) {
        if (type !== "mousedown" && type !== "mouseup") return;
        const pressing = type === "mousedown";
        switch (button) {
          case 0: self.mouseButtonState.LEFT = pressing ? 1 : 0; break;
          case 1: self.mouseButtonState.MIDDLE = pressing ? 1 : 0; break;
          case 2: self.mouseButtonState.RIGHT = pressing ? 1 : 0; break;
          case 3: self.mouseButtonState.BRWS_BWD = pressing ? 1 : 0; break;
          case 4: self.mouseButtonState.BRWS_FWD = pressing ? 1 : 0; break;
          default: break;
        }
      },
      "populateDoors": function(self) {
        const N_COLS = self.nCols, N_ROWS = self.nRows;
        const TYPE_TILE = self.mapLegend.TYPE_TILE;
        const TYPE_TILES = self.const.TYPE_TILES;
        const MAP = self.map;
        const coords2Key = self.util.coords2Key;

        let offset = 0;

        for (let y = 0; y < N_ROWS; ++y) {
          for (let x = 0; x < N_COLS; ++x) {
            const tileType = MAP[offset++][TYPE_TILE];

            if (tileType === TYPE_TILES.V_DOOR ||
                tileType === TYPE_TILES.H_DOOR)
              self.doors[coords2Key(x, y)] = { x, y,
                                               state: 10, // 0: open, 10: closed
                                               animating: 0,
                                               timeout: undefined };
          }
        }
      },
      "populatePickables": function(self) {
        const N_COLS = self.nCols, N_ROWS = self.nRows;
        const MAP_LEGEND = self.mapLegend;
        const TYPE_TILE = self.mapLegend.TYPE_TILE;
        const TYPE_TILES = self.const.TYPE_TILES;
        const MAP = self.map;
        const coords2Key = self.util.coords2Key;

        let offset = 0;

        for (let y = 0; y < N_ROWS; ++y) {
          for (let x = 0; x < N_COLS; ++x) {
            const tile = MAP[offset++];
            const tileType = tile[TYPE_TILE];
            const pickable = tile[MAP_LEGEND.PICKABLE];

            if (pickable && (tileType === TYPE_TILES.THING ||
                             tileType === TYPE_TILES.FREEFORM))
              self.pickables[coords2Key(x, y)] =
                { x, y, carrying: 0, tile, type: tileType };
          }
        }
      },
      "drawCaret": function(ctx, a, b, c, options) {
        options = options || {};
        const com = {
          "x": (a.x + b.x + c.x) / 3,
          "y": (a.y + b.y + c.y) / 3
        };
        const color = options.color ? options.color : "#00FFFF";
        const border = options.border
          ? {
              "color": options.border.color ? options.border.color : color,
              "thickness": options.border.thickness ? options.border.thickness : 1
            }
          : {"color": color, "thickness": 1};
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(com.x, com.y);
        ctx.closePath();
        ctx.lineWidth = border.thickness;
        ctx.strokeStyle = border.color;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();
      },
      "setOffscreenBufferDimensions": function(width, height) {
        offscreenBufferW = width;
        offscreenBufferH = height;
        offscreenBuffer.width = offscreenBufferW;
        offscreenBuffer.height = offscreenBufferH;
        offscreenBufferData = offscreenBufferCtx
          .getImageData(0, 0, offscreenBufferW, offscreenBufferH);
      },
      "fillRect": function(x, y, w, h, r, g, b, a) {
        const X = Math.floor(x), Y = Math.floor(y);
        const W = Math.ceil(w), H = Math.ceil(h);
        const startX = Math.max(X, 0), startY = Math.max(Y, 0);
        const endX = Math.min(X + W, offscreenBufferW), endY = Math.min(Y + H, offscreenBufferH);
        for (let i = startX; i < endX; i += 1) {
          for (let j = startY; j < endY; j += 1) {
            const offPix   = 4 * (offscreenBufferW * j + i);
            const pixRed   = offscreenBufferData.data[offPix];
            const pixGreen = offscreenBufferData.data[offPix + 1];
            const pixBlue  = offscreenBufferData.data[offPix + 2];
            const pixAlpha = offscreenBufferData.data[offPix + 3] || 1;
            const rBlend   = (a * 255) / pixAlpha;
            const newRed   = (r * 255) * rBlend + pixRed * (1 - rBlend);
            const newGreen = (g * 255) * rBlend + pixGreen * (1 - rBlend);
            const newBlue  = (b * 255) * rBlend + pixBlue * (1 - rBlend);
            offscreenBufferData.data[offPix] = newRed;
            offscreenBufferData.data[offPix + 1] = newGreen;
            offscreenBufferData.data[offPix + 2] = newBlue;
            offscreenBufferData.data[offPix + 3] = 255;
          }
        }
      },
      "drawImage": function(imgData, sx, sy, sw, sh, dx, dy, dw, dh, options) {
        const imgWidth = imgData.width, imgHeight = imgData.height;
        const imgBuffer = imgData.bitmap;
        /* early return if either source or destination is out of bounds */
        if (sx + sw <= 0 || sy + sh <= 0 || sx >= imgWidth || sy >= imgHeight
            || dx + dw <= 0 || dy + dh <= 0 || dx >= offscreenBufferW
            || dy >= offscreenBufferH)
          return;
        /* determine how bright & translucent the image is going to be drawn */
        const shade = options && options.shade ? options.shade : 0;
        const lightLevel = 1 - shade;
        const opacity = options
                        && Number.isFinite(options.alpha) ? options.alpha : 1;
        const scaleX = dw / sw, scaleY = dh / sh;
        /* clip the draw coordinates against the bounds of the buffer */
        const clipLeft = Math.max(0 - dx, 0), clipTop = Math.max(0 - dy, 0);
        const clipRight = Math.max(dx + dw - offscreenBufferW, 0);
        const clipBottom = Math.max(dy + dh - offscreenBufferH, 0);
        /* calculate the draw coordinates */
        const clippedW = Math.ceil(dw - clipLeft - clipRight);
        const clippedH = Math.ceil(dh - clipTop - clipBottom);
        const startX = Math.floor(dx + clipLeft), endX = startX + clippedW;
        const startY = Math.floor(dy + clipTop), endY = startY + clippedH;
        /* draw scaled image */
        let sX = 0, sY = 0;
        for (let x = startX; x < endX && sX < imgWidth; ++x) {
          sX = Math.floor(sx + (clipLeft + (x - startX)) / scaleX);
          for (let y = startY; y < endY && sY < imgHeight; ++y) {
            sY = Math.floor(sy + (clipTop + (y - startY)) / scaleY);
            if (sX >= 0 && sX < imgWidth && sY >= 0 && sY < imgHeight) {
              const iImgPx = 4 * (imgHeight * sX + sY);
              const imgR = imgBuffer[iImgPx], imgG = imgBuffer[iImgPx + 1];
              const imgB = imgBuffer[iImgPx + 2], imgA = imgBuffer[iImgPx + 3];
              const iBuffPx = 4 * (offscreenBufferW * y + x);
              const buffR = offscreenBufferData.data[iBuffPx];
              const buffG = offscreenBufferData.data[iBuffPx + 1];
              const buffB = offscreenBufferData.data[iBuffPx + 2];
              const buffA = offscreenBufferData.data[iBuffPx + 3] || 255;
              const rBlend = opacity * imgA / buffA, rBlend_ = 1 - rBlend;
              const newR = lightLevel * rBlend * imgR + rBlend_ * buffR;
              const newG = lightLevel * rBlend * imgG + rBlend_ * buffG;
              const newB = lightLevel * rBlend * imgB + rBlend_ * buffB;
              offscreenBufferData.data[iBuffPx] = newR;
              offscreenBufferData.data[iBuffPx + 1] = newG;
              offscreenBufferData.data[iBuffPx + 2] = newB;
              offscreenBufferData.data[iBuffPx + 3] = 255;
            }
          }
        }
      },
      "print": function(text, x, y, options) {
        options = options || {};
        ctx.font = (!!options.style ? options.style + " " : "") +
                   (!isNaN(options.size) ? options.size : 10).toString() +
                   "px " +
                   (!!options.family ? options.family : "Courier");
        ctx.fillStyle = options.color || "#000000";
        ctx.fillText(text, x, y);
      },
      "render": {
        "stats": function(self, deltaT) {
          const playerX = self.player.x, playerY = self.playerY;
          const playerRotation = self.player.rotation;
          const rad2Deg = self.util.rad2Deg;
          self.util.print(
            "pos: <" + Math.floor(playerX) + ", " +
                       Math.floor(self.player.y) + ", " +
                       (self.player.head / self.MAP_TILE_SIZE).toFixed(1) +
                  ">" +
            " | rot: " + Math.round(rad2Deg(self, playerRotation)) + " deg" +
            " | fps: " + Math.round(1000 / deltaT),
            5, 15,
            {"size": 14, "color": "#FF0000"}
          );
        },
        "loading": function(self) {
          const numStates = 4;
          const render = function(iFrame) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, self.res[0], self.res[1]);
            self.util.print(
              "Loading" + new Array(iFrame % numStates).fill(".").join(""),
              (self.res[0] - 150) * 0.5,
              self.res[1] * 0.5,
              {"size": 36, "color": "#FFFFFF"}
            );
          }
          return self.api.animation(
            self,
            function(i) { render(i); },
            375
          );
        },
        "titleScreen": function(self, onEnd) {
          const sprite = self.assets.sprites.menu.skull;

          function render (iFrame) {
            const i = iFrame & 1;
            self.assets.sprites.menu.skull.activeFrames = [i];
            self.util.fillRect(0, 0, offscreenBufferW, offscreenBufferH,
                               0, 0, 0, 1);
            self.util.render.globalSprite(self, sprite);
            ctx.putImageData(offscreenBufferData, 0, 0);

            if (i === 1)
              self.util.print(
                "Press any key to start",
                (self.res[0] - 212) * 0.5,
                (self.res[1] - 16) * 0.5,
                {"size": 16, "color": "#FFFFFF"}
              );
          }

          return self.api.animation(
            self,
            function(iFrame) { render(iFrame); },
            375,
            undefined,
            onEnd
          );
        },
        "minimap": function(self, offsetX, offsetY) {
          const R = self.const.R_MINIMAP;
          const anchor = R + 0.5;
          const tileSize = self.const.TILE_SIZE_MINIMAP;

          minimapCanvasCtx.fillStyle = "#000000";
          minimapCanvasCtx.beginPath();
          minimapCanvasCtx.arc(anchor * tileSize, anchor * tileSize, R * tileSize, 0, 2 * Math.PI);
          minimapCanvasCtx.fill();

          minimapCanvasCtx.globalCompositeOperation = "source-atop";
          for (let offsetRow = -1 * R; offsetRow <= R; offsetRow += 1) {
            for (let offsetCol = -1 * R; offsetCol <= R; offsetCol += 1) {
              const sampleMap = {
                "x": Math.floor(self.player.x) + offsetCol,
                "y": Math.floor(self.player.y) + offsetRow,
              };
              const translateMap = {
                "x": (R + offsetCol) * tileSize,
                "y": (R + offsetRow) * tileSize,
              };
              if (
                sampleMap.x >= 0 && sampleMap.x < self.nCols &&
                sampleMap.y >= 0 && sampleMap.y < self.nRows
              ) {
                const sample = self.map[self.nCols * sampleMap.y + sampleMap.x][self.mapLegend.TYPE_TILE];
                minimapCanvasCtx.fillStyle = self.const.MINIMAP_COLORS[sample];
              } else { // render map out-of-bounds
                minimapCanvasCtx.fillStyle = "#101010";
              }
              minimapCanvasCtx.fillRect(translateMap.x, translateMap.y, tileSize, tileSize);
            }
          }

          self.util.drawCaret(
            minimapCanvasCtx,
            {"x": (anchor + Math.cos(self.player.rotation)) * tileSize,                   "y": (anchor + Math.sin(self.player.rotation)) * tileSize},
            {"x": (anchor + Math.cos(self.player.rotation + Math.PI * 4 / 3)) * tileSize, "y": (anchor + Math.sin(self.player.rotation + Math.PI * 4 / 3)) * tileSize},
            {"x": (anchor + Math.cos(self.player.rotation + Math.PI * 2 / 3)) * tileSize, "y": (anchor + Math.sin(self.player.rotation + Math.PI * 2 / 3)) * tileSize},
            {"border": {"color": "#000000", "thickness": 2}}
          );

          ctx.fillStyle = self.const.MINIMAP_COLORS[1];
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, (R + 1) * tileSize, 0, 2 * Math.PI);
          ctx.fill();

          const drawOffset = 0.5 * tileSize;
          const drawWidth = minimapCanvas.width - drawOffset;
          const drawHeight = minimapCanvas.height - drawOffset;
          ctx.translate(offsetX, offsetY);
          ctx.rotate(-1 * Math.PI * 0.5 - self.player.rotation);
          ctx.drawImage(minimapCanvas,
                        drawOffset, drawOffset,
                        drawWidth, drawHeight,
                        -1 * R * tileSize, -1 * R * tileSize,
                        drawWidth, drawHeight);
          ctx.rotate(Math.PI * 0.5 + self.player.rotation);
          ctx.translate(-1 * offsetX, -1 * offsetY);
        },
        "wallBounds": function(self, iCol, hCeil, hWall, hLine) {
          self.util.fillRect(
            iCol * self.DRAW_TILE_SIZE.x,
            hCeil * self.DRAW_TILE_SIZE.y,
            self.DRAW_TILE_SIZE.x,
            hLine,
            1, 0, 0, 1
          );
          self.util.fillRect(
            iCol * self.DRAW_TILE_SIZE.x,
            (hCeil + hWall) * self.DRAW_TILE_SIZE.y,
            self.DRAW_TILE_SIZE.x,
            hLine,
            1, 1, 0, 1
          );
          self.util.fillRect(
            self.DRAW_TILE_SIZE.x * iCol,
            self.DRAW_TILE_SIZE.y * (hCeil + hWall * 0.5),
            self.DRAW_TILE_SIZE.x,
            hLine,
            1, 0, 1, 1
          );
        },
        "globalSprite": function(self, sprite) {
          const tex = sprite;
          const frames = sprite.frames;
          const activeFrames = sprite.activeFrames;
          for (let iFrame = 0; iFrame < activeFrames.length; iFrame += 1) {
            const frame = frames[activeFrames[iFrame]];
            const locOnScreen = frame.locOnScreen;
            if (Array.isArray(locOnScreen)) {
              for (let iLoc = 0; iLoc < locOnScreen.length; iLoc += 1) {
                const loc = locOnScreen[iLoc];
                self.util.drawImage(
                  tex,
                  frame.offset,
                  tex.height - frame.height,
                  frame.width,
                  frame.height,
                  loc.x,
                  loc.y,
                  frame.width,
                  frame.height
                );
              }
            } else {
              self.util.drawImage(
                tex,
                frame.offset,
                tex.height - frame.height,
                frame.width,
                frame.height,
                locOnScreen.x,
                locOnScreen.y,
                frame.width,
                frame.height
              );
            }
          }
        },
        "playerView": function(self) {
          const MAP_LEGEND = self.mapLegend;
          const OFFSET_DIAG_WALLS = self.const.OFFSET_DIAG_WALLS;
          const TYPE_TILES = self.const.TYPE_TILES;
          const N_COLS = self.nCols, N_ROWS = self.nRows;
          const MAP = self.map;
          const M_COLS = self.mCols, M_ROWS = self.mRows;
          const H_MAX_WORLD = self.const.H_MAX_WORLD;
          const MAP_TILE_SIZE = self.MAP_TILE_SIZE;
          const VIEW_DIST = self.VIEW_DIST, MAX_DRAW_DIST = self.DRAW_DIST;
          const sqrDrawDist = MAX_DRAW_DIST * MAX_DRAW_DIST;
          const pointVsRect = self.util.collision.pointVsRect;
          const eucDist = self.util.eucDist;
          const getIntersect = self.util.getIntersect;
          const getThingCollnData = self.util.getThingCollnData;
          const getFreeformTileCollnData = self.util.getFreeformTileCollnData;

          const playerX = self.player.x, playerY = self.player.y;
          const playerRot = self.player.rotation, playerTilt = self.player.tilt;
          const playerHeadElev = self.player.head;
          const viewportElev = self.player.viewport + playerTilt;
          /* render an entire frame of pixel columns by ray-casting */
          for (let iCol = 0; iCol < M_COLS; ++iCol) {
            /* calculate the properties for the current ray */
            const rayAngle = Math.atan((iCol - M_COLS * 0.5) / VIEW_DIST) +
                             playerRot;
            const rayX = Math.cos(rayAngle), rayY = Math.sin(rayAngle);
            const rayDirX = Math.sign(rayX), rayDirY = Math.sign(rayY);
            const raySlope = rayY / rayX, raySlope_ = rayX / rayY;
            // cast the ray starting from the current position of the player
            let hitX = playerX, hitY = playerY;
            let tileX = Math.floor(hitX), tileY = Math.floor(hitY);
            /* vertical & horizontal tracers:
             * iterate over vertical and horizontal grid lines that intersect
             * with the current ray
             */
            let vTraceX = rayDirX > 0 ? Math.floor(playerX + 1) : tileX;
            let vTraceY = playerY + (vTraceX - playerX) * raySlope;
            let hTraceY = rayDirY > 0 ? Math.floor(playerY + 1) : tileY;
            let hTraceX = playerX + (hTraceY - playerY) * raySlope_;
            // how much each tracer will advance at each iteration
            const vStepY = rayDirX * raySlope, hStepX = rayDirY * raySlope_;
            let distCovered = 0; // the distance covered by the "closer" tracer
            // the perpendicular distance from the player to the closest solid
            // geometry along the path of the current ray
            let distSolid;
            let hitSolid = 0; // whether we hit a solid wall or not
            let isVerticalHit;
            // which texture to draw on the surface of the solid geometry
            let solidTexture;
            let offsetLeft; // sampling offset for the texture
            /* initialize a depth-buffer for the sorting of non-solid geometries
             * encountered along the path of the current ray
             */
            const depthBuffer = [];
            /* cast the ray until we either hit a solid wall or reach the max
             * draw distance or go out of bounds of the map
             */
            while (!hitSolid && distCovered < sqrDrawDist &&
                   pointVsRect(-1, -1, N_COLS + 1, N_ROWS + 1, tileX, tileY)) {
              // read the current tile
              const idxTile = N_COLS * tileY + tileX, tile = MAP[idxTile];
              const tileType = tile[MAP_LEGEND.TYPE_TILE];
              /* HIT: solid geometry (that extend from the floor all the way to
               * the ceiling)
               */
              if (tileType === TYPE_TILES.WALL) {
                /* determine which texture to draw */
                if (isVerticalHit) {
                  const picnum = rayDirX < 0 ? MAP_LEGEND.TEX_WALL_E
                                             : MAP_LEGEND.TEX_WALL_W;
                  solidTexture = self.assets.textures.images[tile[picnum]];
                  offsetLeft = hitY - tileY;
                } else {
                  const picnum = rayDirY < 0 ? MAP_LEGEND.TEX_WALL_S
                                             : MAP_LEGEND.TEX_WALL_N
                  solidTexture = self.assets.textures.images[tile[picnum]];
                  offsetLeft = hitX - tileX;
                }
                hitSolid = 1;
              } else if (tileType === TYPE_TILES.V_DOOR) {
                /* adjust hit point to intersect with the door */
                const newHitX = tileX + 0.5;
                const deltaX = newHitX - hitX;
                const deltaY = deltaX * raySlope;
                hitX = newHitX; hitY += deltaY;
                /* has the door actually been hit? */
                const hitKey = self.util.coords2Key(tileX, tileY);
                const doorState = self.doors[hitKey].state * 0.1;
                if (hitY >= tileY && hitY < tileY + doorState) {
                  /* determine which texture to draw */
                  solidTexture =
                    self.assets.textures.images[tile[MAP_LEGEND.TEX_WALL_N]];
                  offsetLeft = hitY - tileY + 1 - doorState;
                  hitSolid = 1;
                }
              } else if (tileType === TYPE_TILES.H_DOOR) {
                /* adjust hit point to intersect with the door */
                const newHitY = tileY + 0.5;
                const deltaY = newHitY - hitY;
                const deltaX = deltaY * raySlope_;
                hitX += deltaX; hitY = newHitY;
                /* has the door actually been hit? */
                const hitKey = self.util.coords2Key(tileX, tileY);
                const doorState = self.doors[hitKey].state * 0.1;
                if (hitX >= tileX + 1 - doorState && hitX < tileX + 1) {
                  /* determine which texture to draw */
                  solidTexture =
                    self.assets.textures.images[tile[MAP_LEGEND.TEX_WALL_N]];
                  offsetLeft = hitX - tileX - (1 - doorState);
                  hitSolid = 1;
                }
              } else if (tileType === TYPE_TILES.WALL_DIAG) {
                const dOffsets = OFFSET_DIAG_WALLS[tile[MAP_LEGEND.FACE_DIAG]];
                const x0 = tileX + dOffsets[0][0], y0 = tileY + dOffsets[0][1];
                const x1 = tileX + dOffsets[1][0], y1 = tileY + dOffsets[1][1];
                /* HACK: for correctly calculating the intersection when the
                 * player is currently situated in the diagonal wall tile
                 */
                const isInTile = playerX === hitX && playerY === hitY;
                if (isInTile) {
                  // take a step along whichever axis covers more distance
                  if (Math.abs(raySlope) < 1) {
                    hitX += rayDirX; hitY += vStepY;
                  } else {
                    hitY += rayDirY; hitX += hStepX;
                  }
                }
                /* calculate the point of intersection between the ray line (or
                 * vector) and the diagonal wall line (or vector)
                 */
                const intersect = getIntersect(playerX, playerY, hitX, hitY,
                                               x0, y0, x1, y1,
                                               isInTile ? 1 : 0);
                if (intersect) {
                  hitX = intersect[0]; hitY = intersect[1];
                  /* is the diagonal wall actually visible, i.e., is the current
                   * ray actually intersecting with the diagonal wall vector?
                   */
                  if (isInTile ||
                      pointVsRect(Math.min(x0, x1), Math.min(y0, y1),
                                  Math.abs(x0 - x1), Math.abs(y0 - y1),
                                  hitX, hitY)) {
                    solidTexture =
                      self.assets.textures.images[tile[MAP_LEGEND.TEX_WALL_N]];
                    offsetLeft = (hitX - x0) / (x1 - x0);
                    hitSolid = 1;
                  }
                }
              }
              /* HIT: non-solid geometry (things, free-form blocks, translucent
               * walls)
               */
              else if (tileType === TYPE_TILES.THING) {
                const isInTile = playerX === hitX && playerY === hitY;
                const collnData = getThingCollnData(self, self.player,
                                                    { x: tileX, y: tileY },
                                                    { x: hitX, y: hitY },
                                                    isInTile
                                                      ? { x: rayX, y: rayY }
                                                      : undefined);
                if (collnData) depthBuffer.push(collnData);
              } else if (tileType === TYPE_TILES.FREEFORM) {
                const collnData = getFreeformTileCollnData(
                  self,
                  { x: playerX, y: playerY },
                  { x: tileX, y: tileY },
                  { slope: raySlope, dir: { x: rayDirX } }
                );
                if (collnData) depthBuffer.push(collnData);
              }
              /* advance tracers unless a solid geometry has been already hit */
              if (!hitSolid) {
                /* calculate the distances covered on the ray by each tracer */
                const vDist = eucDist(playerX, playerY, vTraceX, vTraceY,
                                      1, MAP_TILE_SIZE);
                const hDist = eucDist(playerX, playerY, hTraceX, hTraceY,
                                      1, MAP_TILE_SIZE);
                /* determine whether the hit is on the vertical axis */
                isVerticalHit = vDist > hDist
                  ? 0
                  : vDist === hDist ? isVerticalHit : 1;
                // take the minimum distance covered along the ray
                distCovered = isVerticalHit ? vDist : hDist;
                /* advance the tracers themselves */
                if (isVerticalHit) {
                  hitX = vTraceX; hitY = vTraceY; // hit by vertical tracer
                  vTraceX += rayDirX; vTraceY += vStepY; // advance the tracer
                  tileX += rayDirX; // advance vertically to the next tile
                } else {
                  hitX = hTraceX; hitY = hTraceY; // hit by horizontal tracer
                  hTraceX += hStepX; hTraceY += rayDirY; // advance the tracer
                  tileY += rayDirY; // advance horizontally to the next tile
                }
              }
            }
            distSolid = eucDist(playerX, playerY, hitX, hitY, 0, MAP_TILE_SIZE);
            distSolid = Math.min(distSolid, MAX_DRAW_DIST);
            /* at this point, we should have either hit a solid geometry or
             * reached the max draw distance or go out of bounds of the grid
             */
            const realDist = distSolid;
            // fix the fish-eye distortion
            distSolid *= Math.cos(rayAngle - playerRot);
            /* calculate ceiling, floor and wall heights for the solid geometry
             * that's been hit
             */
            const scaleProj = VIEW_DIST / distSolid;
            const yPlayer = M_ROWS + viewportElev - playerHeadElev;
            const hCeil = Math.floor(scaleProj *
                                     (playerHeadElev - H_MAX_WORLD) + yPlayer);
            const yFloor = Math.floor(scaleProj * playerHeadElev + yPlayer);
            const hWall = yFloor - hCeil;
            /* DRAW: solid geometry (that occludes the entirety of the current
             * column of pixels)
             */
            /* draw texture-mapped flats: ceiling & floor */
            if (self.const.FLATS || window.FLATS) {
              self.util.render.col_floor(
                self,
                {}, // FIXME: occlusion for the current column
                undefined,
                iCol,
                yFloor,
                M_ROWS - yFloor,
                rayAngle,
                [0, 0],
                [undefined, undefined],
                self.player.anim.shooting.index === 0 ||
                self.player.anim.shooting.index === 1
                  ? 0
                  : 1
              );
              self.util.render.col_ceiling(
                self,
                {}, // FIXME: occlusion for the current column
                undefined,
                iCol,
                0,
                hCeil,
                rayAngle,
                [0, 0],
                [undefined, undefined],
                self.player.anim.shooting.index === 0 ||
                self.player.anim.shooting.index === 1
                  ? 0
                  : 1
              );
            }
            /* draw texture-mapped wall if we hit something */
            if (offsetLeft >= 0) {
              self.util.render.col_wall(
                self,
                {}, // FIXME: occlusion for the current column
                solidTexture,
                self.const.H_SOLID_WALL / solidTexture.worldHeight,
                offsetLeft * solidTexture.width,
                iCol,
                hCeil,
                hWall,
                realDist / MAX_DRAW_DIST
              );
            }
            else if (realDist >= MAX_DRAW_DIST) {
              self.util.fillRect(iCol * self.DRAW_TILE_SIZE.x,
                                 hCeil * self.DRAW_TILE_SIZE.y,
                                 self.DRAW_TILE_SIZE.x,
                                 hWall * self.DRAW_TILE_SIZE.y,
                                 0, 0, 0, 1);
            }
            /* draw debug artifacts it debug mode is active */
            if (window.DEBUG_MODE === 1) {
              self.util.render.wallBounds(
                self, iCol, hCeil, hWall, self.DRAW_TILE_SIZE.y * 2
              );
            }
            /* DRAW: non-solid geometry (that partially occludes the current
             * column on pixels)
             */
            for (let i = depthBuffer.length - 1; i >= 0; --i) {
              const data = depthBuffer[i];
              const distToObj = Math.sqrt(data.pseudoDistToPlayer) *
                                Math.cos(rayAngle - playerRot);
              /* draw thing (masked 2-D sprite) */
              if (distToObj < distSolid && data.type === TYPE_TILES.THING) {
                const hObj = data.height, hProj = VIEW_DIST * hObj / distToObj;
                const hCeilObj = (playerHeadElev - H_MAX_WORLD) *
                                 VIEW_DIST / distToObj + yPlayer;
                const shade = distToObj / MAX_DRAW_DIST;
                self.util.render.col_thing(self, iCol, hCeilObj, hProj,
                                           data, shade);
              }
              /* draw freeform tile */
              else if ((distToObj < distSolid || data.meta.isInTile)
                       && data.type === TYPE_TILES.FREEFORM)
                self.util.render.col_freeformTile(self, iCol, distToObj,
                                                  rayAngle, data);
            }
          } // REPEAT: for each column of the screen buffer
        },
        "col_wall": function(
          self,
          occlusion,
          texture,
          repeat,
          sx,
          dx,
          dy,
          dh,
          shade,
          opacity
        ) {
          // early return if trying to render out of frustum bounds
          if (dy + dh <= 0 || dy >= offscreenBufferH) return;
          const DTS_X = self.DRAW_TILE_SIZE.x;
          const DTS_Y = self.DRAW_TILE_SIZE.y;
          // calculate the screen coordinates & dimensions for the projection
          const DX = dx * DTS_X, DY = dy * DTS_Y, DH = dh * DTS_Y;
          /* calculate the sampling coordinates & dimensions for the texture */
          const texBitmap = texture.bitmap;
          const SX = Math.floor(sx +
                                (texture.activeFrame !== undefined
                                   ? texture.frames[texture.activeFrame].offset
                                   : 0));
          const SH = texture.activeFrame !== undefined
            ? texture.frames[texture.activeFrame].height
            : texture.height;
          const scaleH = DH / (SH * repeat); // texture-mapping scaling
          //
          const dPerp = shade * self.DRAW_DIST;
          //
          /* determine how bright & translucent the wall texture is going to be
           * drawn
           */
          const lightLevel = 1 - (shade || 0);
          const translucency = 1 - (Number.isFinite(opacity) ? opacity : 1);
          /* clip the projection against the occlusion table */
          const occTop = Math.max(occlusion.top || 0, 0) * DTS_Y;
          const occBottom = Math.max(occlusion.bottom || 0, 0) * DTS_Y;
          const clipTop = Math.max(occTop - DY, 0);
          const clipBottom = Math.max(DY + DH - self.res[1] + occBottom, 0);
          const hClipped = Math.ceil(DH - clipTop - clipBottom);
          const yStart = Math.floor(DY + clipTop), yEnd = yStart + hClipped;
          /* draw the wall projection, i.e., column of texture-mapped pixels */
          for (let x = 0; x < DTS_X; ++x) {
            for (let y = yStart; y < yEnd; ++y) {
              const sY = Math.floor((clipTop + (y - yStart)) / scaleH) % SH;
              const iTexel = 4 * (SH * SX + sY);
              const texR = texBitmap[iTexel], texG = texBitmap[iTexel + 1];
              const texB = texBitmap[iTexel + 2], texA = texBitmap[iTexel + 3];
              const iBuffPx = 4 * (offscreenBufferW * y + (DX + x));
              const buffR = offscreenBufferData.data[iBuffPx];
              const buffG = offscreenBufferData.data[iBuffPx + 1];
              const buffB = offscreenBufferData.data[iBuffPx + 2];
              const buffA = offscreenBufferData.data[iBuffPx + 3] || 255;
              const rBlend = (1 - translucency) * texA / buffA;
              const rBlend_ = 1 - rBlend;
              const newR = lightLevel * rBlend * texR + rBlend_ * buffR;
              const newG = lightLevel * rBlend * texG + rBlend_ * buffG;
              const newB = lightLevel * rBlend * texB + rBlend_ * buffB;
              //
              let newNewR = newR, newNewG = newG, newNewB = newB;
              // if (dPerp < 1440 && texA)
              // {
              //   newNewR = newR * dPerp / 1440 + 255 * (1 - dPerp / 1440);
              //   newNewG = newG * dPerp / 1440;
              //   newNewB = newB * dPerp / 1440 + 255 * (1 - dPerp / 1440);
              // }
              //
              offscreenBufferData.data[iBuffPx] = newNewR;
              offscreenBufferData.data[iBuffPx + 1] = newNewG;
              offscreenBufferData.data[iBuffPx + 2] = newNewB;
              offscreenBufferData.data[iBuffPx + 3] = 255;
            }
          }
        },
        "col_floor": function(
          self,
          occlusion,
          texture,
          dx,
          dy,
          dh,
          rayAngle,
          wallHeights,
          wallDistances,
          shade
        ) {
          // early return if trying to render out of frustum bounds
          if (dy + dh <= 0 || dy >= self.mRows) return;

          // read some global constants
          const DRAW_TILE_SIZE_X = self.DRAW_TILE_SIZE.x;
          const DRAW_TILE_SIZE_Y = self.DRAW_TILE_SIZE.y;
          const MAP_TILE_SIZE = self.MAP_TILE_SIZE;
          const M_ROWS = self.mRows;
          const MAP = self.map, N_COLS = self.nCols;
          const KEY_TEX_G_FLOOR = self.mapLegend.TEX_G_FLOOR;
          const FLOOR_TEXTURES = self.assets.textures.images;
          const VIEW_DIST = self.VIEW_DIST;
          const DRAW_DIST = self.DRAW_DIST;

          const yViewPort = self.player.viewport + self.player.tilt;
          const yHead = self.player.head;
          const yPlayer = yViewPort + M_ROWS - yHead;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

          const dist_F = wallDistances[0], dist_R = wallDistances[1];
          const hWall_F = wallHeights[0], hWall_R = wallHeights[1];
          // determine whether the flat surface of the tile is sloped or not
          const isSlopedFlat = hWall_F !== hWall_R;

          // clip projection against occlusion table
          const occTop = Math.max(occlusion.top || 0, 0);
          const occBottom = Math.max(occlusion.bottom || 0, 0);
          const floorClipTop = Math.max(occTop - dy, 0);
          const floorClipBottom = Math.max(dy + dh - M_ROWS + occBottom, 0);
          const floorClipped = dh - floorClipTop - floorClipBottom;
          const dStart = dy + floorClipTop;

          const relAngle = rayAngle - self.player.rotation;
          for (let iR = 0; iR < floorClipped; iR += 1) {
            const DY = Math.floor(DRAW_TILE_SIZE_Y * (dStart + iR));
            // extend an imaginary line from the current y-coordinate of the screen
            // to player's viewpoint, and find the actual distance from the player
            // to the point where the imaginary line intersects with the floor
            // at the corresponding height
            const dFloorTile = (isSlopedFlat
              ? self.util.getIntersect(0, yHead, VIEW_DIST, yViewPort + M_ROWS -
                                                            (dStart + iR + 1),
                                       dist_F, hWall_F, dist_R, hWall_R)[0]
              : VIEW_DIST * (yHead - hWall_F) / (dStart + 1 + iR - yPlayer)
              ) / Math.cos(relAngle);
            //
            const dPerp = dFloorTile * Math.cos(relAngle);
            //
            // get the distance vector to the floor
            const pFloorTile = {
              "x": dFloorTile * Math.cos(rayAngle) / MAP_TILE_SIZE + self.player.x,
              "y": dFloorTile * Math.sin(rayAngle) / MAP_TILE_SIZE + self.player.y
            };
            // determine which tile on the map the point intersected falls within
            const pMapTile = {
              "x": Math.floor(pFloorTile.x),
              "y": Math.floor(pFloorTile.y)
            };

            let texFloor, tx, ty, tw, th;
            /* determine which texture to draw by using the calculated world
             * coordinates if no texture was given
             */
            if (!texture) {
              const tile = MAP[N_COLS * pMapTile.y + pMapTile.x];
              if (!tile) continue; // bounds-check
              texFloor = FLOOR_TEXTURES[tile[KEY_TEX_G_FLOOR]];
            } else texFloor = texture;
            tw = texFloor.width; th = texFloor.height;
            /* determine which texel to draw */
            if (texFloor.activeFrame !== undefined) {
              th = texFloor.frames[texFloor.activeFrame].height;
              tx = Math.floor((pFloorTile.x - pMapTile.x) *
                texFloor.frames[texFloor.activeFrame].width) +
                texFloor.frames[texFloor.activeFrame].offset;
            } else tx = Math.floor((pFloorTile.x - pMapTile.x) * tw);
            ty = Math.floor((pFloorTile.y - pMapTile.y) * th);

            // sample the texture pixel
            const texBitmap = texFloor.bitmap;
            const offTexel = 4 * (th * tx + ty);
            const tRed = texBitmap[offTexel];
            const tGreen = texBitmap[offTexel + 1];
            const tBlue = texBitmap[offTexel + 2];
            const tAlpha = texBitmap[offTexel + 3];
            // render the sampled texture pixel
            const lightLevel = shade ? 1 - dFloorTile / DRAW_DIST : 1;
            for (let x = 0; x < DRAW_TILE_SIZE_X; x += 1) {
              for (let y = 0; y < DRAW_TILE_SIZE_Y; y += 1) {
                const offBuffer = 4 * (offscreenBufferW * (DY + y) + DX + x);
                const bRed = offscreenBufferData.data[offBuffer];
                const bGreen = offscreenBufferData.data[offBuffer + 1];
                const bBlue = offscreenBufferData.data[offBuffer + 2];
                const bAlpha = offscreenBufferData.data[offBuffer + 3] || 255;
                const rBlend = tAlpha / bAlpha;
                const _rBlend = 1 - rBlend;
                const newRed = tRed * lightLevel * rBlend + bRed * _rBlend;
                const newGreen = tGreen * lightLevel * rBlend + bGreen * _rBlend;
                const newBlue = tBlue * lightLevel * rBlend + bBlue * _rBlend;
                //
                let newNewRed = newRed, newNewGreen = newGreen, newNewBlue = newBlue;
                // if (dPerp < 1440)
                // {
                //   newNewRed = newRed * dPerp / 1440 + 255 * (1 - dPerp / 1440);
                //   newNewGreen = newGreen * dPerp / 1440;
                //   newNewBlue = newBlue * dPerp / 1440 + 255 * (1 - dPerp / 1440);
                // }
                //
                offscreenBufferData.data[offBuffer] = newNewRed;
                offscreenBufferData.data[offBuffer + 1] = newNewGreen;
                offscreenBufferData.data[offBuffer + 2] = newNewBlue;
                offscreenBufferData.data[offBuffer + 3] = 255;
              }
            }
          }
        },
        "col_ceiling": function(
          self,
          occlusion,
          texture,
          dx,
          dy,
          dh,
          rayAngle,
          wallHeights,
          wallDistances,
          shade
        ) {
          // early return if trying to render out of frustum bounds
          if (dy + dh <= 0 || dy >= self.mRows) return;

          // read some global constants
          const DRAW_TILE_SIZE_X = self.DRAW_TILE_SIZE.x;
          const DRAW_TILE_SIZE_Y = self.DRAW_TILE_SIZE.y;
          const MAP_TILE_SIZE = self.MAP_TILE_SIZE;
          const M_ROWS = self.mRows;
          const MAP = self.map, N_COLS = self.nCols;
          const KEY_TEX_G_CEIL = self.mapLegend.TEX_G_CEIL;
          const KEY_INDOORS = self.mapLegend.INDOORS;
          const CEIL_TEXTURES = self.assets.textures.images;
          const MAX_TILT = self.const.MAX_TILT;
          const VIEW_DIST = self.VIEW_DIST;
          const DRAW_DIST = self.DRAW_DIST;
          const normalizeAngle = self.util.normalizeAngle;

          const H_MAX_WORLD = self.const.H_MAX_WORLD;
          const yViewPort = self.player.viewport + self.player.tilt;
          const yHead = self.player.head;
          const yPlayer = yViewPort + M_ROWS - yHead;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

          const dist_F = wallDistances[0], dist_R = wallDistances[1];
          const hWall_F = wallHeights[0], hWall_R = wallHeights[1];
          // determine whether the flat surface of the tile is sloped or not
          const isSlopedFlat = hWall_F !== hWall_R;

          // clip projection against occlusion table
          const occTop = Math.max(occlusion.top || 0, 0);
          const occBottom = Math.max(occlusion.bottom || 0, 0);
          const ceilClipTop = Math.max(occTop - dy, 0);
          const ceilClipBottom = Math.max(dy + dh - M_ROWS + occBottom, 0);
          const ceilClipped = dh - ceilClipTop - ceilClipBottom;
          const dStart = dy + ceilClipTop;

          const relAngle = rayAngle - self.player.rotation;
          for (let iR = 0; iR < ceilClipped; iR += 1) {
            const DY = Math.floor(DRAW_TILE_SIZE_Y * (dStart + iR));
            // extend an imaginary line from the current y-coordinate of the screen
            // to player's viewpoint, and find the actual distance from the player
            // to the point where the imaginary line intersects with the ceiling
            // at the corresponding height
            const dCeilTile = (isSlopedFlat
              ? self.util.getIntersect(0, yHead,
                                       VIEW_DIST, yViewPort + M_ROWS -
                                                  (dStart + iR),
                                       dist_F, H_MAX_WORLD - hWall_F,
                                       dist_R, H_MAX_WORLD - hWall_R)[0]
              : VIEW_DIST * (yHead + hWall_F - H_MAX_WORLD) /
                (dStart + iR - yPlayer))
              / Math.cos(relAngle);
            //
            const dPerp = dCeilTile * Math.cos(relAngle);
            //
            // get the distance vector to the ceiling
            const pCeilTile = {
              "x": dCeilTile * Math.cos(rayAngle) / MAP_TILE_SIZE + self.player.x,
              "y": dCeilTile * Math.sin(rayAngle) / MAP_TILE_SIZE + self.player.y
            };
            // determine which tile on the map the point intersected falls within
            const pMapTile = {
              "x": Math.floor(pCeilTile.x),
              "y": Math.floor(pCeilTile.y)
            };

            let texCeil, tx, ty, tw, th, isSky;
            /* determine which texture to draw by using the calculated world
             * coordinates if no texture was given
             */
            if (!texture) {
              const tile = MAP[N_COLS * pMapTile.y + pMapTile.x];
              if (!tile) continue; // bounds-check
              isSky = !tile[KEY_INDOORS];
              texCeil = CEIL_TEXTURES[tile[KEY_TEX_G_CEIL]];
            } else texCeil = texture;
            tw = texCeil.width, th = texCeil.height;
            /* determine which texel to draw */
            if (isSky) {
              const ppr = tw / self.const.math.RAD_90; // pixels per radiant (skybox repeats x4) // FIXME: don't calculate every time, cache instead
              tx = Math.floor((normalizeAngle(self, rayAngle) * ppr) % tw);
              ty = Math.floor(th * (MAX_TILT - self.player.tilt + iR) / M_ROWS); // FIXME: extreme MAX_TILTs
            } else {
              if (texCeil.activeFrame !== undefined) {
                th = texCeil.frames[texCeil.activeFrame].height;
                tx = Math.floor((pCeilTile.x - pMapTile.x) *
                  texCeil.frames[texCeil.activeFrame].width) +
                  texCeil.frames[texCeil.activeFrame].offset;
              } else tx = Math.floor((pCeilTile.x - pMapTile.x) * tw);
              ty = Math.floor((pCeilTile.y - pMapTile.y) * th);
            }

            // sample the texture pixel
            const texBitmap = texCeil.bitmap;
            const offTexel = 4 * (th * tx + ty);
            const tRed = texBitmap[offTexel];
            const tGreen = texBitmap[offTexel + 1];
            const tBlue = texBitmap[offTexel + 2];
            const tAlpha = texBitmap[offTexel + 3];
            // render the sampled texture pixel
            const lightLevel = shade ? 1 - dCeilTile / DRAW_DIST : 1;
            for (let x = 0; x < DRAW_TILE_SIZE_X; x += 1) {
              for (let y = 0; y < DRAW_TILE_SIZE_Y; y += 1) {
                const offBuffer = 4 * (offscreenBufferW * (DY + y) + DX + x);
                const bRed = offscreenBufferData.data[offBuffer];
                const bGreen = offscreenBufferData.data[offBuffer + 1];
                const bBlue = offscreenBufferData.data[offBuffer + 2];
                const bAlpha = offscreenBufferData.data[offBuffer + 3] || 255;
                const rBlend = tAlpha / bAlpha;
                const _rBlend = 1 - rBlend;
                const newRed = tRed * lightLevel * rBlend + bRed * _rBlend;
                const newGreen = tGreen * lightLevel * rBlend + bGreen * _rBlend;
                const newBlue = tBlue * lightLevel * rBlend + bBlue * _rBlend;
                //
                let newNewRed = newRed, newNewGreen = newGreen, newNewBlue = newBlue;
                // if (dPerp < 1440)
                // {
                //   newNewRed = newRed * dPerp / 1440 + 255 * (1 - dPerp / 1440);
                //   newNewGreen = newGreen * dPerp / 1440;
                //   newNewBlue = newBlue * dPerp / 1440 + 255 * (1 - dPerp / 1440);
                // }
                //
                offscreenBufferData.data[offBuffer] = newNewRed;
                offscreenBufferData.data[offBuffer + 1] = newNewGreen;
                offscreenBufferData.data[offBuffer + 2] = newNewBlue;
                offscreenBufferData.data[offBuffer + 3] = 255;
              }
            }
          }
        },
        "col_thing": function(self, dx, dy, dh, data, shade, opacity) {
          const activeFrame = data.sprite.frames
            ? data.sprite.frames[data.sprite.activeFrame]
            : undefined;
          const offsetLeft = activeFrame
            ? data.offsetLeft * activeFrame.width
            : data.offsetLeft * data.sprite.width;
          self.util.render.col_wall(
            self,
            {}, // FIXME: occlusion for the current column
            data.sprite,
            1, // NOTE: do not repeat the sprite
            offsetLeft,
            dx,
            dy,
            dh,
            shade,
            opacity
          );
        },
        "col_freeformTile": function(
          self,
          dx,
          distTile,
          rayAngle,
          data,
          alpha
        ) {
          const H_MAX_WORLD = self.const.H_MAX_WORLD;
          // read collision data
          const shouldTryWall = data.shouldTryWall;           // is the free-form tile wall potentially visible?
          const shouldTryVisplanes = data.shouldTryVisplanes; // is the free-form tile floor and ceiling potentially visible?
          const hUpper_F = data.hUpper[0], hUpper_R = data.hUpper[1];
          const hLower_F = data.hLower[0], hLower_R = data.hLower[1];
          // calculate y-projection properties relative to the viewport
          const yViewPort = self.player.viewport + self.player.tilt;
          const yPlayer = self.mRows + yViewPort - self.player.head;
          const dltCeil = self.player.head - H_MAX_WORLD;
          const dltFloor = self.player.head;

          // calculate front-wall projection properties
          const scaleProj_F = self.VIEW_DIST / distTile;
          const hCeil_F = Math.floor(scaleProj_F * dltCeil + yPlayer);
          const yFloor_F = Math.floor(scaleProj_F * dltFloor + yPlayer);
          // properties for upper wall portion
          const projEndYUpper_F = Math.floor(scaleProj_F *
                                             (dltCeil + hUpper_F) + yPlayer);
          const hWallUpper_F = projEndYUpper_F - hCeil_F;
          // properties for lower wall portion
          const screenYLower_F = Math.floor(scaleProj_F *
                                            (dltFloor - hLower_F) + yPlayer);
          const hWallLower_F = yFloor_F - screenYLower_F;

          // calculate rear-wall projection properties
          const distTile_R = Math.sqrt(data.pseudoDistToPlayerRear) *
            Math.cos(rayAngle - self.player.rotation);
          const scaleProj_R = self.VIEW_DIST / distTile_R;
          const projEndYUpper_R = Math.floor(scaleProj_R *
                                             (dltCeil + hUpper_R) + yPlayer);
          const screenYLower_R = Math.floor(scaleProj_R *
                                            (dltFloor - hLower_R) + yPlayer);

          if (shouldTryWall) {
            const texture = data.textures[1];
            const sx = data.offsetLeft;

            // calculate occlusion for the clipping of the wall
            const occTop = hCeil_F, occBottom = self.mRows - yFloor_F;

            // draw upper wall portion of the freeform tile
            self.util.render.col_wall(
              self,
              {"top": occTop, "bottom": occBottom}, // FIXME: occlusion for the current column
              texture,
              10 * hUpper_F / (texture.worldHeight * H_MAX_WORLD),
              sx,
              dx,
              hCeil_F,
              hWallUpper_F,
              distTile / self.DRAW_DIST,
              alpha
            );
            // draw lower wall portion of the freeform tile
            self.util.render.col_wall(
              self,
              {"top": occTop, "bottom": occBottom}, // FIXME: occlusion for the current column
              texture,
              10 * hLower_F / (texture.worldHeight * H_MAX_WORLD),
              sx,
              dx,
              screenYLower_F,
              hWallLower_F,
              distTile / self.DRAW_DIST,
              alpha
            );
          }

          if (shouldTryVisplanes) {
            const textures = data.textures;
            const texCeil = textures[0], texFloor = textures[2];

            // only draw the ceiling if the upper wall portion of the
            // freeform tile has a non-zero height
            const shouldRenderCeil = hUpper_F || hUpper_R;
            /* determine the height of the ceiling slice */
            let hCeiling = 0;
            if (shouldRenderCeil && shouldTryWall)
              hCeiling = projEndYUpper_R - projEndYUpper_F;
            else if (shouldRenderCeil) hCeiling = projEndYUpper_R;
            /* draw ceiling if it is actually visible from the player's pov */
            if (hCeiling > 0) {
              self.util.render.col_ceiling(
                self,
                {
                  bottom: self.mRows - (shouldTryWall
                    ? Math.min(screenYLower_F, screenYLower_R)
                    : screenYLower_R)
                }, // FIXME: occlusion for the current column
                texCeil,
                dx,
                shouldTryWall ? projEndYUpper_F : 0,
                hCeiling,
                rayAngle,
                [hUpper_F, hUpper_R],
                [shouldTryWall ? distTile : 0 - distTile, distTile_R],
                self.player.anim.shooting.index === 0 ||
                self.player.anim.shooting.index === 1
                  ? 0
                  : 1
              );
            }

            // only draw the floor if the lower wall portion of the
            // freeform tile has a non-zero height
            const shouldRenderFloor = hLower_F || hLower_R;
            /* determine the height of the floor slice */
            let hFloor = 0;
            if (shouldRenderFloor && shouldTryWall)
              hFloor = screenYLower_F - screenYLower_R;
            else if (shouldRenderFloor)
              hFloor = self.mRows - screenYLower_R;
            /* draw floor if it is actually visible from the player's pov */
            if (hFloor > 0) {
              self.util.render.col_floor(
                self,
                {
                  top: shouldTryWall
                    ? Math.max(projEndYUpper_F, projEndYUpper_R)
                    : projEndYUpper_R
                }, // FIXME: occlusion for the current column
                texFloor,
                dx,
                screenYLower_R,
                hFloor,
                rayAngle,
                [hLower_F, hLower_R],
                [shouldTryWall ? distTile : 0 - distTile, distTile_R],
                self.player.anim.shooting.index === 0 ||
                self.player.anim.shooting.index === 1
                  ? 0
                  : 1
              );
            }
          }
        },
        "inventory": function(self) {
          const fillRect = self.util.fillRect;
          const invhead = self.player.invhead;
          const invselected = self.player.invselected;

          const ox = 288, oy = 448;
          const gap = 8, size = 16, stride = gap + size;
          let x = ox;

          for (let i = 0; i < invhead; ++i) {
            if (i === invselected) {
              fillRect(x, oy, size, 2, 255, 255, 255, 255);
              fillRect(x + size - 2, oy, 2, size, 255, 255, 255, 255);
              fillRect(x, oy + size - 2, size, 2, 255, 255, 255, 255);
              fillRect(x, oy, 2, size, 255, 255, 255, 255);
              fillRect(x + 4, oy + 4, 8, 8, 255, 255, 255, 255);
            } else {
              fillRect(x, oy, size, size, 255, 255, 255, 255);
            }

            x += stride;
          }
        }
      }
    },
    "exec": {
      "setup": function(self) {
        const resolution = {};

        // setup various utils
        Number.prototype.toFixedNum = self.util.toFixed;

        // render loading screen
        resolution.loading = self.util.render.loading(self);
        resolution.loading.start();

        // setup game variables
        self.VIEW_DIST = (self.mCols * 0.5) / Math.tan(self.FOV * 0.5);
        self.DRAW_DIST = self.const.DRAW_DIST * self.MAP_TILE_SIZE;
        self.DRAW_TILE_SIZE = {
          "x": self.res[0] / self.mCols,
          "y": self.res[1] / self.mRows
        };
        self.const.PLAYER_HEIGHT = self.mRows * 0.5;
        self.player.head = self.player.feet + self.const.PLAYER_HEIGHT;
        self.player.weaponDrawn = self.const.WEAPONS.SHOTGUN;

        // setup minimap
        minimapCanvas.width  = (2 * self.const.R_MINIMAP + 0.5) * self.const.TILE_SIZE_MINIMAP;
        minimapCanvas.height = minimapCanvas.width;

        // setup doors
        self.util.populateDoors(self);

        // setup pickable items (things | freewalls)
        self.util.populatePickables(self);

        // setup event listeners
        document.onkeydown = function(e) {
          self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
        };
        document.onkeyup = function(e) {
          self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
        };
        // setup mouse listeners
        self.exec.addMouseListener(self, canvas);
        // add fullscreen listener
        self.exec.addFullscreenListener(canvas);

        // async ops.
        return new Promise(function(resolve, reject) {
          // setup global sprites
          self.assets.sprites.setup(self, [
            // TODO: why strings — why not objects themselves?
            "playerWeapons." + self.player.weaponDrawn,
            "menu.skull"
          ])
            .then(function(sprites) {
              sprites.menu.skull.frames = sprites.menu.skull.frames
                .map(function(frame) {
                  return self.util.merge(
                    self,
                    frame,
                    {
                      "locOnScreen": [
                        {
                          "x": self.res[0] * 0.5 - 150,
                          "y": (self.res[1] - 56) * 0.5
                        },
                        {
                          "x": self.res[0] * 0.5 + 120,
                          "y": (self.res[1] - 56) * 0.5
                        }
                      ]
                    }
                  );
                });
            })

            // setup thing sprites
            .then(function () {
              return self.assets.sprites.setupImages(self, window.__sprites__);
            })

            // setup textures
            .then(function() {
              return self.assets.textures.setup(self, window.__textures__);
            })

            // adapt skybox texture to current game resolution
            // I know this seems a bit hacky, so don't judge me.
            .then(function(textures) {
              const texSky = textures.sky;
              const projectSkyH = Math.floor(
                self.res[1] + self.const.MAX_TILT * self.DRAW_TILE_SIZE.y
              );
              const projectSkyW = Math.floor(projectSkyH * texSky.width / texSky.height);
              self.util.setOffscreenBufferDimensions(projectSkyW, projectSkyH);
              self.util.drawImage(
                texSky,
                0,
                0,
                texSky.width,
                texSky.height,
                0,
                0,
                offscreenBufferW,
                offscreenBufferH
              );
              texSky.bitmap = new ImageData(
                self.util.transposeBitmap(offscreenBufferData.data,
                                          offscreenBufferW, offscreenBufferH),
                offscreenBufferW,
                offscreenBufferH
              ).data;
              texSky.width = offscreenBufferW;
              texSky.height = offscreenBufferH;
            })
            .then(function() {
              self.util.setOffscreenBufferDimensions(self.res[0], self.res[1]);
            })

            // setup world-object animations
            .then(function() {
              const woAnimationsFrames = self.assets.sprites.animations.thing;
              resolution.animations =
                Object.keys(woAnimationsFrames).map(function(sKey) {
                  const animationFrames = woAnimationsFrames[sKey];
                  const sprite = self.assets.sprites.images[sKey];

                  return self.api.animation(
                    self,
                    function(i) { // onFrame
                      sprite.activeFrame = animationFrames[i % animationFrames.length];
                    },
                    1000 / sprite.FPS
                  );
                });
            })
            // setup texture animations
            .then(function() {
              const tAnimationsFrames = self.assets.textures.animations;
              resolution.animations = resolution.animations.concat(
                Object.keys(tAnimationsFrames).map(function(tKey) {
                  const animationFrames = tAnimationsFrames[tKey];
                  const texture = self.assets.textures.images[tKey];

                  return self.api.animation(
                    self,
                    function(i) { // onFrame
                      texture.activeFrame = animationFrames[i % animationFrames.length];
                    },
                    1000 / texture.FPS
                  );
                }));
            })

            // FIXME: find a permanent fix for the audio-loading issues on iOS
            // setup theme music unless running on iOS
            .then(function() {
              const userAgent = window.navigator.userAgent;
              if (!userAgent.match(/iPad/i) && !userAgent.match(/iPhone/i)) {
                return self.assets.themes.setup(self, "main");
              }
            })

            // resolve setup
            .then(function() {
              resolve(resolution);
            });
        });
      },
      "addMouseListener": function(self, element) {
        const onMouseDown = function(e) {
          self.util.handleAsyncMouseButtonState(self, "mousedown", e.button);
        };
        const onMouseUp = function(e) {
          self.util.handleAsyncMouseButtonState(self, "mouseup", e.button);
        };
        const onMouseMove = function(e) {
          // get mouse movement
          const deltaX = e.movementX, deltaY = e.movementY;
          // update the player tilt using the mouse movement along y-axis
          self.exec.updatePlayerTilt(self, 0 - deltaY / self.DRAW_TILE_SIZE.y);
          // update the player rotation using the mouse movement along x-axis
          self.player.rotation += deltaX * self.FOV / self.res[0];
        };
        const onMouseWheel = function(e) {
          e.preventDefault(); // prevent scrolling the page
          // update the player height using the change in the mouse scroll
          self.exec.updatePlayerZ(self, 0 - e.deltaY / 5);
          self.player.head = self.player.feet + self.const.PLAYER_HEIGHT;
        };
        const isPointerLocked = function() {
          return document.pointerLockElement === element ||
            document.mozPointerLockElement === element;
        };
        const requestPointerLock = function() {
          if (!isPointerLocked()) {
            element.requestPointerLock = element.requestPointerLock ||
              element.mozRequestPointerLock;
            element.requestPointerLock();
          }
        };
        const onPointerLockChange = function() {
          if (isPointerLocked()) { // pointer locked, attach mouse listeners
            element.onclick = undefined;
            element.onmousedown = onMouseDown;
            element.onmouseup = onMouseUp;
            element.onmousemove = onMouseMove;
            element.onwheel = onMouseWheel;
          } else {                 // pointer unlocked, detach mouse listeners
            element.onclick = requestPointerLock;
            element.onmousedown = undefined;
            element.onmouseup = undefined;
            element.onmousemove = undefined;
            element.onwheel = undefined;
          }
        };
        element.onclick = requestPointerLock;
        document.onpointerlockchange = onPointerLockChange;
        document.onmozpointerlockchange = onPointerLockChange;
      },
      "addFullscreenListener": function(element) {
        element.requestFullscreen = element.requestFullscreen ||
                                    element.mozRequestFullscreen ||
                                    element.webkitRequestFullscreen;
        document.exitFullscreen = document.exitFullscreen ||
                                  document.mozExitFullscreen ||
                                  document.webkitExitFullscreen;
        addEventListener("keypress", function(e) {
          if (e.keyCode === 102) {
            if (document.fullscreenElement ||
                document.mozFullscreenElement ||
                document.webkitFullscreenElement)
              document.exitFullscreen();
            else element.requestFullscreen();
          }
        });
      },
      "playAudio": function(self, theme) {
        if (theme.status === "READY") {
          theme.status = "PLAYING";
          theme.audio.play().catch(function(error) {});
        }
      },
      "updatePlayerTilt": function(self, deltaTilt) {
        self.player.tilt += deltaTilt;
        if (self.player.tilt > self.const.MAX_TILT)
          self.player.tilt = self.const.MAX_TILT;
        else if (self.player.tilt + self.const.MAX_TILT < 0)
          self.player.tilt = 0 - self.const.MAX_TILT;
      },
      "updatePlayerZ": function(self, deltaZ) {
        self.player.feet += deltaZ;
        const hPlayerCrouch = self.player.anim.walking.apex;
        const zPlayerHead = self.player.feet + self.const.PLAYER_HEIGHT;
        if (zPlayerHead > self.const.H_MAX_WORLD - hPlayerCrouch)
          self.player.feet = self.const.H_MAX_WORLD - hPlayerCrouch -
                             self.const.PLAYER_HEIGHT;
        else if (zPlayerHead < hPlayerCrouch)
          self.player.feet = hPlayerCrouch - self.const.PLAYER_HEIGHT;
        self.player.viewport = self.player.feet;
      },
      "movePlayer": function(self, mult) {
        const updatePlayerTilt = self.exec.updatePlayerTilt;
        const updatePlayerZ = self.exec.updatePlayerZ;
        const collisionResponse = self.util.collision.collisionResponse;
        const animateWalking = self.exec.animateWalking;
        // remember the current position of the player
        const pX = self.player.x, pY = self.player.y;
        /* calculate the movement vector */
        const dirX = Math.cos(self.player.rotation);
        const dirY = Math.sin(self.player.rotation);
        let moveX = 0, moveY = 0;
        if (self.keyState.W & 1) { moveX += dirX; moveY += dirY; }
        if (self.keyState.S & 1) { moveX -= dirX; moveY -= dirY; }
        if (self.keyState.A & 1) { moveX += dirY; moveY -= dirX; }
        if (self.keyState.D & 1) { moveX -= dirY; moveY += dirX; }
        /* rotate player in-place */
        const magRot = 0.075 * mult;
        if (self.keyState.ARW_RIGHT & 1) self.player.rotation += magRot;
        if (self.keyState.ARW_LEFT & 1) self.player.rotation -= magRot;
        /* tilt player's head */
        const magTilt = 5 * mult;
        if (self.keyState.ARW_UP & 1) updatePlayerTilt(self, magTilt);
        if (self.keyState.ARW_DOWN & 1) updatePlayerTilt(self, 0 - magTilt);
        /* update player elevation */
        // if (self.keyState.E & 1) updatePlayerZ(self, magTilt);
        // if (self.keyState.Q & 1) updatePlayerZ(self, 0 - magTilt);
        /* calculate the goal position and resolve collisions if any */
        const goalX = pX + moveX * self.STEP_SIZE * mult;
        const goalY = pY + moveY * self.STEP_SIZE * mult;
        if (moveX || moveY) {
          const resolvedPos = collisionResponse(self, pX, pY, goalX, goalY);
          self.player.x = resolvedPos[0].toFixedNum(5);
          self.player.y = resolvedPos[1].toFixedNum(5);
          self.player.feet = resolvedPos[2];
          console.log(`(${self.player.x}, ${self.player.y}, ${self.player.feet})`);
        }
        // walking animation
        animateWalking(self, [self.player.x, self.player.y], [pX, pY]);
      },
      "animateWalking": function(self, newPos, prevPos) {
        const defaultWeaponFrame =
          self.assets.sprites.playerWeapons[self.player.weaponDrawn].frames[0];
        const defaultLocOnScreen = defaultWeaponFrame.defaultLocOnScreen;
        if (prevPos[0] !== newPos[0] || prevPos[1] !== newPos[1]) {
          // animate head tilt
          self.player.head = self.util.getWalkingPlayerHeight(self);
          // animate weapon bob
          if (self.player.anim.shooting.index < 0) {
            const bob = self.util.getWeaponBob(self);
            defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x + bob.x;
            defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y + bob.y;
          }
        } else {
          self.player.head = self.player.feet + self.const.PLAYER_HEIGHT;
          self.player.anim.walking = {"index": 0, "reverse": 0, "apex": self.player.anim.walking.apex};
          defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x;
          defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y;
          self.player.anim.weaponBob = {"index": 0, "reverse": 0, "apex": self.player.anim.weaponBob.apex};
        }
        self.player.viewport = self.player.head - self.const.PLAYER_HEIGHT;
      },
      "animateShooting": function(self) {
        if (
          ((self.keyState.SPC & 1) || (self.mouseButtonState.LEFT & 1)) &&
          (self.player.anim.shooting.animating & 1) === 0
        ) {
          const animationFrames = self.assets.sprites.animations.playerWeapons[
            self.player.weaponDrawn
          ];

          // prevent launching simultaneous instances of the shooting animation
          self.player.anim.shooting.animating = 1;

          self.api.animation(
            self,
            function(i) { // onFrame
              self.DRAW_DIST = (i === 0 || i === 1) // if shooting frame, increase lighting
                ? 150 * self.MAP_TILE_SIZE
                : self.const.DRAW_DIST * self.MAP_TILE_SIZE;
              self.assets.sprites.playerWeapons[
                self.player.weaponDrawn
              ].activeFrames = [animationFrames[i]];
              self.player.anim.shooting.index = i; // needed to lighten up the floor
            },                                     // during shooting frames
            self.const.SHOOTING_ANIM_INTERVAL[self.player.weaponDrawn],
            function(i) { // shouldEnd
              return i === animationFrames.length;
            },
            function() {  // onEnd
              self.player.anim.shooting.index = -1;
              self.player.anim.shooting.animating = 0;
            }
          ).start();
        }
      },
      "interactWDoor": function(self) {
        if (self.keyState.E & 1) {
          const MAP = self.map, N_COLS = self.nCols;
          const TYPE_TILE = self.mapLegend.TYPE_TILE;
          const TYPE_TILES = self.const.TYPE_TILES;
          const DOORS = self.doors;
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const PLAYER_BB_LEN = MARGIN_TO_WALL * 2;
          const coords2Key = self.util.coords2Key;
          const rectVsRect = self.util.collision.rectVsRect;
          /* lookup the tile exactly one unit ahead of the player along its line
           * of sight
           */
          const playerRot = self.player.rotation;
          const playerX = self.player.x, playerY = self.player.y;
          const lookupX = (playerX + Math.cos(playerRot)) << 0;
          const lookupY = (playerY + Math.sin(playerRot)) << 0;
          const tile = MAP[N_COLS * lookupY + lookupX];
          if (!tile) return;
          const tileType = tile[TYPE_TILE];
          if (tileType === TYPE_TILES.V_DOOR ||
              tileType === TYPE_TILES.H_DOOR) {
            const door = DOORS[coords2Key(lookupX, lookupY)];
            /* interact with the door that is ahead of the player unless they
             * are colliding with it
             */
            if (door &&
                !rectVsRect(playerX - MARGIN_TO_WALL, playerY - MARGIN_TO_WALL,
                            PLAYER_BB_LEN, PLAYER_BB_LEN,
                            lookupX, lookupY,
                            1, 1))
              self.exec.animateDoor(self, door);
          }
        }
      },
      "pickUpPickable": function(self) {
        if ((self.keyState.E & 1) &&
            self.player.invhead < self.const.MAX_INVENTORY_SIZE) {
          const MAP = self.map, N_COLS = self.nCols;
          const TYPE_TILE = self.mapLegend.TYPE_TILE;
          const TYPE_TILES = self.const.TYPE_TILES;
          const PICKABLES = self.pickables;
          const coords2Key = self.util.coords2Key;
          /* lookup the tile exactly one unit ahead of the player along its line
           * of sight
           */
          const playerRot = self.player.rotation;
          const playerX = self.player.x, playerY = self.player.y;
          const lookupX = (playerX + Math.cos(playerRot)) << 0;
          const lookupY = (playerY + Math.sin(playerRot)) << 0;
          const tile = MAP[N_COLS * lookupY + lookupX];
          if (!tile) return;
          const tileType = tile[TYPE_TILE];
          if (tileType === TYPE_TILES.THING ||
              tileType === TYPE_TILES.FREEFORM) {
            const pkey = coords2Key(lookupX, lookupY);
            const pickable = PICKABLES[pkey];
            /* pick the object up */
            if (pickable && !pickable.carrying) {
              pickable.carrying = 1;
              self.inventory.push(pickable);
              ++self.player.invhead;
              tile[TYPE_TILE] = 0; // clear the tile because they picked it up
              // reset the key state to prevent immediately dropping off
              self.keyState.E = 0;
            }
          }
        }
      },
      "dropPickable": function(self) {
        if ((self.keyState.E & 1) && self.player.invhead) {
          const MAP = self.map, N_COLS = self.nCols;
          const MAP_LEGEND = self.mapLegend;
          const TYPE_TILE = self.mapLegend.TYPE_TILE;
          const TYPE_TILES = self.const.TYPE_TILES;
          const PICKABLES = self.pickables;
          const isBlockingMapCell = self.util.isBlockingMapCell;
          const coords2Key = self.util.coords2Key;
          /* drop the pickable exactly one unit ahead of the player along its
           * line of sight
           */
          const playerRot = self.player.rotation;
          const playerX = self.player.x, playerY = self.player.y;
          const lookupX = (playerX + Math.cos(playerRot)) << 0;
          const lookupY = (playerY + Math.sin(playerRot)) << 0;
          /* drop it unless something's blocking */
          if (!isBlockingMapCell(self, lookupX, lookupY, 1)) {
            const invId = self.player.invselected, item = self.inventory[invId];
            const tileHeld = item.tile;
            const tile = MAP[N_COLS * lookupY + lookupX];
            const oldKey = coords2Key(item.x, item.y);
            const newKey = coords2Key(lookupX, lookupY);
            /* put the item down */
            tile[TYPE_TILE] = item.type;
            // TODO: merge freewalls once dropped
            if (item.type === TYPE_TILES.THING) {
              tile[MAP_LEGEND.WOTYPE] = tileHeld[MAP_LEGEND.WOTYPE];
              tile[MAP_LEGEND.WOH] = tileHeld[MAP_LEGEND.WOH];
            } else if (item.type === TYPE_TILES.FREEFORM) {
              tile[MAP_LEGEND.MARGIN_FFT_X] =
                tileHeld[MAP_LEGEND.MARGIN_FFT_X];
              tile[MAP_LEGEND.MARGIN_FFT_Y] =
                tileHeld[MAP_LEGEND.MARGIN_FFT_Y];
              tile[MAP_LEGEND.LEN_FFT_X] = tileHeld[MAP_LEGEND.LEN_FFT_X];
              tile[MAP_LEGEND.LEN_FFT_Y] = tileHeld[MAP_LEGEND.LEN_FFT_Y];
              tile[MAP_LEGEND.TEX_FFT_WALL] =
                tileHeld[MAP_LEGEND.TEX_FFT_WALL];
              tile[MAP_LEGEND.TEX_FFT_FLOOR] =
                tileHeld[MAP_LEGEND.TEX_FFT_FLOOR];
              tile[MAP_LEGEND.TEX_FFT_CEIL] =
                tileHeld[MAP_LEGEND.TEX_FFT_CEIL];
              tile[MAP_LEGEND.H_FFT_UPPER_SLOPE_START] =
                tileHeld[MAP_LEGEND.H_FFT_UPPER_SLOPE_START];
              tile[MAP_LEGEND.H_FFT_UPPER_SLOPE_END] =
                tileHeld[MAP_LEGEND.H_FFT_UPPER_SLOPE_END];
              tile[MAP_LEGEND.H_FFT_LOWER_SLOPE_START] =
                tileHeld[MAP_LEGEND.H_FFT_LOWER_SLOPE_START];
              tile[MAP_LEGEND.H_FFT_LOWER_SLOPE_END] =
                tileHeld[MAP_LEGEND.H_FFT_LOWER_SLOPE_END];
              tile[MAP_LEGEND.FFT_SLOPE_DIR] =
                tileHeld[MAP_LEGEND.FFT_SLOPE_DIR];
            }
            tile[MAP_LEGEND.PICKABLE] = tileHeld[MAP_LEGEND.PICKABLE];
            item.x = lookupX; item.y = lookupY;
            item.carrying = 0;
            delete PICKABLES[oldKey]; // update the item in the global
            PICKABLES[newKey] = item; // `pickables` LUT
            self.inventory.splice(invId, 1);                  // remove the item
            self.player.invselected = Math.max(invId - 1, 0); // from inventory
            --self.player.invhead;
            // reset the key state to prevent immediately picking up again
            self.keyState.E = 0;
          }
        }
      },
      "switchFocusedItem": function(self) {
        const last = Math.max(self.player.invhead - 1, 0);
        if (self.keyState["1"] & 1)
          self.player.invselected = Math.min(0, last);
        else if (self.keyState["2"] & 1)
          self.player.invselected = Math.min(1, last);
        else if (self.keyState["3"] & 1)
          self.player.invselected = Math.min(2, last);
      },
      "tryAndCloseDoor": function(self, door) {
        const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
        const PLAYER_BB_LEN = MARGIN_TO_WALL * 2;
        const rectVsRect = self.util.collision.rectVsRect;
        /* make sure the player AABB does not collide with the door before going
         * ahead and closing it
         */
        const pX = self.player.x, pY = self.player.y;
        const doorX = door.x, doorY = door.y;
        const isInDoorway = rectVsRect(pX - MARGIN_TO_WALL, pY - MARGIN_TO_WALL,
                                       PLAYER_BB_LEN, PLAYER_BB_LEN,
                                       doorX, doorY, 1, 1);
        if (!isInDoorway) self.exec.animateDoor(self, door);
        /* if player is in the doorway, wait for a bit before trying to close
         * again
         */
        else {
          clearTimeout(door.timeout);
          door.timeout = setTimeout(function() {
            self.exec.tryAndCloseDoor(self, door);
          }, self.const.DOOR_RESET_DELAY);
        }
      },
      "animateDoor": function(self, door) {
        if ((door.animating & 1) === 0) {
          door.animating = 1;
          const state = {"reverse": door.state === 0 ? 1 : 0};
          self.api.animation(
            self,
            function() { // onFrame
              door.state += ((state.reverse & 1) === 0 ? -1 : 1);
            },
            self.const.DOOR_ANIM_INTERVAL,
            function() { // shouldEnd
              return (state.reverse & 1) && door.state === 10 ||
                (state.reverse & 1) === 0 && door.state === 0;
            },
            function() { // onEnd
              door.animating = 0;
              if (door.state === 0) {
                door.timeout = setTimeout(function() {
                  self.exec.tryAndCloseDoor(self, door);
                }, self.const.DOOR_RESET_DELAY);
              } else {
                clearTimeout(door.timeout);
                door.timeout = undefined;
              }
            }
          ).start();
        }
      },
      "renderLoop": function(self, deltaT) {
        // update the frame buffer
        self.util.render.playerView(self);
        self.util.render.globalSprite(
          self,
          self.assets.sprites.playerWeapons[self.player.weaponDrawn]
        );
        self.util.render.inventory(self);
        // flush the frame buffer onto the game canvas
        ctx.putImageData(offscreenBufferData, 0, 0);
        // render mini-map directly onto the game canvas
        self.util.render.minimap(
          self,
          self.res[0] - self.const.R_MINIMAP * self.const.TILE_SIZE_MINIMAP - 10,
          self.res[1] - self.const.R_MINIMAP * self.const.TILE_SIZE_MINIMAP - 10
        );
        // render stats directly onto the game canvas
        self.util.render.stats(self, deltaT);
      },
      "playerLoop": function(self, mult) {
        self.exec.movePlayer(self, mult);
        self.exec.interactWDoor(self);
        self.exec.pickUpPickable(self);
        self.exec.dropPickable(self);
        self.exec.switchFocusedItem(self);
        self.exec.animateShooting(self);
      },
      "tick": function(self, deltaT) {
        self.exec.renderLoop(self, deltaT);
        self.exec.playerLoop(self, 1);
      }
    },
    "run": function(self) {
      let lastTick = new Date();
      // main game loop: reiterates ~30 times a sec
      const advanceTick = function() {
        const currentTick = new Date();
        const deltaT = currentTick - lastTick;
        self.exec.tick(self, deltaT);
        lastTick = currentTick;
      };
      self.intervals.game = setInterval(advanceTick, 1000 / self.FPS);
    },
    "start": function(resolution) {
      const self = this;

      // quit loading animation
      resolution.loading.cancel();

      // start world-object animations
      resolution.animations.forEach(function(animation) {
        animation.start();
      });

      const animTitleScreen = self.util.render.titleScreen(self, function() {
        document.removeEventListener("keydown", runContainer);
      });
      const runContainer = function() {
        self.run(self);
        animTitleScreen.cancel();
      };
      animTitleScreen.start();
      document.addEventListener("keydown", runContainer);
    }
  };
  game.exec.setup(game).then(game.start.bind(game));
})();
