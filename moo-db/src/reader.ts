/*** MOO Database reader
 * This provides the low-level methods for reading in a MOO database
 * Version 4 and Latest version databases are supported
 * */

import { MooDatabase, MooObject, OID } from "./db";
import { MooTypes } from "./mootypes";
import { Property } from "./property";
import { Verb } from "./verb";

const versionRe = /\*\* LambdaMOO Database, Format Version (\d+) \*\*/;

export class MooDatabaseReader {
  constructor(public data: string, private pos: number = 0) {}

  readUntil(text: string) {
    const pos = this.data.indexOf(text, this.pos);
    if (pos === -1) {
      this.parsingError(`Could not find ${text}`);
    }
    const result = this.data.substring(this.pos, pos);
    this.pos = pos + text.length;
    return result;
  }

  readLine() {
    return this.readUntil("\n");
  }

  read(offset: number) {
    if (this.pos + offset >= this.data.length) {
      this.parsingError("read past end of file");
    }
    const result = this.data.substring(this.pos, this.pos + offset);
    this.pos += offset;
    return result;
  }

  readInt() {
    return parseInt(this.readLine());
  }

  readList(): any[] {
    const length = this.readInt();
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(this.readValue());
    }
    return result;
  }

  readValue() {
    const type = this.readInt();
    switch (type) {
      case MooTypes.STR:
        return this.readString();
      case MooTypes.OBJ:
        return this.readObjnum();
      case MooTypes.INT:
        return this.readInt();
      case MooTypes.FLOAT:
        return this.readFloat();
      case MooTypes.ERR:
        return this.readErr();
      case MooTypes.LIST:
        return this.readList();
      case MooTypes.CLEAR || MooTypes.NONE:
        break;
      case MooTypes.MAP:
        return this.readMap();
      default:
        this.parsingError(`unknown type ${type}`);
    }
  }

  readFloat() {
    return parseFloat(this.readLine());
  }

  readObjnum(): OID {
    return this.readInt() as OID;
  }

  readErr() {
    return this.readInt();
  }

  readObject(): MooObject | undefined {
    const objNumber = this.readLine();
    if (objNumber.indexOf("#") === -1) {
      this.parsingError("object number does not have #");
    }
    if (objNumber.indexOf("recycled") !== -1) {
      return;
    }
    const oid = parseInt(objNumber.slice(1));
    const name = this.readLine();
    this.readLine();
    const flags = this.readInt();
    const owner = this.readObjnum();
    const location = this.readObjnum();
    const firstContent = this.readInt();
    const neighbor = this.readInt();
    const parent = this.readObjnum();
    const firstChild = this.readInt();
    const sibling = this.readInt();
    const obj = new MooObject(oid, name, flags, owner, location, parent);
    const numVerbs = this.readInt();
    for (let i = 0; i < numVerbs; i++) {
      this.readVerbMetadata(obj);
    }
    const properties = this.readProperties(obj);
    return obj;
  }

  readProperties(obj: MooObject) {
    const numProperties = this.readInt();
    const propertyNames = [];
    for (let i = 0; i < numProperties; i++) {
      propertyNames.push(this.readLine());
    }
    const numPropdefs = this.readInt();
    for (let i = 0; i < numPropdefs; i++) {
      let propertyName;
      if (propertyNames.length) {
        propertyName = propertyNames.shift();
      }
      const value = this.readValue();
      const owner = this.readObjnum();
      const perms = this.readInt();
      const property = new Property(propertyName, value, owner, perms);
      obj.properties!.push(property);
    }
  }

  readVerbMetadata(obj: MooObject) {
    const name = this.readLine();
    const owner = this.readObjnum();
    const perms = this.readInt();
    const preps = this.readInt();
    const verb = new Verb(name, owner, perms, preps);
    obj.verbs!.push(verb);
  }

  readMap() {
    throw new Error("Method not implemented.");
  }

  readString() {
    return this.readLine();
  }

  readDatabase() {
    this.pos = 0;
    const db = new MooDatabase();
    const versionString = this.readLine();
    const versionMatch = versionRe.exec(versionString);
    if (!versionMatch) {
      throw new Error("Could not find version number");
    }
    const dbVersion = parseInt(versionMatch[1]);
    db.versionString = versionString;
    db.version = dbVersion;
    if (dbVersion < 4) {
      throw new Error("Database version too old");
    } else if (dbVersion === 4) {
      return this.readDatabaseV4(db);
    } else if (dbVersion === 17) {
      return this.readDatabaseV17(db);
    } else {
      throw new Error("Unknown database version " + dbVersion);
    }
  }

  readDatabaseV17(db: MooDatabase) {
    return db;
  }

  readDatabaseV4(db: MooDatabase) {
    db.totalObjects = this.readInt();
    db.totalVerbs = this.readInt();
    this.readLine();
    db.totalPlayers = this.readInt();
    for (let i = 0; i < db.totalPlayers; i++) {
      db.players.push(this.readObjnum());
    }

    for (let i = 0; i < db.totalObjects; i++) {
      const obj = this.readObject();
      if (!obj) continue;
      db.objects.set(obj.oid, obj);
    }
    for (let i = 0; i < db.totalVerbs; i++) {
      this.readVerb(db);
    }
    return db;
  }

  readVerb(db: MooDatabase) {
    const verbLocation = this.readLine();
    if (verbLocation.indexOf(":") === -1) {
      this.parsingError("verb does not have seperator");
    }
    const sep = verbLocation.indexOf(":");
    const objNumber = parseInt(verbLocation.slice(1, sep));
    const verbNumber = parseInt(verbLocation.slice(sep + 1));
    const code = [];
    let lastLine = this.readLine();
    while (lastLine !== ".") {
      code.push(lastLine);
      lastLine = this.readLine();
    }
    const obj = db.objects.get(objNumber);
    if (!obj) {
      this.parsingError(`object ${objNumber} not found`);
    }
    const verb = obj.verbs[verbNumber];
    if (!verb) {
      this.parsingError(`verb ${verbNumber} not found on object ${objNumber}`);
    }
    verb.code = code;
  }

  parsingError(message: string): never {
    const lineno = this.data.slice(0, this.pos).split("\n").length;
    throw new Error(`Database parse error on line   ${lineno}: ${message}`);
  }
}
