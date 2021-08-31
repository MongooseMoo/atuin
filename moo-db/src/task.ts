import { Activation } from "./activation";

export class QueuedTask {
  activation?: Activation;
  rtEnv: {} = {};
  constructor(
    public firstLineno: number,
    public id: number,
    public startTime: number
  ) {}
}
