const acorn = require("acorn");
const readline = require("readline");
const util = require("util");
const mooparser = require("./src/mooparser").get_parser();
import { MooToJavascriptConverter } from "./src/moo-to-js";
let decompiler: (code: string) => any;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "Decompile> ",
});

rl.prompt();

rl.on("line", (line: string) => {
  const command = line.trim();
  if (command === "exit") {
    rl.close();
    return;
  } else if (command === "help") {
    console.log("Commands: exit, help, intermediate, javascript, moo");
    return rl.prompt();
  } else if (command === "javascript") {
    decompiler = decompileJavascript;
    return rl.prompt();
  } else if (command === "intermediate") {
    decompiler = decompileIntermediate;
    return rl.prompt();
  } else if (command === "moo") {
    decompiler = decompileMoo;
    return rl.prompt();
  } else if (command === "transpile") {
    decompiler = transpile;
    return rl.prompt();
  }
  try {
    displayTree(decompiler(line));
  } catch (e) {
    console.error(e);
  }
  rl.prompt();
});

function decompile(data: string): any {
  return decompiler(data);
}

function decompileJavascript(code: string) {
  return acorn.parse(code, { ecmaVersion: 2021, sourceType: "module" });
}

function decompileMoo(code: string) {
  return mooparser.parse(code);
}

function decompileIntermediate(code: string) {
  return new MooToJavascriptConverter([code]).toIntermediate();
}

function transpile(code: string) {
  return new MooToJavascriptConverter([code]).toJavascript();
}

function displayTree(tree: any) {
  return console.dir(tree, { depth: null, maxArrayLength: null });
}

decompiler = decompileJavascript;
