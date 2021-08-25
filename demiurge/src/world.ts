import { AccessControl, Permission } from "role-acl";
import { EventEmitter } from "stream";
import { worldBuiltins } from "./builtins";
import { Actions, OID, WorldObject } from "./object";
import { ExecutionContext, ProgramTypes } from "./program";
import { WorldObjectProxyHandler } from "./proxy";
import { Task, TaskStatus, TID } from "./task";

Error.stackTraceLimit = Infinity;

export type ObjectProperty = string | number | null | OID;

export enum Events {
  objectCreated = "objectCreated",
  objectDestroyed = "objectDestroyed",
  programAdded = "programAdded",
  programDeleted = "programDeleted",
}

export class World extends EventEmitter {
  public objects: Map<OID, WorldObject> = new Map();
  public perms: AccessControl = new AccessControl();
  public tasks: Map<TID, Task> = new Map();
  private lastOid: OID = 0;

  constructor(public name: string = "Unnamed") {
    super();
  }

  createProgramEnvironment(context: ExecutionContext) {
    return {
      ...worldBuiltins(this, context),
      ...this.objectRefs(context),
    };
  }

  objectRefs(context: ExecutionContext) {
    const keys = Array.from(this.objects.keys());
    return Object.fromEntries(
      keys
        .map((key) => {
          const obj = this.objects.get(key);
          if (!obj) return [];
          const proxy = this.createProxy(obj, context);
          return ["o" + key, proxy];
        })
        .filter((o) => o.length)
    );
  }

  createProxy(obj: WorldObject, context: ExecutionContext) {
    const proxy = new Proxy(obj, new WorldObjectProxyHandler(context));
    return proxy;
  }

  addWorldObject(obj: WorldObject, oid?: OID) {
    oid = oid || obj.oid || this.newOid();
    this.objects.set(oid, obj);
    obj.oid = oid;

    this.perms
      .grant(obj.credentials)
      // @ts-expect-error The type declaration is wrong
      .execute([Actions.read, Actions.execute, Actions.create])
      .on(ProgramTypes.standard);
  }

  newOid(): OID {
    const oid = this.lastOid + 1;
    this.lastOid = oid;
    return oid;
  }

  act(oid: OID, actionName: string, args = {}) {
    const obj = this.objects.get(oid);
    if (!obj) {
      throw new Error("Object not found");
    }

    const action = obj.lookupAction(actionName);
    if (!action) {
      throw new Error("No such action");
    }
    const canRunPerm = this.perms
      .can(obj.credentials)
      .execute(Actions.execute)
      .sync()
      .on(String(obj)) as Permission;
    if (!canRunPerm.granted) {
      throw new Error("Access denied");
    }
    // @ts-ignore
    action.run(obj.createProgramEnvironment(args, context));
  }

  newTask(owner: WorldObject): Task {
    const tid: TID = this.newTid();

    const task = new Task(tid, owner);
    this.tasks.set(tid, task);
    return task;
  }

  spawnTask(
    caller: WorldObject,
    obj: WorldObject,
    program: string,
    args: any = {}
  ): Task {
    const task = this.newTask(obj);
    const context = new ExecutionContext(caller, task);
    const objProxy = this.createProxy(obj, context);
    context.obj = objProxy;
    task.status = TaskStatus.running;
    task.result = obj.run(program, context, args);
    task.status = TaskStatus.finished;
    return task;
  }

  newTid(): TID {
    const tid: TID = new Date().getTime() + Math.random();
    if (this.tasks.get(tid)) {
      return this.newTid();
    }
    return tid;
  }

  reset() {
    this.objects.clear();
    this.tasks.clear();
    this.lastOid = 0;
    this.perms.reset();
  }
}
