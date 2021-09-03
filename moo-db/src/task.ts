import { Activation } from "./activation";
import { MooTypes, TaskType } from "./mootypes";

export interface VMData {
  activationStack?: Activation[];
  top?: number;
  vector?: number;
  funcId?: number;
  maxStackframes?: number;
}


export class QueuedTask {
  activation?: Activation;
  activation_stack: Activation[] = [];
  rtEnv: {} = {};
  code: string[] = [];
  local: any = {};
  value: any = MooTypes.CLEAR;
  vmData: VMData = { 'maxStackframes': 50 };
  // toaststunt adds one to top when creating VM
  state: TaskType = TaskType.QUEUED; // Default tasks to queued state
  constructor(
    public firstLineno: number,
    public id: number,
    public startTime: number
  ) { }
}

