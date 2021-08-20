import { WorldObject } from "./object";
import { ExecutionContext } from "./program";

const RESTRICTED_ATTRIBUTES = ["programs"];

export class WorldObjectProxyHandler implements ProxyHandler<WorldObject> {
  constructor(public context: ExecutionContext) {}
  get(obj: WorldObject, prop: string) {
    const handler = this;
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
      obj.run(prop, handler.context, arguments);
    };
  }

  set(obj: WorldObject, prop: string, value: any) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    //@ts-ignore
    obj[prop] = value;
    return true;
  }

  deleteProperty(obj: WorldObject, prop: string) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    //@ts-ignore
    delete obj[prop];
    return true;
  }
}
