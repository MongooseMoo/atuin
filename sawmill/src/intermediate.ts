import { AssignmentOperator, BinaryOperator, UnaryOperator } from "estree";
import { builders } from "estree-toolkit";

export enum IntermediateTypes {
  unknown = "unknown",
  float = "float",
  int = "int",
  string = "string",
}

export class Value {
  constructor(
    public type: IntermediateTypes = IntermediateTypes.unknown,
    public value: any = undefined
  ) {}

  toEstree() {
    return builders.literal(this.value);
  }
}

export abstract class ASTNode {
  abstract toEstree(): any;
}

export class Return extends ASTNode {
  constructor(public value: Value) {
    super();
  }

  toEstree() {
    return builders.returnStatement(this.value.toEstree());
  }
}

export class If extends ASTNode {
  constructor(
    public condition: Compare,
    public then: ASTNode,
    public elseDo?: ASTNode
  ) {
    super();
  }

  toEstree() {
    return builders.ifStatement(
      this.condition.toEstree(),
      this.then.toEstree(),
      this.elseDo?.toEstree()
    );
  }
}

export class Assignment {
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {}
  toEstree() {
    return builders.variableDeclaration("let", [
      builders.variableDeclarator(this.lhs.toEstree(), this.rhs.toEstree()),
    ]);
  }
}

export class Unary extends ASTNode {
  constructor(public op: string, public rhs: ASTNode) {
    super();
  }
  toEstree() {
    return builders.unaryExpression(
      this.op as UnaryOperator,
      this.rhs.toEstree()
    );
  }
}

export class Binary extends ASTNode {
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {
    super();
  }

  toEstree() {
    return builders.binaryExpression(
      this.op as BinaryOperator,
      this.lhs.toEstree(),
      this.rhs.toEstree()
    );
  }
}

export class While extends ASTNode {
  constructor(public condition: ASTNode, public body: ASTNode) {
    super();
  }
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
  }
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
  }

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
  }
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
  }
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
  }

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
  }

  toEstree() {
    return builders.blockStatement(this.body.map((node) => node.toEstree()));
  }
}

export class Compare extends ASTNode {
  constructor(public lhs: ASTNode, public op: string, public rhs: ASTNode) {
    super();
  }

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

  toEstree() {
    return builders.identifier(this.name);
  }
}

export class PropertyReference extends ASTNode {
  constructor(public obj: ASTNode, public prop: ASTNode) {
    super();
  }
  toEstree() {
    return builders.memberExpression(this.obj.toEstree(), this.prop.toEstree());
  }
}

export class List extends ASTNode {
  constructor(public items: ASTNode[]) {
    super();
  }

  toEstree() {
    return builders.arrayExpression(this.items.map((item) => item.toEstree()));
  }
}

export class Dictionary extends ASTNode {
  constructor(public entries: [ASTNode, ASTNode][]) {
    super();
  }

  toEstree() {
    const entries = this.entries.map(([key, value]) =>
      builders.property("init", key.toEstree(), value.toEstree())
    );
    return builders.objectExpression(entries);
  }
}
