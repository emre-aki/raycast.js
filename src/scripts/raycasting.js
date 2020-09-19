/*******************************************************************
 *                       Raycasting.js                             *
 *                            by                                   *
 *                      Emre Akı, 2018.                            *
 *                                                                 *
 *   This is an implementation of the once-popular 3-D rendering   *
 * technique known as "ray-casting" which was famously featured in *
 * 1991's popular video game hit Wolfenstein 3D.                   *
 *                                                                 *
 *   All of the rendering is carried out within a single 512x384   *
 * canvas at ~24 frames per second. The rendering at its core is   *
 * basically comprised of vertical slices of wall textures and     *
 * per-pixel rendered ceiling and floor textures--all of which at  *
 * constant Z. An offscreen frame buffer is utilized to optimize   *
 * per-pixel rendering.                                            *
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
 *     - Walking animation & weapon bobbing                        *
 *     - Mini-map display                                          *
 *                                                                 *
 * Last updated: 09.19.2020                                        *
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
    "__dirname__": "/scripts/",
    "__file__": "/scripts/raycasting.js",
    "__sprites__": "/sprites/",
    "__textures__": "/textures/",
    "__audio__": "/audio/"
  };
  const game = {
    "res": [512, 384],
    "FPS": 24,
    "FOV": Math.PI / 3, // < Math.PI
    "MAP_TILE_SIZE": 192, // FIXME: move to self.const
    "DRAW_TILE_SIZE": {}, // initialized in setup // FIXME: move to self.const
    "DRAW_DIST": -1,      // initialized in setup
    "STEP_SIZE": 0.2,     // FIXME: move to self.const
    "PLAYER_HEIGHT": 0,   // initialized in setup // FIXME: move to self.const
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
      "ARW_DOWN": 0
    },
    "map": window.__map__.MAP,
    "mapLegend": window.__map__.LEGEND,
    "mRows": 192,
    "mCols": 256,
    "nRows": window.__map__.N_ROWS,
    "nCols": window.__map__.N_COLS,
    "doors": {},
    "player": {
      "angle": window.__player__.ANGLE,
      "anim": {
        "shooting": {"index": -1, "animating": 0},
        "walking": {"index": 0, "reverse": 0, "apex": 8},
        "weaponBob": {"index": 0, "reverse": 0, "apex": 5}
      },
      "tilt": 0,
      "x": window.__player__.X,
      "y": window.__player__.Y,
      "z": window.__player__.Z // re-initialized at setup
    },
    "assets": {
      "sprites": {
        "menu": {
          "skull": {
            "img": new Image(),
            "name": "menu_skull.png",
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
            "activeFrames": [0],
            "frames": [
              {
                "width": 158,
                "height": 120,
                "offset": 0,
                "locOnScreen": {"x": 0, "y": 0},       // initialized at setup
                "defaultLocOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 158,
                "height": 146,
                "offset": 158,
                "locOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 158,
                "height": 164,
                "offset": 316,
                "locOnScreen": {"x": 0, "y": 0} // initialized at setup
              },
              {
                "width": 238,
                "height": 242,
                "offset": 474,
                "locOnScreen": {"x": 0, "y": 0}, // initialized at setup
                "setLocOnScreen": function(self, frame) {
                  return {"x": 0, "y": self.res[1] - frame.height}; 
                }
              },
              {
                "width": 174,
                "height": 302,
                "offset": 712,
                "locOnScreen": {"x": 0, "y": 0}, // initialized at setup
                "setLocOnScreen": function(self, frame) { 
                  return {"x": 0, "y": self.res[1] - frame.height}; 
                }
              },
              {
                "width": 226,
                "height": 262,
                "offset": 886,
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
            if (i === keys.length) {
              return resolve(self.assets.sprites);
            }
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
              if (Array.isArray(sprite.buffer)) {
                sprite.buffer = self.util.bufferify(sprite.img);
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
          "stone": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "floor_brownstone.png"
          },
          "teleporter": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "portal.png"
          },
          "manhole": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "manhole.png"
          }
        },
        "ceil": {
          "skybox": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name":  "sbox.png"
          },
          "lights": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "ceil_lights.png"
          }
        },
        "wall": {
          "default": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "wall.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            }
          },
          "alt": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "wall_wood.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            }
          },
          "alt_1": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "wall_tech.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            }
          },
          "door": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "door.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 64
            }
          },
          "doorDock": {
            "img": new Image(),
            "buffer": [], // initialized at setup
            "width": 0,   // initialized at setup
            "height": 0,  // initialized at setup
            "name": "door_D.png",
            "vertical": {
              "width": 64,
              "height": 128,
              "offset": 0
            },
            "horizontal": {
              "width": 64,
              "height": 128,
              "offset": 0
            }
          }
        },
        "setup": function(self, keys) { // never heard of `Promise.all`???
          const loadTexture = function(i, resolve, reject) {
            if (i === keys.length) {
              return resolve(self.assets.textures);
            }
            const texture = keys[i].split(".").reduce(function(acc, curr) {
              return acc[curr];
            }, self.assets.textures);
            texture.img.onload = function() {
              texture.buffer = self.util.bufferify(texture.img);
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
        "RAD_360": 2 * Math.PI
      },
      "TYPE_TILES": {
        "FREE": 0,
        "WALL": 1,
        "WALL_DIAG": 2,
        "V_DOOR": 3,
        "H_DOOR": 4,
        "TELEPORTER": 5,
        "WORLD_OBJECT": 6
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
        "#EB4034",   // 5: TELEPORTER
        "#55555599", // 6: WORLD_OBJECT
      ],
      "LEGEND_TEXTURES": {
        "WALL": ["default", "door", "doorDock", "alt", "alt_1"],
        "CEIL": ["skybox", "lights"],
        "FLOOR": ["stone", "teleporter", "manhole"]
      },
      "LEGEND_WORLD_OBJECTS": ["spDude0"],
      "WEAPONS": {"SHOTGUN": "shotgun"},
      "MAX_TILT": 80,
      "FLOOR_CAST": 1,
      "SHOOTING_ANIM_INTERVAL": {"shotgun": 110},
      "DOOR_ANIM_INTERVAL": 20,
      "DOOR_RESET_DELAY": 3000,
      "MARGIN_TO_WALL": 0.5,
      "DRAW_DIST": 15,
      "H_MAX_WORLD": 384,
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
          if (onEnd) { onEnd(); }
        };

        const animate = function() {
          if (shouldEnd && shouldEnd(iFrame)) { cleanUp(); } 
          else { onFrame(iFrame); }
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
        return self.PLAYER_HEIGHT + index;
      },
      "getWeaponBob": function(self) {
        const bobState = self.player.anim.weaponBob;
        const x = bobState.index + (bobState.reverse ? -1 : 1);
        const y = -1 * x * x;
        bobState.reverse = x === bobState.apex ? 1 : x === -1 * bobState.apex
          ? 0
          : bobState.reverse;
        bobState.index = x;
        return {"x": 4 * x, "y": y};
      },
      "getVerticalShift": function(self, deltaPlayerZ, deltaPlayerHeadTilt) {
        return (deltaPlayerZ * (self.VIEW_DIST - self.DRAW_DIST) /
          self.DRAW_DIST + deltaPlayerHeadTilt) / self.mRows;
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
      "getIntersect": function(l0x0, l0y0, l0x1, l0y1, l1x0, l1y0, l1x1, l1y1) {
        const deltaX0 = (l0x1 - l0x0).toFixedNum(5), deltaY0 = l0y1 - l0y0;
        const deltaX1 = (l1x1 - l1x0).toFixedNum(5), deltaY1 = l1y1 - l1y0;
        const m0 = deltaY0 / deltaX0, m1 = deltaY1 / deltaX1;

        // early return if lines are parallel
        if (m0 === m1) { return; }

        if (deltaX0 === 0) {
          const n1 = l1y1 - m1 * l1x1;
          return [l0x1, m1 * l0x1 + n1];
        } else if (deltaX1 === 0) {
          const n0 = l0y1 - m0 * l0x1;
          return [l1x1, m0 * l1x1 + n0];
        } else {
          const n0 = l0y1 - m0 * l0x1, n1 = l1y1 - m1 * l1x1;
          const xI = (n1 - n0) / (m0 - m1);
          return [xI, m0 * xI + n0];
        }
      },
      "isInside": {
        "rectangle": function(xr, yr, w, h, x, y) {
          return x >= xr && x < xr + w && y >= yr && y < yr + h;
        }
      },
      "bufferify": function(img) {
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
              if (typeof(prop) === typeof({})) {
                cloned[key] = clone(prop);
              } else {
                cloned[key] = prop;
              }
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
              if (typeof(prop) === typeof({})) {
                local[key] = mergeTwo(local[key], current[key]);
              } else {
                local[key] = prop;
              }
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
        if (key === 87) {
          self.keyState.W = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.W;
        } else if (key === 65) {
          self.keyState.A = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.A;
        } else if (key === 83) {
          self.keyState.S = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.S;
        } else if (key === 68) {
          self.keyState.D = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.D;
        } else if (key === 81) {
          self.keyState.Q = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.Q;
        } else if (key === 69) {
          self.keyState.E = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.E;
        } else if (key === 32) {
          self.keyState.SPC = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.SPC;
        } else if (key === 13) {
          self.keyState.RTN = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.RTN;
        } else if (key === 38) {
          self.keyState.ARW_UP = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.ARW_UP;
        } else if (key === 40) {
          self.keyState.ARW_DOWN = type === "keydown" ? 1 : type === "keyup" ? 0 : self.keyState.ARW_DOWN;
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
        const imgBuffer = imgData.buffer, imgWidth = imgData.width, imgHeight = imgData.height;
        const SX = Math.floor(sx), SY = Math.floor(sy), SW = Math.ceil(sw), SH = Math.ceil(sh);
        const DX = Math.floor(dx), DY = Math.floor(dy), DW = Math.ceil(dw), DH = Math.ceil(dh);
        const shade = options && options.shade ? options.shade : 0;
        const opacity = options && options.alpha ? options.alpha : 1;
        const scaleX = DW / SW, scaleY = DH / SH;
        let sX = SX, dX = DX, drawCol = scaleX;

        // early return if destination is out of canvas bounds
        if (DX + DW <= 0 || DY + DH <= 0) { return; }

        while (sX < SX + SW && sX < imgWidth && dX < DX + DW && dX < offscreenBufferW) {
          while (drawCol > 0 && dX < DX + DW && dX < offscreenBufferW) {
            let sY = SY, dY = DY, drawRow = scaleY;
            while (sY < SY + SH && sY < imgHeight && dY < DY + DH && dY < offscreenBufferH) {
              while (drawRow > 0 && dY < DY + DH && dY < offscreenBufferH) {
                if (sX >= 0 && sY >= 0 && dX >= 0 && dY >= 0) {
                  const offIm    = 4 * (imgWidth * sY + sX);
                  const offBuff  = 4 * (offscreenBufferW * dY + dX);
                  const iRed     = imgBuffer[offIm];
                  const iGreen   = imgBuffer[offIm + 1];
                  const iBlue    = imgBuffer[offIm + 2];
                  const iAlpha   = imgBuffer[offIm + 3];
                  const bRed     = offscreenBufferData.data[offBuff];
                  const bGreen   = offscreenBufferData.data[offBuff + 1];
                  const bBlue    = offscreenBufferData.data[offBuff + 2];
                  const bAlpha   = offscreenBufferData.data[offBuff + 3] || 255;
                  const rBlend   = iAlpha * opacity / bAlpha;
                  const newRed   = iRed * (1 - shade) * rBlend + bRed * (1 - rBlend);
                  const newGreen = iGreen * (1 - shade) * rBlend + bGreen * (1 - rBlend);
                  const newBlue  = iBlue * (1 - shade) * rBlend + bBlue * (1 - rBlend);
                  offscreenBufferData.data[offBuff] = newRed;
                  offscreenBufferData.data[offBuff + 1] = newGreen;
                  offscreenBufferData.data[offBuff + 2] = newBlue;
                  offscreenBufferData.data[offBuff + 3] = 255;
                }
                drawRow -= 1;
                dY += 1;
              }
              drawRow += scaleY;
              sY += 1;
            }
            drawCol -= 1;
            dX += 1;
          }
          drawCol += scaleX;
          sX += 1;
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
          const animationFrames = self.assets.sprites.animations.menu.skull;
          const render = function(iFrame) {
            const i = iFrame % animationFrames.length;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, self.res[0], self.res[1]);
            if (i === 1) {
              self.util.print(
                "Press any key to start",
                (self.res[0] - 212) * 0.5,
                (self.res[1] - 16) * 0.5,
                {"size": 16, "color": "#FFFFFF"}
              );
            }
            self.assets.sprites.menu.skull.activeFrames = [animationFrames[i]];
            self.util.render.globalSprite(self.assets.sprites.menu.skull);
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
            self.res[1] * (0.5 + self.util.getVerticalShift(
              self,
              self.player.anim.walking.index,
              self.player.tilt
            )),
            self.DRAW_TILE_SIZE.x,
            hLine,
            0, 0, 1, 1
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
        "globalSprite": function(sprite) {
          const img = sprite.img;
          const frames = sprite.frames;
          const activeFrames = sprite.activeFrames;
          for (let iFrame = 0; iFrame < activeFrames.length; iFrame += 1) {
            const frame = frames[activeFrames[iFrame]];
            const locOnScreen = frame.locOnScreen;
            if (Array.isArray(locOnScreen)) {
              for (let iLoc = 0; iLoc < locOnScreen.length; iLoc += 1) {
                const loc = locOnScreen[iLoc];
                ctx.drawImage(
                  img,
                  frame.offset,
                  img.height - frame.height,
                  frame.width,
                  frame.height,
                  loc.x,
                  loc.y,
                  frame.width,
                  frame.height
                );
              }
            } else {
              ctx.drawImage(
                img,
                frame.offset,
                img.height - frame.height,
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
            // reset offscreen buffer
            self.util.clearRect(0, 0, offscreenBufferW, offscreenBufferH);

            const verticalShift = self.util.getVerticalShift(
              self,
              self.player.anim.walking.index,
              self.player.tilt
            );

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
                    );
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
                else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.H_DOOR) { hitV = 1; }

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
                    );
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
                      (hitV & 1) === 0 || distToWall === undefined ||
                      distToWall > hitDist ||
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
                else if (sample[self.mapLegend.TYPE_TILE] === self.const.TYPE_TILES.V_DOOR) { hitH = 1; }

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
              const hCeil = ((self.const.H_MAX_WORLD - self.player.z) *
                (distToWall - self.VIEW_DIST) / distToWall + self.player.tilt) -
                self.const.CLIP_PROJ_EXTRA_CEIL;
              const hFloor = self.player.z *
                (distToWall - self.VIEW_DIST) / distToWall - self.player.tilt;
              const hWall = self.mRows - hCeil - hFloor;

              if (self.const.FLOOR_CAST || window.FLOOR_CAST) {
                // #region | draw floor for current column
                for (let iR = 0; iR < hFloor; iR += 1) {
                  const dFloorTile = (self.player.z * self.VIEW_DIST) / (self.player.z - (iR + self.player.tilt)) / Math.cos(ray.angle - self.player.angle);
                  const pFloorTile = {
                    "x": self.player.x + dFloorTile * Math.cos(ray.angle) / self.MAP_TILE_SIZE,
                    "y": self.player.y + dFloorTile * Math.sin(ray.angle) / self.MAP_TILE_SIZE
                  };
                  const pMapTile = {
                    "x": Math.floor(pFloorTile.x),
                    "y": Math.floor(pFloorTile.y)
                  };
                  const sampleFloorTile = self.map[self.nCols * pMapTile.y + pMapTile.x];
                  const texFloor = self.assets.textures.floor[self.const.LEGEND_TEXTURES.FLOOR[sampleFloorTile[self.mapLegend.TYPE_FLOOR]]];
                  const pTexFloor = {
                    "x": (pFloorTile.x - pMapTile.x) * texFloor.width,
                    "y": (pFloorTile.y - pMapTile.y) * texFloor.height
                  };

                  // draw floor texture
                  self.util.drawImage(
                    texFloor,
                    pTexFloor.x,
                    pTexFloor.y,
                    1,
                    1,
                    self.DRAW_TILE_SIZE.x * iCol,
                    self.DRAW_TILE_SIZE.y * (self.mRows - 1 - iR),
                    self.DRAW_TILE_SIZE.x,
                    self.DRAW_TILE_SIZE.y,
                    {
                      "shade":
                        self.player.anim.shooting.index === 0 ||
                        self.player.anim.shooting.index === 1
                          ? 0
                          : dFloorTile / self.DRAW_DIST
                    }
                  );

                  // gas
                  if (window.GAS && dFloorTile * Math.cos(ray.angle - self.player.angle) > 2 * self.MAP_TILE_SIZE) {
                    self.util.fillRect(
                      self.DRAW_TILE_SIZE.x * iCol,
                      self.DRAW_TILE_SIZE.y * (self.mRows - 1 - iR),
                      self.DRAW_TILE_SIZE.x,
                      self.DRAW_TILE_SIZE.y,
                      0.5, 1, 0, 0.25
                    );
                  }
                }
                // #endregion

                // #region | draw ceiling for current column
                for (let iR = 0; iR < hCeil; iR += 1) {
                  const dCeilTile =
                    (self.player.z - self.const.H_MAX_WORLD) * self.VIEW_DIST /
                    (self.player.z - self.const.H_MAX_WORLD +
                      iR + self.const.CLIP_PROJ_EXTRA_CEIL - self.player.tilt) /
                    Math.cos(ray.angle - self.player.angle);
                  const pCeilTile = {
                    "x": self.player.x + dCeilTile * Math.cos(ray.angle) / self.MAP_TILE_SIZE,
                    "y": self.player.y + dCeilTile * Math.sin(ray.angle) / self.MAP_TILE_SIZE
                  };
                  const pMapTile = {
                    "x": Math.floor(pCeilTile.x),
                    "y": Math.floor(pCeilTile.y)
                  };
                  const sampleCeilTile = self.map[self.nCols * pMapTile.y + pMapTile.x];
                  const texCeil = self.assets.textures.ceil[self.const.LEGEND_TEXTURES.CEIL[sampleCeilTile[self.mapLegend.TYPE_CEIL]]];
                  
                  // draw ceiling texture
                  if (sampleCeilTile[self.mapLegend.TYPE_CEIL]) {
                    const pTexCeil = {
                      "x": (pCeilTile.x - pMapTile.x) * texCeil.width,
                      "y": (pCeilTile.y - pMapTile.y) * texCeil.height
                    };
                    self.util.drawImage(
                      texCeil,
                      pTexCeil.x,
                      pTexCeil.y,
                      1,
                      1,
                      self.DRAW_TILE_SIZE.x * iCol,
                      self.DRAW_TILE_SIZE.y * iR,
                      self.DRAW_TILE_SIZE.x,
                      self.DRAW_TILE_SIZE.y,
                      {
                        "shade":
                          self.player.anim.shooting.index === 0 ||
                          self.player.anim.shooting.index === 1
                            ? 0
                            : dCeilTile / self.DRAW_DIST
                      }
                    );

                    // gas
                    if (window.GAS && dCeilTile * Math.cos(ray.angle - self.player.angle) > 2 * self.MAP_TILE_SIZE) {
                      self.util.fillRect(
                        self.DRAW_TILE_SIZE.x * iCol,
                        self.DRAW_TILE_SIZE.y * iR,
                        self.DRAW_TILE_SIZE.x,
                        self.DRAW_TILE_SIZE.y,
                        0.5, 1, 0, 0.25
                      );
                    }
                  }

                  // draw skybox
                  else {
                    const pps = texCeil.width / 90; // repeats (x4) // FIXME: don't calculate every time, cache instead
                    const offsetX = (self.util.rad2Deg(self, ray.angle) * pps) % texCeil.width;
                    const offsetY = self.DRAW_TILE_SIZE.y * (iR + (
                      self.util.getVerticalShift(
                        self,
                        -1 * self.player.anim.walking.apex,
                        self.const.MAX_TILT
                      ) - verticalShift) * self.mRows);
                    self.util.drawImage(
                      texCeil,
                      offsetX,
                      offsetY,
                      1,
                      1,
                      self.DRAW_TILE_SIZE.x * iCol,
                      self.DRAW_TILE_SIZE.y * iR,
                      self.DRAW_TILE_SIZE.x,
                      self.DRAW_TILE_SIZE.y,
                      {
                        "shade":
                          (
                            self.player.anim.shooting.index === 0 ||
                            self.player.anim.shooting.index === 1
                              ? -1 * Math.abs(self.player.tilt)
                              : (iR - self.player.tilt)
                          ) / (self.mRows * (0.5 + verticalShift) - self.player.tilt)
                      }
                    );
                  }
                }
                // #endregion
              }

              // #region | draw wall for current column
              const texWall = typeWall;
              const dataTexWall = texWall[currentHit || "vertical"];
              self.util.drawImage(
                texWall,
                offsetLeft * dataTexWall.width + dataTexWall.offset,
                texWall.height - dataTexWall.height,
                1,
                dataTexWall.height,
                self.DRAW_TILE_SIZE.x * iCol,
                self.DRAW_TILE_SIZE.y * hCeil,
                self.DRAW_TILE_SIZE.x,
                self.DRAW_TILE_SIZE.y * hWall,
                {"shade": realDist / self.DRAW_DIST}
              );

              // gas
              if (window.GAS && distToWall > 2 * self.MAP_TILE_SIZE) {
                self.util.fillRect(
                  self.DRAW_TILE_SIZE.x * iCol,
                  self.DRAW_TILE_SIZE.y * hCeil,
                  self.DRAW_TILE_SIZE.x,
                  self.DRAW_TILE_SIZE.y * hWall,
                  0.5, 1, 0, 0.25
                );
              }
              // #endregion

              // TODO: draw world-object sprites

              if (window.DEBUG_MODE === 1) {
                self.util.render.wallBounds(
                  self, iCol, hCeil, hWall, self.DRAW_TILE_SIZE.y * 2
                );
              }
            }

            ctx.putImageData(offscreenBufferData, 0, 0);

            // render mini-map
            self.util.render.minimap(
              self,
              self.res[0] - self.const.R_MINIMAP * self.const.TILE_SIZE_MINIMAP - 10,
              self.res[1] - self.const.R_MINIMAP * self.const.TILE_SIZE_MINIMAP - 10
            );
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
        self.PLAYER_HEIGHT = self.mRows * 0.5;
        self.player.z = self.PLAYER_HEIGHT;
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
                "floor.stone",
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
                self.res[1] * 0.5 +
                self.util.getVerticalShift(
                  self,
                  -1 * self.player.anim.walking.apex,
                  self.const.MAX_TILT
                ) * self.mRows * self.DRAW_TILE_SIZE.y
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
              texSky.buffer = new ImageData(
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
      "movePlayer": function(self) {
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
        } if (self.keyState.Q & 1) {
          displacement.x += dir.y;
          displacement.y -= dir.x;
        } if (self.keyState.E & 1) {
          displacement.x -= dir.y;
          displacement.y += dir.x;
        }

        // rotate player in-place
        if (self.keyState.D & 1) {
          self.player.angle += 0.075;
        } if (self.keyState.A & 1) {
          self.player.angle -= 0.075;
        }

        // tilt player's head
        if (self.keyState.ARW_UP) {
           self.player.tilt += self.player.tilt < self.const.MAX_TILT ? 5 : 0;
        } if (self.keyState.ARW_DOWN) {
          self.player.tilt -= self.player.tilt > -1 * self.const.MAX_TILT ? 5 : 0;
        }

        // calculate updated player position & wall margin
        const paceX = displacement.x * self.STEP_SIZE;
        const paceY = displacement.y * self.STEP_SIZE;
        const marginToWall = {
          "x": Math.sign(displacement.x) * self.const.MARGIN_TO_WALL,
          "y": Math.sign(displacement.y) * self.const.MARGIN_TO_WALL
        };

        // #region | collision detection for horizontal movement
        const stepX = {"x": Math.floor(self.player.x + paceX + marginToWall.x), "y": Math.floor(self.player.y)};
        const sampleX = self.map[self.nCols * stepX.y + stepX.x];

        // early return if out-of-map
        if (
          !self.util.isInside.rectangle(
            0,
            0,
            self.nCols,
            self.nRows,
            stepX.x,
            stepX.y
          )
        ) {
          return;
        }

        const tileX = sampleX[self.mapLegend.TYPE_TILE];

        // collided with a solid wall/semi-open door/diagonal wall
        if (
          tileX === self.const.TYPE_TILES.WALL ||
          tileX === self.const.TYPE_TILES.WALL_DIAG ||
          (tileX === self.const.TYPE_TILES.V_DOOR &&
            self.doors[self.util.coords2Key(stepX)].state > 0)
        ) {
          self.player.x = marginToWall.x > 0 // heading east
            ? stepX.x - marginToWall.x
            : stepX.x + 1 - marginToWall.x;  // heading west
        } else {
          self.player.x += paceX;
        }
        // #endregion

        // #region | collision detection for vertical movement
        const stepY = {"x": Math.floor(self.player.x), "y": Math.floor(self.player.y + paceY + marginToWall.y)};
        const sampleY = self.map[self.nCols * stepY.y + stepY.x];

        // early return if out-of-map
        if (!sampleY) { return; }

        const tileY = sampleY[self.mapLegend.TYPE_TILE];

        // collided with a solid wall/semi-open door/diagonal wall
        if (
          tileY === self.const.TYPE_TILES.WALL ||
          tileY === self.const.TYPE_TILES.WALL_DIAG ||
          (tileY === self.const.TYPE_TILES.H_DOOR &&
            self.doors[self.util.coords2Key(stepY)].state > 0)
        ) {
          self.player.y = marginToWall.y > 0 // heading south
            ? stepY.y - marginToWall.y
            : stepY.y + 1 - marginToWall.y;  // heading north
        } else {
          self.player.y += paceY;
        }
        // #endregion

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
          self.player.z = self.PLAYER_HEIGHT;
          self.player.anim.walking = {"index": 0, "reverse": 0, "apex": self.player.anim.walking.apex};
          defaultWeaponFrame.locOnScreen.x = defaultLocOnScreen.x;
          defaultWeaponFrame.locOnScreen.y = defaultLocOnScreen.y;
          self.player.anim.weaponBob = {"index": 0, "reverse": 0, "apex": self.player.anim.weaponBob.apex};
        }
      },
      "animateShooting": function(self) {
        if (
          (self.keyState.SPC & 1) && 
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
          const traceH = {};
          traceH.y = (up & 1) > 0 ? Math.floor(self.player.y) : Math.ceil(self.player.y);
          traceH.x = self.player.x + (traceH.y - self.player.y) / slope;
          const sampleMapH = {
            "x": Math.floor(traceH.x),
            "y": Math.floor(traceH.y - ((up & 1) > 0 ? 1 : 0))
          };
          const sampleH = self.map[self.nCols * sampleMapH.y + sampleMapH.x];
          const tileH = sampleH ? sampleH[self.mapLegend.TYPE_TILE] : undefined;
          if (tileV === self.const.TYPE_TILES.V_DOOR) {
            self.exec.animateDoor(self, self.doors[self.util.coords2Key(sampleMapV)]);
          } else if (tileH === self.const.TYPE_TILES.H_DOOR) {
            self.exec.animateDoor(self, self.doors[self.util.coords2Key(sampleMapH)]);
          }
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
      "gameLoop": function(self, deltaT) {
        self.exec.movePlayer(self);
        self.exec.interactWDoor(self);
        self.exec.animateShooting(self);

        self.util.render.frame.rasterized(self);
        self.util.render.globalSprite(self.assets.sprites.playerWeapons[self.player.weaponDrawn]);
        self.util.render.stats(self, deltaT);
      }
    },
    "run": function(self) {
      let tsStart = new Date();
      self.intervals.game = setInterval(function() { // main game loop:
        const tsEnd = new Date();                    // reiterates ~24 times in a sec
        self.exec.gameLoop(self, tsEnd - tsStart);
        tsStart = tsEnd;
      }, 1000 / self.FPS);
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
