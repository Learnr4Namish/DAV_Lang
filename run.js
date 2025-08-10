const fs = require("fs");
const path = require("path");
const lexer = require("./lexer");
const Parser = require("./parser");
const Interpreter = require("./interpreter");

// Get file path from command-line arguments
const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node run.js <sourcefile.dav>");
    process.exit(1);
}

// Read the source code
const absolutePath = path.resolve(filePath);
let sourceCode;
try {
    sourceCode = fs.readFileSync(absolutePath, "utf8");
} catch (err) {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
}

// Tokenize → Parse → Interpret
try {
    const tokens = lexer(sourceCode);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();

    const interpreter = new Interpreter();
    (async () => {
  await interpreter.run(ast);
  console.log(interpreter.globals)
})();

} catch (err) {
    console.error(`Runtime error: ${err.message}`);
    process.exit(1);
}
