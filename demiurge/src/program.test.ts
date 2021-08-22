import { WorldObject } from "./object";
import { Task } from "./task";
import { World } from "./world";

describe("Basic program checks", () => {
  test("Compilation works", () => {
    let world = new World();
    const obj = new WorldObject(world);
    world.addWorldObject(obj);
    obj.addProgram("test", ["1;"]);
    const result: Task = world.spawnTask(obj, obj, "test");
    expect(result.result).toBe(1);
  });

  test("Programs can call other programs", () => {
    let world = new World();
    const obj = new WorldObject(world);
    world.addWorldObject(obj);
    obj.addProgram("test", ["obj.test2();"]);
    obj.addProgram("test2", ["2;"]);
    const result: Task = world.spawnTask(obj, obj, "test");
    expect(result.result).toBe(2);
  });

  test("Programs can't alter important object attributes", () => {
    let world = new World();
    const obj = new WorldObject(world);
    world.addWorldObject(obj);
    obj.addProgram("test", ["obj.programs=[];delete obj.programs;"]);
    const result: Task = world.spawnTask(obj, obj, "test");
    expect(Array.from(obj.programs.keys()).length).toBe(1);
  });
});
