/*
 *  server.js
 *  raycast.js
 *
 *  Created by Emre Akı on 2024-04-21.
 *
 *  SYNOPSIS:
 *      The module that helps serve the Tmp3D Engine locally as a static site.
 */

const express = require("express");
const path = require("path");

const packageJson = require("../package.json");
const { ReadFile } = require("./file");
const { LogInfo } = require("./log");

const ENV = process.env;
const PORT = ENV.PORT || 3000;
const ROOT = path.join(__dirname, "..", "dist");
const LOG_OPTIONS = { context: "server" };

const level = ReadFile(path.join(ROOT, "..", "data", "level.json"));
const clientEnv = { debugMode: ENV.DEBUG, version: packageJson.version };

function serve ()
{
    LogInfo(`Serving ${ROOT} through port ${PORT}`, LOG_OPTIONS);
}

function main ()
{
    express()
        .use(express.static(path.join(ROOT, "..", "assets")))
        .use("/engine", express.static(path.join(ROOT, "engine")))
        .use("/editor", express.static(path.join(ROOT, "level-editor")))
        // refactor: START
        .use("/_engine", express.static(path.join(ROOT, "refactor", "engine")))
        .use("/_game", express.static(path.join(ROOT, "refactor", "game")))
        .use("/_data", express.static(path.join(ROOT, "refactor", "data")))
        .get("/refactor", (_, res) => res.render("_index"))
        // refactor: END
        .set("view engine", "ejs")
        .set("views", path.join(ROOT, "..", "src", "view"))
        .get("/", (_, res) => res.render("index", { env: clientEnv, level }))
        .get("/editor", (_, res) => res.render("editor"))
        .listen(PORT, serve);
}

main();
