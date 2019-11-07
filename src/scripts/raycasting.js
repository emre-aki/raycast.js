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

  Last updated: 11.07.2019
================================================================
*/

(function() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const fs = {
    "__dirname__": "./scripts/",
    "__file__": "./scripts/raycasting.js",
    "__sprites__": "./assets/sprites/",
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
        "sprite": {"index": 0, "reverse": 0},
        "walking": {"index": 0, "reverse": 0, "apex": 10},
      },
      "x": window.__player__.X,
      "y": window.__player__.Y,
      "z": window.__player__.Z
    },
    "assets": {
      "sprites": {
        "player": {
          "shotgun0": {
            "img": new Image(),
            "name": "shotgun_0.png",
            "loc": {"x": 0, "y": 0},
            "ready": 0
          },
          "shotgun1": {
            "img": new Image(),
            "name": "shotgun_1.png",
            "loc": {"x": 0, "y": 0},
            "ready": 0
          },
          "shotgun2": {
            "img": new Image(),
            "name": "shotgun_2.png",
            "loc": {"x": 0, "y": 0},
            "ready": 0
          },
          "shotgun3": {
            "img": new Image(),
            "name": "shotgun_3.png",
            "loc": {"x": 0, "y": 0},
            "ready": 0
          },
          "shotgun4": {
            "img": new Image(),
            "name": "shotgun_4.png",
            "loc": {"x": 0, "y": 0},
            "ready": 0
          }
        },
        "setup": function(self, path) {
          const sprite = path.split(".").reduce(function(acc, curr) {
            return acc[curr];
          }, self.assets.sprites);
          return new Promise(function(resolve, reject) {
            sprite.img.onload = function() {
              resolve(sprite);
            };
            sprite.img.onerror = function() {
              reject();
            };
            sprite.img.src = fs.__sprites__ + sprite.name;
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
    "intervals": {},
    "const": {
      "math": {
        // TODO:
        // ----
        // Make sin/cos && sqrt tables for optimization
        "sqrt3": Math.sqrt(3),
      },
      "minimapColors": {
        "#": "#FFFFFF",
        "P": "#FF0000",
        "V": "#0000FF",
        "H": "#0000FF",
        ".": "#A9A9A999",
        "-": "#A9A9A999"
      },
      "DOOR_ANIM_INTERVAL": 20,
      "DOOR_RESET_DELAY": 3000,
      "DRAW_DIST": 90,
      "RATIO_DRAW_DIST_TO_BACKGROUND": 1.25 // 5 * 0.25
    },
    "util": {
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
                "reverse": 0,
                "interval": undefined,
                "timeout": undefined,
              };
            }
          }
        }
        return doors;
      },
      "drawLine": function(ctx, x0, y0, x1, y1, color) {
        ctx.strokeStyle = color || "#FFCC00";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
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
      "render": {
        "sprites": function(self, sprites) {
          for (key in sprites) {
            if (!!sprites[key].img) {
              if (!!sprites[key].img.src && sprites[key].ready & 1) {
                ctx.drawImage(sprites[key].img, sprites[key].loc.x, sprites[key].loc.y);
              }
            } else {
              self.util.render.sprites(self, sprites[key]);
            }
          }
        },
        "minimap": {
          "dynamicBetter": function(self, offset, tileSize, R, fullDyn) {
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
                const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                if (pMapSample.x >= 0 && pMapSample.x < self.nCols && pMapSample.y >= 0 && pMapSample.y < self.nRows) {
                  ctx.fillStyle = self.const.minimapColors[mapSample];
                } else { // render map out of bounds
                  ctx.fillStyle = "#FFFFFF";
                }
                ctx.fillRect(pTransformMM.x, pTransformMM.y, tileSize, tileSize);
              }
            }
            const caretPos = {
              "a": {
                "x": fullDyn
                  ? offset.x + 0.5 * tileSize
                  : offset.x + (2 * Math.cos(self.player.angle) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y - 1.5 * tileSize
                  : offset.y + (2 * Math.sin(self.player.angle) + 0.5) * tileSize
              },
              "b": {
                "x": fullDyn
                  ? offset.x + (0.5 - self.const.math.sqrt3) * tileSize
                  : offset.x + (2 * Math.cos(self.player.angle + (2 * Math.PI) / 3) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y + 1.5 * tileSize
                  : offset.y + (2 * Math.sin(self.player.angle + (2 * Math.PI) / 3) + 0.5) * tileSize
              },
              "c": {
                "x": fullDyn
                  ? offset.x + (0.5 + self.const.math.sqrt3) * tileSize
                  : offset.x + (2 * Math.cos(self.player.angle + (4 * Math.PI) / 3) + 0.5) * tileSize,
                "y": fullDyn
                  ? offset.y + 1.5 * tileSize
                  : offset.y + (2 * Math.sin(self.player.angle + (4 * Math.PI) / 3) + 0.5) * tileSize
              }
            };
            self.util.drawCaret(
              ctx,
              caretPos.a,
              caretPos.b,
              caretPos.c,
              {"border": {"color": "#000000", "thickness": 1}}
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
                if (sampleMap.x >= 0 && sampleMap.x < self.nCols &&
                  sampleMap.y >= 0 && sampleMap.y < self.nRows) {
                  const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                  mmCtx.fillStyle = self.const.minimapColors[sample];
                } else { // render map out-of-bounds
                  mmCtx.fillStyle = "#FFFFFF";
                }
                mmCtx.fillRect(translateMap.x, translateMap.y, tileSize, tileSize);
              }
            }
            self.util.drawCaret(
              mmCtx,
              {"x": (R + 0.5 + 2 * Math.cos(self.player.angle)) * tileSize,                   "y": (R + 0.5 + 2 * Math.sin(self.player.angle)) * tileSize},
              {"x": (R + 0.5 + 2 * Math.cos(self.player.angle + Math.PI * 4 / 3)) * tileSize, "y": (R + 0.5 + 2 * Math.sin(self.player.angle + Math.PI * 4 / 3)) * tileSize},
              {"x": (R + 0.5 + 2 * Math.cos(self.player.angle + Math.PI * 2 / 3)) * tileSize, "y": (R + 0.5 + 2 * Math.sin(self.player.angle + Math.PI * 2 / 3)) * tileSize},
              {"border": {"color": "#000000", "thickness": 1}}
            );

            ctx.fillStyle = "#000000";
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
        "background": function(self) {
          const centerVertical = 0.5 + self.player.anim.walking.index * (self.VIEW_DIST - self.DRAW_DIST) / (self.DRAW_DIST * self.mRows);
          const interval = self.const.RATIO_DRAW_DIST_TO_BACKGROUND * self.mRows / self.DRAW_DIST;
          const gradient = ctx.createLinearGradient(0, 0, 0, self.res[1]);
          gradient.addColorStop(0, "#558888");
          gradient.addColorStop(centerVertical - interval, "#000000");
          gradient.addColorStop(centerVertical, "#000000");
          gradient.addColorStop(centerVertical + interval, "#000000");
          gradient.addColorStop(1, "#333333");
          return gradient;
        },
        "frame": {
          "rasterized": function(self) {
            // draw background
            ctx.fillStyle = self.assets.background;
            ctx.fillRect(0, 0, self.res[0], self.res[1]);

            // raycasting
            const sqrDrawDist = self.DRAW_DIST * self.DRAW_DIST;
            let previousHit;
            let currentHit;
            for (let iCol = 0; iCol < self.mCols; iCol += 1) {
              const ray   = {
                "angle": self.player.angle - self.FOV * 0.5 + (iCol / self.mCols) * self.FOV
              };
              ray.dir     = {
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
              while ((hitV & 1) === 0 && traceV.x >= 0 && traceV.x < self.nCols &&
                                         traceV.y >= 0 && traceV.y < self.nRows) {
                const sampleMap = {
                  "x": Math.floor(traceV.x + (right ? 0 : -1)),
                  "y": Math.floor(traceV.y)
                };
                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                if (self.util.eucDist(traceV, {"x": self.player.x, "y": self.player.y}, true, self.mRows) > sqrDrawDist) {
                  hitV           = 1;
                  distToWall     = sqrDrawDist;
                } else if (sample === "#" || sample === "V") {
                  const pHit = {               // TODO: ∨ make 0.5 dynamic
                    "x": traceV.x + (sample === "V" ? (0.5 * ((right & 1) ? 1 : -1)) : 0),
                    "y": traceV.y + (sample === "V" ? (0.5 * ((right & 1) ? 1 : -1)) * ray.slope : 0)
                  };
                  if(sample === "#" || sample === "V" && sampleMap.y + (self.doors[sampleMap.x.toString() + "_" + sampleMap.y.toString()].state * 0.1) > pHit.y) {
                    distToWall     = self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.mRows);
                    hitV           = 1;
                    currentHit     = "vertical";
                  }
                }
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
              while ((hitH & 1) === 0 && traceH.x >= 0 && traceH.x < self.nCols &&
                                         traceH.y >= 0 && traceH.y < self.nRows) {
                const sampleMap = {
                  "x": Math.floor(traceH.x),
                  "y": Math.floor(traceH.y + (up ? -1 : 0))
                };
                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                if (self.util.eucDist(traceH, {"x": self.player.x, "y": self.player.y}, true, self.mRows) > sqrDrawDist) {
                  hitH = 1;
                  distToWall     = distToWall ? distToWall : sqrDrawDist;
                } else if (sample === "#" || sample === "H") {
                  const pHit = {               // TODO: ∨ make 0.5 dynamic
                    "x": traceH.x + (sample === "H" ? (0.5 * ((up & 1) ? -1 : 1)) / ray.slope : 0),
                    "y": traceH.y + (sample === "H" ? (0.5 * ((up & 1) ? -1 : 1)) : 0)
                  };
                  if(sample === "#" || sample === "H" && sampleMap.x + 1 - (self.doors[sampleMap.x.toString() + "_" + sampleMap.y.toString()].state * 0.1) < pHit.x) {
                    const hitDist  = self.util.eucDist(pHit, {"x": self.player.x, "y": self.player.y}, true, self.mRows);
                    if ((hitV & 1) === 0 || distToWall > hitDist || (distToWall === hitDist && previousHit === "horizontal")) {
                      distToWall   = hitDist;
                      currentHit   = "horizontal";
                    }
                    hitH = 1;
                  }
                }
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
            }

            // display mini-map
            const mmTileSize = 2;
            const mmR = 25;
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
        // render loading screen
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, self.res[0], self.res[1]);
        self.util.print(
          "Loading...",
          Math.floor(self.res[0] / 2) - 155,
          Math.floor(self.res[1] / 2),
          {"color": "#FFFFFF", "size": 60}
        );

        // setup game variables
        self.VIEW_DIST = (self.mCols * 0.5) / Math.tan(self.FOV * 0.5);
        self.DRAW_DIST = self.const.DRAW_DIST * self.mRows;
        self.DRAW_TILE_SIZE = {
          "x": self.res[0] / self.mCols,
          "y": self.res[1] / self.mRows
        };
        self.PLAYER_HEIGHT = self.mRows * 0.5;
        self.player.z = self.PLAYER_HEIGHT;

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
          self.assets.sprites
            .setup(self, "player.shotgun0")
            .then(function(sprite) {
              sprite.ready = 1;
              sprite.loc.x = Math.round(self.res[0] / 2 - sprite.img.width / 2);
              sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
            })
            .then(function() {
              return self.assets.sprites.setup(self, "player.shotgun1");
            })
            .then(function(sprite) {
              sprite.loc.x = Math.round(self.res[0] / 2 - sprite.img.width / 2);
              sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
            })
            .then(function() {
              return self.assets.sprites.setup(self, "player.shotgun2");
            })
            .then(function(sprite) {
              sprite.loc.x = Math.round(self.res[0] / 2 - sprite.img.width / 2);
              sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
            })
            .then(function() {
              return self.assets.sprites.setup(self, "player.shotgun3");
            })
            .then(function(sprite) {
              sprite.loc.x = Math.round(self.res[0] / 2 - sprite.img.width / 2);
              sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
            })
            .then(function() {
              return self.assets.sprites.setup(self, "player.shotgun4");
            })
            .then(function(sprite) {
              sprite.loc.x = Math.round(self.res[0] / 2 - sprite.img.width / 2);
              sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
            })

            // setup theme music
            .then(function() {
              return self.assets.themes.setup(self, "main");
            })
            .then(function(theme) {
              resolve(theme);
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
        const wallMargin = 0.25;
        const margin = {"x": 0, "y": 0};

        // update position in the map
        if (self.keyState.W & 1) {
          self.player.x += Math.cos(self.player.angle) * self.STEP_SIZE;
          self.player.y += Math.sin(self.player.angle) * self.STEP_SIZE;
          margin.x = wallMargin * (Math.cos(self.player.angle) > 0 ? 1 : -1);
          margin.y = wallMargin * (Math.sin(self.player.angle) > 0 ? 1 : -1);
        } if (self.keyState.A & 1) {
          self.player.angle -= 0.05;
        } if (self.keyState.S & 1) {
          self.player.x -= Math.cos(self.player.angle) * self.STEP_SIZE;
          self.player.y -= Math.sin(self.player.angle) * self.STEP_SIZE;
          margin.x = wallMargin * (Math.cos(self.player.angle) > 0 ? -1 : 1);
          margin.y = wallMargin * (Math.sin(self.player.angle) > 0 ? -1 : 1);
        } if (self.keyState.D & 1) {
          self.player.angle += 0.05;
        } if (self.keyState.Q & 1) {
          self.player.x += Math.sin(self.player.angle) * self.STEP_SIZE;
          self.player.y -= Math.cos(self.player.angle) * self.STEP_SIZE;
          margin.x = wallMargin * (Math.sin(self.player.angle) > 0 ? 1 : -1);
          margin.y = wallMargin * (Math.cos(self.player.angle) > 0 ? -1 : 1);
        } if (self.keyState.E & 1) {
          self.player.x -= Math.sin(self.player.angle) * self.STEP_SIZE;
          self.player.y += Math.cos(self.player.angle) * self.STEP_SIZE;
          margin.x = wallMargin * (Math.sin(self.player.angle) > 0 ? -1 : 1);
          margin.y = wallMargin * (Math.cos(self.player.angle) > 0 ? 1 : -1);
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

        // TODO: move to a separate function, e.g. `animateWalking`
        // walking animation
        if (self.player.x !== memoPos[0] || self.player.y !== memoPos[1]) {
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
        if (self.keyState.SPC & 1 && !self.intervals.animShooting) {
          self.intervals.animShooting = setInterval(function() {
            self.assets.sprites.player["shotgun" + self.player.anim.sprite.index.toString()].ready = 0;
            self.player.anim.sprite.index =
              self.player.anim.sprite.reverse & 1
                ? self.player.anim.sprite.index === 2
                  ? 0
                  : self.player.anim.sprite.index - 1
                : self.player.anim.sprite.index + 1;
            self.assets.sprites.player["shotgun" + self.player.anim.sprite.index.toString()].ready = 1;
            if (Object.keys(self.assets.sprites.player).length - 1 === self.player.anim.sprite.index) {
              self.player.anim.sprite.reverse = 1;
            } else if (self.player.anim.sprite.index === 0) {
              self.player.anim.sprite.reverse = 0;
              clearInterval(self.intervals.animShooting);
              self.intervals.animShooting = undefined;
              return;
            }
            if (self.player.anim.sprite.index === 1) { // if shooting frame, increase lighting
              self.DRAW_DIST = 150 * self.mRows;
              self.assets.background = self.util.render.background(self);
            } else {
              self.DRAW_DIST = self.const.DRAW_DIST * self.mRows;
              self.assets.background = self.util.render.background(self);
            }
          }, 150);
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
        if (!door.interval) {
          door.interval = setInterval(function(){
            //console.log(door);
            door.state += ((door.reverse & 1) === 0 ? -1 : 1);
            if (door.state === 0) {
              clearInterval(door.interval);
              door.interval = undefined;
              door.reverse = 1;
              door.timeout = setTimeout(function() {
                self.exec.tryAndCloseDoor(self, door);
              }, self.const.DOOR_RESET_DELAY);
            } else if (door.state === 10) {
              door.reverse = 0;
              clearTimeout(door.timeout);
              clearInterval(door.interval);
              door.timeout = undefined;
              door.interval = undefined;
            }
          }, self.const.DOOR_ANIM_INTERVAL);
        }
      },
      "gameLoop": function(self, deltaT) {
        self.util.render.frame.rasterized(self);

        self.exec.movePlayer(self);
        self.exec.animateShooting(self);
        self.exec.interactWDoor(self);
        self.util.render.sprites(self, self.assets.sprites);

        // TODO: add portals dynamically by reading from the map
        self.exec.addPortal(self, 10, 62, 9, 22, Math.PI * 0.5);
        self.exec.addPortal(self, 62, 9, 21, 9.5, Math.PI);

        // display stats
        self.util.print(
          "X: " + Math.floor(self.player.x) + " Y: " + Math.floor(self.player.y) +
          " | α: " + self.util.rad2Deg(self.player.angle).toFixed(1) + " deg" +
          " | FPS: " + (1000 / deltaT).toFixed(1),
          5,
          15,
          {"size": 14}
        );
      }
    },
    "start": function() {
      const self = this;
      let tsStart = new Date();
      self.intervals.game = setInterval(function() {
        // main game loop--reiterates ~30 times a second
        const tsEnd = new Date();
        self.exec.gameLoop(self, tsEnd - tsStart);
        tsStart = tsEnd;
      }, 1000 / self.FPS);
    }
  };
  game.exec.setup(game).then(game.start.bind(game));
})();