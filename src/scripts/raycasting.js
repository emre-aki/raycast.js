/*
================================================================
                    Raycasting on Canvas
                              by
                       Emre Akı, 2018.

    This is a simple implementation of the once-popular 3-D
  rendering technique known as "ray-casting" which was featured
  in the video game Wolfenstein 3D.

    All of the rendering is carried out within a single 800x600
  canvas for the sake of simplicity at ~60 frames per second.

    This little project was inspired by a video on YouTube posted
  by a fellow seasoned programmer who goes by the name 'javidx9.'
  You can follow the link below to refer to his tutorial of
  ray-casting done entirely on a command-line window!

    https://youtu.be/xW8skO7MFYw

  Last updated: 02.04.2020
================================================================
*/

(function() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fs = {
    "__dirname__": "./scripts/",
    "__file__": "./scripts/raycasting.js",
    "__sprites__": "./assets/sprites/",
    "__textures__": "./assets/textures/",
    "__audio__": "./assets/audio/"
  };
  const game = {
    "res": [800, 600],
    "FPS": 60,
    "FOV": Math.PI / 3,
    "DRAW_TILE_SIZE": {}, // initialized in setup
    "DRAW_DIST": -1,      // initialized in setup
    "STEP_SIZE": 0.2,
    "PLAYER_HEIGHT": 0,   // initialized in setup
    "keyState": {
      "W": 0,
      "A": 0,
      "S": 0,
      "D": 0,
      "Q": 0,
      "E": 0,
      "SPC": 0,
      "RTN": 0
    },
    "map": window.__map__.MAP,
    "mRows": 600,
    "mCols": 800,
    "nRows": window.__map__.N_ROWS,
    "nCols": window.__map__.N_COLS,
    "offsetLinebr": window.__map__.OFFSET_LINEBR,
    "doors": {},
    "player": {
      "angle": window.__player__.ANGLE,
      "anim": {
        "walking": {"index": 0, "reverse": 0, "apex": 10},
        "shooting": {"index": -1, "animating": 0},
      },
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
          "superShotgun": {
            "img": new Image(),
            "name": "super_shotgun.png",
            "activeFrames": [], // initialized at setup
            "frames": [
              {
                "offset": 0,
                "width": 118,
                "height": 108,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 118,
                "width": 110,
                "height": 74,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 228,
                "width": 130,
                "height": 92,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 358,
                "width": 166,
                "height": 206,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 524,
                "width": 242,
                "height": 260,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 766,
                "width": 162,
                "height": 160,
                "locOnScreen": {"x": 0, "y": 0}
              },
              {
                "offset": 928,
                "width": 402,
                "height": 126,
                "locOnScreen": {"x": 0, "y": 0},
                "setLocOnScreen": function(self, frame) {
                  return {
                    "x": 0,
                    "y": self.res[1] - frame.height * 0.75
                  };
                }
              },
              {
                "offset": 1330,
                "width": 176,
                "height": 102,
                "locOnScreen": {"x": 0, "y": 0}
              }
            ]
          }
        },
        "__animations": {
          "playerWeapon": {
            "superShotgun": [] // initialized at setup
          }
        },
        "__setup": function(self, keys) {
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
                });
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
        "skybox": {
          "img": new Image(),
          "buffer": [],
          "name":  "sbox_1.png"
        },
        "__setup": function(self, keys) { // never heard of `Promise.all`???
          const loadTexture = function(i, resolve, reject) {
            if (i === keys.length) {
              return resolve(self.assets.textures);
            }
            const texture = keys[i].split(".").reduce(function(acc, curr) {
              return acc[curr];
            }, self.assets.textures);
            texture.img.onload = function() {
              texture.buffer = self.util.bufferify(texture.img);
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
        "__setup": function(self, path) {
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
    "intervals": {},
    "const": {
      "math": {
        // TODO: Make sin/cos && sqrt tables for optimization
        "sqrt3": Math.sqrt(3),
      },
      "minimapColors": {
        "#": "#101010",
        "P": "#EB4034",
        "V": "#264E73",
        "H": "#264E73",
        ".": "#55555599",
        "-": "#55555599"
      },
      "WEAPONS": {
        "SUPER_SHOTGUN": "superShotgun"
      },
      "DOOR_ANIM_INTERVAL": 20,
      "DOOR_RESET_DELAY": 3000,
      "DRAW_DIST": 90,
      "RATIO_DRAW_DIST_TO_BACKGROUND": 1.25 // 5 * 0.25
    },
    "util": {
      "getVerticalShift": function(self) {
        return self.player.anim.walking.index *
          (self.VIEW_DIST - self.DRAW_DIST) / (self.DRAW_DIST * self.mRows);
      },
      "rad2Deg": function(rad) {
        const rad360 = 6.28319;
        const radToDeg = 57.2958;
        return (((rad + rad360) % rad360) * radToDeg + 360) % 360;
      },
      "eucDist": function(a, b, pseudo, multiplier) {
        multiplier = multiplier ? multiplier : 1;
        const pseudoDist = ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) * multiplier * multiplier;
        return pseudo === true ? pseudoDist : Math.sqrt(pseudoDist);
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
        }
      },
      "getDoors": function(self) {
        const doors = {};
        for (let y = 0; y < self.nRows; y += 1) {
          for (let x = 0; x < self.nCols; x += 1) {
            const sample = self.map[(self.nCols + self.offsetLinebr) * y + x];
            if (sample === "H" || sample === "V") {
              doors[x.toString() + "_" + y.toString()] = {
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
      "print": function(text, x, y, options) {
        options = options || {};
        ctx.font = (!!options.style ? options.style + " " : "") +
                   (!isNaN(options.size) ? options.size : 10).toString() +
                   "px " +
                   (!!options.family ? options.family : "Courier");
        ctx.fillStyle = options.color || "#000000";
        ctx.fillText(text, x, y);
      },
      "animation": function(self, onFrame, interval, shouldEnd, onEnd) {
        // private domain
        const uid = function(candidate) {
          return self.intervals[candidate]
            ? uid(candidate + "_1")
            : candidate;
        };
        let iFrame = 0;
        const id = uid(arguments.callee.caller.name);
        const cleanUp = function() {
          clearInterval(self.intervals[id]);
          delete self.intervals[id];
          if (onEnd) {
            onEnd();
          }
        };
        const animate = function() {
          if (shouldEnd && shouldEnd(iFrame)) {
            cleanUp();
          } else {
            onFrame(iFrame);
          }
          iFrame += 1;
        };

        // public domain
        return {
          "start": function() {
            self.intervals[id] = setInterval(animate, interval);
          },
          "cancel": function() {
            cleanUp();
          },
          "isAnimating": function() {
            return !!self.intervals[id];
          }
        };
      },
      "render": {
        "stats": function(self, deltaT) {
          self.util.print(
            "X: " + Math.floor(self.player.x) + " Y: " + Math.floor(self.player.y) +
            " | α: " + self.util.rad2Deg(self.player.angle).toFixed(1) + " deg" +
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
          return self.util.animation(
            self,
            function(i) { render(i); },
            375
          );
        },
        "titleScreen": function(self, onEnd) {
          const render = function(iFrame) {
            const state = iFrame % 2;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, self.res[0], self.res[1]);
            if (state === 1) {
              self.util.print(
                "Press any key to start",
                (self.res[0] - 212) * 0.5,
                (self.res[1] - 16) * 0.5,
                {"size": 16, "color": "#FFFFFF"}
              );
            }
            // render sprites immediately
            self.util.render.sprites(self, {
              "skull": {
                "img": self.assets.sprites.menu.skull.img,
                "frames": [self.assets.sprites.menu.skull.frames[state]],
                "activeFrames": [0]
              }
            });
          };
          return self.util.animation(
            self,
            function(i) { render(i); },
            375,
            undefined,
            onEnd
          );
        },
        "sprites": function(self, sprites) {
          for (const key in sprites) {
            if (key[0] !== "_" && sprites.hasOwnProperty(key)) {
              const spriteObj = sprites[key];
              if (!!spriteObj.img) {
                if (!!spriteObj.activeFrames) {
                  const sprite = spriteObj.img;
                  for (let index = 0; index < spriteObj.activeFrames.length; index += 1) {
                    const frame = spriteObj.frames[spriteObj.activeFrames[index]];
                    if (Array.isArray(frame.locOnScreen)) {
                      for (let iLoc = 0; iLoc < frame.locOnScreen.length; iLoc += 1) {
                        const locOnScreen = frame.locOnScreen[iLoc];
                        ctx.drawImage(
                          sprite,
                          frame.offset,
                          sprite.height - frame.height,
                          frame.width,
                          frame.height,
                          locOnScreen.x,
                          locOnScreen.y,
                          frame.width,
                          frame.height
                        );
                      }
                    } else {
                      ctx.drawImage(
                        sprite,
                        frame.offset,
                        sprite.height - frame.height,
                        frame.width,
                        frame.height,
                        frame.locOnScreen.x,
                        frame.locOnScreen.y,
                        frame.width,
                        frame.height
                      );
                    }
                  }
                }
              } else {
                self.util.render.sprites(self, spriteObj);
              }
            }
          }
        },
        "minimap": {
          "dynamic": function(self, offset, tileSize, R, fullDyn) {
            for (let y = -1 * R; y < R; y += 1) {
              const rRow = Math.round(Math.sqrt(R * R - y * y)); // might use polar coordinates as an alternative
              for (let x = -1 * rRow; x < rRow; x += 1) {
                const rRay       = fullDyn ? Math.sqrt(x * x + y * y) : 0;
                const aRay       = fullDyn ? Math.atan2(y, x) : 0;
                const pMapSample = {
                  "x": fullDyn
                    ? Math.floor(self.player.x + Math.round(Math.cos(self.player.angle + aRay + Math.PI * 0.5) * rRay))
                    : Math.floor(self.player.x + x),
                  "y": fullDyn
                    ? Math.floor(self.player.y + Math.round(Math.sin(self.player.angle + aRay + Math.PI * 0.5) * rRay))
                    : Math.floor(self.player.y + y)
                };
                const pTransformMM = {
                  "x": offset.x + x * tileSize,
                  "y": offset.y + y * tileSize
                };
                if (
                  pMapSample.x >= 0 && pMapSample.x < self.nCols &&
                  pMapSample.y >= 0 && pMapSample.y < self.nRows
                ) {
                  const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                  ctx.fillStyle = self.const.minimapColors[mapSample];
                } else { // render map out of bounds
                  ctx.fillStyle = self.const.minimapColors["#"];
                }
                ctx.fillRect(pTransformMM.x, pTransformMM.y, tileSize, tileSize);
              }
            }
            const caretPos = {
              "a": {
                "x": fullDyn
                  ? offset.x + 0.5 * tileSize
                  : offset.x + (Math.cos(self.player.angle) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y - 0.5 * tileSize
                  : offset.y + (Math.sin(self.player.angle) + 0.5) * tileSize
              },
              "b": {
                "x": fullDyn
                  ? offset.x + 0.5 * (1 - self.const.math.sqrt3) * tileSize
                  : offset.x + (Math.cos(self.player.angle + (2 * Math.PI) / 3) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y + 1 * tileSize
                  : offset.y + (Math.sin(self.player.angle + (2 * Math.PI) / 3) + 0.5) * tileSize
              },
              "c": {
                "x": fullDyn
                  ? offset.x + 0.5 * (1 + self.const.math.sqrt3) * tileSize
                  : offset.x + (Math.cos(self.player.angle + (4 * Math.PI) / 3) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y + 1 * tileSize
                  : offset.y + (Math.sin(self.player.angle + (4 * Math.PI) / 3) + 0.5) * tileSize
              }
            };
            self.util.drawCaret(
              ctx,
              caretPos.a,
              caretPos.b,
              caretPos.c,
              {"border": {"color": "#000000", "thickness": 2}}
            );
          },
          "easy": function(self, offset, tileSize, R) {
            const mmCanvas  = document.createElement("canvas");
            const mmCtx     = mmCanvas.getContext("2d");
            mmCanvas.width  = 2 * R * tileSize;
            mmCanvas.height = mmCanvas.width;

            mmCtx.fillStyle = "#000000";
            mmCtx.beginPath();
            mmCtx.arc(R * tileSize, R * tileSize, R * tileSize, 0, 2 * Math.PI);
            mmCtx.fill();

            mmCtx.globalCompositeOperation = "source-atop";
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
                  const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                  mmCtx.fillStyle = self.const.minimapColors[sample];
                } else { // render map out-of-bounds
                  mmCtx.fillStyle = self.const.minimapColors["#"];
                }
                mmCtx.fillRect(translateMap.x, translateMap.y, tileSize, tileSize);
              }
            }
            self.util.drawCaret(
              mmCtx,
              {"x": (R + 0.5 + Math.cos(self.player.angle)) * tileSize,                   "y": (R + 0.5 + Math.sin(self.player.angle)) * tileSize},
              {"x": (R + 0.5 + Math.cos(self.player.angle + Math.PI * 4 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.angle + Math.PI * 4 / 3)) * tileSize},
              {"x": (R + 0.5 + Math.cos(self.player.angle + Math.PI * 2 / 3)) * tileSize, "y": (R + 0.5 + Math.sin(self.player.angle + Math.PI * 2 / 3)) * tileSize},
              {"border": {"color": "#000000", "thickness": 2}}
            );

            ctx.fillStyle = "#101010";
            ctx.beginPath();
            ctx.arc(offset.x, offset.y, (R + 1) * tileSize, 0, 2 * Math.PI);
            ctx.fill();

            ctx.translate(offset.x, offset.y);
            ctx.rotate(-1 * Math.PI * 0.5 - self.player.angle);
            ctx.drawImage(mmCanvas, -1 * R * tileSize, -1 * R * tileSize, mmCanvas.width, mmCanvas.height);
            ctx.rotate(Math.PI * 0.5 + self.player.angle);
            ctx.translate(-1 * offset.x, -1 * offset.y);
          }
        },
        "skybox": function(self) {
          const texSkybox = self.assets.textures.skybox.img;
          const pps = texSkybox.width / 90;
          const verticalShift = self.util.getVerticalShift(self);
          const offsetTex = {
            "x": Math.floor(
              self.util.rad2Deg(self.player.angle - self.FOV * 0.5) * pps %
              texSkybox.width 
            ),
            "y": Math.floor(
              self.DRAW_TILE_SIZE.y * 
              (self.player.anim.walking.apex - verticalShift * self.mRows)
            )
          };
          const hSkybox = Math.floor(self.res[1] * (0.5 + verticalShift));

          // initial draw
          let offsetScreenX = 0;
          ctx.drawImage(
            texSkybox,
            offsetTex.x,
            offsetTex.y,
            self.res[0] - offsetScreenX,
            texSkybox.height - offsetTex.y,
            offsetScreenX,
            0,
            self.res[0] - offsetScreenX,
            hSkybox
          );
          offsetScreenX += texSkybox.width - offsetTex.x;

          // complementary draws
          while (offsetScreenX < self.res[0]) {
            ctx.drawImage(
              texSkybox,
              0,
              offsetTex.y,
              self.res[0] - offsetScreenX,
              texSkybox.height - offsetTex.y,
              offsetScreenX,
              0,
              self.res[0] - offsetScreenX,
              hSkybox
            );            
            offsetScreenX += texSkybox.width;
          }
        },
        "background": function(self) {
          const mapTileUnitSize = self.mRows;
          const centerVertical = 0.5 + self.util.getVerticalShift(self);
          const interval = self.const.RATIO_DRAW_DIST_TO_BACKGROUND * mapTileUnitSize / self.DRAW_DIST;
          const gradient = ctx.createLinearGradient(0, 0, 0, self.res[1]);
          gradient.addColorStop(0, "#00000000");
          gradient.addColorStop(centerVertical - interval, "#000000");
          gradient.addColorStop(centerVertical, "#000000");
          gradient.addColorStop(centerVertical + interval, "#000000");
          gradient.addColorStop(1, "#333333");
          return gradient;
        },
        "wallBounds": function(self, iCol, hCeil, hWall, hLine) {
          ctx.fillStyle = "red";
          ctx.fillRect(
            iCol * self.DRAW_TILE_SIZE.x,
            Math.floor(hCeil * self.DRAW_TILE_SIZE.y),
            self.DRAW_TILE_SIZE.x,
            hLine
          );
          ctx.fillStyle = "blue";
          ctx.fillRect(
            iCol * self.DRAW_TILE_SIZE.x,
            Math.floor((self.mRows * 0.5 + (self.player.anim.walking.index * (self.VIEW_DIST - self.DRAW_DIST) / self.DRAW_DIST)) * self.DRAW_TILE_SIZE.y),
            self.DRAW_TILE_SIZE.x,
            hLine
          );
          ctx.fillStyle = "yellow";
          ctx.fillRect(
            iCol * self.DRAW_TILE_SIZE.x,
            Math.floor((hCeil + hWall) * self.DRAW_TILE_SIZE.y),
            self.DRAW_TILE_SIZE.x,
            hLine
          );
          ctx.fillStyle = "magenta";
          ctx.fillRect(
            self.DRAW_TILE_SIZE.x * iCol,
            Math.floor(self.DRAW_TILE_SIZE.y * (hCeil + hWall * 0.5)),
            self.DRAW_TILE_SIZE.x,
            hLine
          );
        },
        "frame": {
          "rasterized": function(self) {
            // draw background
            self.util.render.skybox(self);
            ctx.fillStyle = self.assets.background;
            ctx.fillRect(0, 0, self.res[0], self.res[1]);

            // raycasting
            const sqrDrawDist = self.DRAW_DIST * self.DRAW_DIST;
            let previousHit;
            let currentHit;
            for (let iCol = 0; iCol < self.mCols; iCol += 1) {
              const ray = {
                "angle": self.player.angle - self.FOV * 0.5 + (iCol / self.mCols) * self.FOV
              };
              ray.dir = {
                "x": Math.cos(ray.angle),
                "y": Math.sin(ray.angle)
              };
              ray.slope   = ray.dir.y / ray.dir.x;
              const up    = ray.dir.y < 0 ? 1 : 0;
              const right = ray.dir.x > 0 ? 1 : 0;
              let distToWall;

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
                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                if (self.util.eucDist(traceV, {"x": self.player.x, "y": self.player.y}, true, self.mRows) > sqrDrawDist) {
                  hitV = 1;
                  distToWall = sqrDrawDist;
                } else if (sample === "#" || sample === "V") {
                  const pHit = {
                    "x": sample === "V"
                      ? sampleMap.x + 0.5 // TODO: make 0.5 more dynamic
                      : traceV.x,
                    "y": traceV.y +
                      (sample === "V"
                        ? (sampleMap.x + 0.5 - traceV.x) * ray.slope // TODO: make 0.5 more dynamic
                        : 0)
                  };
                  if (sample === "#" || sample === "V" && sampleMap.y + (self.doors[sampleMap.x.toString() + "_" + sampleMap.y.toString()].state * 0.1) > pHit.y) {
                    currentHit = "vertical";
                    distToWall = self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.mRows);
                    distToWall = distToWall > sqrDrawDist ? sqrDrawDist : distToWall;
                    hitV = 1;
                  }
                } else if (sample === "H") { hitV = 1; }
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
                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                if (self.util.eucDist(traceH, {"x": self.player.x, "y": self.player.y}, true, self.mRows) > sqrDrawDist) {
                  hitH = 1;
                  distToWall = distToWall ? distToWall : sqrDrawDist;
                } else if (sample === "#" || sample === "H") {
                  const pHit = {
                    "x": traceH.x +
                      (sample === "H"
                        ? (sampleMap.y + 0.5 - traceH.y) / ray.slope // TODO: make 0.5 more dynamic
                        : 0),
                    "y": sample === "H"
                      ? sampleMap.y + 0.5 // TODO: make 0.5 more dynamic
                      : traceH.y,
                  };
                  if (sample === "#" || sample === "H" && sampleMap.x + 1 - (self.doors[sampleMap.x.toString() + "_" + sampleMap.y.toString()].state * 0.1) < pHit.x) {
                    let hitDist = self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.mRows);
                    hitDist = hitDist > sqrDrawDist ? sqrDrawDist : hitDist;

                    // if current horizontal hit is closer than current vertical hit
                    if (
                      (hitV & 1) === 0 || distToWall === undefined ||
                      distToWall > hitDist ||
                      (distToWall === hitDist && previousHit === "horizontal")
                    ) {
                      currentHit = "horizontal";
                      distToWall = hitDist;
                    }
                    hitH = 1;
                  }
                } else if (sample === "V") { hitH = 1; }
                traceH.x += stepH.x;
                traceH.y += stepH.y;
              }
              previousHit = currentHit;

              // calculate the real distance
              distToWall = Math.sqrt(distToWall);
              const realDist = distToWall;

              // fix the fish-eye distortion
              distToWall *= Math.cos(ray.angle - self.player.angle);

              // draw vertical strip of wall
              ctx.fillStyle = currentHit === "horizontal" ? "#016666" : "#01A1A1";
              const hWall = self.mRows * self.VIEW_DIST / distToWall;
              const hCeil = (distToWall - self.VIEW_DIST) * (self.mRows - self.player.z) / distToWall;
              const hFloor = self.mRows - hCeil - hWall;
              ctx.fillRect(
                self.DRAW_TILE_SIZE.x * iCol,
                self.DRAW_TILE_SIZE.y * hCeil,
                self.DRAW_TILE_SIZE.x,
                self.DRAW_TILE_SIZE.y * hWall
              );

              // shade walls
              ctx.globalAlpha = realDist / self.DRAW_DIST;
              ctx.fillStyle = "#000000";
              ctx.fillRect(
                self.DRAW_TILE_SIZE.x * iCol,
                self.DRAW_TILE_SIZE.y * (hCeil - 1),
                self.DRAW_TILE_SIZE.x,
                self.DRAW_TILE_SIZE.y * (hWall + 2)
              );

              // TODO: floor-casting
              //

              // TODO: ceiling-casting
              //
              ctx.globalAlpha = 1;

              if (window.DEBUG_MODE === 1) {
                self.util.render.wallBounds(
                  self, iCol, hCeil, hWall, self.DRAW_TILE_SIZE.y * 2
                );
              }
            }

            // display mini-map
            const mmTileSize = 4;
            const mmR = 12;
            self.util.render.minimap.easy(
              self,
              {
                "x": self.res[0] - mmR * mmTileSize - 10,
                "y": self.res[1] - mmR * mmTileSize - 10
              },
              mmTileSize,
              mmR
            );
          },
          "final": function() {}
        }
      }
    },
    "exec": {
      "setup": function(self) {
        const animLoading = self.util.render.loading(self);
        animLoading.start();

        // setup game variables
        self.VIEW_DIST = (self.mCols * 0.5) / Math.tan(self.FOV * 0.5);
        self.DRAW_DIST = self.const.DRAW_DIST * self.mRows;
        self.DRAW_TILE_SIZE = {
          "x": self.res[0] / self.mCols,
          "y": self.res[1] / self.mRows
        };
        self.PLAYER_HEIGHT = self.mRows * 0.5;
        self.player.z = self.PLAYER_HEIGHT;
        self.player.weaponDrawn = self.const.WEAPONS.SUPER_SHOTGUN;

        // setup background
        self.assets.background = self.util.render.background(self);

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
          // setup sprites
          self.assets.sprites.__setup(self, [
            "playerWeapons." + self.player.weaponDrawn,
            "menu.skull",
          ])
            .then(function(sprites) {
              sprites.playerWeapons[self.player.weaponDrawn].activeFrames = [0];
              sprites.__animations.playerWeapon[self.player.weaponDrawn] = 
                [1, 2, 0, 3, 4, 5, 6, 7, 5, 3, 0];
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

            // setup textures
            .then(function() {
              return self.assets.textures.__setup(self, [
                "skybox",
              ]);
            })

            // setup theme music
            .then(function() {
              return self.assets.themes.__setup(self, "main");
            })

            // resolve setup
            .then(function() {
              resolve({
                "loading": animLoading
              });
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
        const memoPos = [self.player.x, self.player.y];
        const vecPlayer = [
          Math.sign(Math.cos(self.player.angle)), 
          Math.sign(Math.sin(self.player.angle))
        ];
        const margin = {"x": 2 * self.STEP_SIZE, "y": 2 * self.STEP_SIZE};

        // update position in the map
        if (self.keyState.W & 1) {
          self.player.x += Math.cos(self.player.angle) * self.STEP_SIZE;
          self.player.y += Math.sin(self.player.angle) * self.STEP_SIZE;
          margin.x *= vecPlayer[0];
          margin.y *= vecPlayer[1];
        } if (self.keyState.S & 1) {
          self.player.x -= Math.cos(self.player.angle) * self.STEP_SIZE;
          self.player.y -= Math.sin(self.player.angle) * self.STEP_SIZE;
          margin.x *= -1 * vecPlayer[0];
          margin.y *= -1 * vecPlayer[1];
        } if (self.keyState.Q & 1) {
          self.player.x += Math.sin(self.player.angle) * self.STEP_SIZE;
          self.player.y -= Math.cos(self.player.angle) * self.STEP_SIZE;
          margin.x *= vecPlayer[1];
          margin.y *= -1 * vecPlayer[0];
        } if (self.keyState.E & 1) {
          self.player.x -= Math.sin(self.player.angle) * self.STEP_SIZE;
          self.player.y += Math.cos(self.player.angle) * self.STEP_SIZE;
          margin.x *= -1 * vecPlayer[1];
          margin.y *= vecPlayer[0];
        }
        
        // rotate player in-place
        if (self.keyState.D & 1) {
          self.player.angle += 0.05;
        } if (self.keyState.A & 1) {
          self.player.angle -= 0.05;
        }

        // collision detection
        const stepX = {"x": Math.floor(self.player.x + margin.x), "y": Math.floor(memoPos[1])};
        const stepY = {"x": Math.floor(memoPos[0]), "y": Math.floor(self.player.y + margin.y)};
        const sampleX = self.map[(self.nCols + self.offsetLinebr) * stepX.y + stepX.x];
        const sampleY = self.map[(self.nCols + self.offsetLinebr) * stepY.y + stepY.x];
        if ((sampleX === "#") ||
            ((sampleX === "V" || sampleX === "H") &&
             (self.doors[stepX.x.toString() + "_" + stepX.y.toString()].state > 0))) {
          self.player.x = memoPos[0];
        }
        if ((sampleY === "#") ||
            ((sampleY === "V" || sampleY === "H") &&
             (self.doors[stepY.x.toString() + "_" + stepY.y.toString()].state > 0))) {
          self.player.y = memoPos[1];
        }
        const stepXY = {"x": Math.floor(self.player.x), "y": Math.floor(self.player.y)};
        const sampleXY = self.map[(self.nCols + self.offsetLinebr) * stepXY.y + stepXY.x];
        if ((sampleXY === "#") ||
            ((sampleXY === "V" || sampleXY === "H") &&
             (self.doors[stepXY.x.toString() + "_" + stepXY.y.toString()].state > 0))) {
          self.player.x = memoPos[0];
          self.player.y = memoPos[1];
        }

        // walking animation
        self.exec.animateWalking(self, [self.player.x, self.player.y], memoPos);
      },
      "animateWalking": function(self, newPos, prevPos) {
        if (prevPos[0] !== newPos[0] || prevPos[1] !== newPos[1]) {
          self.player.z += (self.player.anim.walking.reverse & 1) ? -1 : 1;
          self.player.anim.walking.index = self.player.z - self.PLAYER_HEIGHT;
          self.player.anim.walking.reverse = self.player.anim.walking.index === self.player.anim.walking.apex
                                            ? 1
                                            : self.player.anim.walking.index === -1 * self.player.anim.walking.apex
                                              ? 0
                                              : self.player.anim.walking.reverse;
          self.assets.background = self.util.render.background(self);
        } else {
          self.player.z = self.PLAYER_HEIGHT;
          self.player.anim.walking = {"index": 0, "reverse": 0, "apex": self.player.anim.walking.apex};
          self.assets.background = self.util.render.background(self);
        }
      },
      "animateShooting": function(self) {
        if (
          (self.keyState.SPC & 1) && 
          (self.player.anim.shooting.animating & 1) === 0
        ) {
          const animationFrames = self.assets.sprites.__animations.playerWeapon[
            self.player.weaponDrawn
          ];
          self.player.anim.shooting.animating = 1;
          self.util.animation(
            self,
            function(i) { // onFrame
              self.DRAW_DIST = (i === 0 || i === 1) // if shooting frame, increase lighting
                ? 150 * self.mRows
                : self.const.DRAW_DIST * self.mRows;
              self.assets.background = self.util.render.background(self);
              self.assets.sprites.playerWeapons[
                self.player.weaponDrawn
              ].activeFrames = [animationFrames[i]];
              self.player.anim.shooting.index = i; // needed to lighten up the floor
            },                                     // during shooting frames
            140,
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
          const sampleV = self.map[(self.nCols + self.offsetLinebr) * sampleMapV.y + sampleMapV.x];
          const traceH = {};
          traceH.y = (up & 1) > 0 ? Math.floor(self.player.y) : Math.ceil(self.player.y);
          traceH.x = self.player.x + (traceH.y - self.player.y) / slope;
          const sampleMapH = {
            "x": Math.floor(traceH.x),
            "y": Math.floor(traceH.y - ((up & 1) > 0 ? 1 : 0))
          };
          const sampleH = self.map[(self.nCols + self.offsetLinebr) * sampleMapH.y + sampleMapH.x];
          if (sampleV === "V") {
            self.exec.animateDoor(self, self.doors[sampleMapV.x.toString() + "_" + sampleMapV.y.toString()]);
          } else if (sampleH === "H") {
            self.exec.animateDoor(self, self.doors[sampleMapH.x.toString() + "_" + sampleMapH.y.toString()]);
          }
        }
      },
      "tryAndCloseDoor": function(self, door) {
        if (Math.floor(self.player.x) !== door.loc.x || Math.floor(self.player.y) !== door.loc.y) {
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
          self.util.animation(
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
        self.util.render.frame.rasterized(self);

        self.exec.movePlayer(self);
        self.exec.animateShooting(self);
        self.exec.interactWDoor(self);
        self.util.render.sprites(self, self.assets.sprites);

        // TODO: add portals dynamically by reading from the map
        self.exec.addPortal(self, 10, 62.5, 9, 22.5, Math.PI * 0.5);
        self.exec.addPortal(self, 62, 9, 21, 9.5, Math.PI);

        self.util.render.stats(self, deltaT);
      }
    },
    "run": function(self) {
      let tsStart = new Date();
      self.intervals.game = setInterval(function() { // main game loop:
        const tsEnd = new Date();                    // reiterates ~30 times in a sec
        self.exec.gameLoop(self, tsEnd - tsStart);
        tsStart = tsEnd;
      }, 1000 / self.FPS);
    },
    "start": function(resolution) {
      const self = this;
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