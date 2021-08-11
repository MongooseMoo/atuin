import * as ts from "typescript";
import { VM, VMScript } from "vm2";
import { WorldObject } from "./object";
import { Task } from "./task";

export enum ProgramTypes {
  standard = "standard",
}

export interface ProgramContext {
  task?: Task;
  obj: ProxyHandler<WorldObject>;
  args: any;
}

export class Program {
  timeout: number = 1000; // ms
  private compiled?: VMScript;
  private typescriptCompilerOptions = {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  };

  constructor(
    public code: string[],
    public owner: WorldObject,
    public type: ProgramTypes = ProgramTypes.standard
  ) {}

  compile() {
    const compiled = ts.transpileModule(
      this.code.join("\r\n"),
      this.typescriptCompilerOptions
    );
    this.compiled = new VMScript(compiled.outputText);
    this.compiled.compile();
  }

  run(context: ProgramContext, task?: Task) {
    const VM = this.createVM(context);
    if (!this.compiled) {
      this.compile();
    }
    if (!(this.compiled instanceof VMScript)) {
      throw new Error("Failed to compile");
    }

    if (!task) {
      task = this.owner.world.newTask(this.owner, VM);
    }
    VM.freeze(task, "task");
    const result = VM.run(this.compiled);

    return result;
  }

  createVM(context: ProgramContext) {
    return new VM({
      eval: false,
      fixAsync: true,
      wasm: false,
      timeout: this.timeout,
      sandbox: context,
    });
  }
}
