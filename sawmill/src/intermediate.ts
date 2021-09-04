import {
  AssignmentOperator,
  BinaryOperator,
  LogicalOperator,
  UnaryOperator,
} from "estree";
import { builders } from "estree-toolkit";

export enum IntermediateTypes {
  unknown = "unknown",
  float = "float",
  int = "int",
  string = "string",
}

function logCall(
  object: Object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any) {
    console.log(`${object.constructor.name} ${String(propertyKey)}(${args})`);
    return originalMethod.apply(this, args);
  };
}

export class Value {
  constructor(
    public type: IntermediateTypes = IntermediateTypes.unknown,
    public value: any = undefined
  ) {}

  @logCall
  toEstree() {
    return builders.literal(this.value);
  }
}

export abstract class ASTNode {
  parent?: ASTNode | null = null;
  abstract toEstree(): any;
}

export class Return extends ASTNode {
  constructor(public value?: ASTNode) {
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
    public then: ASTNode,
    public elseDo?: ASTNode
  ) {
    super();
    condition.parent = this;
    then.parent = this;
    if (elseDo) {
      elseDo.parent = this;
    }
  }

  @logCall
  toEstree() {
    return builders.ifStatement(
      this.condition.toEstree(),
      this.then.toEstree(),
      this.elseDo?.toEstree()
    );
  }
}

export class Assignment {
  constructor(
    public lhs: ASTNode,
    public op: string,
    public rhs: ASTNode,
    public declare: boolean
  ) {
    lhs.parent = this;
    rhs.parent = this;
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
  constructor(public op: string, public rhs: ASTNode) {
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
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {
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
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {
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
  constructor(public condition: ASTNode, public body: ASTNode) {
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
  constructor(public body: ASTNode[] = []) {
    super();
    body.map((node) => (node.parent = this));
  }

  @logCall
  toEstree() {
    return builders.program(this.body.map((node) => node.toEstree()));
  }
}

export class MethodCall extends ASTNode {
  constructor(
    public obj: ASTNode,
    public method: ASTNode,
    public args: ASTNode[]
  ) {
    super();
    obj.parent = this;
    method.parent = this;
    args.map((arg) => (arg.parent = this));
  }

  @logCall
  toEstree() {
    return builders.expressionStatement(
      builders.callExpression(
        builders.memberExpression(this.obj.toEstree(), this.method.toEstree()),
        this.args.map((arg) => arg.toEstree())
      )
    );
  }
}

export class FunctionCall extends ASTNode {
  constructor(public name: ASTNode, public args: ASTNode[]) {
    super();
    name.parent = this;
    args.map((arg) => (arg.parent = this));
  }

  @logCall
  toEstree() {
    return builders.callExpression(
      this.name.toEstree(),
      this.args.map((arg) => arg.toEstree())
    );
  }
}

export class TryCatch extends ASTNode {
  constructor(public tryBlock: ASTNode, public catchBlock: ASTNode) {
    super();
    tryBlock.parent = this;
    catchBlock.parent = this;
  }

  @logCall
  toEstree() {
    return builders.tryStatement(
      this.tryBlock.toEstree(),
      builders.catchClause(builders.identifier("e"), this.catchBlock.toEstree())
    );
  }
}

export class ForInLoop extends ASTNode {
  constructor(
    public variable: ASTNode,
    public collection: ASTNode,
    public body: ASTNode
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
  constructor(public body: ASTNode[] = []) {
    super();
    body.map((node) => (node.parent = this));
  }

  @logCall
  toEstree() {
    return builders.blockStatement(this.body.map((node) => node.toEstree()));
  }
}

export class Compare extends ASTNode {
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {
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
  constructor(public name: string) {
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
  constructor(public obj: ASTNode, public prop: ASTNode) {
    super();
    obj.parent = this;
    prop.parent = this;
  }

  @logCall
  toEstree() {
    return builders.memberExpression(this.obj.toEstree(), this.prop.toEstree());
  }
}

export class List extends ASTNode {
  constructor(public items: ASTNode[]) {
    super();
    items.map((item) => (item.parent = this));
  }

  @logCall
  toEstree() {
    return builders.arrayExpression(this.items.map((item) => item.toEstree()));
  }
}

export class Dictionary extends ASTNode {
  constructor(public entries: [ASTNode, ASTNode][]) {
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
  constructor(
    public condition: ASTNode,
    public then: ASTNode,
    public elseDo: ASTNode
  ) {
    super();
    condition.parent = this;
    then.parent = this;
    elseDo.parent = this;
  }

  @logCall
  toEstree() {
    return builders.expressionStatement(
      builders.conditionalExpression(
        this.condition.toEstree(),
        this.then.toEstree(),
        this.elseDo.toEstree()
      )
    );
  }
}

export class Subscript extends ASTNode {
  constructor(public obj: ASTNode, public index: ASTNode) {
    super();
    obj.parent = this;
    index.parent = this;
  }

  @logCall
  toEstree() {
    return builders.expressionStatement(
      builders.memberExpression(
        this.obj.toEstree(),
        this.index.toEstree(),
        true
      )
    );
  }
}

export class TryExpression extends ASTNode {
  constructor(
    public expression: ASTNode,
    public catchBlock: ASTNode,
    public errorType?: ASTNode
  ) {
    super();
    expression.parent = this;
    catchBlock.parent = this;
    errorType && (errorType.parent = this);
  }

  @logCall
  toEstree() {
    return builders.callExpression(
      builders.arrowFunctionExpression(
        [],
        builders.blockStatement([
          builders.tryStatement(
            this.expression.toEstree(), // try
            builders.catchClause(null, this.catchBlock.toEstree()),
            null // finalizer
          ),
        ])
      ),
      []
    );
  }
}
