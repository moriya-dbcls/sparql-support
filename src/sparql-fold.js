// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

import CodeMirror from "codemirror/lib/codemirror";

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
