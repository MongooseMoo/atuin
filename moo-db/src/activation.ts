import { OID } from "./db";

export class Activation {
  public this: OID = -1;
  public player: OID = -1;
  public programmer: OID = -1;
  public vloc: number = -1;
  public debug: boolean = false;
  public verb: string = "";
  public verbname: string = "";
}
