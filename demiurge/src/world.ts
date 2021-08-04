import { AccessControl, Permission } from "role-acl";
import { Actions, OID, WorldObject } from "./object";
import { ProgramTypes } from "./program";

Error.stackTraceLimit = Infinity;
const RESTRICTED_ATTRIBUTES = ["programs"];
const ProxyHandler = {
  get: function (obj: WorldObject, prop: string) {
    const value = obj.properties.get(prop);
    if (value) {
      return value;
    }
    const toRun = obj.programs.get(prop);
    if (!toRun) {
      //@ts-ignore
      return obj[prop];
    }
    return function () {
      obj.run(prop, arguments);
    };
  },
  set: function (obj: WorldObject, prop: string, value: any) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    //@ts-ignore
    obj[prop] = value;
    return true;
  },
  delete: function (obj: WorldObject, prop: string) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    //@ts-ignore
    delete obj[prop];
    return true;
  },
};

export type ObjectProperty = string | number | null | OID;

export class World {
  programContext() {
    return {
      world: this,
      ...this.builtins(),
      ...this.objectRefs(),
    };
  }
  public objects: Map<OID, WorldObject> = new Map();
  private proxies: Map<OID, any> = new Map();
  public perms: AccessControl = new AccessControl();
  lastOid: OID = 0;

  builtins() {
    const world = this;
    return {
      print: console.log,

      toObj: function (str: string) {
        str = String(str);
        const start = str.startsWith("o") ? 1 : 0;
        const oid = parseInt(str.slice(start));
        const obj = world.objects.get(oid);
        if (!obj) throw new Error("No such object " + oid);
        return obj;
      },
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
      proxy = new Proxy(obj, ProxyHandler);
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
