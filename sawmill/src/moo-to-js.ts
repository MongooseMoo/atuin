import { SourceLocation } from "acorn";
import { generate } from "astring";
import { builders } from "estree-toolkit";
import {
  Assignment,
  ASTNode,
  Binary,
  Break,
  Compare,
  Compound,
  Continue,
  Dictionary,
  ExceptBlock,
  FinallyBlock,
  ForInLoop,
  FunctionCall,
  If,
  IntermediateTypes,
  List,
  Logical,
  MethodCall,
  ObjectReference,
  Program,
  PropertyReference,
  Return,
  ScatterNames,
  Spread,
  Subscript,
  Ternary,
  TryCatch,
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

const context: ConvertContext = { canDeclare: true };

function noDeclaration(
  _object: any,
  _propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    const canDeclare = context.canDeclare;
    context.canDeclare = false;
    const result = original.apply(this, args);
    context.canDeclare = canDeclare;
    return result;
  };
}

export class MooToJavascriptConverter {
  opMap: any = {
    "==": "===",
    "!=": "!==",
  };

  nameMap: any = {
    typeof: "type_of",
  };

  constructor(public moocode: string[]) {}

  toJavascript() {
    return generate(this.toIntermediate().toEstree(), {
      sourceMap: true,
      comments: true,
    });
  }

  toIntermediate(): ASTNode {
    if (!this.moocode.length) {
      return new Program([]);
    }
    const tree = this.parse();
    return this.convertNode(tree);
  }

  convertNode(node: MooASTNode): ASTNode {
    if (!node) {
      throw new Error("node is undefined");
    }
    if (node.type) {
      switch (node.type) {
        case "VAR":
          return this.convertVariable(node);
        case "SIGNED_INT":
          return new Value(IntermediateTypes.int, parseInt(node.value!));
        case "SIGNED_FLOAT":
          return new Value(IntermediateTypes.float, parseFloat(node.value!));
        case "ESCAPED_STRING":
          return new Value(
            IntermediateTypes.string,
            node.value!.slice(1, node.value!.length - 1)
          );
        case "OBJ_NUM":
          return this.convertObjNum(node);
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
        case "scatter_assignment":
          return this.convertAssignment(node);
        case "verb_call":
          return this.convertVerbCall(node);
        case "function_call":
          return this.convertFunctionCall(node);
        case "try":
          return this.convertTry(node);
        case "except_block":
          return this.convertExcept(node);
        case "finally_block":
          return this.convertFinally(node);
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
        case "scatter_names":
          return this.convertScatterNames(node);
        case "ternary":
          return this.convertTernary(node);
        case "subscript":
          return this.convertSubscript(node);
        case "spread":
          return this.convertSpread(node);
        case "break":
          return this.convertBreak(node);
        case "continue":
          return this.convertContinue(node);
        case "return":
          return this.convertReturn(node);
        default:
          throw new Error(
            `Unknown node type ${node.data} ${JSON.stringify(node.children)}`
          );
      }
    }
  }

  convertObjNum(node: MooASTNode): ASTNode {
    return new ObjectReference(
      parseInt(node.value!.slice(1)),
      this.sourceLocation(node)
    );
  }

  convertScatterNames(node: MooASTNode): ASTNode {
    const names = node.children.map((child) => this.convertNode(child));
    //@ts-expect-error
    return new ScatterNames(names, this.sourceLocation(node));
  }

  convertContinue(node: MooASTNode): Continue {
    return new Continue(undefined, this.sourceLocation(node));
  }

  convertBreak(node: MooASTNode): Break {
    return new Break(undefined, this.sourceLocation(node));
  }

  @noDeclaration
  convertCompactTry(node: MooASTNode): TryExpression {
    const hasErrorType = node.children.length === 3;
    if (!hasErrorType) {
      return new TryExpression(
        this.convertNode(node.children[0]),
        undefined,
        this.convertNode(node.children[1]),
        this.sourceLocation(node)
      );
    }
    return new TryExpression(
      this.convertNode(node.children[0]),
      this.convertNode(node.children[2]),
      this.convertNode(node.children[1]),
      this.sourceLocation(node)
    );
  }

  sourceLocation(node: MooASTNode): SourceLocation {
    return {
      start: { offset: node.start_pos, line: node.line, column: node.column },
      end: {
        offset: node.end_pos,
        line: node.end_line,
        column: node.end_column,
      },
    };
  }

  convertWhile(node: MooASTNode): WhileLoop {
    const condition = this.convertNode(node.children[0]);
    const body = this.convertNode(node.children[1]);
    return new WhileLoop(condition, body, this.sourceLocation(node));
  }

  convertVariable(node: MooASTNode): Variable {
    const name = node.value!;
    const validName = this.nameMap[name] || name;
    return new Variable(validName, this.sourceLocation(node));
  }

  @noDeclaration
  convertPropRef(node: MooASTNode): PropertyReference {
    const obj = this.convertNode(node.children[0]);
    const prop = this.convertNode(node.children[1]);
    return new PropertyReference(obj, prop, this.sourceLocation(node));
  }

  @noDeclaration
  convertUnary(node: MooASTNode): Unary {
    const op = node.children[0].children[0].value!;
    const value = this.convertNode(node.children[1]);
    return new Unary(op, value, this.sourceLocation(node));
  }

  @noDeclaration
  convertBinary(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Binary(left, operator.value!, right, this.sourceLocation(node));
  }

  @noDeclaration
  convertLogical(node: MooASTNode): ASTNode {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    return new Logical(left, operator.value!, right, this.sourceLocation(node));
  }

  @noDeclaration
  convertFunctionCall(node: MooASTNode): FunctionCall {
    const name = this.convertNode(node.children[0]);
    const args = node.children[1].children.map((child) =>
      this.convertNode(child)
    );
    return new FunctionCall(name, args, this.sourceLocation(node));
  }

  convertStart(node: MooASTNode): Program {
    return new Program(
      node.children[0].children.map((child) => this.convertNode(child)),
      this.sourceLocation(node)
    );
  }

  @noDeclaration
  convertComparison(node: MooASTNode): Compare {
    const left = this.convertNode(node.children[0]);
    const operator = node.children[1].children[0];
    const right = this.convertNode(node.children[2]);
    const convertedOp = this.opMap[operator.value!] || operator.value!;
    return new Compare(left, convertedOp, right, this.sourceLocation(node));
  }

  @noDeclaration
  convertIf(node: MooASTNode): If {
    const condition = this.convertNode(node.children[0]) as Compare;
    let consequent, alternate;
    const elseIfs: If[] = [];

    node.children.slice(1).forEach((child) => {
      if (child.data === "block") {
        consequent = this.convertNode(child);
      } else if (child.data === "elseif") {
        elseIfs.push(this.convertIf(child));
      } else if (child.data === "else") {
        alternate = this.convertNode(child.children[0]);
      } else {
        throw new Error(`Unknown if child ${child.data}`);
      }
    });

    return new If(
      condition,
      consequent,
      elseIfs,
      alternate,
      this.sourceLocation(node)
    );
  }

  @noDeclaration
  convertForIn(node: MooASTNode): ForInLoop {
    const variable = this.convertNode(node.children[0]);
    const list = this.convertNode(node.children[1]);
    const body = this.convertNode(node.children[2]);
    return new ForInLoop(variable, list, body, this.sourceLocation(node));
  }

  convertAssignment(node: MooASTNode): Assignment {
    const canDeclare = context.canDeclare;
    context.canDeclare = false;
    const left = this.convertNode(node.children[0]);
    const right = this.convertNode(node.children[1]);
    context.canDeclare = canDeclare;
    return new Assignment(
      left,
      "=",
      right,
      canDeclare,
      this.sourceLocation(node)
    );
  }

  @noDeclaration
  convertVerbCall(node: MooASTNode): MethodCall {
    const obj = this.convertNode(node.children[0]);
    const name = this.convertNode(node.children[1]);
    const args = node.children[2].children.map((child) =>
      this.convertNode(child)
    );
    return new MethodCall(obj, name, args, this.sourceLocation(node));
  }

  convertBlock(node: MooASTNode): Compound {
    const body = node.children.map((child) => this.convertNode(child));
    return new Compound(body, this.sourceLocation(node));
  }

  @noDeclaration
  convertMap(node: MooASTNode): Dictionary {
    const entries: [ASTNode, ASTNode][] = node.children.map((child) => {
      return [
        this.convertNode(child.children[0]),
        this.convertNode(child.children[1]),
      ];
    });
    return new Dictionary(entries, this.sourceLocation(node));
  }

  @noDeclaration
  convertList(node: MooASTNode): List {
    const entries: ASTNode[] = node.children.map((child) => {
      return this.convertNode(child);
    });
    return new List(entries, this.sourceLocation(node));
  }

  @noDeclaration
  convertTernary(node: MooASTNode): Ternary {
    const condition = this.convertNode(node.children[0]);
    const consequent = this.convertNode(node.children[1]);
    const alternate = this.convertNode(node.children[2]);
    return new Ternary(
      condition,
      consequent,
      alternate,
      this.sourceLocation(node)
    );
  }

  @noDeclaration
  convertReturn(node: MooASTNode): Return {
    const value = node.children[0];
    const toReturn = value ? this.convertNode(value) : undefined;
    return new Return(toReturn, this.sourceLocation(node));
  }

  @noDeclaration
  convertSubscript(node: MooASTNode): Subscript {
    const obj = this.convertNode(node.children[0]);
    const subscript = this.convertNode(node.children[1]);
    return new Subscript(obj, subscript, this.sourceLocation(node));
  }

  convertSpread(node: MooASTNode): Spread {
    return new Spread(this.convertNode(node.children[1]));
  }

  convertTry(node: MooASTNode): TryCatch {
    let body;
    if (node.children.length) {
      body = this.convertNode(node.children[0]);
    }
    let catchBlocks: ExceptBlock[] = [];
    let finallyBlock: ASTNode | undefined;
    node.children.slice(1).forEach((child) => {
      let converted = this.convertNode(child);
      if (converted instanceof ExceptBlock) {
        catchBlocks.push(converted);
      } else if (converted instanceof FinallyBlock) {
        finallyBlock = converted;
      }
    });
    return new TryCatch(
      body,
      catchBlocks,
      finallyBlock,
      this.sourceLocation(node)
    );
  }

  convertFinally(node: MooASTNode): FinallyBlock {
    return new FinallyBlock(
      this.convertNode(node.children[0]),
      this.sourceLocation(node)
    );
  }

  convertExcept(node: MooASTNode): ExceptBlock {
    let exceptionType, exceptionVariable, body;
    if (node.children.length) {
      const exceptClause = node.children[0];
      if (exceptClause.children.length) {
        exceptionType = this.convertNode(exceptClause.children[0]);
      }
      if (exceptClause.children.length > 1) {
        exceptionVariable = this.convertNode(
          exceptClause.children[1]
        ) as Variable;
      }
      if (node.children.length > 1) {
        body = this.convertNode(node.children[1]);
      }
    }
    return new ExceptBlock(
      exceptionType,
      exceptionVariable,
      body,
      this.sourceLocation(node)
    );
  }

  parse() {
    return parseMoocode(this.moocode);
  }
}
