import { World } from "./world";

export function worldBuiltins(world: World) {
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
