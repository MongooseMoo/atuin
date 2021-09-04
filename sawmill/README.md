# Introduction

Sawmill is a transpiler which parses MOO code into a parse tree, which it uses to build an AST in an intermediate language. It also has the capability to render an intermediate language tree out as a Javascript abstract syntax tree, from which valid code may be generated.
Its purpose is to assist in transpiling MOO to Javascript
It currently uses Acorns to render the generated AST, making it capable of a complete source-to-source transformation.
