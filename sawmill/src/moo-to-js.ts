import { generate } from "astring";
import {
  Assignment,
  ASTNode,
  Binary,
  Compare,
  Compound,
  Dictionary,
  FunctionCall,
  If,
  IntermediateTypes,
  List,
  Logical,
  MethodCall,
  Program,
  PropertyReference,
  Return,
  Subscript,
  Ternary,
  Unary,
  Value,
  Variable,
} from "./intermediate";

import { MooASTNode, parseMoocode } from "./parser";

export class MooToJavascriptConverter {
  opMap: any = {
    "==": "===",
    "<=": "<==",
    ">=": ">==",
    "!=": "!==",
  };

  nameMap: any = {
    typeof: "type_of",
  };

  constructor(public moocode: string[]) {}

  toJavascript() {
    return generate(this.toIntermediate().toEstree());
  }

  toIntermediate(): ASTNode {
    const tree = this.parse();
    return this.convertNode(tree);
  }

  convertNode(node: MooASTNode): ASTNode {
    if (node.type) {
      switch (node.type) {
        case "VAR":
          return this.convertVariable(node);
        case "SIGNED_INT":
          return new Value(IntermediateTypes.int, parseInt(node.value!));
        case "SIGNED_FLOAT":
          return new Value(IntermediateTypes.float, parseFloat(node.value!));
        case "ESCAPED_STRING":
          return new Value(IntermediateTypes.string, node.value!);
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }
    } else {
      switch (node.data) {
        case "start":
          return this.convertStart(node);
        case "block":
          return this.convertBlock(node);
        case "if":
          return this.convertIf(node);
        case "assignment":
          return this.convertAssignment(node);
        case "verb_call":
          return this.convertVerbCall(node);
        case "function_call":
          return this.convertFunctionCall(node);
        case "prop_ref":
          return this.convertPropRef(node);
        case "comparison":
          return this.convertComparison(node);
        case "unary_expression":
          return this.convertUnary(node);
        case "binary_expression":
          return this.convertBinary(node);
        case "logical_expression":
          return this.convertLogical(node);
        case "map":
          return this.convertMap(node);
        case "list":
          return this.convertList(node);
        case "ternary":
          return this.convertTernary(node);
        case "subscript":
          return this.convertSubscript(node);
        case "return":
          return this.convertReturn(node);
        default:
          throw new Error(
            `Unknown node type ${node.data} ${JSON.stringify(node.children)}`
          );
      }
    }
  }

  convertVariable(node: MooASTNode): ASTNode {
    const name = node.value!;
    const validName = this.nameMap[name] || name;
    return new Variable(validName);
  }

  convertPropRef(node: MooASTNode): ASTNode {
    const obj = this.convertNode(node.children[0]);
    const prop = this.convertNode(node.children[1]);
    return new PropertyReference(obj, prop);
  }

  convertUnary(node: MooASTNode): ASTNode {
    const op = node.children[0].children[0].value!;
    const value = this.convertNode(node.children[1]);
    return new Unary(op, value);
  }

  convertBinary(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Binary(left, operator.value!, right);
  }

  convertLogical(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Logical(left, operator.value!, right);
  }

  convertFunctionCall(node: MooASTNode): ASTNode {
    const name = this.convertNode(node.children[0]);
    const args = node.children[1].children.map((child) =>
      this.convertNode(child)
    );
    return new FunctionCall(name, args);
  }

  convertStart(node: MooASTNode): ASTNode {
    return new Program(
      node.children[0].children.map((child) => this.convertNode(child))
    );
  }

  convertComparison(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);

    const convertedOp = this.opMap[operator.value!] || operator.value!;
    return new Compare(left, convertedOp, right);
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

  convertBlock(node: MooASTNode) {
    const block = new Compound();
    block.body = node.children.map((child) => this.convertNode(child));
    return block;
  }

  convertMap(node: MooASTNode): ASTNode {
    const entries: [ASTNode, ASTNode][] = node.children.map((child) => {
      return [
        this.convertNode(child.children[0]),
        this.convertNode(child.children[1]),
      ];
    });
    return new Dictionary(entries);
  }

  convertList(node: MooASTNode): ASTNode {
    const entries: ASTNode[] = node.children.map((child) => {
      return this.convertNode(child);
    });
    return new List(entries);
  }

  convertTernary(node: MooASTNode): ASTNode {
    const condition = this.convertNode(node.children[0]);
    const consequent = this.convertNode(node.children[1]);
    const alternate = this.convertNode(node.children[2]);
    return new Ternary(condition, consequent, alternate);
  }

  convertReturn(node: MooASTNode): ASTNode {
    return new Return(this.convertNode(node.children[0]));
  }

  convertSubscript(node: MooASTNode): ASTNode {
    return new Subscript(
      this.convertNode(node.children[0]),
      this.convertNode(node.children[1])
    );
  }

  parse() {
    return parseMoocode(this.moocode);
  }
}

export function test() {
  const code = `id = this:get_free_entry();
  if (id == 0)
  return 0;
  endif
  if (((!(player in connected_players())) || (!$object_utils:has_property(player, "name"))) || (typeof(player.name) != STR))
  return -2;
  endif
  connection = this:net_open(this.irc_server, this.irc_server_port);
  if (typeof(connection) == ERR)
  return -1;
  endif
  this:log_use(caller, start_time = time());
  this:net_notify(connection, ((((((((((("USER " + this.irc_user) + " ") + $network.site) + " ") + this.irc_server) + " :") + this.irc_realname) + " for ") + tostr(player)) + " (") + player.name) + ")");
  nick = (length(player.name) > 8) ? player.name[1..8] | player.name;
  this:net_notify(connection, "NICK " + nick);
  this:net_notify(connection, ("MODE " + nick) + " :-i");
  `;
  const Transpiler = new MooToJavascriptConverter([code]);
  //const result = Transpiler.toIntermediate();
  const result = Transpiler.toJavascript();
  //console.dir(result, { depth: null, maxArrayLength: null });
  console.log(result);
}

test();
