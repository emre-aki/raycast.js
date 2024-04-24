const path = require("path");
const readline = require("readline");
const { readFile, writeFile }  = require("./io");
const ROOT = path.join(__dirname, "..", "src");

const main = function() {
  console.log("\n########################################");
  console.log("# Welcome to Raycasting.js map editor. #");
  console.log("#       Developed by Emre Akı          #");
  console.log("########################################\n");

  const INTERFACE = {
    input: process.stdin,
    output: process.stdout
  };
  const rl = initReadline({
    "interface": INTERFACE,
    "onClose": function() {
      console.log("\nGoodbye.\n");
      process.exit(0);
    }
  });

  displayMainMenu(rl)
    .then(function(mapData) {
      console.log(
        "\n" + (mapData._path === "new" ? "Created " : "Loaded ") +
        mapData.width + "x" + mapData.height + " map."
      );
      return mapData;
    })
    .then(function(mapData) {
      displayEditOrQuitMenu(rl, mapData);
    });
};

const displayMainMenu = function(rlHandle) {
  return promptReadline(rlHandle, "\n(N)ew map\t(L)oad map\t(Q)uit editor\n> ")
    .then(function(response) {
      if (response === "N") {
        return createNewMap(rlHandle)
          .then(function(mapData) {
            return {
              "map": mapData.map,
              "width": mapData.width,
              "height": mapData.height,
              "_path": "new"
            };
          });
      } else if (response === "L") {
        return loadMap();
      } else if (response === "Q") {
        closeReadline(rlHandle);
      } else {
        console.error("Invalid selection");
        return displayMainMenu(rlHandle);
      }
    });
};

const createNewMap = function(rlHandle) {
  return promptReadline(rlHandle, "\nNumber of columns: ")
    .then(function(numCols) {
      return promptReadline(rlHandle, "Number of rows: ")
        .then(function(numRows) {
          return [+numCols, +numRows];
        });
    })
    .then(function(mapDimensions) {
      const wMap = mapDimensions[0];
      const hMap = mapDimensions[1];
      const map = Array(wMap * hMap).fill([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      return {"map": map, "width": wMap, "height": hMap};
    });
};

const displayEditOrQuitMenu = function(rlHandle, mapData) {
  promptReadline(rlHandle, "\n(E)dit cell\t(Q)uit editor\n> ")
    .then(function(response) {
      if (response === "E") {
        editCell(rlHandle, mapData);
      } else if (response === "Q") {
        saveMap(mapData);
        console.log(
          "\nSaved " + mapData.width + "x" + mapData.height + " map in " +
          path.join(ROOT, "engine", "map.js")
        );
        closeReadline(rlHandle);
      } else {
        console.error("Invalid selection");
        displayEditOrQuitMenu(rlHandle, mapData);
      }
    });
};

const loadMap = function() {
  const file = path.join(ROOT, "engine", "map.js");
  const fileContents = readFile(file);
  return {
    "map": JSON.parse(
      "[" +
      new RegExp("\"MAP\":\\s*\\[([\\s\\S]*)\\]").exec(fileContents)[1] +
      "]"
    ),
    "width": +(new RegExp("\"N_COLS\":\\s*(\\d+)")).exec(fileContents)[1],
    "height": +(new RegExp("\"N_ROWS\":\\s*(\\d+)").exec(fileContents)[1])
  };
};

const saveMap = function(mapData) {
  const mapStr = mapData.map.reduce(
    function(accumulator, cellData, cellIdx) {
      return accumulator + "[" + cellData.join(",") + "]," +
        (
          (cellIdx + 1) % mapData.width === 0
          ? "\n      "
          : ""
        );
    },
    "[\n      "
  );
  const mapTemplate = readFile(path.join(__dirname, "map.tjs"));
  writeFile(path.join(ROOT, "engine", "map.js"), mapTemplate, {
    "__N_ROWS__": mapData.height,
    "__N_COLS__": mapData.width,
    "__MAP__": mapStr.slice(0, mapStr.length - 8) + "\n    ]"
  });
};

const editCell = function(rlHandle, mapData) {
  promptReadline(rlHandle, "\nEnter cell properties (space-separated)\n" +
    "  0: Cell type,\n" +
    "  1: North-face texture/Freeform cell x-margin,\n" +
    "  2: East-face texture/Freeform cell y-margin,\n" +
    "  3: South-face texture/Freeform cell width,\n" +
    "  4: West-face texture/Freeform cell depth,\n" +
    "  5: Floor type,\n" +
    "  6: Ceiling type,\n" +
    "  7: Diagonal wall type,\n" +
    "  8: Word-object type/Freeform cell z-margin,\n" +
    "  9: Word-object height/Freeform cell height\n> ")
    .then(function(props) {
      return promptReadline(
        rlHandle,
        "\nEnter coordinates of the cell(s) to edit (space-separated)\n> "
      )
      .then(function(coordinates) {
          const coordinatesParsed = coordinates.split(" ")
            .map(function(component) { return parseInt(component, 10); });
          for (let i = 0; i < coordinatesParsed.length; i += 2) {
            const cellData = props.split(" ")
              .map(function(component) { return parseFloat(component, 10); });
            const [x, y] = [coordinatesParsed[i], coordinatesParsed[i + 1]];
            mapData.map[mapData.width * y + x] = cellData;
            console.log(
              "Set [" + cellData.join(", ") + "]" +
              " to cell at (" + x + ", " + y + ")."
            );
          }
        });
    })
    .then(function() {
      displayEditOrQuitMenu(rlHandle, mapData);
    });
};

const initReadline = function(config) {
  const rl = readline.createInterface(config.interface);
  if (config.onClose) {
    rl.on("close", config.onClose);
  }
  return rl;
};

const promptReadline = function(rlHandle, message) {
  return new Promise(function(resolve) {
    rlHandle.question(message, function(response) {
      resolve(response);
    });
  });
};

const closeReadline = function(rlHandle) {
  rlHandle.close();
};

main();
