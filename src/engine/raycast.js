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
 *     - Freelook (perspective-incorrect, achieved via y-shearing) *
 *     - Player elevation                                          *
 *     - Mini-map display                                          *
 *                                                                 *
 * Last updated: 12.17.2021                                        *
 *******************************************************************/

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
    "player": {
      "rotation": window.__player__.ROTATION,
      "anim": {
        "shooting": {"index": -1, "animating": 0},
        "walking": {"index": 0, "reverse": 0, "apex": 50},
        "weaponBob": {"index": 0, "reverse": 0, "apex": 5}
      },
      "tilt": 0,
      "viewport": window.__player__.Z,
      "feet": window.__player__.Z,
      "head": 0, // re-initialized at setup
      "x": window.__player__.X,
      "y": window.__player__.Y
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
        "animations": {
          "playerWeapons": {"shotgun": [1, 2, 0, 3, 4, 5, 4, 3, 0]},
          "menu": {"skull": [0, 1]}
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
        }
      },
      "textures": {
        "floor": {
          "hexStone": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "f_hexstone.png"
          },
          "teleporter": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "f_tporter.png"
          },
          "manhole": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "f_manhole.png"
          }
        },
        "ceil": {
          "skybox": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name":  "s_mounts.png"
          },
          "lights": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "f_lights.png"
          }
        },
        "wall": {
          "default": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "w_temple.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            },
            "worldHeight": 10
          },
          "alt": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "w_wood.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            },
            "worldHeight": 10
          },
          "alt_1": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "w_tech.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            },
            "worldHeight": 10
          },
          "door": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "w_door.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            },
            "worldHeight": 10
          },
          "doorDock": {
            "img": new Image(),
            "bitmap": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "w_doordock.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "worldHeight": 10
          }
        },
        "animations": {},
        "setup": function(self, keys) { // never heard of `Promise.all`???
          const loadTexture = function(i, resolve, reject) {
            if (i === keys.length) return resolve(self.assets.textures);
            const texture = keys[i].split(".").reduce(function(acc, curr) {
              return acc[curr];
            }, self.assets.textures);
            texture.img.onload = function() {
              texture.bitmap = self.util.getBitmap(self, texture.img);
              texture.width = texture.img.width;
              texture.height = texture.img.height;
              delete texture.img;
              loadTexture(i + 1, resolve, reject);
            };
            texture.img.onerror = function() {
              reject(texture);
            };
            texture.img.src = fs.__textures__ + texture.name;
          };
          return new Promise(function(resolve, reject) {
            loadTexture(0, resolve, reject);
          });
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
        "TELEPORTER": 5
      },
      "OFFSET_DIAG_WALLS": [
        [[0, 1], [1, 0]], // #/
        [[0, 0], [1, 1]], // \#
        [[1, 0], [0, 1]], // /#
        [[1, 1], [0, 0]]  // #\
      ],
      "MINIMAP_COLORS": [
        "#55555599", // 0: FREE
        "#101010",   // 1: WALL
        "#FFFFFF",   // 2: WALL_DIAG
        "#264E73",   // 3: V_DOOR
        "#264E73",   // 4: H_DOOR
        "#EB4034"    // 5: TELEPORTER
      ],
      "LEGEND_TEXTURES": {
        "WALL": ["default", "door", "doorDock", "alt", "alt_1"],
        "CEIL": ["skybox", "lights"],
        "FLOOR": ["hexStone", "teleporter", "manhole"]
      },
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
      "TILE_SIZE_MINIMAP": 4
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
        return [l0x0 + X * l0[0], l0y0 + X * l0[1]];
      },
      "isOnTheLeft": function(x0, y0, x1, y1, x, y) {
          return ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)).toFixedNum(5) < 0;
      },
      "collision": {
        "pointVsRect": function(xr, yr, w, h, x, y) {
          return x >= xr && x < xr + w && y >= yr && y < yr + h;
        },
        "pointVsPolygon": function(self, x, y, linedefs) {
          const nLines = linedefs.length;
          let nColls = 0;
          for (let i = 0; i < nLines; i += 1) {
            const v0 = linedefs[i][0], v1 = linedefs[i][1];
            const x0 = v0[0], y0 = v0[1], x1 = v1[0], y1 = v1[1];
            const colln = self.util.getIntersect(x, y, 0, y, x0, y0, x1, y1, 1);
            if (
              // if the ray intersects with an edge of the polygon
              colln && isFinite(colln[0]) && (
                // if the intersection is on either one of the vertices of the
                // polygon edge, the other vertex of the edge should be situated
                // below the ray
                colln[0] === x0 && colln[1] === y0 && y0 < y1 ||
                colln[0] === x1 && colln[1] === y1 && y0 > y1 ||
                // if the intersection is on neither one of the vertices of the
                // polygon edge
                (colln[0] !== x0 || colln[1] !== y0) &&
                (colln[0] !== x1 || colln[1] !== y1)
              )
            ) nColls += 1;
          }
          return nColls % 2 > 0;
        },
        "vectorVsMap": function(self, px, py, sx, sy, dx, dy) {
          const N_COLS = self.nCols, N_ROWS = self.nRows;
          const MAP = self.map;
          const LEGEND_TYPE_TILE = self.mapLegend.TYPE_TILE;
          const LEGEND_FACE_DIAG = self.mapLegend.FACE_DIAG;
          const TYPE_TILES = self.const.TYPE_TILES;
          const OFFSET_DIAG_WALLS = self.const.OFFSET_DIAG_WALLS;
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const CLOCKWISE = self.const.math.CLOCKWISE;
          const pointVsRect = self.util.collision.pointVsRect;
          const eucDist = self.util.eucDist;
          const getIntersect = self.util.getIntersect;
          const isOnTheLeft = self.util.isOnTheLeft;
          const isBlockingMapCell = self.util.isBlockingMapCell;
          /* NOTE: using `toFixedNum` here in order to prevent floating-point
           * rounding errors messing up the ray-casting routine, e.g.:
           * 3.6000000000000005 -> 3.6
           */
          const sX = sx.toFixedNum(5), sY = sy.toFixedNum(5);
          const dX = dx.toFixedNum(5), dY = dy.toFixedNum(5);
          /* calculate the properties for the movement ray */
          const deltaX = dX - sX, deltaY = dY - sY;
          const rayDirX = Math.sign(deltaX), rayDirY = Math.sign(deltaY);
          const raySlope = deltaY / deltaX, raySlope_ = deltaX / deltaY;
          // start casting the movement ray from the starting position
          let hitX = sX, hitY = sY;
          let tileX = Math.floor(hitX), tileY = Math.floor(hitY);
          /* vertical & horizontal tracers:
           * iterate over vertical and horizontal grid lines that intersect
           * with the movement ray
           */
          let vTraceX = rayDirX > 0 ? Math.floor(sX + 1) : tileX;
          let vTraceY = sY + (vTraceX - sX) * raySlope;
          let hTraceY = rayDirY > 0 ? Math.floor(sY + 1) : tileY;
          let hTraceX = sX + (hTraceY - sY) * raySlope_;
          /* how much each tracer will advance at each iteration */
          const vStepX = rayDirX, vStepY = vStepX * raySlope;
          const hStepY = rayDirY, hStepX = hStepY * raySlope_;
          let distCovered = 0; // the distance covered by the "closer" tracer
          let hitSolid = 0; // whether we hit a solid geometry or not
          let isVerticalHit;
          // how much distance the step the player took will cover
          const distanceToCover = eucDist(sX, sY, dX, dY, 1);
          /* the tile data we are currently inspecting */
          let tile = MAP[N_COLS * tileY + tileX];
          let typeTile = tile[LEGEND_TYPE_TILE];
          while (!hitSolid && distCovered < distanceToCover
                 && pointVsRect(0, 0, N_COLS, N_ROWS, tileX, tileY)) {
            hitSolid = isBlockingMapCell(self, tileX, tileY) ? 1 : 0;
            if (typeTile === TYPE_TILES.WALL_DIAG) {
              const dOffsets = OFFSET_DIAG_WALLS[tile[LEGEND_FACE_DIAG]];
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
                  const isectX = isect[0], isectY = isect[1];
                  /* account for the floating-point rounding errors in
                   * `isDInside`, e.g.: (+/-)0.00001
                   */
                  if (!Number.isFinite(isectX) || !Number.isFinite(isectY))
                    continue;
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
                        hitX, hitY, iGX, iGY, 1];
              // no collisions has been found, continue with the ray-casting
              hitSolid = 0;
            }
            /* advance tracers unless a solid geometry has been already hit */
            if (!hitSolid) {
              /* calculate the distances covered on the ray by each tracer */
              const vDist = eucDist(sX, sY, vTraceX, vTraceY, 1);
              const hDist = eucDist(sX, sY, hTraceX, hTraceY, 1);
              /* determine whether the hit is on the vertical axis */
              isVerticalHit = Number.isNaN(vDist) || vDist > hDist
                ? 0
                : vDist === hDist ? isVerticalHit : 1;
              distCovered = isVerticalHit ? vDist : hDist;
              if (isVerticalHit) {
                hitX = vTraceX; hitY = vTraceY; // hit by vertical tracer
                vTraceX += vStepX; vTraceY += vStepY; // advance the tracer
                tileX += rayDirX; // advance vertically to the next tile
              } else {
                hitX = hTraceX; hitY = hTraceY; // hit by horizontal tracer
                hTraceX += hStepX; hTraceY += hStepY; // advance the tracer
                tileY += rayDirY; // advance horizontally to the next tile
              }
              tile = MAP[N_COLS * tileY + tileX];
              typeTile = tile[LEGEND_TYPE_TILE];
            }
          }
          if (!hitSolid) return; // early return if there was no collision
          /* calculate the unit normal of the collided geometry */
          let normalX = 0, normalY = 0;
          const isHitOnVertical = (hitX === tileX || hitX === tileX + 1)
                                   && (px - hitX) * rayDirX <= 0;
          const isHitOnHorizontal = (hitY === tileY || hitY === tileY + 1)
                                    && (py - hitY) * rayDirY <= 0;
          if (isHitOnVertical && rayDirX) {
            /* CORNER CASE: if the movement vector collides with a corner of the
             * tile, resolve the collision against the other axis of the
             * movement vector unless that would cause another collision
             */
            if (isHitOnHorizontal && !isBlockingMapCell(self, px + rayDirX, py))
              normalY -= rayDirY;
            // EDGE CASE: resolve collision against the vertical edge of the
            // tile that has been hit
            else normalX -= rayDirX;
          } else if (isHitOnHorizontal && rayDirY) {
            /* CORNER CASE: the same as above */
            if (isHitOnVertical && !isBlockingMapCell(self, px, py + rayDirY))
              normalX -= rayDirX;
            // EDGE CASE: resolve collision against the horizontal edge of the
            // tile that has been hit
            else normalY -= rayDirY;
          }
          // return `undefined` if the normal vector is of zero length, as that
          // means there's actually no collisions to resolve
          if (!(normalX || normalY)) return;
          return [normalX, normalY, hitX, hitY];
        },
        "collisionResponse": function(self, px, py, gx, gy) {
          const CLOCKWISE = self.const.math.CLOCKWISE;
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const eucDist = self.util.eucDist;
          const vectorVsMap = self.util.collision.vectorVsMap;
          const collisionResponse = self.util.collision.collisionResponse;
          // TODO: detect collisions along the z-axis
          /* check all 4 vertices of the player AABB against collisions along
           * the movement vector
           */
          const vx = gx - px, vy = gy - py;
          /* use the first vertex of the player AABB that collides with a
           * blocking geometry to resolve the collision
           */
          let goalX, goalY, closestCollision, distTrespassEarlistHit;
          let hitNonOrdinary;
          for (let i = 0; i < 4 && !hitNonOrdinary; ++i) {
            const offsetX = MARGIN_TO_WALL * ((CLOCKWISE[i] & 1) ? 1 : -1);
            const offsetY = MARGIN_TO_WALL * ((CLOCKWISE[i] & 2) ? 1 : -1);
            let sx = px + offsetX, sy = py + offsetY;
            let dx = sx + vx, dy = sy + vy;
            const collision = vectorVsMap(self, px, py, sx, sy, dx, dy);
            if (collision) {
              const hitX = collision[2], hitY = collision[3];
              /* if the 4th and 5th elements in the collision data are occupied,
               * that means the actual collision had occurred at some other
               * vertex of player AABB than the current (ith) vertex
               */
              if (Number.isFinite(collision[4])
                  && Number.isFinite(collision[5])) {
                dx = collision[4]; dy = collision[5];
              }
              // if the 6th element in the collision data is `1`, that means the
              // point of collision described by the 4th and 5th elements *is*
              // the first vertex of the player AABB that'd collided with a
              // blocking geometry, so we can safely break out of the loop
              if (collision[6]) hitNonOrdinary = 1;
              const distTrespass = eucDist(hitX, hitY, dx, dy, 1);
              if ((distTrespassEarlistHit || 0) < distTrespass) {
                distTrespassEarlistHit = distTrespass;
                closestCollision = collision;
                goalX = dx; goalY = dy;
              }
            }
          }
          // return the goal position, i.e., the position to travel to had there
          // been no collisions whatsoever
          if (!closestCollision) return [gx, gy];
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
      "isBlockingMapCell": function(self, x, y) {
        const X = Math.floor(x), Y = Math.floor(y);
        const typeCell = self.map[self.nCols * Y + X][self.mapLegend.TYPE_TILE];
        return typeCell === self.const.TYPE_TILES.WALL ||
          typeCell === self.const.TYPE_TILES.WALL_DIAG ||
          (typeCell === self.const.TYPE_TILES.V_DOOR ||
            typeCell === self.const.TYPE_TILES.H_DOOR) &&
            self.doors[self.util.coords2Key(X, Y)].state;
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
      "getDoors": function(self) {
        const doors = {};
        for (let y = 0; y < self.nRows; y += 1) {
          for (let x = 0; x < self.nCols; x += 1) {
            const sample = self.map[self.nCols * y + x][self.mapLegend.TYPE_TILE];
            if (
              sample === self.const.TYPE_TILES.V_DOOR ||
              sample === self.const.TYPE_TILES.H_DOOR
            ) {
              doors[self.util.coords2Key(x, y)] = {
                "loc": {"x": x, "y": y},
                "state": 10, // 0: open, 10: closed
                "animating": 0,
                "timeout": undefined
              };
            }
          }
        }
        return doors;
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
      "clearRect": function(x, y, w, h) {
        offscreenBufferCtx.clearRect(x, y, w, h);
        offscreenBufferData = offscreenBufferCtx.getImageData(0, 0, offscreenBufferW, offscreenBufferH);
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
          const animationFrames = self.assets.sprites.animations.menu.skull;
          const render = function(iFrame) {
            const i = iFrame % animationFrames.length;
            self.assets.sprites.menu.skull.activeFrames = [animationFrames[i]];
            self.util.fillRect(0, 0, offscreenBufferW, offscreenBufferH, 0, 0, 0, 1);
            self.util.render.globalSprite(self, sprite);
            ctx.putImageData(offscreenBufferData, 0, 0);
            if (i === 1) {
              self.util.print(
                "Press any key to start",
                (self.res[0] - 212) * 0.5,
                (self.res[1] - 16) * 0.5,
                {"size": 16, "color": "#FFFFFF"}
              );
            }
          };
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
          const tileSize = self.const.TILE_SIZE_MINIMAP;

          minimapCanvasCtx.fillStyle = "#000000";
          minimapCanvasCtx.beginPath();
          minimapCanvasCtx.arc(R * tileSize, R * tileSize, R * tileSize, 0, 2 * Math.PI);
          minimapCanvasCtx.fill();

          minimapCanvasCtx.globalCompositeOperation = "source-atop";
          for (let offsetRow = -1 * R; offsetRow < R; offsetRow += 1) {
            for (let offsetCol = -1 * R; offsetCol < R; offsetCol += 1) {
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
                minimapCanvasCtx.fillStyle = self.const.MINIMAP_COLORS[1];
              }
              minimapCanvasCtx.fillRect(translateMap.x, translateMap.y, tileSize, tileSize);
            }
          }

          self.util.drawCaret(
            minimapCanvasCtx,
            {"x": (R + 0.5 + Math.cos(self.player.rotation)) * tileSize,                   "y": (R + 0.5 + Math.sin(self.player.rotation)) * tileSize},
            {"x": (R + 0.5 + Math.cos(self.player.rotation + Math.PI * 4 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.rotation + Math.PI * 4 / 3)) * tileSize},
            {"x": (R + 0.5 + Math.cos(self.player.rotation + Math.PI * 2 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.rotation + Math.PI * 2 / 3)) * tileSize},
            {"border": {"color": "#000000", "thickness": 2}}
          );

          ctx.fillStyle = "#101010";
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, (R + 1) * tileSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.translate(offsetX, offsetY);
          ctx.rotate(-1 * Math.PI * 0.5 - self.player.rotation);
          ctx.drawImage(minimapCanvas, -1 * R * tileSize, -1 * R * tileSize, minimapCanvas.width, minimapCanvas.height);
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
          // reset offscreen buffer
          self.util.clearRect(0, 0, offscreenBufferW, offscreenBufferH);

          const LEGEND_TEXTURES = self.const.LEGEND_TEXTURES;
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
            let solidTexture = self.assets.textures.wall.default;
            let offsetLeft; // sampling offset for the texture
            /* cast the ray until we either hit a solid wall or reach the max
             * draw distance or go out of bounds of the map
             */
            while (!hitSolid && distCovered < sqrDrawDist
                   && pointVsRect(0, 0, N_COLS, N_ROWS, tileX, tileY)) {
              // read the current tile
              const idxTile = N_COLS * tileY + tileX, tile = MAP[idxTile];
              const tileType = tile[MAP_LEGEND.TYPE_TILE];
              /* HIT: solid geometry (that extend from the floor all the way to
               * the ceiling)
               */
              if (tileType === TYPE_TILES.WALL) {
                /* determine which texture to draw */
                if (isVerticalHit) {
                  const isDoorDock = MAP[idxTile - rayDirX]
                                        [MAP_LEGEND.TYPE_TILE] ===
                                     TYPE_TILES.H_DOOR;
                  solidTexture = isDoorDock
                    ? self.assets.textures.wall.doorDock
                    : self.assets.textures.wall[LEGEND_TEXTURES.WALL[
                                                tile[rayDirX < 0
                                                  ? MAP_LEGEND.TEX_WALL_E
                                                  : MAP_LEGEND.TEX_WALL_W]]];
                  offsetLeft = hitY - tileY;
                } else {
                  const isDoorDock = MAP[idxTile - rayDirY * N_COLS]
                                        [MAP_LEGEND.TYPE_TILE] ===
                                     TYPE_TILES.V_DOOR;
                  solidTexture = isDoorDock
                    ? self.assets.textures.wall.doorDock
                    : self.assets.textures.wall[LEGEND_TEXTURES.WALL[
                                                tile[rayDirY < 0
                                                  ? MAP_LEGEND.TEX_WALL_S
                                                  : MAP_LEGEND.TEX_WALL_N]]];
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
                  solidTexture = self.assets.textures.wall.door;
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
                  solidTexture = self.assets.textures.wall.door;
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
                  if (isInTile
                      || pointVsRect(Math.min(x0, x1), Math.min(y0, y1),
                                     Math.abs(x0 - x1), Math.abs(y0 - y1),
                                     hitX, hitY)) {
                    // TODO: dynamically set textures for diagonal walls
                    solidTexture = self.assets.textures.wall.doorDock;
                    offsetLeft = (hitX - x0) / (x1 - x0);
                    hitSolid = 1;
                  }
                }
              }
              /* TODO:
               * HIT: non-solid geometry (things, free-form blocks, translucent
               * walls)
               */
              /* advance tracers unless a solid geometry has been hit already */
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
                0,
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
                0,
                self.player.anim.shooting.index === 0 ||
                self.player.anim.shooting.index === 1
                  ? 0
                  : 1
              );
            }
            /* draw texture-mapped wall unless max draw distance is exceeded,
             * otherwise draw a column of all-black pixels
             */
            if (offsetLeft >= 0) {
              const dataTex = solidTexture[isVerticalHit
                                            ? "vertical"
                                            : "horizontal"];
              self.util.render.col_wall(
                self,
                {}, // FIXME: occlusion for the current column
                solidTexture,
                self.const.H_SOLID_WALL / solidTexture.worldHeight,
                offsetLeft * dataTex.width + dataTex.offset,
                iCol,
                hCeil,
                hWall,
                realDist / MAX_DRAW_DIST
              );
            } else {
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
            /* TODO:
             * DRAW: non-solid geometry (that partially occludes the current
             * column on pixels)
             */
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
              offscreenBufferData.data[iBuffPx] = newR;
              offscreenBufferData.data[iBuffPx + 1] = newG;
              offscreenBufferData.data[iBuffPx + 2] = newB;
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
          wz,
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
          const LEGEND_TEXTURES = self.const.LEGEND_TEXTURES.FLOOR;
          const KEY_TEX_G_FLOOR = self.mapLegend.TEX_G_FLOOR;
          const FLOOR_TEXTURES = self.assets.textures.floor;
          const VIEW_DIST = self.VIEW_DIST;
          const DRAW_DIST = self.DRAW_DIST;

          const yViewPort = self.player.viewport + self.player.tilt;
          const yHead = self.player.head;
          const yPlayer = yViewPort + M_ROWS - yHead;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

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
            // at the given world-z (wz)
            const dFloorTile = (VIEW_DIST * (yHead - wz)) /
                               ((dStart + 1 + iR - yPlayer) * Math.cos(relAngle));
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
              const typeFloor = tile[KEY_TEX_G_FLOOR];
              texFloor = FLOOR_TEXTURES[LEGEND_TEXTURES[typeFloor]];
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
                offscreenBufferData.data[offBuffer] = newRed;
                offscreenBufferData.data[offBuffer + 1] = newGreen;
                offscreenBufferData.data[offBuffer + 2] = newBlue;
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
          wh,
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
          const LEGEND_TEXTURES = self.const.LEGEND_TEXTURES.CEIL;
          const KEY_TEX_G_CEIL = self.mapLegend.TEX_G_CEIL;
          const CEIL_TEXTURES = self.assets.textures.ceil;
          const MAX_TILT = self.const.MAX_TILT;
          const VIEW_DIST = self.VIEW_DIST;
          const DRAW_DIST = self.DRAW_DIST;
          const normalizeAngle = self.util.normalizeAngle;

          const H_MAX_WORLD = self.const.H_MAX_WORLD;
          const yViewPort = self.player.viewport + self.player.tilt;
          const yHead = self.player.head;
          const yPlayer = yViewPort + M_ROWS - yHead;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

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
            // that has a height of world-height (wh)
            const dCeilTile = (VIEW_DIST * (yHead + wh - H_MAX_WORLD)) /
                              ((dStart + iR - yPlayer) * Math.cos(relAngle));
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
              const typeCeil = tile[KEY_TEX_G_CEIL]; isSky = typeCeil === 0;
              texCeil = CEIL_TEXTURES[LEGEND_TEXTURES[typeCeil]];
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
                offscreenBufferData.data[offBuffer] = newRed;
                offscreenBufferData.data[offBuffer + 1] = newGreen;
                offscreenBufferData.data[offBuffer + 2] = newBlue;
                offscreenBufferData.data[offBuffer + 3] = 255;
              }
            }
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
        minimapCanvas.width  = 2 * self.const.R_MINIMAP * self.const.TILE_SIZE_MINIMAP;
        minimapCanvas.height = minimapCanvas.width;

        // setup doors
        self.doors = self.util.getDoors(self);

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
          // setup sprites // TODO: why strings? - why not objects themselves?
          self.assets.sprites.setup(self, [
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

            // setup textures // TODO: why strings? - why not objects themselves?
            .then(function() {
              return self.assets.textures.setup(self, [
                "ceil.skybox",
                "ceil.lights",
                "floor.hexStone",
                "floor.teleporter",
                "floor.manhole",
                "wall.default",
                "wall.alt",
                "wall.alt_1",
                "wall.door",
                "wall.doorDock"
              ]);
            })

            // adapt skybox texture to current game resolution
            // I know this seems a bit hacky, so don't judge me.
            .then(function(textures) {
              const texSky = textures.ceil.skybox;
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

            // setup texture animations
            .then(function() {
              const tAnimationsFrames = self.assets.textures.animations;
              resolution.animations = Object.keys(tAnimationsFrames)
                .map(function(tKey) {
                  const animationFrames = tAnimationsFrames[tKey];
                  const textureLookup = tKey[0] === "w"
                    ? self.assets.textures.wall
                    : tKey[0] === "f"
                      ? self.assets.textures.floor
                      : self.assets.textures.ceil;
                  const texture = textureLookup[tKey.slice(2)];
                  return self.api.animation(
                    self,
                    function(i) { // onFrame
                      texture.activeFrame = animationFrames[i % animationFrames.length];
                    },
                    1000 / texture.FPS
                  );
                });
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
          if (e.which === 102 || e.keyCode === 102) {
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
        if (self.keyState.E & 1) updatePlayerZ(self, magTilt);
        if (self.keyState.Q & 1) updatePlayerZ(self, 0 - magTilt);
        /* calculate the goal position and resolve collisions if any */
        const goalX = pX + moveX * self.STEP_SIZE * mult;
        const goalY = pY + moveY * self.STEP_SIZE * mult;
        if (moveX || moveY) {
          const resolvedPos = collisionResponse(self, pX, pY, goalX, goalY);
          self.player.x = resolvedPos[0]; self.player.y = resolvedPos[1];
        }
        // walking animation
        animateWalking(self, [self.player.x, self.player.y], [pX, pY]);
      },
      "animateWalking": function(self, newPos, prevPos) {
        const defaultWeaponFrame = self.assets.sprites.playerWeapons[self.player.weaponDrawn].frames[0];
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
        if (self.keyState.RTN & 1) {
          const MAP = self.map, N_COLS = self.nCols;
          const TYPE_TILE = self.mapLegend.TYPE_TILE;
          const TYPE_V_DOOR = self.const.TYPE_TILES.V_DOOR;
          const TYPE_H_DOOR = self.const.TYPE_TILES.H_DOOR;
          const DOORS = self.doors;
          const coords2Key = self.util.coords2Key;
          /* lookup the tiles exactly one unit ahead of the player in both axes
           * to see whether they are doors or not
           */
          const playerRot = self.player.rotation;
          const playerX = self.player.x, playerY = self.player.y;
          const pX = Math.floor(playerX), pY = Math.floor(playerY);
          const lookupX = pX + Math.sign(Math.cos(playerRot));
          const lookupY = pY + Math.sign(Math.sin(playerRot));
          const tileV = MAP[N_COLS * pY + lookupX][TYPE_TILE];
          const doorDataV = DOORS[coords2Key(lookupX, pY)];
          const tileH = MAP[N_COLS * lookupY + pX][TYPE_TILE];
          const doorDataH = DOORS[coords2Key(pX, lookupY)];
          if (Math.abs(playerX - lookupX) >= self.const.MARGIN_TO_WALL
              && tileV === TYPE_V_DOOR)
            self.exec.animateDoor(self, doorDataV);
          else if (Math.abs(playerY - lookupY) >= self.const.MARGIN_TO_WALL
                   && tileH === TYPE_H_DOOR)
            self.exec.animateDoor(self, doorDataH);
        }
      },
      "tryAndCloseDoor": function(self, door) {
        const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
        const CLOCKWISE = self.const.math.CLOCKWISE;
        /* make sure the player AABB does not collide with the wall before
         * going ahead and closing it
         */
        const pX = self.player.x, pY = self.player.y;
        const doorX = door.loc.x, doorY = door.loc.y;
        let isInDoorway = false;
        for (let iVertex = 0; iVertex < 4 && !isInDoorway; ++iVertex) {
          const vX = pX + MARGIN_TO_WALL * ((CLOCKWISE[iVertex] & 1) ? 1 : -1);
          const vY = pY + MARGIN_TO_WALL * ((CLOCKWISE[iVertex] & 2) ? 1 : -1);
          isInDoorway = Math.floor(vX) === doorX && Math.floor(vY) === doorY;
        }
        if (!isInDoorway) self.exec.animateDoor(self, door);
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
