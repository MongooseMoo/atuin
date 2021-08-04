import { existsSync, promises as fs } from "fs";
import { join } from "path";
import { OID, WorldObject } from "./object";
import { Program } from "./program";
import { World } from "./world";

export interface WorldObjectFileContents {
  oid: OID;
  properties: {};
  programs: {};
}

export interface ProgramContents {
  code: string[];
  owner: OID;
}

export function serializeWorld(world: World, path: string) {
  world.objects.forEach(async (obj: WorldObject, oid: OID) => {
    const objectJson = serializeObj(obj);
    const objectPath = join(path, `${oid}.json`);
    await writeJsonFile(objectPath, objectJson);
  });
}

export function serializeObj(obj: WorldObject): WorldObjectFileContents {
  const properties = Object.fromEntries(obj.properties.entries());

  const programs = Object.fromEntries(
    Array.from(obj.programs.entries()).map(([name, prog]) => {
      return [name, { code: prog.code, owner: prog.owner.oid as OID }];
    })
  );

  return {
    oid: obj.oid as OID,
    programs: programs,
    properties: properties,
  };
}

const WORLD_META_FILE = "world.json";

export async function loadWorld(path: string): Promise<World> {
  if (!existsSync(path)) {
    throw new Error("Invalid world path");
  }
  const world = new World();
  const worldFiles = new Set(await fs.readdir(path));
  worldFiles.delete(WORLD_META_FILE);
  // const worldMeta = loadJsonFile(join(path, WORLD_META_FILE));
  const promises: any[] = [];
  worldFiles.forEach(async (fname) =>
    promises.push(loadObjectFile(join(path, fname), world))
  );
  await Promise.all(promises);
  return world;
}

async function loadObjectFile(fname: string, intoWorld: World) {
  const json: WorldObjectFileContents = await loadJsonFile(fname);
  const worldObj = new WorldObject(intoWorld, json.oid);
  Object.keys(json.properties).forEach((propname) => {
    // @ts-expect-error
    worldObj.properties.set(propname, json.properties[propname]);
  });
  Object.keys(json.programs).forEach((progname) => {
    // @ts-expect-error
    const prog = json.properties[propname];
    const program = new Program(prog.code, prog.type, prog.owner);
    worldObj.programs.set(progname, program);
  });

  intoWorld.addWorldObject(worldObj);
}

async function loadJsonFile(path: string) {
  const buf = await fs.readFile(path);
  const objectJson = buf.toString();
  const intermediateObject = JSON.parse(objectJson);
  return intermediateObject;
}

async function writeJsonFile(path: string, contents: any) {
  const json = JSON.stringify(contents, null, 2);
  await fs.writeFile(path, json);
}

loadWorld("../../worlds/Pangaea").then((world) =>
  console.log("Hello world! ", world)
);
