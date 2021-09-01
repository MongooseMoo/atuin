import { generate } from "astring";
import {
  Assignment,
  ASTNode,
  Compare,
  Compound,
  FunctionCall,
  If,
  IntermediateTypes,
  MethodCall,
  Program,
  Value,
  Variable,
} from "./intermediate";

import { MooASTNode, parseMoocode } from "./parser";

export class MooToJavascriptConverter {
  constructor(public moocode: string[]) {}

  toJavascript() {
    return generate(this.toIntermediate().toEstree());
  }

  toIntermediate(): ASTNode {
    const tree = this.parse();
    return this.convertNode(tree);
  }

  convertNode(node: MooASTNode): ASTNode {
    switch (node.type) {
      case "VAR":
        return new Variable(node.value!);
      case "SIGNED_INT":
        return new Value(IntermediateTypes.int, parseInt(node.value!));
      case "ESCAPED_STRING":
        return new Value(IntermediateTypes.string, node.value!);
    }
    switch (node.data) {
      case "start":
        return this.convertStart(node);
      case "if":
        return this.convertIf(node);
      case "assignment":
        return this.convertAssignment(node);
      case "verb_call":
        return this.convertVerbCall(node);
      case "statement":
        return this.convertNode(node.children[0]);
      case "expression":
        return this.convertNode(node.children[0]);
      case "comparison":
        return this.convertComparison(node);
      default:
        throw new Error(
          `Unknown node type ${node.data} ${JSON.stringify(node.children)}`
        );
    }
  }

  convertComparison(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1];
    const right = this.convertNode(node.children[2]);
    return new Compare(left, operator.value!, right);
  }

  convertIf(node: MooASTNode): ASTNode {
    const condition = this.convertNode(node.children[0]) as Compare;
    const consequent = this.convertNode(node.children[1]);
    let alternate: ASTNode | undefined;
    if (node.children.length === 3) {
      alternate = this.convertNode(node.children[2]);
    }
    return new If(condition, consequent);
  }

  convertAssignment(node: MooASTNode) {
    const left = this.convertNode(node.children[0]);
    const right = this.convertNode(node.children[1]);
    return new Assignment(left, "=", right);
  }

  convertVerbCall(node: MooASTNode) {
    const obj = this.convertNode(node.children[0]);
    const name = this.convertNode(node.children[1]);
    const args = node.children[2].children.map((child) =>
      this.convertNode(child)
    );
    return new MethodCall(obj, name, args);
  }

  convertStart(node: MooASTNode) {
    const block = new Compound();
    block.body = node.children.map((child) => this.convertNode(child));
    return block;
  }

  parse() {
    return parseMoocode(this.moocode);
  }
}

export function test() {
  const code = [
    `x = 1;`,
    `if (x==1)`,
    `player:tell("Test successful!");`,
    `endif`,
  ];
  const Transpiler = new MooToJavascriptConverter(code);
  const result = Transpiler.toJavascript();
  console.dir(result, { depth: null, maxArrayLength: null });
}

test();
