const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

express()
  .use(express.static(path.join(ROOT, "assets")))
  .use("/engine", express.static(path.join(ROOT, "engine")))
  .set("view engine", "ejs")
  .set("views", path.join(ROOT, "templates"))
  .get("/", (req, res) => res.render("index"))
  .listen(PORT, () => console.log(`Listening on ${PORT}\n ROOT: ${ROOT}`));
