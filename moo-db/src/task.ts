import { Activation } from "./activation";

export class QueuedTask {
  activation?: Activation;
  rtEnv: {} = {};
  code: string[] = [];

  constructor(
    public firstLineno: number,
    public id: number,
    public startTime: number
  ) {}
}
