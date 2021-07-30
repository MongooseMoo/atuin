import { VM } from "vm2";

export interface ProgramContext {
  obj: any;
  args: any;
}

export class Program {
  programTimeout: number = 1000; // ms
  constructor(public code: string[]) {}

  run(context: ProgramContext) {
    const code = this.code.join("\n");
    const VM = this.createVM(context);
    const result = VM.run(code);
    return result;
  }
  createVM(context: any) {
    return new VM({
      eval: false,
      wasm: false,
      timeout: this.programTimeout,
      sandbox: context,
    });
  }
}
