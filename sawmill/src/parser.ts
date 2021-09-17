import { get_parser } from "./mooparser";

const mooParser = get_parser({ propagate_positions: true });

export interface MooASTNode {
  data: string;
  children: this[];
  type?: string;
  value?: string;
  start_pos: number;
  end_pos: number;
  line: number;
  end_line: number;
  column: number;
  end_column: number;
}

export function parseMoocode(moocode: string[]) {
  const code = moocode.join("\n");
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
