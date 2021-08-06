import * as ts from "typescript";
import { VM, VMScript } from "vm2";
import { WorldObject } from "./object";

export enum ProgramTypes {
  standard = "standard",
}

export interface ProgramContext {
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

  run(context: ProgramContext) {
    const VM = this.createVM(context);
    if (!this.compiled) {
      this.compile();
    }
    if (this.compiled instanceof VMScript) {
      const result = VM.run(this.compiled);

      return result;
    }
    throw new Error("Failed to compile");
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
