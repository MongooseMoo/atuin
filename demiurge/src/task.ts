import { getParsedCommandLineOfConfigFile } from "typescript";
import { VM } from "vm2";
import { WorldObject } from "./object";

export type TID = number;

export enum TaskStatus {
  pending,
  running,
  finished,
}

export class Task {
  public startTime: number = 0;
  public result: any = undefined;
  public status: TaskStatus = TaskStatus.pending;

  constructor(public id: TID, public owner: WorldObject) {}
}
