const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

express()
  .use(express.static(path.join(ROOT, "assets")))
  .use("/engine", express.static(path.join(ROOT, "engine")))
  .use("/editor", express.static(path.join(ROOT, "level-editor")))
  // refactor: START
  .use("/_engine", express.static(path.join(ROOT, "refactor", "engine")))
  .use("/_game", express.static(path.join(ROOT, "refactor", "game")))
  .use("/_data", express.static(path.join(ROOT, "refactor", "data")))
  .get("/refactor", (req, res) => res.render("_index"))
  // refactor: END
  .set("view engine", "ejs")
  .set("views", path.join(ROOT, "templates"))
  .get("/", (req, res) => res.render("index"))
  .get("/editor", (req, res) => res.render("editor"))
  .listen(PORT, () => console.log(`Listening on ${PORT}\n ROOT: ${ROOT}`));
