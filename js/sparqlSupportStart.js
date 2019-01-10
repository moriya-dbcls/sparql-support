var id = "query";

var editor = CodeMirror.fromTextArea(document.getElementById(id), {
    mode: "application/sparql-query",
    matchBrackets: true,
    autoCloseBrackets: true,
    lineNumbers: true,
    sparqlSupportAutoComp: id,
    sparqlSupportQueries: id,
    sparqlSupportInnerMode: id,
    extraKeys: {"Tab": function(instance) { return false; },
		"Ctrl-Space": function(instance) { return false; }}
});
