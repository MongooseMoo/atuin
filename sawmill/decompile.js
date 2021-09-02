"use strict";
const acorn = require("acorn");
const readline = require("readline");
const util = require("util");
const mooparser = require("./src/mooparser").get_parser();
let decompiler;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "Decompile> ",
});

rl.prompt();

rl.on("line", (line) => {
  const command = line.trim();
  if (command === "exit") {
    rl.close();
  } else if (command === "help") {
    console.log("Commands: exit, help, javascript, moo");
    return rl.prompt();
  } else if (command === "javascript") {
    decompiler = decompileJavascript;
    return rl.prompt();
  } else if (command === "moo") {
    decompiler = decompileMoo;
    return rl.prompt();
  }
  try {
    displayTree(decompile(line));
  } catch (e) {
    console.error(e);
  }
  rl.prompt();
});

function decompile(data) {
  return decompiler(data);
}

function decompileJavascript(data) {
  return acorn.parse(data, { ecmaVersion: 2021, sourceType: "module" });
}

function decompileMoo(data) {
  return mooparser.parse(data);
}

function displayTree(tree) {
  return console.dir(tree, { depth: null, maxArrayLength: null });
}

decompiler = decompileJavascript;
