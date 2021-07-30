import { OID, WorldObject } from "./object";

const RESTRICTED_ATTRIBUTES = ["programs"];
const ProxyHandler = {
  get: function (obj: WorldObject, prop: string) {
    const toRun = obj.programs.get(prop);
    if (!toRun) {
      // @ts-expect-error
      return obj[prop];
    }
    return () => obj.run(prop, arguments);
  },
  set: function (obj: WorldObject, prop: string, value: any) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    // @ts-expect-error
    obj[prop] = value;
    return true;
  },
  delete: function (obj: WorldObject, prop: string) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    // @ts-expect-error
    delete obj[prop];
    return true;
  },
};

export class World {
  private objects: Map<OID, WorldObject> = new Map();
  private proxies: Map<OID, any> = new Map();
  lastOid: OID = 0;

  builtins(): object {
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
  }

  newOid(): OID {
    const oid = this.lastOid + 1;
    this.lastOid = oid;
    return oid;
  }
}

const world = new World();
const obj = new WorldObject(world);
obj.addProgram("hello", [
  "print(`Hello, world from object ${obj.oid}!`)",
  `const a = 1;
  if (a) {
  print('Assignment works!')
  }
  obj.verify();
  print("Obj is o1: ", obj === o1);
  obj.programs = [];
  obj.test = 1;
  print("Set obj.test to ", obj.test);
  print("toObj test "+ toObj(1));
`,
  "new Date().toString()",
]);

obj.addProgram("verify", [`print('This program was called')`]);

world.addWorldObject(obj);
const result = obj.run("hello");
console.log("Program returned: ", result);
