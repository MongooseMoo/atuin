import { parse } from "comment-parser";
import { existsSync, promises as fs } from "fs";
import { join } from "path";
import { OID, WorldObject } from "./object";
import { Program } from "./program";
import { World } from "./world";

const SCHEMA_VERSION = 1;

export interface WorldMetadata {
  name: string;
  schemaVersion: number;
}

export interface WorldObjectMetadata {
  oid: OID;
  owner: OID;
  programs: string[];
}

export interface ProgramContents {
  code: string[];
  owner: OID;
}

export async function serializeWorld(world: World, path: string) {
  const metadata: WorldMetadata = {
    name: world.name,
    schemaVersion: SCHEMA_VERSION,
  };
  const metadataPath = join(path, "world.json");
  await writeJsonFile(metadataPath, metadata);
  await world.objects.forEach(async (obj: WorldObject, oid: OID) => {
    const objectPath = join(path, oid.toString());
    await writeObjToPath(obj, objectPath);
  });
}

export async function writeObjToPath(obj: WorldObject, path: string) {
  const objMeta: WorldObjectMetadata = {
    oid: obj.oid as OID,
    owner: obj.owner?.oid as OID,
    programs: Array.from(obj.programs.keys()),
  };
  await writeJsonFile(join(path, "object.json"), objMeta);
  await writeJsonFile(join(path, "properties.json"), obj.properties);
  for (const [name, program] of obj.programs.entries()) {
    let serialized = serializeProgram(program);
    const programPath = join(path, `${name}.ts`);
    await fs.writeFile(programPath, serialized);
  }
}

export function serializeProgram(program: Program) {
  const code = program.code.join("\n");
  const header = `
  /**
  * ${program.description}
  * 
  *  @name: ${program.name}
  * @author: ${program.owner?.oid}
  **/
 
  `;
  return header + code;
}

const WORLD_META_FILE = "world.json";

export async function loadWorld(path: string, world?: World): Promise<World> {
  if (!existsSync(path)) {
    throw new Error("Invalid world path");
  }
  if (typeof world === "undefined") {
    world = new World();
  }
  const metadataPath = join(path, WORLD_META_FILE);
  const worldFiles = new Set(await fs.readdir(path));
  worldFiles.delete(WORLD_META_FILE);
  const worldMeta: WorldMetadata = await loadJsonFile(
    join(path, WORLD_META_FILE)
  );
  const promises: any[] = [];
  worldFiles.forEach(async (fname) =>
    promises.push(loadObjectFromPath(join(path, fname), world as World))
  );
  await Promise.all(promises);
  return world;
}

async function loadObjectFromPath(path: string, intoWorld: World) {
  const metadata = await loadJsonFile(join(path, "object.json"));
  const properties = await loadJsonFile(join(path, "properties.json"));
  const worldObj = new WorldObject(intoWorld, metadata.oid);
  Object.keys(properties).forEach((propname) => {
    worldObj.properties.set(propname, properties[propname]);
  });

  await metadata.programs.forEach(async (progname: string) => {
    const programPath = join(path, `${progname}.ts`);

    const programData = await fs.readFile(programPath);
    const program = deserializeProgram(programData.toString());
    worldObj.programs.set(progname, program);
  });

  intoWorld.addWorldObject(worldObj);
}

function deserializeProgram(programData: string): Program {
  const header = parse(programData)[0];
  const tags = Object.fromEntries(header.tags.map((t) => [t.tag, t]));
  const name = tags.name.name;
  const authorOid = tags.author.name;
  const code = programData.slice(programData.indexOf("*/")).split("\n");
  const program = new Program(name, code);
  return program;
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
