import * as ts from "typescript";
import { VM, VMScript } from "vm2";
import { WorldObject } from "./object";
import { Task } from "./task";

export enum ProgramTypes {
  standard = "standard",
}

export interface ProgramEnvironment {
  obj?: ProxyHandler<WorldObject>;
  args: any;
}

export class ExecutionContext {
  public environment?: ProgramEnvironment;
  constructor(
    public caller: WorldObject,
    public task: Task,
    public obj?: WorldObject
  ) {}
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

  run(ENVIRONMENT: ProgramEnvironment) {
    const VM = this.createVM(ENVIRONMENT);
    if (!this.compiled) {
      this.compile();
    }
    if (!(this.compiled instanceof VMScript)) {
      throw new Error("Failed to compile");
    }

    const result = VM.run(this.compiled);

    return result;
  }

  createVM(environment: ProgramEnvironment) {
    return new VM({
      eval: false,
      fixAsync: true,
      wasm: false,
      timeout: this.timeout,
      sandbox: environment,
    });
  }
}
