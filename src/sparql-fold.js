// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.registerHelper("fold", "sparql", function(cm, start) {
  function isPrefix (lineNo) {
    var line = cm.getLine(lineNo)
    var match = line && line.match(/^PREFIX/i);
    return match ? true : false
  }

  if (isPrefix(start.line) && !isPrefix(start.line - 1)) {
    var end = start.line

    while (isPrefix(end)) {
      end++;
    }

    if (end - start.line > 1) {
      return {
        from: CodeMirror.Pos(start.line, cm.getLine(start.line).length),
        to: CodeMirror.Pos(end - 1, cm.getLine(end - 1).length)
      };
    }
  }
});

});
