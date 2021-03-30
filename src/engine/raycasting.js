/*******************************************************************
 *                       Raycasting.js                             *
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
 *     - Texture-mapped walls, floors & ceilings                   *
 *     - Alpha blending                                            *
 *     - Panoramic skybox                                          *
 *     - Shading with distance                                     *
 *     - Doors                                                     *
 *     - Diagonal walls                                            *
 *     - Ability to look up & down                                 *
 *     - Player elevation                                          *
 *     - Walking animation & weapon bobbing                        *
 *     - Mini-map display                                          *
 *                                                                 *
 * Last updated: 03.30.2021                                        *
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
    "__file__": "/engine/raycasting.js",
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
    "mouseButtonState": {
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
      "angle": window.__player__.ANGLE,
      "anim": {
        "shooting": {"index": -1, "animating": 0},
        "walking": {"index": 0, "reverse": 0, "apex": 12},
        "weaponBob": {"index": 0, "reverse": 0, "apex": 6}
      },
      "tilt": 0,
      "frstmElev": window.__player__.Z,
      "x": window.__player__.X,
      "y": window.__player__.Y,
      "z": 0 // re-initialized at setup
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
                sprite.bitmap = self.util.getBitmap(sprite.img);
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
        "setup": function(self, keys) { // never heard of `Promise.all`???
          const loadTexture = function(i, resolve, reject) {
            if (i === keys.length) return resolve(self.assets.textures);
            const texture = keys[i].split(".").reduce(function(acc, curr) {
              return acc[curr];
            }, self.assets.textures);
            texture.img.onload = function() {
              texture.bitmap = self.util.getBitmap(texture.img);
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
        "RAD_360": 2 * Math.PI
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
        [[1, 0], [0, 1]], // #/
        [[1, 1], [0, 0]], // \#
        [[0, 1], [1, 0]], // /#
        [[0, 0], [1, 1]]  // #\
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
      "VISPLANES": 1,
      "SHOOTING_ANIM_INTERVAL": {"shotgun": 110},
      "DOOR_ANIM_INTERVAL": 20,
      "DOOR_RESET_DELAY": 3000,
      "MARGIN_TO_WALL": 0.4,
      "DRAW_DIST": 15,
      "H_SOLID_WALL": 10,
      "H_MAX_WORLD": 480,
      "CLIP_PROJ_EXTRA_CEIL": 0, // initialized at `setup`
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
      },
      "memo": function(data) {
        let _data = data;

        return {
          "get": function() { return _data; },
          "reset": function(data) { _data = data; }
        };
      }
    },
    "util": {
      "getWalkingPlayerHeight": function(self) {
        const walkingState = self.player.anim.walking;
        const index = walkingState.index + (walkingState.reverse ? 1 : -1);
        walkingState.reverse = index === -1 * walkingState.apex ? 1 : index === 0
          ? 0
          : walkingState.reverse;
        walkingState.index = index;
        return self.player.frstmElev + self.const.PLAYER_HEIGHT + index;
      },
      "getWeaponBob": function(self) {
        const bobState = self.player.anim.weaponBob;
        const x = bobState.index + (bobState.reverse ? -0.5 : 0.5);
        const y = -0.75 * x * x;
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
      "eucDist": function(a, b, pseudo, multiplier) {
        multiplier = multiplier ? multiplier : 1;
        const pseudoDist = ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) * multiplier * multiplier;
        return pseudo === true ? pseudoDist : Math.sqrt(pseudoDist);
      },
      "getIntersect": function(l0x0, l0y0, l0x1, l0y1, l1x0, l1y0, l1x1, l1y1, seg) {
        const vec2dCross = (u, v) => u[0] * v[1] - u[1] * v[0]; // FIXME: remove as a separate function
        const l0 = [l0x1 - l0x0, l0y1 - l0y0], l1 = [l1x1 - l1x0, l1y1 - l1y0];
        const denom = vec2dCross(l0, l1);
        const numer = [l1x0 - l0x0, l1y0 - l0y0];
        const X = vec2dCross(numer, l1) / denom;
        if (seg) {
          const Y = vec2dCross(numer, l0) / denom;
          // if given vectors l0 and l1 are line segments, their intersection
          // parameters X and Y must be within the range [0, 1], that is,
          // the point of intersection must be sitting on both line segments
          if (X < 0 || X > 1 || Y < 0 || Y > 1) return;
        }
        return [l0x0 + X * l0[0], l0y0 + X * l0[1]];
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
        "playerAABBvsGrid": function(self, pace, movingAlongX) {
          const MARGIN_TO_WALL = self.const.MARGIN_TO_WALL;
          const playerX = self.player.x, playerY = self.player.y;
          const PACE = pace.toFixedNum(5);
          const DIR = Math.sign(PACE);
          if (PACE && movingAlongX) {    // if the movement is along the x-axis
            const newX = playerX + PACE;
            const vX = newX + MARGIN_TO_WALL * DIR;
            const vNorth = (playerY - MARGIN_TO_WALL).toFixedNum(5);
            const vSouth = (playerY + MARGIN_TO_WALL).toFixedNum(5);
            const northBlocked = self.util.isBlockingMapCell(self, vX, vNorth);
            const southBlocked = self.util.isBlockingMapCell(self, vX, vSouth);
            const southEdgeTouching = Math.floor(vSouth) === vSouth;
            // a collision must have occurred if either the northern or the
            // the non-touching southern edge of the player bounding-box
            // is blocked
            if (northBlocked || southBlocked && !southEdgeTouching)
              return Math.floor(vX);
          } else if (PACE) {             // if the movement is along the y-axis
            const newY = playerY + PACE;
            const vY = newY + MARGIN_TO_WALL * DIR;
            const vWest = (playerX - MARGIN_TO_WALL).toFixedNum(5);
            const vEast = (playerX + MARGIN_TO_WALL).toFixedNum(5);
            const westBlocked = self.util.isBlockingMapCell(self, vWest, vY);
            const eastBlocked = self.util.isBlockingMapCell(self, vEast, vY);
            const eastEdgeTouching = Math.floor(vEast) === vEast;
            // a collision must have occurred if either the western or the
            // the non-touching eastern edge of the player bounding-box
            // is blocked
            if (westBlocked || eastBlocked && !eastEdgeTouching)
              return Math.floor(vY);
          }
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
      "getBitmap": function(img) {
        const buffCanvas = document.createElement("canvas");
        const buffCtx = buffCanvas.getContext("2d");
        buffCanvas.width = img.width;
        buffCanvas.height = img.height;
        buffCtx.drawImage(img, 0, 0);
        return buffCtx.getImageData(0, 0, img.width, img.height).data;
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
        const imgBuffer = imgData.bitmap, imgWidth = imgData.width, imgHeight = imgData.height;
        // early return if either source or destination is out of bounds
        if (
          sx + sw <= 0 || sy + sh <= 0 || sx >= imgWidth || sy >= imgHeight ||
          dx + dw <= 0 || dy + dh <= 0 || dx >= offscreenBufferW ||
          dy >= offscreenBufferH
        ) return;

        // calculate source & destination coordinates & the scaling factor
        const SX = Math.floor(sx), SY = Math.floor(sy), SW = Math.ceil(sw), SH = Math.ceil(sh);
        const DX = Math.floor(dx), DY = Math.floor(dy), DW = Math.ceil(dw), DH = Math.ceil(dh);
        const shade = options && options.shade ? options.shade : 0;
        const opacity = options && options.alpha ? options.alpha : 1;
        const scaleX = DW / SW, scaleY = DH / SH;
        // clip image from top and left
        const dClipW = Math.max(0 - DX, 0), dClipH = Math.max(0 - DY, 0);
        const dClippedW = DW - dClipW, dClippedH = DH - dClipH;
        const sClipW = Math.floor(dClipW * SW / DW), sClipH = Math.floor(dClipH * SH / DH);
        // calculate starting coordinates and dimensions for source & destination
        const sStartX = SX + sClipW, dStartX = DX + dClipW;
        const sStartY = SY + sClipH, dStartY = DY + dClipH;
        const dW = dClippedW, dH = dClippedH;
        // draw scaled image
        let sX = sStartX, dX = dStartX, drawCol = scaleX - dClipW % scaleX;
        while (sX < imgWidth && dX < dStartX + dW && dX < offscreenBufferW) {
          while (drawCol > 0 && dX < dStartX + dW && dX < offscreenBufferW) {
            let sY = sStartY, dY = dStartY, drawRow = scaleY - dClipH % scaleY;
            while (sY < imgHeight && dY < dStartY + dH && dY < offscreenBufferH) {
              const offIm = 4 * (imgWidth * sY + sX);
              const iRed = imgBuffer[offIm];
              const iGreen = imgBuffer[offIm + 1];
              const iBlue = imgBuffer[offIm + 2];
              const iAlpha = imgBuffer[offIm + 3];
              while (drawRow > 0 && dY < dStartY + dH && dY < offscreenBufferH) {
                if (sX >= 0 && sY >= 0) {
                  const offBuff = 4 * (offscreenBufferW * dY + dX);
                  const bRed = offscreenBufferData.data[offBuff];
                  const bGreen = offscreenBufferData.data[offBuff + 1];
                  const bBlue = offscreenBufferData.data[offBuff + 2];
                  const bAlpha = offscreenBufferData.data[offBuff + 3] || 255;
                  const rBlend = iAlpha * opacity / bAlpha;
                  const newRed = iRed * (1 - shade) * rBlend + bRed * (1 - rBlend);
                  const newGreen = iGreen * (1 - shade) * rBlend + bGreen * (1 - rBlend);
                  const newBlue = iBlue * (1 - shade) * rBlend + bBlue * (1 - rBlend);
                  offscreenBufferData.data[offBuff] = newRed;
                  offscreenBufferData.data[offBuff + 1] = newGreen;
                  offscreenBufferData.data[offBuff + 2] = newBlue;
                  offscreenBufferData.data[offBuff + 3] = 255;
                }
                drawRow -= 1;
                dY += 1;
              }
              while (drawRow <= 0) {
                drawRow += scaleY;
                sY += 1;
              }
            }
            drawCol -= 1;
            dX += 1;
          }
          while (drawCol <= 0) {
            drawCol += scaleX;
            sX += 1;
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
          self.util.print(
            "X: " + Math.floor(self.player.x) + " Y: " + Math.floor(self.player.y) +
            " | α: " + self.util.rad2Deg(self, self.player.angle).toFixed(1) + " deg" +
            " | FPS: " + (1000 / deltaT).toFixed(1),
            5,
            15,
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
            {"x": (R + 0.5 + Math.cos(self.player.angle)) * tileSize,                   "y": (R + 0.5 + Math.sin(self.player.angle)) * tileSize},
            {"x": (R + 0.5 + Math.cos(self.player.angle + Math.PI * 4 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.angle + Math.PI * 4 / 3)) * tileSize},
            {"x": (R + 0.5 + Math.cos(self.player.angle + Math.PI * 2 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.angle + Math.PI * 2 / 3)) * tileSize},
            {"border": {"color": "#000000", "thickness": 2}}
          );

          ctx.fillStyle = "#101010";
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, (R + 1) * tileSize, 0, 2 * Math.PI);
          ctx.fill();

          ctx.translate(offsetX, offsetY);
          ctx.rotate(-1 * Math.PI * 0.5 - self.player.angle);
          ctx.drawImage(minimapCanvas, -1 * R * tileSize, -1 * R * tileSize, minimapCanvas.width, minimapCanvas.height);
          ctx.rotate(Math.PI * 0.5 + self.player.angle);
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
        "frame": {
          "rasterized": function(self) {
            // read some constants
            const H_FRSTM = self.player.frstmElev + self.player.tilt;

            // reset offscreen buffer
            self.util.clearRect(0, 0, offscreenBufferW, offscreenBufferH);

            // raycasting
            const sqrDrawDist = self.DRAW_DIST * self.DRAW_DIST;
            let previousHit;
            let currentHit;
            for (let iCol = 0; iCol < self.mCols; iCol += 1) {
              const ray = {
                "angle": Math.atan((-1 * self.mCols * 0.5 + iCol) / self.VIEW_DIST) + self.player.angle
              };
              ray.dir = {
                "x": Math.cos(ray.angle),
                "y": Math.sin(ray.angle)
              };
              ray.slope   = ray.dir.y / ray.dir.x;
              const up    = ray.dir.y < 0 ? 1 : 0;
              const right = ray.dir.x > 0 ? 1 : 0;

              let distToWall;
              let typeWall   = self.assets.textures.wall.default;
              let offsetLeft = 0;

              // vertical wall detection
              const stepV  = {};
              const traceV = {};
              stepV.x      = right & 1 ? 1 : -1;
              stepV.y      = stepV.x * ray.slope;
              traceV.x     = right ? Math.ceil(self.player.x) : Math.floor(self.player.x);
              traceV.y     = self.player.y + (traceV.x - self.player.x) * ray.slope;
              let hitV     = 0;
              while (
                (hitV & 1) === 0 &&
                traceV.x > 0 && traceV.x < self.nCols &&
                traceV.y >= 0 && traceV.y < self.nRows
              ) {
                const sampleMap = {
                  "x": Math.floor(traceV.x + ((right & 1) ? 0 : -1)),
                  "y": Math.floor(traceV.y)
                };
                const sample = self.map[self.nCols * sampleMap.y + sampleMap.x];

                // max. draw distance exceeded, break out of loop
                if (self.util.eucDist(traceV, {"x": self.player.x, "y": self.player.y}, true, self.MAP_TILE_SIZE) > sqrDrawDist) {
                  hitV = 1;
                  distToWall = sqrDrawDist;
                }

                // did we hit some SOLID obstacle?
                // like walls, doors, or diagonal walls
                else if (
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL ||
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG ||
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR
                ) {
                  const hitKey = self.util.coords2Key(sampleMap);
                  const pHit = {"x": traceV.x, "y": traceV.y};

                  // calculate point hit on the map
                  if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR) {
                    pHit.x = sampleMap.x + 0.5;
                    pHit.y += (sampleMap.x + 0.5 - traceV.x) * ray.slope;
                  } else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG) {
                    const pIntersect = self.util.getIntersect(
                      self.player.x,
                      self.player.y,
                      traceV.x,
                      traceV.y,
                      sampleMap.x + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][0][0],
                      sampleMap.y + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][0][1],
                      sampleMap.x + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][1][0],
                      sampleMap.y + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][1][1]
                    ); // FIXME: fix for parallel lines
                    pHit.x = pIntersect[0];
                    pHit.y = pIntersect[1];
                  }

                  // collision test - whether or not we hit a wall (or door)
                  if (
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL ||
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG &&
                    pHit.x >= sampleMap.x && pHit.x < sampleMap.x + 1 ||
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR &&
                    sampleMap.y + self.doors[hitKey].state * 0.1 > pHit.y &&
                    pHit.y < sampleMap.y + 1
                  ) {
                    const hitEast = pHit.x > sampleMap.x;
                    currentHit = "vertical";
                    hitV = 1;
                    distToWall = Math.min(self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.MAP_TILE_SIZE), sqrDrawDist);

                    // determine the type of the texture to draw on the hit side of the wall
                    typeWall = sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL
                      ? (self.map[self.nCols * sampleMap.y + sampleMap.x + (hitEast ? 1 : -1)][self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR
                        ? self.assets.textures.wall.doorDock
                        : self.assets.textures.wall[self.const.LEGEND_TEXTURES.WALL[sample[hitEast ? self.mapLegend.TEX_WALL_E : self.mapLegend.TEX_WALL_W]]])
                      : self.assets.textures.wall.door;

                    // TODO: add texture-mapping for diagonal walls
                    // determine how far from the left of the wall we should sample from the wall texture
                    offsetLeft = pHit.y - sampleMap.y +
                      (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR
                        ? (1 - self.doors[hitKey].state * 0.1)
                        : 0);
                  }
                }

                // if we hit a horizontal door, no need to continue progressing
                else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR) hitV = 1;

                traceV.x += stepV.x;
                traceV.y += stepV.y;
              }

              // horizontal wall detection
              const stepH  = {};
              const traceH = {};
              stepH.y      = up & 1 ? -1 : 1;
              stepH.x      = stepH.y / ray.slope;
              traceH.y     = up ? Math.floor(self.player.y) : Math.ceil(self.player.y);
              traceH.x     = self.player.x + (traceH.y - self.player.y) / ray.slope;
              let hitH     = 0;
              while (
                (hitH & 1) === 0 &&
                traceH.x >= 0 && traceH.x < self.nCols &&
                traceH.y > 0 && traceH.y < self.nRows
              ) {
                const sampleMap = {
                  "x": Math.floor(traceH.x),
                  "y": Math.floor(traceH.y + ((up & 1) ? -1 : 0))
                };
                const sample = self.map[self.nCols * sampleMap.y + sampleMap.x];

                // max. draw distance exceeded, break out of loop
                if (self.util.eucDist(traceH, {"x": self.player.x, "y": self.player.y}, true, self.MAP_TILE_SIZE) > sqrDrawDist) {
                  hitH = 1;
                  distToWall = distToWall ? distToWall : sqrDrawDist;
                }

                // did we hit some SOLID obstacle?
                // like walls, doors, or diagonal walls
                else if (
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL ||
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG ||
                  sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR
                ) {
                  const hitKey = self.util.coords2Key(sampleMap);
                  const pHit = {"x": traceH.x, "y": traceH.y};

                  // calculate point hit on the map
                  if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR) {
                    pHit.x += (sampleMap.y + 0.5 - traceH.y) / ray.slope;
                    pHit.y = sampleMap.y + 0.5;
                  } else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG) {
                    const pIntersect = self.util.getIntersect(
                      self.player.x,
                      self.player.y,
                      traceH.x,
                      traceH.y,
                      sampleMap.x + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][0][0],
                      sampleMap.y + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][0][1],
                      sampleMap.x + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][1][0],
                      sampleMap.y + self.const.OFFSET_DIAG_WALLS[sample[self.mapLegend.FACE_DIAG]][1][1]
                    ); // FIXME: fix for parallel lines
                    pHit.x = pIntersect[0];
                    pHit.y = pIntersect[1];
                  }

                  // collision test - whether or not we hit a wall (or door)
                  if (
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL ||
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL_DIAG &&
                    pHit.y >= sampleMap.y && pHit.y < sampleMap.y + 1 ||
                    sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR &&
                    1 + sampleMap.x - self.doors[hitKey].state * 0.1 < pHit.x &&
                    pHit.x < sampleMap.x + 1
                  ) {
                    const hitDist = Math.min(self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.MAP_TILE_SIZE), sqrDrawDist);

                    // if current horizontal hit is closer than current vertical hit
                    if (
                      distToWall === undefined || distToWall > hitDist ||
                      (distToWall === hitDist && previousHit === "horizontal")
                    ) {
                      const hitSouth = pHit.y > sampleMap.y;
                      currentHit = "horizontal";
                      distToWall = hitDist;

                      // determine the type of the texture to draw on the hit side of the wall
                      typeWall = sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.WALL
                        ? (self.map[self.nCols * (sampleMap.y + (hitSouth ? 1 : -1)) + sampleMap.x][self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR
                          ? self.assets.textures.wall.doorDock
                          : self.assets.textures.wall[self.const.LEGEND_TEXTURES.WALL[sample[hitSouth ? self.mapLegend.TEX_WALL_S : self.mapLegend.TEX_WALL_N]]])
                        : self.assets.textures.wall.door;

                      // TODO: add texture-mapping for diagonal walls
                      // determine how far from the left of the wall we should sample from the wall texture
                      offsetLeft = pHit.x - sampleMap.x -
                        (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR
                          ? (1 - self.doors[hitKey].state * 0.1)
                          : 0);
                    }
                    hitH = 1;
                  }
                }

                // if we hit a vertical door, no need to continue progressing
                else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR) hitH = 1;

                traceH.x += stepH.x;
                traceH.y += stepH.y;
              }
              previousHit = currentHit;

              // calculate the real distance
              distToWall = Math.sqrt(distToWall);
              const realDist = distToWall;

              // fix the fish-eye distortion by calculating the perpendicular
              // distance to the wall
              distToWall *= Math.cos(ray.angle - self.player.angle);

              // calculate ceiling, floor and wall height for current column
              const scaleProj = self.VIEW_DIST / distToWall;
              const yPlayer = self.mRows + H_FRSTM - self.player.z;
              const hCeil = Math.floor(
                scaleProj * (self.player.z - self.const.H_MAX_WORLD) + yPlayer
              );
              const yFloor = Math.floor(scaleProj * self.player.z + yPlayer);
              const hWall = yFloor - hCeil;

              if (self.const.VISPLANES || window.VISPLANES) {
                // draw floor
                self.util.render.col_floor(
                  self,
                  {}, // FIXME: occlusion for the current column
                  undefined,
                  iCol,
                  yFloor,
                  self.mRows - yFloor,
                  ray.angle,
                  0,
                  self.player.anim.shooting.index === 0 ||
                  self.player.anim.shooting.index === 1
                    ? 0
                    : 1
                );
                // draw ceiling
                self.util.render.col_ceiling(
                  self,
                  {}, // FIXME: occlusion for the current column
                  undefined,
                  iCol,
                  0,
                  hCeil,
                  ray.angle,
                  0,
                  self.player.anim.shooting.index === 0 ||
                  self.player.anim.shooting.index === 1
                    ? 0
                    : 1
                );
              }

              // draw wall
              const texWall = typeWall;
              const dataTexWall = texWall[currentHit || "vertical"];
              self.util.render.col_wall(
                self,
                {}, // FIXME: occlusion for the current column
                texWall,
                self.const.H_SOLID_WALL / texWall.worldHeight,
                offsetLeft * dataTexWall.width + dataTexWall.offset,
                iCol,
                hCeil,
                hWall,
                realDist / self.DRAW_DIST
              );

              // TODO: draw world-object sprites

              if (window.DEBUG_MODE === 1) {
                self.util.render.wallBounds(
                  self, iCol, hCeil, hWall, self.DRAW_TILE_SIZE.y * 2
                );
              }
            }
          }
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

          const DRAW_TILE_SIZE_X = self.DRAW_TILE_SIZE.x;
          const DRAW_TILE_SIZE_Y = self.DRAW_TILE_SIZE.y;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);
          const DY = Math.floor(DRAW_TILE_SIZE_Y * dy);
          const DH = Math.ceil(DRAW_TILE_SIZE_Y * dh);
          const SX = Math.floor(sx);

          const tw = texture.width, th = texture.height, texBitmap = texture.bitmap;

          // texture-mapping scaling factor
          const scaleH = DH / (th * repeat);

          const lightLevel = 1 - (shade || 0);
          const translucency = 1 - (opacity || 1);

          // clip texture & its projection against occlusion table
          const occTop = Math.floor(
            Math.max(occlusion.top || 0, 0) * DRAW_TILE_SIZE_Y
          );
          const occBottom = Math.floor(
            Math.max(occlusion.bottom || 0, 0) * DRAW_TILE_SIZE_Y
          );
          const wallClipTop = Math.max(occTop - DY, 0);
          const wallClipBottom = Math.max(DY + DH - self.res[1] + occBottom, 0);
          const wallClipped = DH - wallClipTop - wallClipBottom;
          const texClipTop = Math.floor(wallClipTop / scaleH);
          const dStart = DY + wallClipTop, sStart = texClipTop % th;

          for (let x = 0; x < DRAW_TILE_SIZE_X; x += 1) {
            let sY = sStart, dY = dStart, drawRow = scaleH - wallClipTop % scaleH;
            while (dY < dStart + wallClipped) {
              const offIm = 4 * (tw * sY + SX);
              const iRed = texBitmap[offIm];
              const iGreen = texBitmap[offIm + 1];
              const iBlue = texBitmap[offIm + 2];
              const iAlpha = texBitmap[offIm + 3];
              while (drawRow > 0 && dY < dStart + wallClipped) {
                const offBuff = 4 * (offscreenBufferW * dY + DX + x);
                const bRed = offscreenBufferData.data[offBuff];
                const bGreen = offscreenBufferData.data[offBuff + 1];
                const bBlue = offscreenBufferData.data[offBuff + 2];
                const bAlpha = offscreenBufferData.data[offBuff + 3] || 255;
                const rBlend = iAlpha * (1 - translucency) / bAlpha;
                const newRed = iRed * lightLevel * rBlend + bRed * (1 - rBlend);
                const newGreen = iGreen * lightLevel * rBlend + bGreen * (1 - rBlend);
                const newBlue = iBlue * lightLevel * rBlend + bBlue * (1 - rBlend);
                offscreenBufferData.data[offBuff] = newRed;
                offscreenBufferData.data[offBuff + 1] = newGreen;
                offscreenBufferData.data[offBuff + 2] = newBlue;
                offscreenBufferData.data[offBuff + 3] = 255;
                drawRow -= 1;
                dY += 1;
              }
              while (drawRow <= 0) {
                drawRow += scaleH;
                sY += 1;
              }
              if (sY >= th) sY %= th;
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

          const H_FRSTM = self.player.frstmElev + self.player.tilt;
          const yPlayer = H_FRSTM + M_ROWS - self.player.z;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

          // clip projection against occlusion table
          const occTop = Math.max(occlusion.top || 0, 0);
          const occBottom = Math.max(occlusion.bottom || 0, 0);
          const floorClipTop = Math.max(occTop - dy, 0);
          const floorClipBottom = Math.max(dy + dh - M_ROWS + occBottom, 0);
          const floorClipped = dh - floorClipTop - floorClipBottom;
          const dStart = dy + floorClipTop;

          const relAngle = rayAngle - self.player.angle;
          for (let iR = 0; iR < floorClipped; iR += 1) {
            const DY = Math.floor(DRAW_TILE_SIZE_Y * (dStart + iR));
            // extend an imaginary line from the current y-coordinate of the screen
            // to player's viewpoint, and find the actual distance from the player
            // to the point where the imaginary line intersects with the floor
            // at the given world-z (wz)
            const dFloorTile = VIEW_DIST * (self.player.z - wz) /
              (dStart + 1 + iR - yPlayer) / Math.cos(relAngle);
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
            // determine which texture to render by using the calculated world
            // coordinates if no texture was given
            if (!texture) {
              const tile = MAP[N_COLS * pMapTile.y + pMapTile.x];
              const typeFloor = tile[KEY_TEX_G_FLOOR];
              texFloor = FLOOR_TEXTURES[LEGEND_TEXTURES[typeFloor]];
              tw = texFloor.width, th = texFloor.height;
              tx = Math.floor((pFloorTile.x - pMapTile.x) * tw);
              ty = Math.floor((pFloorTile.y - pMapTile.y) * th);
            } else {
              texFloor = texture, tw = texFloor.width, th = texFloor.height;
              tx = Math.floor((pFloorTile.x - pMapTile.x) * tw);
              ty = Math.floor((pFloorTile.y - pMapTile.y) * th);
            }

            // sample the texture pixel
            const texBitmap = texFloor.bitmap;
            const offTexel = 4 * (tw * ty + tx);
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
          const H_FRSTM = self.player.frstmElev + self.player.tilt;
          const yPlayer = H_FRSTM + M_ROWS - self.player.z;

          const DX = Math.floor(DRAW_TILE_SIZE_X * dx);

          // clip projection against occlusion table
          const occTop = Math.max(occlusion.top || 0, 0);
          const occBottom = Math.max(occlusion.bottom || 0, 0);
          const ceilClipTop = Math.max(occTop - dy, 0);
          const ceilClipBottom = Math.max(dy + dh - M_ROWS + occBottom, 0);
          const ceilClipped = dh - ceilClipTop - ceilClipBottom;
          const dStart = dy + ceilClipTop;

          const relAngle = rayAngle - self.player.angle;
          for (let iR = 0; iR < ceilClipped; iR += 1) {
            const DY = Math.floor(DRAW_TILE_SIZE_Y * (dStart + iR));
            // extend an imaginary line from the current y-coordinate of the screen
            // to player's viewpoint, and find the actual distance from the player
            // to the point where the imaginary line intersects with the ceiling
            // that has a height of world-height (wh)
            const dCeilTile = VIEW_DIST * (self.player.z + wh - H_MAX_WORLD) /
              (dStart + iR - yPlayer) / Math.cos(relAngle);
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

            let texCeil, tx, ty, tw, th;
            // determine which texture to render by using the calculated world
            // coordinates if no texture was given
            if (!texture) {
              const tile = MAP[N_COLS * pMapTile.y + pMapTile.x];
              const typeCeil = tile[KEY_TEX_G_CEIL];
              texCeil = CEIL_TEXTURES[LEGEND_TEXTURES[typeCeil]];
              tw = texCeil.width, th = texCeil.height;
              if (typeCeil) { // if indoors ceiling
                tx = Math.floor((pCeilTile.x - pMapTile.x) * tw);
                ty = Math.floor((pCeilTile.y - pMapTile.y) * th);
              } else {        // if outdoors skybox
                const ppr = tw / self.const.math.RAD_90; // pixels per radiant (skybox repeats x4) // FIXME: don't calculate every time, cache instead
                tx = Math.floor((normalizeAngle(self, rayAngle) * ppr) % tw);
                ty = Math.floor(th * (MAX_TILT - self.player.tilt + iR) / M_ROWS); // FIXME: extreme MAX_TILTs
              }
            } else {
              texCeil = texture;
              tw = texCeil.width, th = texCeil.height;
              tx = Math.floor((pCeilTile.x - pMapTile.x) * tw);
              ty = Math.floor((pCeilTile.y - pMapTile.y) * th);
            }

            // sample the texture pixel
            const texBitmap = texCeil.bitmap;
            const offTexel = 4 * (tw * ty + tx);
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
        self.const.CLIP_PROJ_EXTRA_CEIL = self.const.H_MAX_WORLD - self.mRows;
        self.const.PLAYER_HEIGHT = self.mRows * 0.5;
        self.player.z = self.player.frstmElev + self.const.PLAYER_HEIGHT;
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
                offscreenBufferData.data,
                offscreenBufferW,
                offscreenBufferH
              ).data;
              texSky.width = offscreenBufferW;
              texSky.height = offscreenBufferH;
            })
            .then(function() {
              self.util.setOffscreenBufferDimensions(self.res[0], self.res[1]);
            })

            // setup theme music
            .then(function() {
              return self.assets.themes.setup(self, "main");
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
          self.player.angle += deltaX * self.FOV / self.res[0];
        };
        const onMouseWheel = function(e) {
          // update the player height using the change in the mouse scroll
          self.exec.updatePlayerZ(self, 0 - e.deltaY / 5);
          self.player.z = self.player.frstmElev + self.const.PLAYER_HEIGHT;
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
      "playAudio": function(self, theme) {
        if (theme.status === "READY") {
          theme.status = "PLAYING";
          theme.audio.play().catch(function(error) {});
        }
      },
      "addPortal": function(self, fromX, toX, fromY, toY, toAngle) {
        if (Math.floor(self.player.x) === fromX && Math.floor(self.player.y) === fromY) {
          self.player.x = toX;
          self.player.y = toY;
          self.player.angle = toAngle;
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
        self.player.frstmElev += deltaZ;
        const hPlayerCrouch = self.player.anim.walking.apex;
        const zPlayerHead = self.player.frstmElev + self.const.PLAYER_HEIGHT;
        if (zPlayerHead > self.const.H_MAX_WORLD - hPlayerCrouch)
          self.player.frstmElev = self.const.H_MAX_WORLD - hPlayerCrouch -
            self.const.PLAYER_HEIGHT;
        else if (zPlayerHead < hPlayerCrouch)
          self.player.frstmElev = hPlayerCrouch - self.const.PLAYER_HEIGHT;
      },
      "movePlayer": function(self, mult) {
        // memoize current position
        const memoPos = self.api.memo([self.player.x, self.player.y]);
        // calculate displacement vector
        const dir = {
          "x": Math.cos(self.player.angle),
          "y": Math.sin(self.player.angle)
        };
        const displacement = {"x": 0, "y": 0};
        if (self.keyState.W & 1) {
          displacement.x += dir.x;
          displacement.y += dir.y;
        } if (self.keyState.S & 1) {
          displacement.x -= dir.x;
          displacement.y -= dir.y;
        } if (self.keyState.A & 1) {
          displacement.x += dir.y;
          displacement.y -= dir.x;
        } if (self.keyState.D & 1) {
          displacement.x -= dir.y;
          displacement.y += dir.x;
        }
        // rotate player in-place
        const magRot = 0.075 * mult;
        if (self.keyState.ARW_RIGHT & 1) self.player.angle += magRot;
        if (self.keyState.ARW_LEFT & 1) self.player.angle -= magRot;
        // tilt player's head
        const magTilt = 5 * mult;
        if (self.keyState.ARW_UP & 1) self.exec.updatePlayerTilt(self, magTilt);
        if (self.keyState.ARW_DOWN & 1) self.exec.updatePlayerTilt(self, 0 - magTilt);
        // update player elevation
        if (self.keyState.E & 1) self.exec.updatePlayerZ(self, magTilt);
        if (self.keyState.Q & 1) self.exec.updatePlayerZ(self, 0 - magTilt);
        // calculate updated player position
        const paceX = displacement.x * self.STEP_SIZE * mult;
        const paceY = displacement.y * self.STEP_SIZE * mult;
        // detect collisions when moving along x-axis
        const collnX = self.util.collision.playerAABBvsGrid(self, paceX, 1);
        // update player position unless a collision has occurred
        if (isNaN(collnX)) self.player.x += paceX;
        // if collided with a solid geometry, resolve it accordingly
        else {
          const resolve = self.const.MARGIN_TO_WALL * (0 - Math.sign(paceX));
          self.player.x = collnX + (resolve > 0 ? 1 : 0) + resolve;
        }
        // detect collisions when moving along y-axis
        const collnY = self.util.collision.playerAABBvsGrid(self, paceY);
        // update player position unless a collision has occurred
        if (isNaN(collnY)) self.player.y += paceY;
        // if collided with a solid geometry, resolve it accordingly
        else {
          const resolve = self.const.MARGIN_TO_WALL * (0 - Math.sign(paceY));
          self.player.y = collnY + (resolve > 0 ? 1 : 0) + resolve;
        }
        // walking animation
        self.exec.animateWalking(self, [self.player.x, self.player.y], memoPos.get());
      },
      "animateWalking": function(self, newPos, prevPos) {
        const defaultWeaponFrame = self.assets.sprites.playerWeapons[self.player.weaponDrawn].frames[0];
        const defaultLocOnScreen = defaultWeaponFrame.defaultLocOnScreen;
        if (prevPos[0] !== newPos[0] || prevPos[1] !== newPos[1]) {
          // animate head tilt
          self.player.z = self.util.getWalkingPlayerHeight(self);

          // animate weapon bob
          if (self.player.anim.shooting.index < 0) {
            const bob = self.util.getWeaponBob(self);
            defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x + bob.x;
            defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y + bob.y;
          }
        } else {
          self.player.z = self.player.frstmElev + self.const.PLAYER_HEIGHT;
          self.player.anim.walking = {"index": 0, "reverse": 0, "apex": self.player.anim.walking.apex};
          defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x;
          defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y;
          self.player.anim.weaponBob = {"index": 0, "reverse": 0, "apex": self.player.anim.weaponBob.apex};
        }
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
        if ((self.keyState.RTN & 1) > 0) {
          const dir    = {
            "x": Math.cos(self.player.angle),
            "y": Math.sin(self.player.angle)
          };
          const slope  = dir.y / dir.x;
          const up     = dir.y < 0 ? 1 : 0;
          const right  = dir.x > 0 ? 1 : 0;
          const traceV = {};
          traceV.x = (right & 1) > 0 ? Math.ceil(self.player.x) : Math.floor(self.player.x);
          traceV.y = self.player.y + (traceV.x - self.player.x) * slope;
          const sampleMapV = {
            "x": Math.floor(traceV.x - ((right & 1) > 0 ? 0 : 1)),
            "y": Math.floor(traceV.y)
          };
          const sampleV = self.map[self.nCols * sampleMapV.y + sampleMapV.x];
          const tileV = sampleV ? sampleV[self.mapLegend.TYPE_TILE] : undefined;
          const doorDataV = self.doors[self.util.coords2Key(sampleMapV)];
          const traceH = {};
          traceH.y = (up & 1) > 0 ? Math.floor(self.player.y) : Math.ceil(self.player.y);
          traceH.x = self.player.x + (traceH.y - self.player.y) / slope;
          const sampleMapH = {
            "x": Math.floor(traceH.x),
            "y": Math.floor(traceH.y - ((up & 1) > 0 ? 1 : 0))
          };
          const sampleH = self.map[self.nCols * sampleMapH.y + sampleMapH.x];
          const tileH = sampleH ? sampleH[self.mapLegend.TYPE_TILE] : undefined;
          const doorDataH = self.doors[self.util.coords2Key(sampleMapH)];
          if (tileV === self.const.TYPE_TILES.V_DOOR && doorDataV)
            self.exec.animateDoor(self, doorDataV);
          else if (tileH === self.const.TYPE_TILES.H_DOOR && doorDataH)
            self.exec.animateDoor(self, doorDataH);
        }
      },
      "tryAndCloseDoor": function(self, door) {
        if (
          Math.floor(self.player.x) !== door.loc.x ||
          Math.floor(self.player.y) !== door.loc.y
        ) {
          self.exec.animateDoor(self, door);
        } else {
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
        self.util.render.frame.rasterized(self);
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
        // TODO: add portals dynamically by reading from the map
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
