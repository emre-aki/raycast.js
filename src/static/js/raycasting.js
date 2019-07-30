



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
        "FPS": 60,
        "FOV": Math.PI / 3,
        "DRAW_DIST": 20,
        "STEP_SIZE": 0.2, // 0.066
        "keyState": {
            "W": 0,
            "A": 0,
            "S": 0,
            "D": 0,
            "Q": 0,
            "E": 0,
            "SPC": 0
        },
        "map": window.__map__.MAP,
        "mRows": 600,
        "mCols": 800,
        "nRows": window.__map__.N_ROWS,
        "nCols": window.__map__.N_COLS,
        "offsetLinebr": window.__map__.OFFSET_LINEBR,
        "player": {
            "angle": window.__player__.ANGLE,
            "sprite": {"index": 0, "reverse": 0},
            "x": window.__player__.X,
            "y": window.__player__.Y
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
                "setup": function (self, path) {
                    const sprite = path.split(".").reduce(function(acc, curr) {
                        return acc[curr];
                    }, self.assets.sprites);
                    return new Promise(function (resolve, reject) {
                        sprite.img.onload = function () {
                            resolve(sprite);
                        };
                        sprite.img.onerror = function () {
                            reject();
                        };
                        sprite.img.src = fs.__static__ + "sprites/" + sprite.name;
                    });
                }
            },
            "themes": {
                "main": {
                    "audio": new Audio(),
                    "name": "theme.mp3",
                    "status": "INIT"
                },
                "setup": function (self, path) {
                    const theme = path.split(".").reduce(function (acc, curr) {
                        return acc[curr];
                    }, self.assets.themes);
                    return new Promise(function (resolve, reject) {
                        theme.audio.onended = function () {
                            theme.status = "READY";
                            this.currentTime = 0;
                            self.exec.playAudio(self, theme);
                        };
                        theme.audio.onerror = function () {
                            theme.status = "INIT";
                            reject();
                        };
                        theme.audio.oncanplaythrough = function () {
                            theme.status = "READY";
                            resolve(theme);
                        };
                        document.addEventListener("keydown", function () {
                            self.exec.playAudio(self, theme);
                        });
                        theme.audio.src = fs.__static__ + "audio/" + theme.name;
                    });
                }
            },
            "COLOR_MAP": {
                "ENV":  ["#7F2A1A", "#6F2516", "#5F1F13", "#4F1A0F", "#3F150C", "#2F0F09", "#1F0A06", "#000000"],
                "WALL": ["#FFFFFFFF", "#FFFFFFDF", "#FFFFFFBF", "#FFFFFF9F", "#FFFFFF7F", "#FFFFFF5F", "#FFFFFF3F", "#FFFFFF1F", "#FFFFFF0F"],
                "PORTAL": ["#FFFF000F", "#FFFF001F", "#FFFF002F", "#FFFF003F", "#FFFF004F"]
            }
        },
        "intervals": {},
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
                } else if (key === 32) {
                    self.keyState.SPC = type === "keydown" ? 1 : (type === "keyup" ? 0 : self.keyState.SPC);
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
                "sprites": function (self, sprites) {
                    for (key in sprites) {
                        if (!(!sprites[key].img)) {
                            if (!(!sprites[key].img.src) && sprites[key].ready & 1) {
                                ctx.drawImage(sprites[key].img, sprites[key].loc.x, sprites[key].loc.y);
                            }
                        } else {
                            self.util.render.sprites(self, sprites[key]);
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
                                    "x": fullDyn ? Math.floor(self.player.x + Math.round(Math.cos(self.player.angle + aRay) * rRay)) : Math.floor(self.player.x + x),
                                    "y": fullDyn ? Math.floor(self.player.y + Math.round(Math.sin(self.player.angle + aRay) * rRay)) : Math.floor(self.player.y + y)
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
                            while ((hitWall_v & 1) === 0 &&
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
                                tileSize * (Math.floor(self.player.x) + 0.5) + offset.x,
                                tileSize * (Math.floor(self.player.y) + 0.5) + offset.y,
                                tileSize * wall.x + offset.x,
                                tileSize * wall.y + offset.y
                            );
                        }

                        // draw player
                        ctx.fillStyle = "#000000";
                        ctx.fillRect(
                            tileSize * Math.floor(self.player.x) + offset.x - 1,
                            tileSize * Math.floor(self.player.y) + offset.y - 1,
                            tileSize + 2,
                            tileSize + 2
                        );
                        ctx.fillStyle = "#FF0000";
                        ctx.fillRect(
                            tileSize * Math.floor(self.player.x) + offset.x,
                            tileSize * Math.floor(self.player.y) + offset.y,
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
                    },
                    "rasterized": function (self) {
                        // draw background
                        ctx.fillStyle = "#00FFFF";
                        ctx.fillRect(0, 0, self.res[0], self.res[1] * 0.5);
                        ctx.fillStyle = "#303030";
                        ctx.fillRect(0, self.res[1] * 0.5, self.res[0], self.res[1] * 0.5);

                        const tileSize = {
                            // TODO: optimize--avoid division for each frame
                            "x": Math.round(self.res[0] / self.mCols), 
                            "y": Math.round(self.res[1] / self.mRows)
                        };

                        // raycasting
                        let previousHit;
                        let currentHit;
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

                            // vertical wall detection
                            const stepV   = {};
                            const traceV  = {};
                            stepV.x       = right & 1 ? 1 : -1;
                            stepV.y       = stepV.x * ray.slope;
                            traceV.x      = right ? Math.ceil(self.player.x) : Math.floor(self.player.x);
                            traceV.y      = self.player.y + (traceV.x - self.player.x) * ray.slope;
                            let hitVWall = 0;
                            while ((hitVWall & 1) === 0 && traceV.x >= 0 && traceV.x < self.nCols && traceV.y >= 0 && traceV.y < self.nRows) {
                                const sampleMap = {
                                    "x": Math.floor(traceV.x + (right ? 0 : -1)),
                                    "y": Math.floor(traceV.y)
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                                if (sample === "#") {
                                    const hitCoord = {"x": traceV.x - self.player.x, "y": traceV.y - self.player.y};
                                    distToWall = hitCoord.x * hitCoord.x + hitCoord.y * hitCoord.y;
                                    hitVWall = 1;
                                    currentHit = "vertical";
                                } else if (sample === "P") {
                                    const hitCoord = {"x": traceV.x - self.player.x, "y": traceV.y - self.player.y};
                                    distToPortal = hitCoord.x * hitCoord.x + hitCoord.y * hitCoord.y;
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
                            let hitHWall = 0;
                            while ((hitHWall & 1) === 0 && traceH.x >= 0 && traceH.x < self.nCols && traceH.y >= 0 && traceH.y < self.nRows) {
                                const sampleMap = {
                                    "x": Math.floor(traceH.x),
                                    "y": Math.floor(traceH.y + (up ? -1 : 0))
                                };
                                const sample = self.map[(self.nCols + self.offsetLinebr) * sampleMap.y + sampleMap.x];
                                if (sample === "#") {
                                    const hitCoord = {"x": traceH.x - self.player.x, "y": traceH.y - self.player.y};
                                    const hitDist   = hitCoord.x * hitCoord.x + hitCoord.y * hitCoord.y;
                                    if ((hitVWall & 1) === 0 || distToWall > hitDist || (distToWall === hitDist && previousHit === "horizontal")) {
                                        distToWall = hitDist;
                                        currentHit = "horizontal";
                                    }
                                    hitHWall = 1;
                                } else if (sample === "P") {
                                    const hitCoord = {"x": traceH.x - self.player.x, "y": traceH.y - self.player.y};
                                    const hitDist   = hitCoord.x * hitCoord.x + hitCoord.y * hitCoord.y; 
                                    if (!distToPortal || distToPortal > hitDist) {
                                        distToPortal = hitDist;
                                    }
                                }
                                traceH.x += stepH.x;
                                traceH.y += stepH.y;
                            }
                            previousHit = currentHit;
                            distToWall = Math.sqrt(distToWall) /* * 3 */;

                            // fix the fish-eye distortion
                            distToWall *= Math.cos(self.player.angle - ray.angle);

                            // draw rows for the current column
                            // TODO:
                            // ----
                            //  - bring back gradients (for walls and floor/ceiling both)
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
                            ctx.fillStyle = currentHit === "horizontal" ? "#016666" : "#01A1A1";
                            ctx.fillRect(tileSize.x * iCol, heightCeil * tileSize.y, tileSize.x, (startFloor - heightCeil) * tileSize.y);
                            //ctx.fillStyle = "#000000";
                            //ctx.fillRect(tileSize.x * iCol, tileSize.y * heightCeil, tileSize.x, tileSize.y * (startFloor - heightCeil));
                            //ctx.fillStyle = self.assets.COLOR_MAP.WALL[Math.floor(self.assets.COLOR_MAP.WALL.length * (distToWall / self.DRAW_DIST)) >= self.assets.COLOR_MAP.WALL.length ? self.assets.COLOR_MAP.WALL.length  - 1 : Math.floor(self.assets.COLOR_MAP.WALL.length * (distToWall / self.DRAW_DIST))];
                            //ctx.fillRect(tileSize.x * iCol, heightCeil * tileSize.y, tileSize.x, (startFloor - heightCeil) * tileSize.y);
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
                    // setup event listeners
                    document.onkeydown = function (e) {
                        self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
                    };
                    document.onkeyup = function (e) {
                        self.util.handleAsyncKeyState(self, e.type, e.which || e.keyCode);
                    };

                    // setup sprites
                    self.assets.sprites.setup(self, "player.shotgun0")
                        .then(function (sprite) {
                            sprite.ready = 1;
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);
                        })
                        .then(function () {
                            return self.assets.sprites.setup(self, "player.shotgun1");
                        })
                        .then(function (sprite) {
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);                            
                        })
                        .then(function () {
                            return self.assets.sprites.setup(self, "player.shotgun2");
                        })
                        .then(function (sprite) {
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);                            
                        }).then(function () {
                            return self.assets.sprites.setup(self, "player.shotgun3");
                        })
                        .then(function (sprite) {
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);                            
                        })
                        .then(function () {
                            return self.assets.sprites.setup(self, "player.shotgun4");
                        })
                        .then(function (sprite) {
                            sprite.loc.x = Math.round((self.res[0] / 2) - sprite.img.width / 2);
                            sprite.loc.y = Math.round(self.res[1] - sprite.img.height);                            
                        })

                    // setup theme music
                        .then(function () {
                            return self.assets.themes.setup(self, "main");
                        })
                        .then(function (theme) {
                            resolve(theme);
                        });                    
                });
            },
            "playAudio": function (self, theme) {
                if (theme.status === "READY") {
                    theme.status = "PLAYING";
                    theme.audio.play()
                        .catch(function (error) {});
                }
            },
            "addPortal": function (self, fromX, toX, fromY, toY, toAngle) {
                if (Math.floor(self.player.x) === fromX && Math.floor(self.player.y) === fromY) {
                    self.player.x = toX;
                    self.player.y = toY;
                    self.player.angle = toAngle;
                }
            },
            "movePlayer": function (self) {
                // TODO:
                // ----
                //  - investigate calculation with wall angle
                const memoPos = [self.player.x, self.player.y];
                if (self.keyState.W & 1) {
                    self.player.x += Math.cos(self.player.angle) * (self.STEP_SIZE);
                    self.player.y += Math.sin(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.A & 1) {
                    self.player.angle -= 0.05;
                } if (self.keyState.S & 1) {
                    self.player.x -= Math.cos(self.player.angle) * (self.STEP_SIZE);
                    self.player.y -= Math.sin(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.D & 1) {
                    self.player.angle += 0.05;
                } if (self.keyState.Q & 1) {
                    self.player.x += Math.sin(self.player.angle) * (self.STEP_SIZE);
                    self.player.y -= Math.cos(self.player.angle) * (self.STEP_SIZE);
                } if (self.keyState.E & 1) {
                    self.player.x -= Math.sin(self.player.angle) * (self.STEP_SIZE);
                    self.player.y += Math.cos(self.player.angle) * (self.STEP_SIZE);
                }
                const sample_x = self.map[(self.nCols + self.offsetLinebr) * Math.floor(memoPos[1]) + Math.floor(self.player.x)];
                const sample_y = self.map[(self.nCols + self.offsetLinebr) * Math.floor(self.player.y) + Math.floor(memoPos[0])];
                if (sample_x === "#") {
                    self.player.x = memoPos[0];
                } if (sample_y === "#") {
                    self.player.y = memoPos[1];
                }
            },
            "animateShooting": function (self) {
                if ((self.keyState.SPC & 1) && !self.intervals.animShooting) {
                    self.intervals.animShooting = setInterval(function () {
                        if (Object.keys(self.assets.sprites.player).length - 1 === self.player.sprite.index) {
                            self.player.sprite.reverse = 1;
                        } else if ((self.player.sprite.reverse & 1) && self.player.sprite.index === 0) {
                            self.player.sprite.reverse = 0;
                            clearInterval(self.intervals.animShooting);
                            self.intervals.animShooting = undefined;
                            return;
                        }
                        self.assets.sprites.player["shotgun" + self.player.sprite.index.toString()].ready = 0;
                        self.player.sprite.index = (self.player.sprite.reverse & 1) ? (self.player.sprite.index === 2 ? 0 : self.player.sprite.index - 1) : self.player.sprite.index + 1;
                        self.assets.sprites.player["shotgun" + self.player.sprite.index.toString()].ready = 1;
                    }, 150);
                }
            },
            "gameLoop": function (self, deltaT) {
                self.util.render.frame.rasterized(self);

                self.exec.movePlayer(self);
                self.exec.animateShooting(self);
                self.util.render.sprites(self, self.assets.sprites);

                // TODO: add portals dynamically by reading from the map
                self.exec.addPortal(self, 10, 62, 9, 22, Math.PI * 0.5);
                self.exec.addPortal(self, 62, 9, 21, 9.5, Math.PI);

                // display stats
                self.util.print(
                    "X: " + Math.floor(self.player.x) + " Y: " + Math.floor(self.player.y) +
                    " | α: " + (self.util.rad2Deg(self.player.angle)).toFixed(1) + " deg" +
                    " | FPS: " + (1000 / deltaT).toFixed(1), 
                    5, 15, 
                    { "size": 14 }
                );
            }
        },
        "start": function () {
            const self = this;
            let tsStart = new Date();
            self.intervals.game = setInterval(function () {
                // main game loop--reiterates ~30 times a second
                const tsEnd = new Date();
                self.exec.gameLoop(self, tsEnd - tsStart);
                tsStart = tsEnd;
            }, 1000 / self.FPS);
        }
    };
    game.exec.setup(game).then(game.start.bind(game));
})();