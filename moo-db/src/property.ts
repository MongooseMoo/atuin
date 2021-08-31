import { OID } from "./db";

export class Property {
  constructor(
    public name: string | undefined,
    public value: any,
    public owner: OID,
    public permissions: number
  ) {}
}
