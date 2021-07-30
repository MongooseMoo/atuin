import { Program } from "./program";
import { World } from "./world";

export type OID = number;

export class WorldObject {
  programs: Map<string, Program> = new Map();

  constructor(public world: World, public oid?: OID) {}

  runnablePrograms() {
    return Object.fromEntries(
      Array.from(this.programs.keys()).map((name) => [
        name,
        () => this.run(name, arguments),
      ])
    );
  }

  run(programName: string, args?: any) {
    const prog = this.programs.get(programName);
    if (!prog) {
      throw new Error(`Program not found: ${programName}`);
    }
    const context = {
      obj: this.world.createProxy(this),
      args: args,
      world: this.world,
      ...this.world.builtins(),
      ...this.world.objectRefs(),
    };

    return prog.run(context);
  }

  addProgram(name: string, code: string[]) {
    const program = new Program(code);
    this.programs.set(name, program);
  }

  toString() {
    return "o" + this.oid;
  }
}
