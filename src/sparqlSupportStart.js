import CodeMirror from "codemirror/lib/codemirror";

var id = "query";

var editor = CodeMirror.fromTextArea(document.getElementById(id), {
    mode: "application/sparql-query",
    matchBrackets: true,
    autoCloseBrackets: true,
    lineNumbers: true,
    sparqlSupportAutoComp: true,
    sparqlSupportQueries: true,
    sparqlSupportInnerMode: true,
    extraKeys: {"Tab": function(instance) { return false; },
		"Ctrl-Space": function(instance) { return false; }}
});
