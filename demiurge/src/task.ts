import { VM } from "vm2";
import { WorldObject } from "./object";

export type TID = number;

export class Task {
  public startTime: number = 0;

  constructor(public id: TID, public owner: WorldObject, public vm: VM) {}
}
