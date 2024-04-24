/*
 *  watch.js
 *  raycast.js
 *
 *  Created by Emre Akı on 2024-04-21.
 *
 *  SYNOPSIS:
 *      A module for watching and re-building changes in the local project tree.
 */

const { Build } = require("./build");

const ENV = process.env;

function main ()
{
    Build("dist", ENV.DEBUG, 1);
    require("./server");
}

main();
