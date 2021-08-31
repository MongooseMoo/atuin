import { Property } from "./property";
import { QueuedTask } from "./task";
import { Verb } from "./verb";

export type OID = number;

export class MooObject {
  constructor(
    public oid: OID,
    public name: string,
    public flags: number,
    public owner: OID,
    public location: OID,
    public parent: OID,
    public properties: Property[] = [],
    public verbs: Verb[] = []
  ) {}
}

export class MooDatabase {
  versionString: string = "";
  version: number = 0;
  totalObjects: number = 0;
  totalVerbs: number = 0;
  totalPlayers: number = 0;
  players: OID[] = [];
  objects: Map<OID, MooObject> = new Map();
  queuedTasks: QueuedTask[] = [];
}
