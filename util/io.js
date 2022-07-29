const fs = require("fs");

module.exports.readFile = function(path) {
  return fs.readFileSync(path, {"encoding": "utf-8"});
};

module.exports.writeFile = function(path, content, replace) {
  fs.writeFileSync(
    path,
    replace
      ? Object.keys(replace).reduce(function(accumulator, replaceToken) {
          return accumulator.replace(
            new RegExp("\\b" + replaceToken + "\\b", "g"),
            replace[replaceToken]
          );
        }, content)
      : content,
    {"encoding": "utf-8"}
  );
};
