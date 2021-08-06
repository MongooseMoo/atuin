import { AccessControl, Permission } from "role-acl";
import { worldBuiltins } from "./builtins";
import { Actions, OID, WorldObject } from "./object";
import { ProgramTypes } from "./program";
import { WorldObjectProxyHandler } from "./proxy";

Error.stackTraceLimit = Infinity;
export type ObjectProperty = string | number | null | OID;

export class World {
  public objects: Map<OID, WorldObject> = new Map();
  private proxies: Map<OID, any> = new Map();
  public perms: AccessControl = new AccessControl();
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
      .execute(Actions.read)
      .on(ProgramTypes.standard)
      .execute(Actions.create)
      .on(ProgramTypes.standard)
      .execute(Actions.execute)
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
}
