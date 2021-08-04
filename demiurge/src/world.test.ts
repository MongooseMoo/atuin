import { WorldObject } from "./object";
import { ProgramTypes } from "./program";
import { World } from "./world";

const world = new World();
const obj = new WorldObject(world);
obj.addProgram(
  "hello",
  [
    "print(`Hello, world from object ${obj.oid}!`)",
    `const a = 1;
  if (a) {
  print('Assignment works!')
  }
  obj.verify();
  print("Obj is o1: ", obj === o1);
  obj.programs = [];
  obj.test = 1;
  print("Set obj.test to ", obj.test);
  print("toObj test "+ toObj(1));
`,
    "new Date().toString()",
  ],
  ProgramTypes.standard,
  obj
);

obj.addProgram("verify", [`print('This program was called')`]);

world.addWorldObject(obj);
const result = obj.run("hello");
console.log("Program returned: ", result);
