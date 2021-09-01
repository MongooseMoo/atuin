/*** MOO Database reader
 * This provides the low-level methods for reading in a MOO database
 * Version 4 and Latest version databases are supported
 
 * */

import { Activation } from "./activation";
import { MooDatabase, MooObject, OID } from "./db";
import { MooTypes } from "./mootypes";
import { Property } from "./property";
import { QueuedTask } from "./task";
import { Verb } from "./verb";

const versionRe =
  /\*\* LambdaMOO Database, Format Version (?<version>\d+) \*\*/;
const varCountRe = /(?<count>\d+) variables/;
const clockCountRe = /(?<count>\d+) clocks/;
const taskCountRe = /(?<count>\d+) queued tasks/;
const taskHeaderRe = /\d+ (\d+) (\d+) (\d+)/;
const activationHeaderRe =
  /-?(\d+) -?\d+ -?\d+ -?(\d+) -?\d+ -?(\d+) -?(\d+) -?\d+ -?(\d+)/;
const pendingValueRe = /(?<count>\d+) values pending finalization/;
const suspendedTaskCountRe = /(?<count>\d+) suspended tasks/;
const suspendedTaskHeaderRe = /(?<startTime>\d+) (?<id>\d+)(?<endchar>\n| )(?<value>|.+\n)/;

export class MooDatabaseReader {
  constructor(public data: string, private pos: number = 0) { }

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
      case MooTypes.ANON:
        return this.readAnon();
      case MooTypes.INT:
        return this.readInt();
      case MooTypes.FLOAT:
        return this.readFloat();
      case MooTypes.ERR:
        return this.readErr();
      case MooTypes.LIST:
        return this.readList();
      case MooTypes.CLEAR:
        break;
      case MooTypes.NONE:
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
    if (!versionMatch || !versionMatch.groups) {
      throw new Error("Could not find version number");
    }
    const dbVersion = parseInt(versionMatch.groups.version);
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

  readDatabaseV4(db: MooDatabase) {
    db.totalObjects = this.readInt();
    db.totalVerbs = this.readInt();
    this.readLine();
    this.readPlayers(db);
    for (let i = 0; i < db.totalObjects; i++) {
      const obj = this.readObject();
      if (!obj) continue;
      db.objects.set(obj.oid, obj);
    }
    for (let i = 0; i < db.totalVerbs; i++) {
      this.readVerb(db);
    }
    this.readClocks();
    this.readTaskQueue(db);
    return db;
  }

  readPlayers(db: MooDatabase) {
    db.totalPlayers = this.readInt();
    for (let i = 0; i < db.totalPlayers; i++) {
      db.players.push(this.readObjnum());
    }
  }

  readDatabaseV17(db: MooDatabase) {
    return db;
  }

  readVerb(db: MooDatabase) {
    const verbLocation = this.readLine();
    if (verbLocation.indexOf(":") === -1) {
      this.parsingError("verb does not have seperator");
    }
    const sep = verbLocation.indexOf(":");
    const objNumber = parseInt(verbLocation.slice(1, sep)) as OID;
    const verbNumber = parseInt(verbLocation.slice(sep + 1));
    const code = this.readCode();
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

  readCode() {
    const code = [];
    let lastLine = this.readLine();
    while (lastLine !== ".") {
      code.push(lastLine);
      lastLine = this.readLine();
    }
    return code;
  }

  readAnon() {
    return this.readObjnum();
  }

  readClocks() {
    const clockLine = this.readLine();
    const clockMatch = clockCountRe.exec(clockLine);
    if (!clockMatch || !clockMatch.groups) {
      this.parsingError("Could not find clock definitions");
    }
    const numClocks = parseInt(clockMatch.groups.count);
    for (let i = 0; i < numClocks; i++) {
      this.readClock();
    }
  }

  readClock() {
    /* Not implemented for newer database versions */
    this.readLine();
  }

  readTaskQueue(db: MooDatabase) {
    const queuedTasksLine = this.readLine();
    const queuedTasksMatch = taskCountRe.exec(queuedTasksLine);
    if (!queuedTasksMatch || !queuedTasksMatch.groups) {
      this.parsingError("Could not find task queue");
    }
    const numTasks = parseInt(queuedTasksMatch.groups.count);
    for (let i = 0; i < numTasks; i++) {
      this.readQueuedTask(db);
    }
  }

  readQueuedTask(db: MooDatabase) {
    const headerLine = this.readLine();
    const headerMatch = taskHeaderRe.exec(headerLine);
    if (!headerMatch) {
      this.parsingError("Could not find task header");
    }
    const firstLineno = parseInt(headerMatch[1]);
    const st = parseInt(headerMatch[2]);
    const id = parseInt(headerMatch[3]);
    const task = new QueuedTask(firstLineno, id, st);
    const activation = this.readActivation();
    task.activation = activation;
    task.rtEnv = this.readRTEnv();
    task.code = this.readCode();
    db.queuedTasks.push(task);
  }

  readActivation(): Activation {
    this.readValue();
    const headerLine = this.readLine();
    const headerMatch = activationHeaderRe.exec(headerLine);
    if (!headerMatch || headerMatch.length !== 6) {
      this.parsingError("Could not find activation header");
    }
    const activation = new Activation();
    activation.this = parseInt(headerMatch[1]);
    activation.player = parseInt(headerMatch[2]);
    activation.programmer = parseInt(headerMatch[3]);
    activation.vloc = parseInt(headerMatch[4]);
    activation.debug = Boolean(parseInt(headerMatch[5]));
    this.readString(); /* Was argstr*/
    this.readString(); /* Was dobjstr*/
    this.readString(); /* Was prepstr*/
    this.readString(); /* Was iobjstr*/
    activation.verb = this.readString();
    activation.verbname = this.readString();
    return activation;
  }

  readRTEnv() {
    const varCountLine = this.readLine();
    const varCountMatch = varCountRe.exec(varCountLine);
    if (!varCountMatch || !varCountMatch.groups) {
      this.parsingError("Could not find variable count for RT Env");
    }
    const varCount = parseInt(varCountMatch.groups.count);
    let rtEnv = {};
    for (let i = 0; i < varCount; i++) {
      const name = this.readLine();
      const value = this.readValue();
      // @ts-expect-error
      rtEnv[name] = value;
    }
    return rtEnv;
  }

  parsingError(message: string): never {
    const lineno = this.data.slice(0, this.pos).split("\n").length;
    throw new Error(`Database parse error on line   ${lineno}: ${message}`);
  }


  readPending(db: MooDatabase) {
    const valueLine = this.readLine()
    const valueMatch = pendingValueRe.exec(valueLine)
    if (!valueMatch || !valueMatch.groups) {
      this.parsingError('Bad pending finalizations');
    }
    const finalizationCount = parseInt(valueMatch.groups.count)
    for (let i = 0; i < finalizationCount; i++) {
      this.readPendingValue(db);
    }
  }

  //@ts-expect-error
  readPendingValue(db: MooDatabase) {
    return this.readValue();
  }


  readSuspendedTasks(db: MooDatabase) {
    const valueLine = this.readLine()
    const suspendedMatch = suspendedTaskCountRe.exec(valueLine);
    if (!suspendedMatch || !suspendedMatch.groups) {
      this.parsingError('Bad suspended tasks header')
    }
    const count = parseInt(suspendedMatch?.groups.count)
    for (let i = 0; i < count; i++) {
      const task = this.readSuspendedTask(db);
    }
  }

  readSuspendedTask(db: MooDatabase) {
    const headerLine = this.readLine();
    const taskMatch = suspendedTaskHeaderRe.exec(headerLine);
    if (!taskMatch || !taskMatch.groups) {
      this.parsingError('Bad suspended task header')
    }
    const id = parseInt(taskMatch.groups.id);
    const startTime = parseInt(taskMatch.groups.startTime);
    const task = new QueuedTask(0, id, startTime); // Set line number to 0 for a suspended task since we don't know it (only opcodes, not text)
    if (taskMatch.groups.value) {
      task.value = this.readValue();
    }
    db.queuedTasks.push(task);
  }

  read_vm(db: MooDatabase, id: number) {

  }

  readLine() {
    return this.readUntil("\n");
  }

  readUntil(text: string) {
    const pos = this.data.indexOf(text, this.pos);
    if (pos === -1) {
      this.parsingError(`Could not find ${text}`);
    }
    const result = this.data.substring(this.pos, pos);
    this.pos = pos + text.length;
    return result;
  }
}
