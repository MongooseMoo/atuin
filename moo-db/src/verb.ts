import { OID } from "./db";

export class Verb {
  constructor(
    public name: string,
    public owner: OID,
    public perms: number,
    public preposition: number,
    public code: string[] = [],
    public oid?: OID
  ) {}
}
