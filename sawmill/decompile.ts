const acorn = require("acorn");
const readline = require("readline");
const util = require("util");
const mooparser = require("./src/mooparser").get_parser();
import { MooToJavascriptConverter } from "./src/moo-to-js";

let decompiler: (code: string) => any = decompileJavascript;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "JS>",
});

rl.prompt();

rl.on("line", (line: string) => {
  const command = line.trim();
  if (command === "exit") {
    rl.close();
    return;
  } else if (command === "help") {
    console.log(
      "Commands: exit, help, intermediate, javascript, moo, transpile"
    );
    return rl.prompt();
  } else if (command === "javascript") {
    decompiler = decompileJavascript;
    rl.setPrompt("JS>");
    return rl.prompt();
  } else if (command === "intermediate") {
    decompiler = decompileIntermediate;
    rl.setPrompt("Intermediate>");
    return rl.prompt();
  } else if (command === "moo") {
    decompiler = decompileMoo;
    rl.setPrompt("Moo>");
    return rl.prompt();
  } else if (command === "transpile") {
    decompiler = transpile;
    rl.setPrompt("Transpile>");
    return rl.prompt();
  }
  try {
    var lastTree = decompiler(line);
    displayTree(lastTree);
  } catch (e) {
    console.error(e);
  }
  rl.prompt();
});

function decompile(data: string): any {
  return decompiler(data);
}

function decompileJavascript(code: string) {
  return acorn.parse(code, { ecmaVersion: 2021, sourceType: "script" });
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
