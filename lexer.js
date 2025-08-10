const KEYWORDS = [
    "Num", "Float", "Text", "List", "Obj", "Bool", "true", "false", "void",
    "when", "else", "define", "return", "class", "new", "set", "fetch", "launch"
];
const OPERATORS = [
    "+", "-", "*", "/", "=", "==", "!=", ">=", "<=", ">", "<", "**"
];
const PUNCTUATIONS = ["(", ")", "{", "}", ",", ":", "."];
function lexer(input) {
    const tokens = [];
    let i = 0;
    function peek() {
        return input[i] || null;
    }
    function advance() {
        return input[i++] || null;
    }
    function isAlpha(ch) {
        return /[a-zA-Z_]/.test(ch);
    }
    function isDigit(ch) {
        return /[0-9]/.test(ch);
    }
    while (i < input.length) {
        let ch = peek();
        if (/\s/.test(ch)) {
            advance();
            continue;
        }
if (ch === "/") {
  const nextCh = input[i + 1];
  if (nextCh === "/") {
    i += 2;
    while (i < input.length && input[i] !== "\n") i++;
    continue;
  }
  if (nextCh === "*") {
    i += 2;
    while (i < input.length) {
      if (input[i] === "*" && input[i + 1] === "/") {
        i += 2;
        break;
      }
      i++;
    }
    continue;
  }
}
        if (isDigit(ch)) {
            let numStr = "";
            while (isDigit(peek())) numStr += advance();
            if (peek() === ".") {
                numStr += advance();
                while (isDigit(peek())) numStr += advance();
                tokens.push({ type: "FLOAT", value: parseFloat(numStr) });
            } else {
                tokens.push({ type: "NUMBER", value: parseInt(numStr) });
            }
            continue;
        }
        if (ch === '"' || ch === "'") {
  let str = "";
  i++;
  while (i < input.length && input[i] !== ch) {
    if (input[i] === "\\") {
      i++;
      const esc = input[i];
      switch (esc) {
        case "n": str += "\n"; break;
        case "t": str += "\t"; break;
        case "r": str += "\r"; break;
        case '"': str += '"'; break;
        case "'": str += "'"; break;
        case "\\": str += "\\"; break;
        case "x": {
          const hex = input.substr(i + 1, 2);
          if (!/^[0-9A-Fa-f]{2}$/.test(hex)) {
            throw new Error(`Invalid hex escape at position ${i}`);
          }
          str += String.fromCharCode(parseInt(hex, 16));
          i += 2;
          break;
        }
        case "u": {
          const hex = input.substr(i + 1, 4);
          if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
            throw new Error(`Invalid unicode escape at position ${i}`);
          }
          str += String.fromCharCode(parseInt(hex, 16));
          i += 4;
          break;
        }
        default:
          str += esc;
      }
    } else {
      str += input[i];
    }
    i++;
  }
  i++;
  tokens.push({ type: "TEXT", value: str });
  continue;
}
        if (isAlpha(ch)) {
            let ident = "";
            while (isAlpha(peek()) || isDigit(peek())) ident += advance();
            if (KEYWORDS.includes(ident)) {
                tokens.push({ type: "KEYWORD", value: ident });
            } else {
                tokens.push({ type: "IDENTIFIER", value: ident });
            }
            continue;
        }
        let twoCharOp = input.slice(i, i + 2);
        if (OPERATORS.includes(twoCharOp)) {
            tokens.push({ type: "OPERATOR", value: twoCharOp });
            i += 2;
            continue;
        }
        if (OPERATORS.includes(ch)) {
            tokens.push({ type: "OPERATOR", value: ch });
            advance();
            continue;
        }
        if (PUNCTUATIONS.includes(ch)) {
            tokens.push({ type: "PUNCTUATION", value: ch });
            advance();
            continue;
        }
        throw new Error(`Unexpected character: ${ch}`);
    }
    return tokens;
}
module.exports = lexer;
