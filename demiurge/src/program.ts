import { VM } from "vm2";
import { WorldObject } from "./object";

export enum ProgramTypes {
  standard = "standard",
}

export interface ProgramContext {
  obj: any;
  args: any;
}

export class Program {
  timeout: number = 1000; // ms

  constructor(
    public code: string[],
    public owner: WorldObject,
    public type: ProgramTypes = ProgramTypes.standard
  ) {}

  run(context: ProgramContext) {
    const code = this.code.join("\n");
    const VM = this.createVM(context);
    const result = VM.run(code);
    return result;
  }

  createVM(context: ProgramContext) {
    return new VM({
      eval: false,
      wasm: false,
      timeout: this.timeout,
      sandbox: context,
    });
  }
}
