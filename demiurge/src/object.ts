import { Permission } from "role-acl";
import { Program, ProgramContext, ProgramTypes } from "./program";
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

  run(programName: string, args?: any, caller: WorldObject = this) {
    const prog = this.programs.get(programName);
    if (!prog) {
      throw new Error(`Program not found: ${programName}`);
    }
    const readPerms = this.world.perms
      .can(caller.credentials)
      // .context({ owner: prog.owner, caller: caller })
      .execute(Actions.read)
      .sync()
      .on(prog.type) as Permission;

    const executePerms = this.world.perms
      .can(caller.credentials)
      // .context({ owner: prog.owner, caller: caller })
      .execute(Actions.execute)
      .sync()
      .on(prog.type) as Permission;
    console.log("Perms ", readPerms);
    if (!(readPerms.granted && executePerms.granted)) {
      throw new Error("Permission denied");
    }
    const context: ProgramContext = this.programContext(args);

    return prog.run(context);
  }

  programContext(args: any): ProgramContext {
    return {
      obj: this.world.createProxy(this),
      args: args,
      ...this.world.programContext(),
    };
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
