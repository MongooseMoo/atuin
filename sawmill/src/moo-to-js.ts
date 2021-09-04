import { generate } from "astring";
import {
  Assignment,
  ASTNode,
  Binary,
  Compare,
  Compound,
  Dictionary,
  ForInLoop,
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
  TryExpression,
  Unary,
  Value,
  Variable,
  WhileLoop,
} from "./intermediate";
import { MooASTNode, parseMoocode } from "./parser";

export interface ConvertContext {
  canDeclare: boolean; // can declare variables
}

function noDeclaration(
  object: MooToJavascriptConverter,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    object.context.canDeclare = false;
    const result = original.apply(this, args);
    object.context.canDeclare = true;
    return result;
  };
}

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

  public context: ConvertContext = { canDeclare: true };

  constructor(public moocode: string[]) {}

  toJavascript() {
    return generate(this.toIntermediate().toEstree(), {
      sourceMap: true,
      comments: true,
    });
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
        case "for":
          return this.convertForIn(node);
        case "while":
          return this.convertWhile(node);
        case "assignment":
          return this.convertAssignment(node);
        case "verb_call":
          return this.convertVerbCall(node);
        case "function_call":
          return this.convertFunctionCall(node);
        case "compact_try":
          return this.convertCompactTry(node);
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

  convertCompactTry(node: MooASTNode): ASTNode {
    const hasErrorType = node.children.length === 3;
    if (!hasErrorType) {
      return new TryExpression(
        this.convertNode(node.children[0]),
        this.convertNode(node.children[1])
      );
    }
    return new TryExpression(
      this.convertNode(node.children[0]),
      this.convertNode(node.children[1]),
      this.convertNode(node.children[2])
    );
  }

  convertWhile(node: MooASTNode): ASTNode {
    const condition = this.convertNode(node.children[0]);
    const body = this.convertNode(node.children[1]);
    return new WhileLoop(condition, body);
  }

  convertVariable(node: MooASTNode): ASTNode {
    const name = node.value!;
    const validName = this.nameMap[name] || name;
    return new Variable(validName);
  }

  @noDeclaration
  convertPropRef(node: MooASTNode): ASTNode {
    const obj = this.convertNode(node.children[0]);
    const prop = this.convertNode(node.children[1]);

    return new PropertyReference(obj, prop);
  }

  @noDeclaration
  convertUnary(node: MooASTNode): ASTNode {
    const op = node.children[0].children[0].value!;
    const value = this.convertNode(node.children[1]);
    return new Unary(op, value);
  }

  @noDeclaration
  convertBinary(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Binary(left, operator.value!, right);
  }

  @noDeclaration
  convertLogical(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Logical(left, operator.value!, right);
  }

  @noDeclaration
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

  @noDeclaration
  convertComparison(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    const convertedOp = this.opMap[operator.value!] || operator.value!;
    return new Compare(left, convertedOp, right);
  }

  convertIf(node: MooASTNode): ASTNode {
    const canDeclareVariables = this.context.canDeclare;
    this.context.canDeclare = false;
    const condition = this.convertNode(node.children[0]) as Compare;
    this.context.canDeclare = canDeclareVariables;
    const consequent = this.convertNode(node.children[1]);
    let alternate: ASTNode | undefined;
    if (node.children.length === 3) {
      alternate = this.convertNode(node.children[2].children[0]);
    }
    return new If(condition, consequent, alternate);
  }

  convertForIn(node: MooASTNode): ASTNode {
    const canDeclareVariables = this.context.canDeclare;
    this.context.canDeclare = false;
    const variable = this.convertNode(node.children[0]);
    const list = this.convertNode(node.children[1]);
    this.context.canDeclare = canDeclareVariables;
    const body = this.convertNode(node.children[2]);
    return new ForInLoop(variable, list, body);
  }

  convertAssignment(node: MooASTNode) {
    const canDeclare = this.context.canDeclare;
    this.context.canDeclare = false;
    const left = this.convertNode(node.children[0]);
    const right = this.convertNode(node.children[1]);
    this.context.canDeclare = canDeclare;
    return new Assignment(left, "=", right, canDeclare);
  }

  @noDeclaration
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

  @noDeclaration
  convertMap(node: MooASTNode): ASTNode {
    const entries: [ASTNode, ASTNode][] = node.children.map((child) => {
      return [
        this.convertNode(child.children[0]),
        this.convertNode(child.children[1]),
      ];
    });
    return new Dictionary(entries);
  }

  @noDeclaration
  convertList(node: MooASTNode): ASTNode {
    const entries: ASTNode[] = node.children.map((child) => {
      return this.convertNode(child);
    });
    return new List(entries);
  }

  @noDeclaration
  convertTernary(node: MooASTNode): ASTNode {
    const condition = this.convertNode(node.children[0]);
    const consequent = this.convertNode(node.children[1]);
    const alternate = this.convertNode(node.children[2]);
    return new Ternary(condition, consequent, alternate);
  }

  @noDeclaration
  convertReturn(node: MooASTNode): ASTNode {
    const value = node.children[0];
    const toReturn = value ? this.convertNode(value) : undefined;
    return new Return(toReturn);
  }

  @noDeclaration
  convertSubscript(node: MooASTNode): ASTNode {
    const obj = this.convertNode(node.children[0]);
    const subscript = this.convertNode(node.children[1]);
    return new Subscript(obj, obj);
  }

  parse() {
    return parseMoocode(this.moocode);
  }
}

export function test() {
  const code = `"'find_verb (<name>)' - Search for a verb with the given name. The objects searched are those returned by this:find_verbs_on(). The printing order relies on $list_utils:remove_duplicates to leave the *first* copy of each duplicated element in a list; for example, {1, 2, 1} -> {1, 2}, not to {2, 1}.";
  name = args[1];
  results = "";
  objects = $list_utils:remove_duplicates(this:find_verbs_on());
  for thing in (objects)
  if (valid(thing) && (mom = $object_utils:has_verb(thing, name)))
  results = ((((results + "   ") + thing.name) + "(") + tostr(thing)) + ")";
  mom = mom[1];
  if (thing != mom)
  results = ((((results + "--") + mom.name) + "(") + tostr(mom)) + ")";
  endif
  endif
  endfor
  if (results)
  this:tell("The verb :", name, " is on", results);
  else
  this:tell("The verb :", name, " is nowhere to be found.");
  endif
  `;

  const Transpiler = new MooToJavascriptConverter([code]);
  // const result = Transpiler.toIntermediate();
  const result = Transpiler.toJavascript();
  // console.dir(result, { depth: null, maxArrayLength: null });
  console.log(result);
}

test();
