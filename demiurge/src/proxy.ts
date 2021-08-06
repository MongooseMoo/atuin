import { WorldObject } from "./object";

const RESTRICTED_ATTRIBUTES = ["programs"];
export const WorldObjectProxyHandler: ProxyHandler<WorldObject> = {
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

  deleteProperty: function (obj: WorldObject, prop: string) {
    if (RESTRICTED_ATTRIBUTES.indexOf(prop) >= 0) {
      return false;
    }
    //@ts-ignore
    delete obj[prop];
    return true;
  },
};
