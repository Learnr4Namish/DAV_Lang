class Parser {
  constructor(tokens) {
    this.tokens = tokens || [];
    this.pos = 0;
  }
  peek() {
    return this.tokens[this.pos] || null;
  }
  advance() {
    return this.tokens[this.pos++] || null;
  }
  at() {
    return this.pos;
  }
  expect(type, value = undefined, message = undefined) {
    const t = this.peek();
    const pos = this.at();
    if (!t) {
      throw new SyntaxError(
        (message ?? `Expected ${type}${value ? " '" + value + "'" : ""}`) +
          ` — but found end of input at ${pos}`
      );
    }
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SyntaxError(
        (message ?? `Expected ${type}${value ? " '" + value + "'" : ""}`) +
          ` — got ${t.type}${t.value !== undefined ? `('${t.value}')` : ""} at ${pos}`
      );
    }
    return this.advance();
  }
  match(type, value = undefined) {
    const t = this.peek();
    if (!t) return null;
    if (t.type !== type) return null;
    if (value !== undefined && t.value !== value) return null;
    return this.advance();
  }
  parseProgram() {
    const body = [];
    while (this.peek()) {
      body.push(this.parseStatement());
    }
    return { type: "Program", body };
  }
  parseStatement() {
    const t = this.peek();
    if (!t) throw new SyntaxError("Unexpected end of input in parseStatement");
    if (t.type === "KEYWORD" && t.value === "define") {
      return this.parseFunctionDeclaration();
    }
    if (t.type === "KEYWORD" && ["Num", "Float", "Text", "List", "Obj"].includes(t.value)) {
      return this.parseVariableDeclaration();
    }
    if (t.type === "KEYWORD" && t.value === "set") {
      return this.parseSetStatement();
    }
    if (t.type === "KEYWORD" && t.value === "fetch") {
      return this.parseFetchStatement();
    }
    if (t.type === "KEYWORD" && t.value === "launch") {
      return this.parseLaunchStatement();
    }
    if (t.type === "KEYWORD" && t.value === "when") {
      return this.parseWhenStatement();
    }
    if (t.type === "KEYWORD" && t.value === "else") {
      return this.parseElseStatement();
    }
    if (t.type === "KEYWORD" && t.value === "return") {
      return this.parseReturnStatement();
    }
    return { type: "ExpressionStatement", expression: this.parseExpression() };
  }

  parseSetStatement() {
    this.expect("KEYWORD", "set", "Expected 'set' keyword");
    const nameTok = this.expect("IDENTIFIER", undefined, "Expected variable name after 'set'");
    this.expect("OPERATOR", "=", "Expected '=' after variable name in set statement");
    const expr = this.parseExpression();
    return { type: "SetStatement", id: nameTok.value, value: expr };
  }
  parseVariableDeclaration() {
    const typeTok = this.expect("KEYWORD", undefined, "Expected type for variable declaration");
    const nameTok = this.expect("IDENTIFIER", undefined, "Expected variable name after type");
    this.expect("OPERATOR", "=", "Expected '=' after variable name");
    const expr = this.parseExpression();
    return { type: "VariableDeclaration", varType: typeTok.value, id: nameTok.value, init: expr };
  }
  parseFunctionDeclaration() {
    this.expect("KEYWORD", "define", "Expected 'define' to start function");
    const returnTypeTok = this.expect("KEYWORD", undefined, "Expected return type after 'define'");
    const nameTok = this.expect("IDENTIFIER", undefined, "Expected function name after return type");
    this.expect("PUNCTUATION", "(", "Expected '(' after function name");
    const params = [];
    const next = this.peek();
    if (!next) throw new SyntaxError("Unexpected end of input when parsing parameters");
    if (!(next.type === "PUNCTUATION" && next.value === ")")) {
      while (true) {
        const pnameTok = this.expect("IDENTIFIER", undefined, "Expected parameter name");
        this.expect("PUNCTUATION", ":", "Expected ':' after parameter name");
        const ptypeTok = this.expect("KEYWORD", undefined, "Expected parameter type after ':'");
        params.push({ name: pnameTok.value, varType: ptypeTok.value });
        const sep = this.peek();
        if (!sep) throw new SyntaxError("Unexpected end of input in parameter list");
        if (sep.type === "PUNCTUATION" && sep.value === ",") {
          this.advance();
          continue;
        }
        break;
      }
    }
    this.expect("PUNCTUATION", ")", "Expected ')' after parameter list");
    const body = this.parseBlock();
    return {
      type: "FunctionDeclaration",
      returnType: returnTypeTok.value,
      id: nameTok.value,
      params,
      body
    };
  }
  parseWhenStatement() {
    this.expect("KEYWORD", "when", "Expected 'when'");
    this.expect("PUNCTUATION", "(", "Expected '(' after 'when'");
    const test = this.parseExpression();
    this.expect("PUNCTUATION", ")", "Expected ')' after condition");
    const consequent = this.parseBlock();
    let alternate = null;
    const fpeek = this.peek();
    if (fpeek && fpeek.type === "KEYWORD" && fpeek.value === "else") {
      this.advance();
      alternate = this.parseBlock();
    }
    return { type: "WhenStatement", test, consequent, alternate };
  }
  parseElseStatement() {
    this.expect("KEYWORD", "else", "Expected 'else'");
    const consequent = this.parseBlock();
    return { type: "ElseStatement", consequent };
  }
  parseReturnStatement() {
    this.expect("KEYWORD", "return", "Expected 'return'");
    const arg = this.parseExpression();
    return { type: "ReturnStatement", argument: arg };
  }
  parseBlock() {
    this.expect("PUNCTUATION", "{", "Expected '{' to start block");
    const body = [];
    while (true) {
      const t = this.peek();
      if (!t) throw new SyntaxError("Unexpected end of input inside block");
      if (t.type === "PUNCTUATION" && t.value === "}") {
        this.advance();
        break;
      }
      body.push(this.parseStatement());
    }
    return { type: "BlockStatement", body };
  }
  parseExpression() {
    return this.parseBinaryExpression(0);
  }
  parseBinaryExpression(minPrec = 0) {
    let left = this.parseUnary();
    const prec = {
  "==": 1, "!=": 1,
  ">": 2, "<": 2, ">=": 2, "<=": 2,
  "+": 3, "-": 3,
  "*": 4, "/": 4,
  "**": 5
};
   while (true) {
  const t = this.peek();
  if (!t || t.type !== "OPERATOR") break;
  const tprec = prec[t.value] ?? 0;
  if (tprec < minPrec) break;
  const op = this.advance().value;
  const nextMinPrec = op === "**" ? tprec : tprec + 1;
  const right = this.parseBinaryExpression(nextMinPrec);
  left = { type: "BinaryExpression", operator: op, left, right };
}
    return left;
  }
  parseUnary() {
    const t = this.peek();
    if (t && t.type === "OPERATOR" && (t.value === "-" || t.value === "+" || t.value === "!")) {
      const op = this.advance().value;
      const argument = this.parseUnary();
      return { type: "UnaryExpression", operator: op, argument };
    }
    return this.parsePrimary();
  }
  parsePrimary() {
    const t = this.peek();
    if (!t) throw new SyntaxError("Unexpected end of input in expression");
    if (t.type === "NUMBER" || t.type === "FLOAT" || t.type === "TEXT") {
      this.advance();
      return { type: "Literal", value: t.value };
    }
    if (t.type === "IDENTIFIER") {
      const idTok = this.advance();
      const next = this.peek();
      if (next && next.type === "PUNCTUATION" && next.value === "(") {
        this.advance();
        const args = [];
        if (!(this.peek() && this.peek().type === "PUNCTUATION" && this.peek().value === ")")) {
          while (true) {
            args.push(this.parseExpression());
            const sep = this.peek();
            if (!sep) throw new SyntaxError("Unexpected end of input in call arguments");
            if (sep.type === "PUNCTUATION" && sep.value === ",") {
              this.advance();
              continue;
            }
            break;
          }
        }
        this.expect("PUNCTUATION", ")", "Expected ')' after call arguments");
        return { type: "CallExpression", callee: { type: "Identifier", name: idTok.value }, arguments: args };
      }
      return { type: "Identifier", name: idTok.value };
    }
    if (t.type === "PUNCTUATION" && t.value === "(") {
      this.advance();
      const expr = this.parseExpression();
      this.expect("PUNCTUATION", ")", "Expected ')' after expression");
      return expr;
    }
    throw new SyntaxError(`Unexpected token ${t.type}${t.value !== undefined ? `('${t.value}')` : ""} at ${this.at()}`);
  }
  parseFetchStatement() {
    this.expect("KEYWORD", "fetch", "Expected 'fetch' keyword");
    const pathToken = this.expect("TEXT", undefined, "Expected module path as string");
    return {
      type: "FetchStatement",
      path: pathToken.value
    };
  }

  parseLaunchStatement() {
    const names = [];
    if (this.peek().type !== "IDENTIFIER") {
      throw new Error("Expected identifier after 'launch'");
    }
    names.push(this.advance().value);
    while (this.peek().type === "PUNCTUATION" && this.peek().value === ",") {
      this.advance();
      if (this.peek().type !== "IDENTIFIER") {
        throw new Error("Expected identifier after ',' in launch statement");
      }
      names.push(this.advance().value);
    }
    return { type: "LaunchStatement", names };
  }
}
module.exports = Parser;
