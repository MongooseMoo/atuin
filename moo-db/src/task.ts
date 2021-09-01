import { Activation } from "./activation";
import { MooTypes, TaskType } from "./mootypes";


export class QueuedTask {
  activation?: Activation;
  rtEnv: {} = {};
  code: string[] = [];
  value: any = MooTypes.CLEAR;
  state: TaskType = TaskType.QUEUED; // Default tasks to queued state
  constructor(
    public firstLineno: number,
    public id: number,
    public startTime: number
  ) { }
}

