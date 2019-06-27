(function () {
    /*
    ================================================================
                        Raycasting on Canvas
                                  by
                           Emre Akı, 2018.


        This is a simple implementation of the once-popular 3-D
    rendering technique known as "ray-casting" or "ray-tracing"
    which was featured in the video game Wolfenstein 3D.

        All of the rendering is carried out within a single 800x600
    canvas for the sake of simplicity at ~30 frames per second.

        This little project was inspired by a video on YouTube posted
    by a fellow seasoned programmer who goes by the name 'javidx9.'
    You can follow the link below to refer to his tutorial of
    ray-casting done entirely on a command-line window!

        https://youtu.be/xW8skO7MFYw

    Last updated: 06.15.2019
    ================================================================
     */

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    let player = {
        "angle": 0,
        "x": 0,
        "y": 0
    };
    const fs = {
        "__static__": "./static/",
        "__dirname__": "./static/js/",
        "__file__": "./static/js/raycasting.js"
    };
    const game = {
        // TODO:
        // ----
        // Make sin/cos && sqrt tables for optimization
        "res": [800, 600],
        "FPS": 30,
        "FOV": 5 * Math.PI / 12,
        "DRAW_DIST": 12,
        "STEP_SIZE": 0.25,
        "keyState": {
            "W": 0,
            "A": 0,
            "S": 0,
            "D": 0,
            "Q": 0,
            "E": 0
        },
        "map": window.__map__.MAP,
        /*
        "map": (function () {
            const oldMap = window.__map__.MAP;
            let newMap = "";
            oldMap.split("\n").forEach(function (row) {
                newMap += row + row + row + "\n";
            });
            oldMap.split("\n").forEach(function (row) {
                newMap += row + row + row + "\n";
            });
            oldMap.split("\n").forEach(function (row) {
                newMap += row + row + row + "\n";
            });
            return newMap;
        })(),*/
        //"nRows": 300,
        //"nCols": 300,
        "nRows": window.__map__.N_ROWS,
        "nCols": window.__map__.N_COLS,
        "offsetLinebr": window.__map__.OFFSET_LINEBR,
        "player": player,
        "assets": {
            "sprites": {
                "player": {
                    "img": new Image(),
                    "name": "pistol1.png", 
                    "loc": { "x": 0, "y": 0 },
                    "ready": false
                },
                "setup": function (self, key) {
                    return new Promise(function (resolve, reject) {
                        self.assets.sprites[key].img.onload = function () {
                            self.assets.sprites[key].ready = true;
                            resolve(self.assets.sprites[key]);
                        };
                        self.assets.sprites[key].img.onerror = function () {
                            reject();
                        };
                        self.assets.sprites[key].img.src = fs.__static__ + "sprites/" + self.assets.sprites[key].name;
                    });
                }
            },
            "themes": {
                "main": {
                    "audio": new Audio(),
                    "name": "theme.mp3",
                    "status": "INIT"
                },
                "setup": function (self, key) {
                    return new Promise(function (resolve, reject) {
                        self.assets.themes[key].audio.onended = function () {
                            self.assets.themes[key].status = "READY";
                            this.currentTime = 0;
                            self.exec.playAudio(self, key);
                        };
                        self.assets.themes[key].audio.onerror = function () {
                            self.assets.themes[key].status = "INIT";
                            reject();
                        };
                        self.assets.themes[key].audio.oncanplaythrough = function () {
                            self.assets.themes[key].status = "READY";
                            resolve(self.assets.themes[key]);
                        };
                        document.addEventListener("keydown", function () {
                            self.exec.playAudio(self, key);
                        });
                        self.assets.themes[key].audio.src = fs.__static__ + "audio/" + self.assets.themes[key].name;
                    });
                }
            },
            "COLOR_MAP": {
                "ENV":  ["#7F2A1A", "#6F2516", "#5F1F13", "#4F1A0F", "#3F150C", "#2F0F09", "#1F0A06", "#000000"],
                "WALL": ["#FFFFFF", "#F0F0F0", "#D4D4D4", "#B8B8B8", "#9C9C9C", "#7F7F7F", "#636363", "#474747", "#2B2B2B", "#000000"],
                "PORTAL": ["#FFFF000F", "#FFFF001F", "#FFFF002F", "#FFFF003F", "#FFFF004F"]
            }
        },
        "const": {
            "sqrt3": Math.sqrt(3)
        },
        "util": {
            "rad2Deg": function (rad) {
                const rad360 = 6.28319;
                const radToDeg = 57.2958;
                return ((((rad + rad360) % rad360) * radToDeg) + 360) % 360;
            },
            "handleAsyncKeyState": function (self, type, key) {
                if (key === 87) {
                    self.keyState.W = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.W);
                } else if (key === 65) {
                    self.keyState.A = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.A);
                } else if (key === 83) {
                    self.keyState.S = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.S);
                } else if (key === 68) {
                    self.keyState.D = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.D);
                } else if (key === 81) {
                    self.keyState.Q = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.Q);
                } else if (key === 69) {
                    self.keyState.E = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.E);
                }
            },
            "drawLine": function (x0, y0, x1, y1, color) {
                ctx.strokeStyle = color || "#FFCC00";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            },
            "drawCaret": function (a, b, c, options) {
                const com = {"x": (a.x + b.x + c.x) / 3, "y": (a.y + b.y + c.y) / 3};
                const color = options.color ? options.color : "#00FFFF";
                const border = options.border ? 
                    {
                        "color": options.border.color ? options.border.color : color,
                        "thickness": options.border.thickness ? options.border.thickness : 1
                    } : {"color": color, "thickness": 1};
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
            "print": function (text, x, y, options) {
                options = options || {};
                ctx.font = ((!(!options.style) ? (options.style + " ") : "") +
                    (!isNaN(options.size) ? options.size : 10).toString() + "px " +
                    (!(!options.family) ? options.family : "Courier"));
                ctx.fillStyle = options.color || "#000000";
                ctx.fillText(text, x, y);
            },
            "renderGlobalSprites": function (self) {
                for (key in self.assets.sprites) {
                    if (!(!self.assets.sprites[key].img) && !(!self.assets.sprites[key].img.src) && self.assets.sprites[key].ready) {
                        ctx.drawImage(self.assets.sprites[key].img, self.assets.sprites[key].loc.x, self.assets.sprites[key].loc.y);
                    }
                }
            },
            // -----
            // TODO:
            // -----
            //  - render.globalSprites
            //  - render.minimap.dyn
            //  - render.minimap.stat
            //  - render.frame
            "renderMinimapDyn": function (self, offset, tileSize, R) {
                for (let r = 0; r <= R; r += 1) {
                    const stride = 1 / r; // (2 * Math.PI) / (2 * Math.PI * r)
                    for (let a = 0; a < 2 * Math.PI; a += stride) {
                        const pMapSample = {
                            "x": Math.round(Math.cos(a) * r + self.player.x),
                            "y": Math.round(Math.sin(a) * r + self.player.y)
                        };
                        const pTransformMM = {
                            "x": offset.x + Math.sin(a - self.player.angle) * r * tileSize,
                            "y": offset.y - Math.cos(a - self.player.angle) * r * tileSize
                        };
                        const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                        if (r === R) { // render minimap border
                            ctx.fillStyle = "#000000";
                        } else if ((pMapSample.x >= 0) && (pMapSample.x < self.nCols) &&
                                   (pMapSample.y >= 0) && (pMapSample.y < self.nRows)) {
                            if (mapSample === ".") {
                                ctx.fillStyle = "#A9A9A9BF";
                            } else if (mapSample === "#") {
                                ctx.fillStyle = "#FFFFFF";
                            } else if (mapSample === "P") {
                                ctx.fillStyle = "#FF0000";
                            }
                        } else { // render map out-of-bounds
                            ctx.fillStyle = "#FFFFFF";
                        }
                        ctx.fillRect(pTransformMM.x, pTransformMM.y, tileSize, tileSize);
                    }
                }
                self.util.drawCaret(
                    {"x": offset.x, "y": offset.y - 2 * tileSize},
                    {"x": offset.x - self.const.sqrt3 * tileSize, "y": offset.y + tileSize},
                    {"x": offset.x + self.const.sqrt3 * tileSize, "y": offset.y + tileSize},
                    {"border": {"color": "#00000", "thickness": 1}},
                );
            },
            "renderMinimapDynBetter": function (self, offset, tileSize, R, fullDyn) {
                // TODO:
                // ----
                //  - Find a way to aesthetically render border around minimap
                for (let y = -1 * R; y < R; y += 1) {
                    const rRow = Math.round(Math.sqrt(R * R - y * y)); // might use polar coordinates as an alternative
                    for (let x = -1 * rRow; x < rRow; x += 1) {
                        const rRay = Math.sqrt(x * x + y * y);
                        const aRay = Math.atan2(y, x);
                        const pMapSample = {
                            "x": Math.round(self.player.x + x),
                            "y": Math.round(self.player.y + y)
                        };
                        const pTransformMM = {
                            "x": fullDyn ? (offset.x + Math.sin(aRay - self.player.angle) * rRay * tileSize) : (offset.x + y * tileSize),
                            "y": fullDyn ? (offset.y - Math.cos(aRay - self.player.angle) * rRay * tileSize) : (offset.y - x * tileSize)
                        };
                        const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                        if ((pMapSample.x >= 0) && (pMapSample.x < self.nCols) &&
                            (pMapSample.y >= 0) && (pMapSample.y < self.nRows)) {
                            if (mapSample === ".") {
                                ctx.fillStyle = "#A9A9A9BF";
                            } else if (mapSample === "#") {
                                ctx.fillStyle = "#FFFFFF";
                            } else if (mapSample === "P") {
                                ctx.fillStyle = "#FF0000";
                            }
                        } else { // render map out of bounds
                            ctx.fillStyle = "#FFFFFF";
                        }
                        ctx.fillRect(pTransformMM.x, pTransformMM.y, tileSize, tileSize);
                    }
                }
                const caretPos = {
                    "a": {
                        "x": fullDyn ? (offset.x + 0.5 * tileSize) : (offset.x + (2 * Math.cos(self.player.angle - Math.PI * 0.5) + 0.5) * tileSize),
                        "y": fullDyn ? (offset.y - 1.5 * tileSize) : (offset.y + (2 * Math.sin(self.player.angle - Math.PI * 0.5) + 0.5) * tileSize)
                    },
                    "b": {
                        "x": fullDyn ? (offset.x + (0.5 - self.const.sqrt3) * tileSize) : (offset.x + (2 * Math.cos(self.player.angle + 5 * Math.PI / 6) + 0.5) * tileSize),
                        "y": fullDyn ? (offset.y + 1.5 * tileSize)                      : (offset.y + (2 * Math.sin(self.player.angle + 5 * Math.PI / 6) + 0.5) * tileSize)
                    },
                    "c": {
                        "x": fullDyn ? (offset.x + (0.5 + self.const.sqrt3) * tileSize) : (offset.x + (2 * Math.cos(self.player.angle + Math.PI / 6) + 0.5) * tileSize),
                        "y": fullDyn ? (offset.y + 1.5 * tileSize)                      : (offset.y + (2 * Math.sin(self.player.angle + Math.PI / 6) + 0.5) * tileSize),
                    }
                };
                self.util.drawCaret(
                    caretPos.a,
                    caretPos.b,
                    caretPos.c,
                    {"border": {"color": "#000000", "thickness": 1}}
                );
            },
            "renderMinimapStat": function (self, offsetX, offsetY, tileSize) {
                // draw map
                for (let mY = 0; mY < self.nRows; mY += 1) {
                    for (let mX = 0; mX < self.nCols; mX += 1) {
                        if (self.map[mY * (self.nCols + self.offsetLinebr) + mX] === ".") {
                            ctx.fillStyle = "#A9A9A9BF";
                        } else if (self.map[mY * (self.nCols + self.offsetLinebr) + mX] === "#") {
                            ctx.fillStyle = "#FFFFFF";
                        } else if (self.map[mY * (self.nCols + self.offsetLinebr) + mX] === "P") {
                            ctx.fillStyle = "#FF0000";
                        }
                        ctx.fillRect(tileSize * mX + offsetX, tileSize * mY + offsetY, tileSize, tileSize);
                    }
                }

                // draw player FOV
                for (let iCol = 0; iCol < 2; iCol +=  1) {
                    const angleRay = self.player.angle - (self.FOV / 2) + iCol * self.FOV;

                    // draw rays until a wall is hit
                    const step = 0.1;
                    let rayLength = 0;
                    let hitWall = false;
                    let rayX = Math.cos(angleRay) * rayLength + self.player.x;
                    let rayY = Math.sin(angleRay) * rayLength + self.player.y;
                    while (!hitWall) {
                        rayX = Math.cos(angleRay) * rayLength + self.player.x;
                        rayY = Math.sin(angleRay) * rayLength + self.player.y;
                        if (((rayX < 0 || rayY < 0 || rayX >= self.nCols || rayY >= self.nRows) ||
                            (self.map[Math.round(rayY) * (self.nCols + self.offsetLinebr) + Math.round(rayX)] === "#"))) {
                            hitWall = true;
                            if (Math.cos(angleRay) < 0) {
                                rayX -= Math.cos(angleRay) * step;
                            } if (Math.sin(angleRay) < 0) {
                                rayY -= Math.sin(angleRay) * step;
                            }
                            //rayX += Math.abs(Math.cos(angleRay) * step); // hacky
                            //rayY += Math.abs(Math.sin(angleRay) * step); // hacky
                        }
                        rayLength += step;
                    }
                    self.util.drawLine(
                        tileSize * (Math.round(self.player.x) + 0.5) + offsetX,
                        tileSize * (Math.round(self.player.y) + 0.5) + offsetY,
                        tileSize * Math.round(rayX) + offsetX,
                        tileSize * Math.round(rayY) + offsetY
                    );
                }

                // draw player
                ctx.fillStyle = "#000000";
                ctx.fillRect(
                    tileSize * Math.round(self.player.x) + offsetX - 1,
                    tileSize * Math.round(self.player.y) + offsetY - 1,
                    tileSize + 2,
                    tileSize + 2
                );
                ctx.fillStyle = "#FF0000";
                ctx.fillRect(
                    tileSize * Math.round(self.player.x) + offsetX,
                    tileSize * Math.round(self.player.y) + offsetY,
                    tileSize,
                    tileSize
                );

                self.util.print(
                    "MAP",
                    tileSize * self.nCols + offsetX - 28,
                    offsetY + 12,
                    { "size": 13, "style": "italic" }
                );
            },
            "renderFrame": function (self) {
                // TODO:
                // ----
                //  - make raycasting independent from `self.nCols`

                // draw background
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, self.res[0], self.res[1]);

                // raycasting
                const tileSizeX = Math.round(self.res[0] / self.nCols);
                const tileSizeY = Math.round(self.res[1] / self.nRows);
                for (let colI = 0; colI < self.nCols; colI += 1) {
                    const angleRay = (self.player.angle - (self.FOV / 2)) + ((colI / (self.nCols - self.offsetLinebr)) * self.FOV);

                    // wall detection
                    const step = 0.01;
                    let hitWall = false;
                    let distPortal = null;
                    let dist = 0;
                    while (!hitWall && dist < self.DRAW_DIST) {
                        dist += step;
                        let distRayX = self.player.x + (Math.cos(angleRay) * dist);
                        let distRayY = self.player.y + (Math.sin(angleRay) * dist);
                        if ((distRayX < 0 || distRayY < 0)
                            || (distRayX >= self.nCols || distRayY >= self.nRows)) { // ray out of bounds
                            hitWall = true;
                            dist = self.DRAW_DIST;
                        } else if (self.map[Math.round(distRayY) * (self.nCols + self.offsetLinebr) + Math.round(distRayX)] === "#") {
                            hitWall = true;
                        } else if (((!(!distPortal) === false) &&
                            (self.map[Math.round(distRayY) * (self.nCols + self.offsetLinebr) + Math.round(distRayX)] === "P"))) {
                            distPortal = dist;
                        }
                    }
                    // an attempt to remedy well-known fish-eye correction
                    // dist *= Math.cos(self.player.angle - angleRay);

                    // draw rows for current col
                    const heightCeil = (self.nRows / 2) - (self.nRows / dist);
                    const heightFloor = self.nRows - heightCeil;
                    const intervalGradient = heightCeil / self.assets.COLOR_MAP.ENV.length;
                    for (let rowI = 0; rowI < self.nRows; rowI += 1) {
                        if (rowI < heightCeil) {                               // drawing ceiling
                            ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.floor(rowI / intervalGradient)];
                        } else if (heightCeil <= rowI && rowI < heightFloor) { // drawing wall
                            ctx.fillStyle = self.assets.COLOR_MAP.WALL[Math.floor((dist / self.DRAW_DIST) * self.assets.COLOR_MAP.WALL.length)];
                        } else {                                               // drawing floor
                            ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.floor((self.nRows - rowI) / intervalGradient)];
                        }
                        ctx.fillRect(colI * tileSizeX, rowI * tileSizeY, tileSizeX, tileSizeY);
                    }

                    // draw portal for the current col, if there exists any
                    if (!(!distPortal)) {
                        const heightCeil = (self.nRows / 2) - (self.nRows / distPortal);
                        const heightFloor = self.nRows - heightCeil;
                        const intervalGradient = heightCeil / self.assets.COLOR_MAP.PORTAL.length;
                        let iRow = 0;
                        while (iRow < self.nRows && iRow < heightFloor) {
                            if (self.nRows <= heightFloor) { // if too close to/inside the portal
                                ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[self.assets.COLOR_MAP.PORTAL.length - 1];
                            } else {
                                ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[Math.floor(iRow / intervalGradient)] || 
                                    self.assets.COLOR_MAP.PORTAL[self.assets.COLOR_MAP.PORTAL.length - 1];
                            }
                            ctx.fillRect(tileSizeX * colI, tileSizeY * iRow, tileSizeX, tileSizeY);
                            iRow += 1;
                        }
                    }

                }

                // display mini-map
                const tileSizeMap = 2;
                const radiusMap = 25;
                self.util.renderMinimapDynBetter(
                    self,
                    {
                        "x": self.res[0] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr),
                        "y": self.res[1] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr)
                    },
                    tileSizeMap,
                    radiusMap,
                    true
                );
                self.util.renderMinimapDynBetter(
                    self,
                    {
                        "x": self.res[0] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr),
                        "y": self.res[1] - 20 - tileSizeMap * (3 * radiusMap + self.offsetLinebr)
                    },
                    tileSizeMap,
                    radiusMap
                );
                self.util.renderMinimapStat(self, 10,
                    self.res[1] - tileSizeMap * self.nRows - 10,
                    tileSizeMap
                );

                // render global sprites
                self.util.renderGlobalSprites(self);
            }
        },
        "exec": {
            "setup": function (self) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, self.res[0], self.res[1]);
                self.util.print(
                    "Loading...",
                    Math.floor(self.res[0] / 2) - 155,
                    Math.floor(self.res[1] / 2),
                    { "color": "#FFFFFF", "size": 60 }
                );
                return new Promise(function (resolve, reject) {
                    // initialize player
                    self.player.x = 2;
                    self.player.y = 9;
                    self.player.angle = 0;

                    // setup event listeners
                    document.onkeydown = function (e) {
                        self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
                    };
                    document.onkeyup = function (e) {
                        self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
                    };

                    // setup sprites
                    self.assets.sprites.setup(self, "player")
                        .then(function (sprite) {
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);

                            //setup theme music
                            return self.assets.themes.setup(self, "main");
                        })
                        .then(function (theme) {
                            resolve(theme);
                        });                    
                });
            },
            "playAudio": function (self, theme) {
                if (self.assets.themes[theme].status === "READY") {
                    self.assets.themes[theme].status = "PLAYING";
                    self.assets.themes[theme].audio.play()
                        .catch(function (error) {});
                }
            },
            "addPortal": function (self, fromX, toX, fromY, toY, toAngle) {
                if (Math.round(self.player.x) === fromX && Math.round(self.player.y) === fromY) {
                    self.player.x = toX;
                    self.player.y = toY;
                    self.player.angle = toAngle;
                }
            },
            "movePlayer": function (self) {
                const memoPos = [self.player.x, self.player.y];
                if (self.keyState.W && 1) {
                    self.player.x += Math.cos(self.player.angle) * (self.STEP_SIZE);
                    self.player.y += Math.sin(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.A && 1) {
                    self.player.angle -= 0.1;
                } if (self.keyState.S && 1) {
                    self.player.x -= Math.cos(self.player.angle) * (self.STEP_SIZE);
                    self.player.y -= Math.sin(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.D && 1) {
                    self.player.angle += 0.1;
                } if (self.keyState.Q && 1) {
                    self.player.x += Math.sin(self.player.angle) * (self.STEP_SIZE);
                    self.player.y -= Math.cos(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.E && 1) {
                    self.player.x -= Math.sin(self.player.angle) * (self.STEP_SIZE);
                    self.player.y += Math.cos(self.player.angle) * (self.STEP_SIZE);
                } if (self.map[Math.round(self.player.y) * (self.nCols + self.offsetLinebr) + Math.round(self.player.x)] === "#") {
                    self.player.x = memoPos[0];
                    self.player.y = memoPos[1];
                }
            },
            "gameLoop": function (self, deltaT) {
                self.util.renderFrame(self);

                // display stats
                self.util.print(
                    "X: " + Math.round(self.player.x) + " Y: " + Math.round(self.player.y) +
                    " | α: " + (self.util.rad2Deg(self.player.angle)).toFixed(1) + " deg" +
                    " | FPS: " + (1000 / deltaT).toFixed(1), 
                    5, 15, 
                    { "size": 14 }
                )

                self.exec.movePlayer(self);

                // TODO: add portals dynamically by reading from the map
                self.exec.addPortal(self, 10, 62, 9, 22, 0);
                self.exec.addPortal(self, 62, 9, 21, 9, Math.PI);
            }
        },
        "start": function () {
            const self = this;
            let tsStart = new Date();
            setInterval(function () {
                // main game loop--reiterates ~30 times a second
                const tsEnd = new Date();
                self.exec.gameLoop(self, tsEnd - tsStart);
                tsStart = tsEnd;
            }, 1000 / self.FPS);
        }
    };
    game.exec.setup(game).then(game.start.bind(game));
})();