import { env } from "process";
import { Permission } from "role-acl";
import {
  ExecutionContext,
  Program,
  ProgramEnvironment,
  ProgramTypes,
} from "./program";
import { ObjectProperty, World } from "./world";

export type OID = number;

export enum Actions {
  create = "create",
  delete = "delete",
  execute = "execute",
  read = "read",
}

export enum CredentialTypes {
  user = "user",
}

export class WorldObject {
  programs: Map<string, Program> = new Map();
  properties: Map<string, ObjectProperty> = new Map();
  credentials: CredentialTypes[] = [CredentialTypes.user];

  constructor(public world: World, public oid?: OID) {}

  lookupAction(actionName: string) {
    let action = this.programs.get(actionName);
    return action;
  }

  run(programName: string, context: ExecutionContext, args?: any) {
    const prog = this.programs.get(programName);
    if (!prog) {
      throw new Error(`Program not found: ${programName}`);
    }
    const readPerms = this.world.perms
      .can(context.caller.credentials)
      // .context({ owner: prog.owner, caller: caller })
      .execute(Actions.read)
      .sync()
      .on(prog.type) as Permission;

    const executePerms = this.world.perms
      .can(context.caller.credentials)
      // .context({ owner: prog.owner, caller: caller })
      .execute(Actions.execute)
      .sync()
      .on(prog.type) as Permission;
    if (!(readPerms.granted && executePerms.granted)) {
      throw new Error("Permission denied");
    }
    let environment;
    if (context.environment) {
      environment = context.environment;
    } else {
      environment = this.createProgramEnvironment(args, context);
    }
    return prog.run(environment);
  }

  createProgramEnvironment(
    args: any,
    context: ExecutionContext
  ): ProgramEnvironment {
    const env = {
      args: args,
      ...this.world.createProgramEnvironment(context),
    };
    env.obj = env["o" + this.oid];
    return env;
  }

  addProgram(
    name: string,
    code: string[],
    programType: ProgramTypes = ProgramTypes.standard,
    owner: WorldObject = this
  ) {
    console.log("current world perms ", this.world.perms.toJSON());
    const perm = this.world.perms
      .can(owner.credentials)
      .execute(Actions.create)
      .sync()
      .on(programType) as Permission;
    if (!perm.granted) {
      throw new Error("Access denied");
    }
    const program = new Program(code, owner);
    this.programs.set(name, program);
  }

  toString() {
    return "o" + this.oid;
  }
}
