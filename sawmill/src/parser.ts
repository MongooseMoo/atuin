import { parse } from "path/posix";
import { get_parser } from "./mooparser";

const mooParser = get_parser();

export interface MooASTNode {
  data: string;
  children: this[];
  type?: string;
  value?: string;
}

export function parseMoocode(moocode: string[]) {
  const code = moocode.join("\n");
  console.log(code);
  const parseTree = mooParser.parse(code);
  return parseTree;
}

export function test() {
  const code = [
    `x = 1;`,
    `if (x==1)`,
    `player:tell("Test successful!");`,
    `endif`,
  ];
  const tree = parseMoocode(code);
  console.dir(tree, { depth: null, maxArrayLength: null });
}