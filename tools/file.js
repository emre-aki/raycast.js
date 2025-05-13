/*
 *  file.js
 *  raycast.js
 *
 *  Created by Emre Akı on 2024-04-21.
 *
 *  SYNOPSIS:
 *      The module that helps with filesystem I/O.
 */

const fs = require("fs");

function ReadFile (path, options)
{
    try { return fs.readFileSync(path, options); }
    catch (error) { throw new Error(`ReadFile: ${error}`); }
}

function WriteFile (path, data, options)
{
    try { fs.writeFileSync(path, data, options); }
    catch (error) { throw new Error(`WriteFile: ${error}`); }
}

function CopyFile (src, dest)
{
    try { fs.copyFileSync(src, dest); }
    catch (error) { throw new Error(`CopyFile: ${error}`); }
}

function IsDir (path)
{
    try
    {
        if (!fs.existsSync(path)) return false;
        return fs.lstatSync(path).isDirectory();
    }
    catch (error)
    {
        throw new Error(`IsDir: ${error}`);
    }
}

function Mkdir (path, recursive)
{
    try { fs.mkdirSync(path, { recursive }); }
    catch (error) { throw new Error(`Mkdir: ${error}`); }
}

function ReadDir (path)
{
    try { return fs.readdirSync(path); }
    catch (error) { throw new Error(`ReadDir: ${error}`); }
}

function RemovePath (path, recursive)
{
    try { fs.rmSync(path, { recursive }); }
    catch (error) { throw new Error(`RemovePath: ${error}`); }
}

function PathExists (path)
{
  return fs.existsSync(path);
}

exports.ReadFile = ReadFile;
exports.WriteFile = WriteFile;
exports.CopyFile = CopyFile;
exports.IsDir = IsDir;
exports.Mkdir = Mkdir;
exports.ReadDir = ReadDir;
exports.RemovePath = RemovePath;
exports.PathExists = PathExists;
