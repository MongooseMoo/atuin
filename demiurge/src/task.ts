import { WorldObject } from "./object";

export type TID = number;

export class TaskKilled extends Error {}

export enum TaskStatus {
  pending,
  running,
  finished,
  killed,
}

export class Task {
  public startTime: number = 0;
  public result: any = undefined;
  public status: TaskStatus = TaskStatus.pending;

  constructor(public id: TID, public owner: WorldObject) {}
}
