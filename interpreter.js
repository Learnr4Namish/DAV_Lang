const fs = require("fs");
const lexer = require("./lexer");
const Parser = require("./parser");
const path = require('path');
class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class Interpreter {
  constructor() {
    this.globals = {};
    this.functions = {};
    this.exports = {};
    this.moduleRegistry = JSON.parse(
      fs.readFileSync(path.join(__dirname, "/moduleRegistry.json"), "utf-8")
    );
    this.loadingModules = new Set();
    this.functions["write"] = {
      type: "BuiltinFunction",
      func: (...args) => {
        console.log(...args);
        return null;
      },
      params: []
    };
    this.functions["__sqrt"] = {
  type: "BuiltinFunction",
  func: (x) => Math.sqrt(x),
  params: [{name:"x"}]
};
this.functions["length"] = {
  type: "BuiltinFunction",
  func: (x) => x.length,
  params: [{name:"x"}]
};
this.functions["__abs"] = {
  type: "BuiltinFunction",
  func: (x) => Math.abs(x),
  params: [{name:"x"}]
};
this.functions["__round"] = {
  type: "BuiltinFunction",
  func: (x) => Math.round(x),
  params: [{name:"x"}]
};
this.functions["__ceil"] = {
  type: "BuiltinFunction",
  func: (x) => Math.ceil(x),
  params: [{name:"x"}]
};
this.functions["__floor"] = {
  type: "BuiltinFunction",
  func: (x) => Math.floor(x),
  params: [{name:"x"}]
};
this.functions["__pow"] = {
  type: "BuiltinFunction",
  func: (base, exponent) => Math.pow(base, exponent),
  params: [{name:"base"}, {name:"exponent"}]
};
this.functions["__log"] = {
  type: "BuiltinFunction",
  func: (x) => Math.log(x),
  params: [{name:"x"}]
};
this.functions["__sin"] = {
  type: "BuiltinFunction",
  func: (x) => Math.sin(x),
  params: [{name:"x"}]
};
this.functions["__cos"] = {
  type: "BuiltinFunction",
  func: (x) => Math.cos(x),
  params: [{name:"x"}]
};
this.functions["__tan"] = {
  type: "BuiltinFunction",
  func: (x) => Math.tan(x),
  params: [{name:"x"}]
};
this.functions["__atan"] = {
  type: "BuiltinFunction",
  func: (x) => Math.atan(x),
  params: [{name:"x"}]
};
this.functions["__acos"] = {
  type: "BuiltinFunction",
  func: (x) => Math.acos(x),
  params: [{name:"x"}]
};
this.functions["__asin"] = {
  type: "BuiltinFunction",
  func: (x) => Math.asin(x),
  params: [{name:"x"}]
};
this.functions["__log10"] = {
  type: "BuiltinFunction",
  func: (x) => Math.log10(x),
  params: [{name:"x"}]
};
this.functions["__log2"] = {
  type: "BuiltinFunction",
  func: (x) => Math.log2(x),
  params: [{name:"x"}]
};
this.functions["__exp"] = {
  type: "BuiltinFunction",
  func: (x) => Math.exp(x),
  params: [{name:"x"}]
};
this.functions["__max"] = {
  type: "BuiltinFunction",
  func: (a, b) => Math.max(a, b),
  params: [{name:"a"}, {name:"b"}]
};
this.functions["__min"] = {
  type: "BuiltinFunction",
  func: (a, b) => Math.min(a, b),
  params: [{name:"a"}, {name:"b"}]
};
this.functions["__rand"] = {
  type: "BuiltinFunction",
  func: (min, max) => Math.random() * (max - min) + min,
  params: [{name:"min"}, {name:"max"}]
};
this.functions["__randInt"] = {
  type: "BuiltinFunction",
  func: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  params: [{name:"min"}, {name:"max"}]
};
this.functions["__randFloat"] = {
  type: "BuiltinFunction",
  func: (min, max) => Math.random() * (max - min) + min,
  params: [{name:"min"}, {name:"max"}]
};
this.functions["__isNaN"] = {
  type: "BuiltinFunction",
  func: (x) => isNaN(x),
  params: [{name:"x"}]
};
this.functions["__isFinite"] = {
  type: "BuiltinFunction",
  func: (x) => isFinite(x),
  params: [{name:"x"}]
};
// Reads the interpreter globals, then gets the davType of the variable
  this.functions["get_type"] = {
  type: "BuiltinFunction",
  func: (name) => {
    const entry = this.globals[name];
    if (entry) {
      return entry.davType;
    }
    throw new Error(`Undefined global variable: ${name}`);
  },
  params: [{name:"name"}]
};
this.promptUser = (prompt) => {
  const readline = require("readline-sync");
  const input = readline.question(prompt + " ");
  return input;
};
this.functions["prompt"] = {
  type: "BuiltinFunction",
  func: (prompt, variableName, davType = "Text") => {
    const value = this.promptUser(prompt);
    this.globals[variableName] = { value, davType: davType ? `DAV.${davType}` : null };
    return null;
  },
  params: [{name:"prompt"}, {name:"variableName"}, {name:"davType"}]
};
this.functions["sys_clear"] = {
  type: "BuiltinFunction",
  func: () => {
    console.clear();
    return null;
  },
  params: []
};
this.functions["sys_exit"] = {
  type: "BuiltinFunction",
  func: () => {
    process.exit();
  },
  params: []
};
this.functions["sys_delete"] = {
  type: "BuiltinFunction",
  func: (variableName) => {
    delete this.globals[variableName];
    return null;
  },
  params: [{name:"variableName"}]
};
this.functions["writeln"] = {
  type: "BuiltinFunction",
  func: (...args) => {
    console.log("\n", ...args);
        return null;
      },
      params: []
    };
  }
  run(program) {
    for (const stmt of program.body) {
      this.evalStatement(stmt);
    }
  }
  evalStatement(stmt, scope = this.globals) {
    switch (stmt.type) {
      case "VariableDeclaration":
        scope[stmt.id] = {
          value: this.evalExpression(stmt.init, scope),
          davType: `DAV.${stmt.varType}`
        };
        return;
      case "SetStatement":
        if (!(stmt.id in scope) && !(stmt.id in this.globals)) {
          throw new Error(`Cannot set undeclared variable: ${stmt.id}`);
        }
        let target = (stmt.id in scope) ? scope[stmt.id] : this.globals[stmt.id];
        if (target && typeof target === "object" && "davType" in target) {
          target.value = this.evalExpression(stmt.value, scope);
        } else {
          throw new Error(`Variable ${stmt.id} is not a valid DAV variable`);
        }
        return;
      case "FunctionDeclaration":
        this.functions[stmt.id] = stmt;
        return;
      case "WhenStatement":
        if (this.evalExpression(stmt.test, scope)) {
          this.evalBlock(stmt.consequent, scope);
        } else if (stmt.alternate) {
          this.evalBlock(stmt.alternate, scope);
        }
        return;
      case "ElseStatement":
        this.evalBlock(stmt.consequent, scope);
        return;
      case "ReturnStatement":
        throw new ReturnSignal(this.evalExpression(stmt.argument, scope));
      case "ExpressionStatement":
        this.evalExpression(stmt.expression, scope);
        return;
      case "FetchStatement":
        return this.handleFetch(stmt, scope);
      case "LaunchStatement":
        return this.handleLaunch(stmt, scope);
      default:
        throw new Error(`Unknown statement type: ${stmt.type}`);
    }
  }

  handleFetch(stmt, scope) {
    let modulePath = stmt.path;
    if (!modulePath.includes("/") && !modulePath.includes("\\")) {
      if (this.moduleRegistry[modulePath]) {
        modulePath = this.moduleRegistry[modulePath];
      } else {
        throw new Error(`Module '${modulePath}' not found in registry`);
      }
    }
    // Normalize to absolute path
    modulePath = path.resolve(modulePath);
    // Prevent self-import
    if (this.currentModulePath && modulePath === this.currentModulePath) {
      return null;
    }
    // Prevent circular import
    if (this.loadingModules.has(modulePath)) {
      return null;
    }
    this.loadingModules.add(modulePath);
    const sourceCode = fs.readFileSync(modulePath, "utf-8");
    const tokens = lexer(sourceCode);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    const prevModulePath = this.currentModulePath;
    this.currentModulePath = modulePath;
    const moduleScope = { functions: {}, globals: {}, exports: {} };
    this.runInScope(ast, moduleScope);
    for (const [name, value] of Object.entries(moduleScope.exports)) {
      if (value.type === "function") {
        this.functions[name] = value.value;
      } else {
        this.globals[name] = value;
      }
    }
    this.currentModulePath = prevModulePath;
    this.loadingModules.delete(modulePath);
    return null;
  }

  handleLaunch(stmt, scope) {
    for (const name of stmt.names) {
      if (name in this.functions) {
        this.exports[name] = this.functions[name];
      } else if (name in this.globals) {
        this.exports[name] = this.globals[name];
      } else {
        throw new Error(`Cannot export unknown identifier '${name}'`);
      }
    }
    return null;
  }
  run(program) {
    for (const stmt of program.body) {
      this.evalStatement(stmt);
    }
  }
  evalStatement(stmt, scope = this.globals) {
    switch (stmt.type) {
      case "VariableDeclaration":
        scope[stmt.id] = {
          value: this.evalExpression(stmt.init, scope),
          davType: `DAV.${stmt.varType}`
        };
        return;
      case "SetStatement":
        if (!(stmt.id in scope) && !(stmt.id in this.globals)) {
          throw new Error(`Cannot set undeclared variable: ${stmt.id}`);
        }
        let target = (stmt.id in scope) ? scope[stmt.id] : this.globals[stmt.id];
        if (target && typeof target === "object" && "davType" in target) {
          target.value = this.evalExpression(stmt.value, scope);
        } else {
          throw new Error(`Variable ${stmt.id} is not a valid DAV variable`);
        }
        return;
      case "FunctionDeclaration":
        this.functions[stmt.id] = stmt;
        return;
      case "WhenStatement":
        if (this.evalExpression(stmt.test, scope)) {
          this.evalBlock(stmt.consequent, scope);
        } else if (stmt.alternate) {
          this.evalBlock(stmt.alternate, scope);
        }
        return;
      case "ElseStatement":
        this.evalBlock(stmt.consequent, scope);
        return;
      case "ReturnStatement":
        throw new ReturnSignal(this.evalExpression(stmt.argument, scope));
      case "ExpressionStatement":
        this.evalExpression(stmt.expression, scope);
        return;
      case "FetchStatement":
        return this.handleFetch(stmt, scope);
      case "LaunchStatement":
        return this.handleLaunch(stmt, scope);
      default:
        throw new Error(`Unknown statement type: ${stmt.type}`);
    }
  }

  handleFetch(stmt, scope) {
    let modulePath = stmt.path;
    if (!modulePath.includes("/") && !modulePath.includes("\\")) {
      if (this.moduleRegistry[modulePath]) {
        modulePath = this.moduleRegistry[modulePath];
      } else {
        throw new Error(`Module '${modulePath}' not found in registry`);
      }
    }
    // Normalize to absolute path
    modulePath = path.resolve(modulePath);
    // Prevent self-import
    if (this.currentModulePath && modulePath === this.currentModulePath) {
      return null;
    }
    // Prevent circular import
    if (this.loadingModules.has(modulePath)) {
      return null;
    }
    this.loadingModules.add(modulePath);
    const sourceCode = fs.readFileSync(modulePath, "utf-8");
    const tokens = lexer(sourceCode);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();
    const prevModulePath = this.currentModulePath;
    this.currentModulePath = modulePath;
    const moduleScope = { functions: {}, globals: {}, exports: {} };
    this.runInScope(ast, moduleScope);
    for (const [name, value] of Object.entries(moduleScope.exports)) {
      if (value.type === "function") {
        this.functions[name] = value.value;
      } else {
        this.globals[name] = value;
      }
    }
    this.currentModulePath = prevModulePath;
    this.loadingModules.delete(modulePath);
    return null;
  }

  handleLaunch(stmt, scope) {
    for (const name of stmt.names) {
      if (name in this.functions) {
        this.exports[name] = this.functions[name];
      } else if (name in this.globals) {
        this.exports[name] = this.globals[name];
      } else {
        throw new Error(`Cannot export unknown identifier '${name}'`);
      }
    }
    return null;
  }
  evalBlock(block, parentScope) {
    const localScope = Object.create(parentScope);
    for (const stmt of block.body) {
      try {
        this.evalStatement(stmt, localScope);
      } catch (signal) {
        if (signal instanceof ReturnSignal) {
          throw signal;
        }
        throw signal;
      }
    }
  }
  evalExpression(expr, scope) {
    switch (expr.type) {
      case "Literal":
        return expr.value;
      case "Identifier":
        if (expr.name in scope) {
          const entry = scope[expr.name];
          if (entry && typeof entry === "object" && "value" in entry && "davType" in entry) {
            return entry.value;
          }
          return entry;
        }
        if (expr.name in this.globals) {
          const entry = this.globals[expr.name];
          if (entry && typeof entry === "object" && "value" in entry && "davType" in entry) {
            return entry.value;
          }
          return entry;
        }
        throw new Error(`Undefined variable: ${expr.name}`);
      case "BinaryExpression":
        return this.applyOperator(expr.operator,
          this.evalExpression(expr.left, scope),
          this.evalExpression(expr.right, scope)
        );
      case "UnaryExpression":
        return this.applyUnary(expr.operator, this.evalExpression(expr.argument, scope));
      case "CallExpression":
        return this.callFunction(expr, scope);
      default:
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }
  callFunction(callExpr, scope) {
    const funcName = callExpr.callee.name;
    const funcDef = this.functions[funcName];
    if (!funcDef) throw new Error(`Undefined function: ${funcName}`);
    if (funcDef.type === "BuiltinFunction") {
      const argValues = callExpr.arguments.map(arg => this.evalExpression(arg, scope));
      return funcDef.func(...argValues);
    }
    if (callExpr.arguments.length !== funcDef.params.length) {
      throw new Error(`Function ${funcName} expects ${funcDef.params.length} args, got ${callExpr.arguments.length}`);
    }
    const localScope = Object.create(this.globals);
    funcDef.params.forEach((param, idx) => {
      const argVal = this.evalExpression(callExpr.arguments[idx], scope);
      let argType = null;
      if (callExpr.arguments[idx].type === "Identifier") {
        const varName = callExpr.arguments[idx].name;
        if (varName in scope && scope[varName] && typeof scope[varName] === "object" && "davType" in scope[varName]) {
          argType = scope[varName].davType;
        } else if (varName in this.globals && this.globals[varName] && typeof this.globals[varName] === "object" && "davType" in this.globals[varName]) {
          argType = this.globals[varName].davType;
        }
      }
      localScope[param.name] = { value: argVal, davType: argType };
    });
    try {
      this.evalBlock(funcDef.body, localScope);
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        return signal.value;
      }
      throw signal;
    }
    return null;
  }
  applyOperator(op, left, right) {
    switch (op) {
      case "+": return left + right;
case "-": return left - right;
case "*": return left * right;
case "/": return left / right;
case "**": return left ** right;
case "==": return left == right;
case "!=": return left != right;
case ">": return left > right;
case "<": return left < right;
case ">=": return left >= right;
case "<=": return left <= right;
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }
  applyUnary(op, val) {
    switch (op) {
      case "+": return +val;
      case "-": return -val;
      case "!": return !val;
      default: throw new Error(`Unknown unary operator: ${op}`);
    }
  }
}
module.exports = Interpreter;
