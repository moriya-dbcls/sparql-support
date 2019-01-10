// ==UserScript==
// @name            SPARQL support 
// @version         0.8.5
// @namespace       http://sparql-support.dbcls.jp/sparql-support.html
// @description     an addon of the CodeMirror to support editing SPARQL queries
// @include         http*://*togogenome.org/sparql*
// @include         http*://integbio.jp/rdf/sparql
// @exclude         http*://sparql-support.dbcls.jp*
// @grant           GM_getResourceText
// @grant           GM_addStyle
// @grant           GM.getResourceText
// @grant           GM.addStyle
// @grant           GM.getResourceUrl
// @require         http://sparql-support.dbcls.jp/js/codemirror/lib/codemirror.js
// @require         http://sparql-support.dbcls.jp/js/codemirror/mode/sparql/sparql.js
// @require         http://sparql-support.dbcls.jp/js/codemirror/addon/edit/matchbrackets.js
// @require         http://sparql-support.dbcls.jp/js/codemirror/addon/edit/closebrackets.js
// @require         http://sparql-support.dbcls.jp/js/sparql-support.js
// @require         https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @resource styleCM http://sparql-support.dbcls.jp/js/codemirror/lib/codemirror.css
// @resource styleSS http://sparql-support.dbcls.jp/css/base.css
// ==/UserScript==

(async () => {
    var styleCM = await GM_getResourceText("styleCM");
    var styleSS = await GM_getResourceText("styleSS");
    GM_addStyle(styleCM);
    GM_addStyle(styleSS);
    
    var idName = "query";

    var checkDiv = function(){
	count++;
	console.log(count);
	var codemirror = document.getElementsByClassName("cm-s-default")[0];
	console.log(codemirror);
	if(codemirror.tagName.toLowerCase() == "div"){
	    console.log(count);
	    clearInterval(id);
	    if(count < 50) restartCodeMirror();
	}
    };
    
    var restartCodeMirror = function(){
	var textarea = removeCodeMirror();
	startCodeMirror(textarea);
    };
    
    var removeCodeMirror = function(){
	var codemirror = document.getElementsByClassName("cm-s-default")[0];
	var textareaNodes = document.getElementsByTagName("textarea");
	var textarea = false;
	for(var i = 0; textareaNodes[i]; i++){
	    if(codemirror.tagName.toLowerCase() == "div" && textareaNodes[i].name == "query" && codemirror.parentNode == textareaNodes[i].parentNode){
		textarea = textareaNodes[i];
		break;
	    }
	}
	if(textarea){
	    textarea.style.display = "block";
	    var style = document.defaultView.getComputedStyle(codemirror, '');
	    var array = ["cm", codemirror.offsetHeight, codemirror.offsetWidth, style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth, style.borderTopStyle, style.borderRightStyle, style.borderBottomStyle, style.borderLeftStyle, style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor, style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius, style.marginTop, style.marginRight, style.marginBottom, style.marginLeft, style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft, style.fontSize, style.lineHeight, style.fontFamily];
	    var cmStyle = document.createElement("input");
	    cmStyle.type= "hidden";
	    cmStyle.id = "sparqlSupportCmDivStyle";
	    cmStyle.value = array.join("|");
	    textarea.parentNode.appendChild(cmStyle);
	    textarea.style.display = "none";
	    target = textarea;
	    codemirror.parentNode.removeChild(codemirror);
	}
	return textarea;
    };

    var startCodeMirror = function(textarea){
	if(textarea){
	    if(textarea.id) idName =  textarea.id;
            else textarea.id = idName;
	    var editor = CodeMirror.fromTextArea(textarea, {
		mode: "application/sparql-query",
		indentUnit: 2,
		matchBrackets: true,
		autoCloseBrackets: true,
		lineNumbers: true,
		sparqlSupportAutoComp: idName,  // Auto completion
		sparqlSupportQueries: idName,
		sparqlSupportInnerMode: idName,
		extraKeys: {"Tab": function(instance) { return false; },
			    "Ctrl-Space": function(instance) { return false; }}
	    });
	}
    };

    /////
    var cmFlag = 0;
    var scripts = document.getElementsByTagName("script");
    for(var i = 0; scripts[i]; i++){
	if(scripts[i].src.match("codemirror.js")){
	    cmFlag = 1;
	    break;
	}
    }

    var timer;
    var count = 0;
    if(cmFlag){ // if used CodeMirror
	timer = setInterval(
	    function(){
		count++;
		var codemirror = document.getElementsByClassName("cm-s-default")[0];
		if(!codemirror){
		    console.log(codemirror);
		}else{
		    clearInterval(timer);
		    if(count < 50) restartCodeMirror();
		}
	    }, 100);
    }else{ // do not used CodeMirror
	var textareaNodes = document.getElementsByTagName("textarea");
	var textarea = false;
	if(textareaNodes.length == 1){
            textarea = textareaNodes[0];
	}else{
	    for(var i = 0; textareaNodes[i]; i++){
		if(textareaNodes[i].id.toLowerCase() = idName){
		    textarea = teatareaNodes[i];
		    break;
		}
	    }
	}
	startCodeMirror(textarea);
    }

})();
