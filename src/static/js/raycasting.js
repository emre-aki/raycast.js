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
        "FOV": Math.PI / 3,
        "DRAW_DIST": 20,
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
        "mRows": 150,
        "mCols": 200,
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
            "render": {
                "globalSprites": function (self) {
                    for (key in self.assets.sprites) {
                        if (!(!self.assets.sprites[key].img) && !(!self.assets.sprites[key].img.src) && self.assets.sprites[key].ready) {
                            ctx.drawImage(self.assets.sprites[key].img, self.assets.sprites[key].loc.x, self.assets.sprites[key].loc.y);
                        }
                    }
                },
                "minimap": {
                    "dynamic": function (self, offset, tileSize, R) {
                        for (let r = 0; r <= R; r += 1) {
                            const stride = 1 / r; // (2 * Math.PI) / (2 * Math.PI * r)
                            for (let a = 0; a < 2 * Math.PI; a += stride) {
                                const pMapSample = {
                                    "x": Math.round(Math.cos(a + self.player.angle) * r + self.player.x),
                                    "y": Math.round(Math.sin(a + self.player.angle) * r + self.player.y)
                                };
                                const pTransformMM = {
                                    "x": offset.x + Math.sin(a) * r * tileSize,
                                    "y": offset.y - Math.cos(a) * r * tileSize
                                };
                                const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                                if (r === R) { // render minimap border
                                    ctx.fillStyle = "#000000";
                                } else if (pMapSample.x >= 0 && pMapSample.x < self.nCols &&
                                           pMapSample.y >= 0 && pMapSample.y < self.nRows) {
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
                    "dynamicBetter": function (self, offset, tileSize, R, fullDyn) {
                        // TODO:
                        // ----
                        //  - Find a way to aesthetically render border around minimap
                        for (let y = -1 * R; y < R; y += 1) {
                            const rRow = Math.round(Math.sqrt(R * R - y * y)); // might use polar coordinates as an alternative
                            for (let x = -1 * rRow; x < rRow; x += 1) {
                                const rRay = fullDyn ? Math.sqrt(x * x + y * y) : 0;
                                const aRay = fullDyn ? Math.atan2(y, x) : 0;

                                const pMapSample = {
                                    "x": fullDyn ? (Math.floor(self.player.x + Math.round(Math.cos(self.player.angle + aRay) * rRay))) : (Math.round(self.player.x + x)),
                                    "y": fullDyn ? (Math.floor(self.player.y + Math.round(Math.sin(self.player.angle + aRay) * rRay))) : (Math.round(self.player.y + y)),
                                };


                                const pTransformMM = {
                                    "x": offset.x + y * tileSize,
                                    "y": offset.y - x * tileSize
                                };
                                const mapSample = self.map[(self.nCols + self.offsetLinebr) * pMapSample.y + pMapSample.x];
                                if (pMapSample.x >= 0 && pMapSample.x < self.nCols &&
                                    pMapSample.y >= 0 && pMapSample.y < self.nRows) {
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
                    "static": function (self, offset, tileSize) {
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
                                ctx.fillRect(tileSize * mX + offset.x, tileSize * mY + offset.y, tileSize, tileSize);
                            }
                        }

                        // draw player FOV
                        for (let iCol = 0; iCol < 2; iCol +=  1) {

                            // raycasting
                            const ray   = {"angle": self.player.angle - (self.FOV * 0.5) + iCol * self.FOV};
                            ray.dir     = {"x": Math.cos(ray.angle), "y": Math.sin(ray.angle)};
                            ray.slope   = ray.dir.y / ray.dir.x;
                            const up    = ray.dir.y < 0 ? 1 : 0;
                            const right = ray.dir.x > 0 ? 1 : 0;
                            let wall    = {};
                            let distToWall;

                            // trace horizontal wall collisions
                            let hitWall_h = 0;
                            const step_h  = {};
                            const trace_h = {};
                            step_h.y      = up & 1 ? -1 : 1;
                            step_h.x      = step_h.y / ray.slope;
                            trace_h.y     = up & 1 ? Math.floor(self.player.y) : Math.ceil(self.player.y);
                            trace_h.x     = self.player.x + (trace_h.y - self.player.y) / ray.slope;
                            while (!(hitWall_h & 1) && 
                                   trace_h.x >= 0 && trace_h.x < self.nCols &&
                                   trace_h.y >= 0 && trace_h.y < self.nRows) {
                                const pSample = {
                                    "x": Math.floor(trace_h.x),
                                    "y": Math.floor(trace_h.y + (up & 1 ? -1 : 0))
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * pSample.y + pSample.x];
                                if (sample === "#") {
                                    distToWall = (trace_h.y - self.player.y) * (trace_h.y - self.player.y) + 
                                                 (trace_h.x - self.player.x) * (trace_h.x - self.player.x);
                                    wall       = {"x": pSample.x, "y": pSample.y + (up & 1 ? 1 : 0)};
                                    hitWall_h  = 1;
                                } else {
                                    trace_h.x += step_h.x;
                                    trace_h.y += step_h.y;
                                }
                            }

                            // trace vertical wall collisions
                            let hitWall_v = 0;
                            const step_v  = {};
                            const trace_v = {};
                            step_v.x      = right & 1 ? 1 : -1;
                            step_v.y      = step_v.x * ray.slope;
                            trace_v.x     = right & 1 ? Math.ceil(self.player.x) : Math.floor(self.player.x);
                            trace_v.y     = self.player.y + (trace_v.x - self.player.x) * ray.slope;
                            while (!(hitWall_v & 1) &&
                                   trace_v.x >= 0 && trace_v.x < self.nCols &&
                                   trace_v.y >= 0 && trace_v.y < self.nRows) {
                                const pSample = {
                                    "x": Math.floor(trace_v.x + (right & 1 ? 0 : -1)),
                                    "y": Math.floor(trace_v.y)
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * pSample.y + pSample.x];
                                if (sample === "#") {
                                    const dist_tmp = (trace_v.y - self.player.y) * (trace_v.y - self.player.y) +
                                                     (trace_v.x - self.player.x) * (trace_v.x - self.player.x);
                                    hitWall_v      = 1;
                                    if ((hitWall_h & 1) === 0 || dist_tmp < distToWall) {
                                        distToWall = dist_tmp;
                                        wall       = {"x": pSample.x + (right & 1 ? 0 : 1), "y": pSample.y};
                                    }
                                } else {
                                    trace_v.x += step_v.x;
                                    trace_v.y += step_v.y;
                                }
                            }

                            self.util.drawLine(
                                tileSize * (Math.round(self.player.x) + 0.5) + offset.x,
                                tileSize * (Math.round(self.player.y) + 0.5) + offset.y,
                                tileSize * wall.x + offset.x,
                                tileSize * wall.y + offset.y
                            );
                        }

                        // draw player
                        ctx.fillStyle = "#000000";
                        ctx.fillRect(
                            tileSize * Math.round(self.player.x) + offset.x - 1,
                            tileSize * Math.round(self.player.y) + offset.y - 1,
                            tileSize + 2,
                            tileSize + 2
                        );
                        ctx.fillStyle = "#FF0000";
                        ctx.fillRect(
                            tileSize * Math.round(self.player.x) + offset.x,
                            tileSize * Math.round(self.player.y) + offset.y,
                            tileSize,
                            tileSize
                        );

                        self.util.print(
                            "MAP",
                            tileSize * self.nCols + offset.x - 28,
                            offset.y + 12,
                            { "size": 13, "style": "italic" }
                        );
                    }
                },
                "frame": {
                    "naive": function (self) {
                        // draw background
                        ctx.fillStyle = "#000000";
                        ctx.fillRect(0, 0, self.res[0], self.res[1]);

                        // raycasting
                        const tileSizeX = Math.round(self.res[0] / self.mCols);
                        const tileSizeY = Math.round(self.res[1] / self.mRows);
                        for (let colI = 0; colI < self.mCols; colI += 1) {
                            const angleRay = (self.player.angle - (self.FOV / 2)) + ((colI / self.mCols) * self.FOV);

                            // wall detection
                            const step = 0.01;
                            let hitWall = false;
                            let distPortal = null;
                            let dist = 0;
                            while (!hitWall && dist < self.DRAW_DIST) {
                                dist += step;
                                const ray = {
                                    "x": Math.floor(self.player.x + dist * Math.cos(angleRay)), 
                                    "y": Math.floor(self.player.y + dist * Math.sin(angleRay))
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * ray.y + ray.x];
                                if (ray.x < 0 || ray.y < 0 || ray.x >= self.nCols || ray.y >= self.nRows) { // ray out of bounds
                                    hitWall = true;
                                    dist = self.DRAW_DIST;
                                } else if (sample === "#") {
                                    hitWall = true;
                                } else if (!(!distPortal) === false && sample === "P") {
                                    distPortal = dist;
                                }
                            }
                            // an attempt to remedy well-known fish-eye correction
                            //dist *= Math.cos(self.player.angle - angleRay);

                            // draw rows for current col
                            const heightCeil = (self.mRows / 2) - (self.mRows / dist);
                            const heightFloor = self.mRows - heightCeil;
                            const interval = self.assets.COLOR_MAP.ENV.length / heightCeil;
                            for (let rowI = 0; rowI < self.mRows; rowI += 1) {
                                if (rowI < heightCeil) {                               // drawing ceiling
                                    ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.floor(rowI * interval)];
                                } else if (heightCeil <= rowI && rowI < heightFloor) { // drawing wall
                                    ctx.fillStyle = self.assets.COLOR_MAP.WALL[Math.floor((dist / self.DRAW_DIST) * self.assets.COLOR_MAP.WALL.length)];
                                } else {                                               // drawing floor
                                    ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.floor((self.mRows - rowI) * interval)];
                                }
                                ctx.fillRect(colI * tileSizeX, rowI * tileSizeY, tileSizeX, tileSizeY);
                            }

                            // draw portal for the current col, if there exists any
                            if (!(!distPortal)) {
                                const heightCeil = (self.mRows / 2) - (self.mRows / distPortal);
                                const heightFloor = self.mRows - heightCeil;
                                const interval = self.assets.COLOR_MAP.PORTAL.length / heightCeil;
                                let iRow = 0;
                                while (iRow < self.mRows && iRow < heightFloor) {
                                    if (self.mRows <= heightFloor) { // if too close to/inside the portal
                                        ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[self.assets.COLOR_MAP.PORTAL.length - 1];
                                    } else {
                                        ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[Math.floor(iRow * interval)] || 
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
                        self.util.render.minimap.dynamicBetter(
                            self,
                            {
                                "x": self.res[0] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr),
                                "y": self.res[1] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr)
                            },
                            tileSizeMap,
                            radiusMap,
                            true
                        );
                        self.util.render.minimap.dynamicBetter(
                            self,
                            {
                                "x": self.res[0] - 10 - tileSizeMap * (radiusMap + self.offsetLinebr),
                                "y": self.res[1] - 20 - tileSizeMap * (3 * radiusMap + self.offsetLinebr)
                            },
                            tileSizeMap,
                            radiusMap
                        );
                        self.util.render.minimap.static(
                            self, 
                            {
                                "x": 10,
                                "y": self.res[1] - tileSizeMap * self.nRows - 10
                            },
                            tileSizeMap
                        );

                        // render global sprites
                        self.util.render.globalSprites(self);                        
                    },
                    "rasterized": function (self) {
                        // draw background
                        ctx.fillStyle = "#000000";
                        ctx.fillRect(0, 0, self.res[0], self.res[1]);
                        const tileSize = {
                            // TODO: optimize--avoid division for each frame
                            "x": Math.round(self.res[0] / self.mCols), 
                            "y": Math.round(self.res[1] / self.mRows)
                        };
                        ctx.fillStyle = "#00FFFF";
                        ctx.fillRect(0, 0, self.res[0], self.res[1] * 0.5);

                        // raycasting
                        for (let iCol = 0; iCol < self.mCols; iCol += 1) {
                            const ray   = {
                                "angle": (self.player.angle - self.FOV * 0.5) + (iCol / self.mCols) * self.FOV
                            };
                            ray.dir     = {"x": Math.cos(ray.angle), "y": Math.sin(ray.angle)};
                            ray.slope   = ray.dir.y / ray.dir.x;
                            const up    = ray.dir.y < 0 ? 1 : 0;
                            const right = ray.dir.x > 0 ? 1 : 0;
                            let distToWall;
                            let distToPortal;
                            const wall = {};

                            // vertical wall detection
                            const stepV   = {};
                            const traceV  = {};
                            stepV.x       = right && 1 ? 1 : -1;
                            stepV.y       = stepV.x * ray.slope;
                            traceV.x      = right ? Math.ceil(self.player.x) : Math.floor(self.player.x);
                            traceV.y      = self.player.y + (traceV.x - self.player.x) * ray.slope;
                            let hitVWall = 0;
                            while ((hitVWall && 1) === 0 && traceV.x >= 0 && traceV.x < self.nCols && traceV.y >= 0 && traceV.y < self.nRows) {
                                const sampleMap = {
                                    "x": Math.floor(traceV.x + (right ? 0 : -1)),
                                    "y": Math.floor(traceV.y)
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                                if (sample === "#") {
                                    const hitDist = {"x": traceV.x - self.player.x, "y": traceV.y - self.player.y};
                                    distToWall = hitDist.x * hitDist.x + hitDist.y * hitDist.y;
                                    hitVWall = 1;
                                    wall.x = sampleMap.x;
                                    wall.y = sampleMap.y;
                                    if (wall.y === sampleMap.y) {
                                        ctx.fillStyle = "#01A1A1";
                                    }
                                } else if (sample === "P") {
                                    const hitDist = {"x": traceV.x - self.player.x, "y": traceV.y - self.player.y};
                                    distToPortal = hitDist.x * hitDist.x + hitDist.y * hitDist.y;
                                }
                                traceV.x += stepV.x;
                                traceV.y += stepV.y;
                            }

                            // horizontal wall detection
                            const stepH  = {};
                            const traceH = {};
                            stepH.y      = up && 1 ? -1 : 1;
                            stepH.x      = stepH.y / ray.slope;
                            traceH.y     = up ? Math.floor(self.player.y) : Math.ceil(self.player.y);
                            traceH.x     = self.player.x + (traceH.y - self.player.y) / ray.slope;
                            let hitHWall = 0;
                            while ((hitHWall && 1) === 0 && traceH.x >= 0 && traceH.x < self.nCols && traceH.y >= 0 && traceH.y < self.nRows) {
                                const sampleMap = {
                                    "x": Math.floor(traceH.x),
                                    "y": Math.floor(traceH.y + (up ? -1 : 0))
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                                if (sample === "#") {
                                    const hitDist = {"x": traceH.x - self.player.x, "y": traceH.y - self.player.y};
                                    const distH   = hitDist.x * hitDist.x + hitDist.y * hitDist.y; 
                                    if ((hitVWall & 1) === 0 || distToWall > distH) {
                                        distToWall = distH;
                                        wall.x = sampleMap.x;
                                        wall.y = sampleMap.y;
                                        if (wall.x === sampleMap.x) {
                                            ctx.fillStyle = "#016666";
                                        }
                                    }
                                    hitHWall = 1;
                                } else if (sample === "P") {
                                    const hitDist = {"x": traceH.x - self.player.x, "y": traceH.y - self.player.y};
                                    const distH   = hitDist.x * hitDist.x + hitDist.y * hitDist.y; 
                                    if (!distToPortal || distToPortal > distH) {
                                        distToPortal = distH;
                                    }
                                }
                                traceH.x += stepH.x;
                                traceH.y += stepH.y;
                            }

                            // fix the fish-eye distortion
                            distToWall = Math.sqrt(distToWall);
                            distToWall *= Math.cos(self.player.angle - ray.angle);

                            // draw rows for the current column
                            let heightCeil = (self.mRows * 0.5) - (self.mRows / distToWall);
                            let startFloor = self.mRows - heightCeil;
                            let interval   = self.assets.COLOR_MAP.ENV.length / heightCeil;
                            /*
                            for (let iRow = 0; iRow < self.mRows; iRow += 1) {
                                if (iRow < heightCeil) {
                                    ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.round(iRow * interval)];
                                    ctx.fillRect(iCol * tileSize.x, iRow * tileSize.y, tileSize.x, tileSize.y);
                                } else if (iRow >= heightCeil && iRow < startFloor) {
                                    ctx.fillStyle = self.assets.COLOR_MAP.WALL[Math.round(self.assets.COLOR_MAP.WALL.length * distToWall / self.DRAW_DIST)];
                                    ctx.fillRect(iCol * tileSize.x, iRow * tileSize.y, tileSize.x, Math.round((startFloor - heightCeil) * tileSize.y));
                                    iRow = startFloor - 1;
                                } else {
                                    ctx.fillStyle = self.assets.COLOR_MAP.ENV[Math.round((self.mRows - iRow) * interval)];
                                    ctx.fillRect(iCol * tileSize.x, iRow * tileSize.y, tileSize.x, tileSize.y);
                                }
                                //ctx.fillRect(iCol * tileSize.x, iRow * tileSize.y, tileSize.x, tileSize.y);
                            }
                            */

                            /**/
                            heightCeil = heightCeil === -Infinity ? 0 : heightCeil;
                            startFloor = startFloor === Infinity ? self.mRows : startFloor;
                            //ctx.fillStyle = self.assets.COLOR_MAP.WALL[Math.floor(self.assets.COLOR_MAP.WALL.length * (distToWall / self.DRAW_DIST)) >= self.assets.COLOR_MAP.WALL.length ? self.assets.COLOR_MAP.WALL.length  - 1 : Math.floor(self.assets.COLOR_MAP.WALL.length * (distToWall / self.DRAW_DIST))];
                            const ang = self.util.rad2Deg(ray.angle - self.player.angle);
                            //ctx.fillStyle = "red";
                            ctx.fillRect(tileSize.x * iCol, heightCeil * tileSize.y, tileSize.x, (startFloor - heightCeil) * tileSize.y);
                            /**/

                            // draw portal for the current col, if there exists any
                            /*
                            if (distToPortal) {
                                const heightCeil = self.mRows * 0.5 - self.mRows / Math.sqrt(distToPortal);
                                const startFloor = self.mRows - heightCeil;
                                const interval   = self.assets.COLOR_MAP.PORTAL.length / heightCeil;
                                let iRow = 0;
                                while (iRow < self.mRows && iRow < startFloor) {
                                    if (self.mRows <= startFloor) { // if too close to/inside the portal
                                        ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[self.assets.COLOR_MAP.PORTAL.length - 1];
                                    } else {
                                        ctx.fillStyle = self.assets.COLOR_MAP.PORTAL[Math.round(iRow * interval)] || 
                                                                                     self.assets.COLOR_MAP.PORTAL[self.assets.COLOR_MAP.PORTAL.length - 1];
                                    }
                                    ctx.fillRect(iCol * tileSize.x, iRow * tileSize.y, tileSize.x, tileSize.y);
                                    iRow += 1;
                                }
                            }
                            */
                        }

                        // display mini-map
                        self.util.render.minimap.dynamicBetter(
                            self,
                            {
                                "x": self.res[0] - 50 * 2 + 30,
                                "y": self.res[1] - 50 * 2 + 30
                            }, 
                            2, 
                            25, 
                            true
                        );

                        // render global sprites
                        self.util.render.globalSprites(self);
                    },
                    "final": function () {}
                }
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
                    self.player.y = 9.5;
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
                }
                 if (self.map[(self.nCols + self.offsetLinebr) * Math.floor(self.player.y) + Math.floor(self.player.x)] === "#") {
                    self.player.x = memoPos[0];
                    self.player.y = memoPos[1];
                }
            },
            "gameLoop": function (self, deltaT) {
                self.util.render.frame.naive(self);

                // display stats
                self.util.print(
                    "X: " + Math.floor(self.player.x) + " Y: " + Math.floor(self.player.y) +
                    " | α: " + (self.util.rad2Deg(self.player.angle)).toFixed(1) + " deg" +
                    " | FPS: " + (1000 / deltaT).toFixed(1), 
                    5, 15, 
                    { "size": 14 }
                );

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