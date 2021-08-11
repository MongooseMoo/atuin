import { AccessControl, Permission } from "role-acl";
import { VM } from "vm2";
import { worldBuiltins } from "./builtins";
import { Actions, OID, WorldObject } from "./object";
import { ProgramTypes } from "./program";
import { WorldObjectProxyHandler } from "./proxy";
import { Task, TID } from "./task";

Error.stackTraceLimit = Infinity;

export type ObjectProperty = string | number | null | OID;

export class World {
  public objects: Map<OID, WorldObject> = new Map();
  private proxies: Map<OID, any> = new Map();
  public perms: AccessControl = new AccessControl();
  private tasks: Map<TID, Task> = new Map();
  lastOid: OID = 0;
  builtins: any;

  constructor() {
    this.builtins = worldBuiltins(this);
  }

  programContext() {
    return {
      world: this,
      ...this.builtins,
      ...this.objectRefs(),
    };
  }

  objectRefs() {
    const keys = Array.from(this.objects.keys());
    return Object.fromEntries(
      keys
        .map((key) => {
          const obj = this.objects.get(key);
          if (!obj) return [];
          const proxy = this.createProxy(obj);
          return ["o" + key, proxy];
        })
        .filter((o) => o.length)
    );
  }

  createProxy(obj: WorldObject) {
    const oid = obj.oid as OID;
    let proxy = this.proxies.get(oid);
    if (!proxy) {
      proxy = new Proxy(obj, WorldObjectProxyHandler);
      this.proxies.set(oid, proxy);
    }
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

    action.run(obj.programContext(args));
  }

  newTask(owner: WorldObject, vm: VM): Task {
    const tid: TID = this.newTid();

    const task = new Task(tid, owner, vm);
    this.tasks.set(tid, task);
    return task;
  }

  newTid(): TID {
    const tid: TID = new Date().getTime() + Math.random();
    if (this.tasks.get(tid)) {
      return this.newTid();
    }
    return tid;
  }
}
