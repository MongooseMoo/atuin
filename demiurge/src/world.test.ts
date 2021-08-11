import { WorldObject } from "./object";
import { ProgramTypes } from "./program";
import { World } from "./world";

const world = new World();
const obj = new WorldObject(world);
world.addWorldObject(obj);
obj.addProgram(
  "hello",
  [
    "print(`Hello, world from object ${obj.oid}!`)",
    "print(`The current task ID is ${task.id}`",
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

obj.addProgram("verify", [
  "print(`This program was called. Current task ID: ${task.id}`)",
]);

const result = obj.run("hello");
console.log("Program returned: ", result);
