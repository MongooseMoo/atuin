import { SourceLocation } from "acorn";
import {
  AssignmentOperator,
  BinaryOperator,
  Identifier,
  LogicalOperator,
  UnaryOperator,
} from "estree";
import { builders, types } from "estree-toolkit";

export enum IntermediateTypes {
  unknown = "unknown",
  float = "float",
  int = "int",
  string = "string",
}

const LOG = false;

function logCall(
  object: Object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any) {
    if (LOG) {
      console.log(`${object.constructor.name} ${String(propertyKey)}(${args})`);
    }
    return originalMethod.apply(this, args);
  };
}

export class Value {
  isExpression = true;
  constructor(
    public type: IntermediateTypes = IntermediateTypes.unknown,
    public value: any = undefined,
    public loc: SourceLocation | null = null
  ) {}

  @logCall
  toEstree() {
    return builders.literal(this.value);
  }
}

export abstract class ASTNode {
  parent?: ASTNode | null = null;
  loc: SourceLocation | null = null;
  isExpression: boolean = false;
  abstract toEstree(): any;
}

export class Return extends ASTNode {
  constructor(
    public value?: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    if (value) {
      value.parent = this;
    }
  }

  @logCall
  toEstree() {
    const value = this.value ? this.value.toEstree() : undefined;
    return builders.returnStatement(value);
  }
}

export class If extends ASTNode {
  constructor(
    public condition: Compare,
    public then?: ASTNode,
    public elseIfs: If[] = [],
    public elseDo?: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    condition.parent = this;
    then && (then.parent = this);
    elseIfs.forEach((ifNode) => {
      ifNode.parent = this;
    });
    elseDo && (elseDo.parent = this);
  }

  @logCall
  toEstree() {
    return builders.ifStatement(
      this.condition.toEstree(),
      this.then?.toEstree() || builders.blockStatement([]),
      this.buildElseBlockEstree()
    );
  }

  buildElseBlockEstree(): any {
    if (this.elseIfs.length) {
      if (this.elseDo) {
        // else ifs + else
        return builders.blockStatement([
          ...this.elseIfs.map((ifNode) => ifNode.toEstree()),
          this.elseDo.toEstree(),
        ]);
      } else {
        // else ifs only
        return builders.blockStatement(
          this.elseIfs.map((ifNode) => ifNode.toEstree())
        );
      }
    } else {
      return this.elseDo?.toEstree() || null;
    }
  }
}

export class Assignment extends ASTNode {
  constructor(
    public lhs: ASTNode,
    public op: string,
    public rhs: ASTNode,
    public declare: boolean,
    public override loc: SourceLocation | null = null
  ) {
    super();
    lhs.parent = this;
    rhs.parent = this;
    this.isExpression = !declare;
  }

  @logCall
  toEstree() {
    if (this.declare) {
      return builders.variableDeclaration("let", [
        builders.variableDeclarator(this.lhs.toEstree(), this.rhs.toEstree()),
      ]);
    }
    return builders.assignmentExpression(
      this.op as AssignmentOperator,
      this.lhs.toEstree(),
      this.rhs.toEstree()
    );
  }
}

export class Unary extends ASTNode {
  override isExpression = true;
  constructor(
    public op: string,
    public rhs: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    rhs.parent = this;
  }

  @logCall
  toEstree() {
    return builders.unaryExpression(
      this.op as UnaryOperator,
      this.rhs.toEstree(),
      true
    );
  }
}

export class Binary extends ASTNode {
  override isExpression = true;
  constructor(
    public lhs: ASTNode,
    public op: string,
    public rhs: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    lhs.parent = this;
    rhs.parent = this;
  }

  @logCall
  toEstree() {
    return builders.binaryExpression(
      this.op as BinaryOperator,
      this.lhs.toEstree(),
      this.rhs.toEstree()
    );
  }
}

export class Logical extends ASTNode {
  override isExpression = true;
  constructor(
    public lhs: ASTNode,
    public op: string,
    public rhs: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    lhs.parent = this;
    rhs.parent = this;
  }

  @logCall
  toEstree() {
    return builders.logicalExpression(
      this.op as LogicalOperator,
      this.lhs.toEstree(),
      this.rhs.toEstree()
    );
  }
}

export class WhileLoop extends ASTNode {
  constructor(
    public condition: ASTNode,
    public body: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    condition.parent = this;
    body.parent = this;
  }

  @logCall
  toEstree() {
    return builders.whileStatement(
      this.condition.toEstree(),
      this.body.toEstree()
    );
  }
}

export class Program extends ASTNode {
  constructor(
    public body: ASTNode[] = [],
    public override loc: SourceLocation | null = null
  ) {
    super();
    body.forEach((node) => (node.parent = this));
  }

  @logCall
  toEstree() {
    return builders.program(
      this.body.map((node) => {
        if (node.isExpression) {
          return builders.expressionStatement(node.toEstree());
        } else {
          return node.toEstree();
        }
      }),

      "script"
    );
  }

  toMoo(): string[] {
    //@ts-expect-error
    return this.body.map((node) => `${node.toMoo && node.toMoo()};`);
  }
}

export class MethodCall extends ASTNode {
  override isExpression = true;
  constructor(
    public obj: ASTNode,
    public method: ASTNode,
    public args: ASTNode[],
    public override loc: SourceLocation | null = null
  ) {
    super();
    obj.parent = this;
    method.parent = this;
    args.map((arg) => (arg.parent = this));
  }

  @logCall
  toEstree() {
    return builders.callExpression(
      builders.memberExpression(this.obj.toEstree(), this.method.toEstree()),
      this.args.map((arg) => arg.toEstree())
    );
  }
}

export class FunctionCall extends ASTNode {
  override isExpression = true;
  constructor(
    public callee: ASTNode,
    public args: ASTNode[],
    public override loc: SourceLocation | null = null
  ) {
    super();
    callee.parent = this;
    args.map((arg) => (arg.parent = this));
  }

  @logCall
  toEstree() {
    return builders.callExpression(
      this.callee.toEstree(),
      this.args.map((arg) => arg.toEstree())
    );
  }
}

export class TryCatch extends ASTNode {
  constructor(
    public tryBlock: ASTNode | null = null,
    public exceptBlocks: ExceptBlock[] = [],
    public finallyBlock: ASTNode | null = null,
    public override loc: SourceLocation | null = null
  ) {
    super();
    tryBlock && (tryBlock.parent = this);
    exceptBlocks.map((block) => (block.parent = this));
    finallyBlock && (finallyBlock.parent = this);
  }

  @logCall
  toEstree() {
    return builders.tryStatement(
      this.tryBlock?.toEstree() || builders.blockStatement([]),
      this.catchBlockEstree(),
      this.finallyBlock?.toEstree()
    );
  }

  catchBlockEstree() {
    if (this.exceptBlocks.length === 0) {
      // In Javascript every try must have at least one except
      return builders.catchClause(null, builders.blockStatement([]));
    }
    return this.exceptBlocks[0].toEstree();
  }
}

export class ForInLoop extends ASTNode {
  constructor(
    public variable: ASTNode,
    public collection: ASTNode,
    public body: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    variable.parent = this;
    collection.parent = this;
    body.parent = this;
  }

  @logCall
  toEstree() {
    return builders.forInStatement(
      this.variable.toEstree(),
      this.collection.toEstree(),
      this.body.toEstree()
    );
  }
}

export class Compound extends ASTNode {
  constructor(
    public body: ASTNode[] = [],
    public override loc: SourceLocation | null = null
  ) {
    super();
    body.forEach((node) => (node.parent = this));
  }

  @logCall
  toEstree() {
    const result = builders.blockStatement(
      this.body.map((node) => {
        if (node instanceof Value && node.type === IntermediateTypes.string) {
          // would like to do comment generation
          return builders.expressionStatement(node.toEstree());
        }
        if (node.isExpression) {
          return builders.expressionStatement(node.toEstree());
        } else {
          return node.toEstree();
        }
      })
    );
    return result;
  }
}

export class Compare extends ASTNode {
  override isExpression = true;
  constructor(
    public lhs: ASTNode,
    public op: string,
    public rhs: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    lhs.parent = this;
    rhs.parent = this;
  }

  @logCall
  toEstree() {
    return builders.binaryExpression(
      this.op as BinaryOperator,
      this.lhs.toEstree(),
      this.rhs.toEstree()
    );
  }
}

export class Variable extends ASTNode {
  override isExpression = true;

  constructor(
    public name: string,
    public override loc: SourceLocation | null = null
  ) {
    super();
  }

  @logCall
  toEstree() {
    if (this.name === "this") {
      return builders.thisExpression();
    }
    return builders.identifier(this.name);
  }
}

export class PropertyReference extends ASTNode {
  override isExpression = true;
  constructor(
    public obj: ASTNode,
    public prop: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    obj.parent = this;
    prop.parent = this;
  }

  @logCall
  toEstree() {
    return builders.memberExpression(
      this.obj.toEstree(),
      this.prop.toEstree(),
      this.isComputed()
    );
  }

  isComputed() {
    return !(this.prop instanceof Variable);
  }
}

export class List extends ASTNode {
  override isExpression = true;
  constructor(
    public items: ASTNode[],
    public override loc: SourceLocation | null = null
  ) {
    super();
    items.map((item) => (item.parent = this));
  }

  @logCall
  toEstree() {
    return builders.arrayExpression(this.items.map((item) => item.toEstree()));
  }
}

export class Dictionary extends ASTNode {
  override isExpression = true;
  constructor(
    public entries: [ASTNode, ASTNode][],
    public override loc: SourceLocation | null = null
  ) {
    super();
    entries.map(([key, value]) => {
      key.parent = this;
      value.parent = this;
    });
  }

  @logCall
  toEstree() {
    const entries = this.entries.map(([key, value]) =>
      builders.property("init", key.toEstree(), value.toEstree())
    );
    return builders.objectExpression(entries);
  }
}

export class Ternary extends ASTNode {
  override isExpression = true;
  constructor(
    public condition: ASTNode,
    public then: ASTNode,
    public elseDo: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    condition.parent = this;
    then.parent = this;
    elseDo.parent = this;
  }

  @logCall
  toEstree() {
    return builders.conditionalExpression(
      this.condition.toEstree(),
      this.then.toEstree(),
      this.elseDo.toEstree()
    );
  }
}

export class Subscript extends ASTNode {
  override isExpression = true;
  constructor(
    public obj: ASTNode,
    public index: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    obj.parent = this;
    index.parent = this;
  }

  @logCall
  toEstree() {
    return builders.memberExpression(
      this.obj.toEstree(),
      this.index.toEstree(),
      true
    );
  }
}

export class TryExpression extends ASTNode {
  override isExpression = true;
  constructor(
    public tryExpression: ASTNode,
    public catchBlock?: ASTNode,
    public errorType?: ASTNode,
    public override loc: SourceLocation | null = null
  ) {
    super();
    tryExpression.parent = this;
    catchBlock && (catchBlock.parent = this);
    errorType && (errorType.parent = this);
  }

  @logCall
  toEstree() {
    return builders.callExpression(
      builders.arrowFunctionExpression(
        [],
        builders.blockStatement([
          builders.tryStatement(
            builders.blockStatement([
              builders.returnStatement(this.tryExpression.toEstree()),
            ]), // try
            builders.catchClause(
              null,
              builders.blockStatement([
                builders.returnStatement(this.catchBlock?.toEstree()),
              ])
            ),
            null // finalizer
          ),
        ])
      ),
      []
    );
  }
}

export class Break extends ASTNode {
  constructor(
    public id?: Variable,
    override loc: SourceLocation | null = null
  ) {
    super();
    id && (id.parent = this);
  }

  @logCall
  toEstree() {
    return builders.breakStatement(this.id?.toEstree() as Identifier);
  }
}

export class Continue extends ASTNode {
  constructor(
    public id?: Variable,
    override loc: SourceLocation | null = null
  ) {
    super();
    id && (id.parent = this);
  }

  @logCall
  toEstree() {
    return builders.continueStatement();
  }
}

export class ScatterNames extends ASTNode {
  constructor(
    public names: Variable[],
    override loc: SourceLocation | null = null
  ) {
    super();
    names.forEach((name) => (name.parent = this));
  }

  @logCall
  toEstree() {
    return builders.arrayPattern(
      this.names.map((name) => name.toEstree() as any)
    );
  }
}

export class Spread extends ASTNode {
  constructor(
    public expression: ASTNode,
    override loc: SourceLocation | null = null
  ) {
    super();
    this.expression.parent = this;
  }

  @logCall
  toEstree() {
    return builders.spreadElement(this.expression.toEstree());
  }
}

export class comment extends ASTNode {
  constructor(public text: string, override loc: SourceLocation | null = null) {
    super();
  }

  toEstree() {
    throw new Error("Comments are not supported");
  }
}

export class ObjectReference extends ASTNode {
  override isExpression = true;
  constructor(
    public number: number,
    override loc: SourceLocation | null = null
  ) {
    super();
  }

  @logCall
  toEstree() {
    return new Variable(
      `o${this.number >= 0 ? this.number : "_" + Math.abs(this.number)}`,
      this.loc
    ).toEstree();
  }
}

export class AnonymousFunction extends ASTNode {
  override isExpression = true;
  constructor(
    public parameters: Variable[],
    public body: ASTNode,
    override loc: SourceLocation | null = null
  ) {
    super();
    parameters.forEach((param) => (param.parent = this));
    body.parent = this;
  }

  @logCall
  toEstree() {
    return builders.arrowFunctionExpression(
      this.parameters.map((param) => <Identifier>param.toEstree()),
      this.body.toEstree()
    );
  }
}

export class ExceptBlock extends ASTNode {
  constructor(
    public exceptionType?: ASTNode,
    public variable?: Variable,
    public body?: ASTNode,
    override loc: SourceLocation | null = null
  ) {
    super();
    exceptionType && (exceptionType.parent = this);
    variable && (variable.parent = this);
    body && (body.parent = this);
  }

  @logCall
  toEstree() {
    return builders.catchClause(
      this.exceptionType?.toEstree(),
      this.body?.toEstree()
    );
  }
}

export class FinallyBlock extends ASTNode {
  constructor(
    public body: ASTNode,
    override loc: SourceLocation | null = null
  ) {
    super();
    body.parent = this;
  }

  @logCall
  toEstree() {
    return builders.blockStatement([this.body.toEstree()]);
  }
}

export class Slice extends ASTNode {
  override isExpression = true;
  constructor(
    public start?: ASTNode,
    public end?: ASTNode,
    override loc: SourceLocation | null = null
  ) {
    super();
    start && (start.parent = this);
    end && (end.parent = this);
  }

  @logCall
  toEstree() {
    const arrayProto = builders.memberExpression(
      builders.identifier("Array"),
      builders.identifier("prototype"),
      false
    );
    return builders.callExpression(
      builders.memberExpression(
        arrayProto,
        builders.identifier("slice"),
        false
      ),
      [this.start?.toEstree(), this.end?.toEstree()]
    );
  }
}
