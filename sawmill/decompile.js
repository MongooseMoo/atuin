"use strict";
const acorn = require("acorn");
const readline = require("readline");
const util = require("util");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "Decompile> ",
});

rl.prompt();

rl.on("line", (line) => {
  try {
    displayTree(decompile(line));
  } catch (e) {
    console.error(e);
  }
  rl.prompt();
});

function decompile(data) {
  return acorn.parse(data, { ecmaVersion: 2021, sourceType: "module" });
}

function displayTree(tree) {
  return console.dir(tree, { depth: null, maxArrayLength: null });
}
