import { WorldObject } from "./object";
import { ExecutionContext, ProgramTypes } from "./program";
import { World } from "./world";

const world = new World();
const obj = new WorldObject(world);
world.addWorldObject(obj);
obj.addProgram(
  "hello",
  [
    "print(`Hello, world from object ${obj.oid}!`)",
    "print(`Current task ID: ${taskId()}`",
    `const a = 1;
  if (a) {
  print('Assignment works!')
  }
  obj.second();
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

obj.addProgram("second", [
  "print(`Secondary program called.`)",
  "print(`Current task ID in secondary program: ${taskId()}",
]);

const result = world.spawnTask(obj, obj, "hello");
console.log("task returned: ", result.result);
