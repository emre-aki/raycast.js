/*
 *  build.js
 *  raycast.js
 *
 *  Created by Emre Akı on 2024-04-21.
 *
 *  SYNOPSIS:
 *      The module that helps build a static site to serve the RayCast.js
 *      Engine.
 */

const cli = require("commander");
const path = require("path");
const ejs = require("ejs");

const packageJson = require("../package.json");
const {
    ReadFile,
    WriteFile,
    CopyFile,
    IsDir,
    Mkdir,
    ReadDir,
    RemovePath
} = require("./file");
const { LogInfo } = require("./log");

const ROOT = path.dirname(__dirname); // the project root
const SRC = path.join(ROOT, "src"); // the source directory
const ASSETS = path.join(ROOT, "assets"); // the assets directory
// path to the view template
const TEMPLATE_PATH = path.join(SRC, "view", "index.ejs");
// path to the view template directory
const TEMPLATE_DIR = path.dirname(TEMPLATE_PATH);
const FAVICON_PATH = path.join(ASSETS, "favicon.ico"); // path to the favicon
const LOG_OPTIONS = { context: "build" };

function BuildView (debug)
{
    // read the template
    const template = ReadFile(TEMPLATE_PATH, { encoding: "utf8" });
    // the environment variables to pass onto `ejs` for the rendering of the
    // template
    const clientEnv = { debugMode: !!debug, version: packageJson.version };
        const level = ReadFile(path.join(ROOT, "data", "level.json"));
    // render and return the `index.html`
    return ejs.render(template, { env: clientEnv, level: level.toString() });
}

function CopyStatic (sourceDir, outputDir, onFile)
{
    // queue the directory entries to copy from `sourceDir` to `outputDir`
    const copyQueue = [];
    /* iterate over the entries in the `sourceDir` to determine whether or not
     * they should be copied over to `outputDir`
     */
    for (const entry of ReadDir(sourceDir))
    {
        const copySrc = path.join(sourceDir, entry);
        if (
            // copy if it's any directory other than the `TEMPLATE_DIR`...
            copySrc !== TEMPLATE_DIR && IsDir(copySrc) ||
            // ...or if it's the favicon
            copySrc === FAVICON_PATH
        )
            copyQueue.push(entry);
    }
    /* exhaust the entries in the queue and copy them over to `outputDir` */
    while (copyQueue.length)
    {
        const entry = copyQueue.shift();
        const copySrc = path.join(sourceDir, entry);
        const copyDest = path.join(outputDir, entry);
        /* check to see if the entry popped from the queue is in fact a file,
         * and if so, copy it directly over to the `outputDir`
         *
         * (this case only applies to the favicon for the time being)
         */
        if (!IsDir(copySrc))
        {
            CopyFile(copySrc, copyDest);

            continue;
        }
        Mkdir(copyDest); // create the sub-directory in the `outputDir`
        /* iterate over the sub-entries in the `copySrc`... */
        for (const subEntry of ReadDir(copySrc))
        {
            const copySrcAbspath = path.join(copySrc, subEntry);
            /* ...and push the sub-entry to the queue if it's a sub-directory */
            if (IsDir(copySrcAbspath))
                copyQueue.push(path.join(entry, subEntry));
            /* ...or run a custom callback, if specified */
            else if (onFile)
                onFile(copySrcAbspath, copyDest);
            /* ...or copy it over to the `copyDest` if it's a file */
            else
                CopyFile(copySrcAbspath, path.join(copyDest, subEntry));
        }
    }
}

function Build (outputPath, debug, verbose)
{
    LOG_OPTIONS.verbose = verbose;
    const outputDir = path.join(ROOT, outputPath);
    /* start with a clean slate and clear any previously built artefacts */
    if (IsDir(outputDir))
    {
        LogInfo(`Cleaning ${outputDir}...`, LOG_OPTIONS);
        RemovePath(outputDir, true);
    }
    Mkdir(outputDir, true); // create the output directory
    LogInfo(`Created the output directory at ${outputDir}.`, LOG_OPTIONS);
    LogInfo("Building view...", LOG_OPTIONS);
    const pathToView = path.join(outputDir, "index.html");
    // compile the `index.html`
    WriteFile(pathToView, BuildView(debug), { encoding: "utf8" });
    LogInfo(`Saved view at ${pathToView}.`, LOG_OPTIONS);
    LogInfo(`Copying ${SRC}...`, LOG_OPTIONS);
    /* copy the static files, i.e, scripts, assets, and anything that is static,
     * over to the output directory
     */
    CopyStatic(SRC, outputDir);
    LogInfo(`Copied contents of ${SRC} to ${outputDir}.`, LOG_OPTIONS);
    LogInfo(`Copying ${ASSETS}...`, LOG_OPTIONS);
    CopyStatic(ASSETS, outputDir);
    LogInfo(`Copied contents of ${ASSETS} to ${outputDir}.`, LOG_OPTIONS);
}

function HandleCommand (args)
{
    const { outputPath, debug, verbose } = args; // read optional arguments
    // build the project to be served as a static site from the provided
    // `outputPath`
    Build(outputPath, debug, verbose ?? false);
}

function main ()
{
    cli
        .name("build")
        .description("Build a static site to serve the RayCast.js Engine")
        .version("0.0.1");
    cli
        .option("-o, --output-path", "The path in which the built site will be saved", "./dist")
        .option("-d, --debug", "Build in debug mode")
        .option("-v, --verbose", "Verbose mode")
        .action(HandleCommand);
    cli.parse(process.argv);
}

main();

exports.Build = Build;
