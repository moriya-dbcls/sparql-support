// name:    SPARQList support
// version: 0.0.6
//
// Released under the MIT license
// Copyright (c) 2017 Yuki Moriya (DBCLS)
// http://opensource.org/licenses/mit-license.php

import CodeMirror from "codemirror/lib/codemirror";

const SPARQListSupport = {

    path: location.pathname,
    runJS: new Function,
    run_id: 0,
    font_family: "monospace, Courier, Consolas, Monaco",
    font_size: "16px",
    line_height: "22px",

    params2json: function (id){
	var tmp = SPARQListSupport.getName(id);
	var sparqlet = tmp[0];
	var object = tmp[1];
	
	var id = sparqlet + "___" + object;
	var text = d3.select("#slsTa_" + id).property("value");
	var error;
	if(text.match(/\*/)){
	    var lines = text.split(/\n/);
	    var params = new Object();
	    for(var i = 0; i < lines.length; i++){
		if(lines[i].match(/^\*\s*\w+:\s*\w+/)){
		    var tmp = lines[i].match(/^\*\s*(\w+): *(.+)/);
		    if(tmp[2].match(/^\[.+\]$/)){
			tmp[2] = tmp[2].replace(/[\[\]\s]/g, "");
			params[tmp[1]] = [];
			var array = tmp[2].split(",");
			for(var j = 0; j < array.length; j++){
			    params[tmp[1]].push(array[j]);
			}
		    }else{
			params[tmp[1]] = tmp[2];
		    }
		}else if(lines[i].match(/^\*\s*\`\w+\`/) && lines[i+1] && lines[i+1].match(/^\s+\*\s*default:\s*\w+/)){
		    //   console.log(lines[i] + "\n" + lines[i+1]);
		    params[lines[i].match(/^\*\s*\`(\w+)\`/)[1]] = lines[i+1].match(/^\s+\*\s*default:\s*(.+)$/)[1];
		    i++;
		}
	    }
	}else{
	    error = "e.g.\n\n\* \`param\`\n  \* default: value\n";
	}
	var pre = d3.select("#res_div_slsTa_" + id).select("pre");
	if(error) pre.text(error);
	else pre.text(JSON.stringify(params, null, "  "));
    },

    copyJS: function (id) {
	var tmp = SPARQListSupport.getName(id);
	var sparqlet = tmp[0];
	var object = tmp[1];

	SPARQListSupport.run_id = id;
	var lines = d3.select("#slsTa_" + id).property("value").replace(/[\r\n]/g, "\n").split(/\n/);
	var head = "", js = "", param = "", arg = "", code = "", js_code = "", f = 0;

	// extract code
	for(var i = 0; i < lines.length; i++){
	    if(f < 2){
		if(lines[i].match(/^\s*\/\//)){
		    head += lines[i] + "\n";
		}else if(lines[i].match(/^\s*\/\*/)){
		    head += lines[i] + "\n";
		    f = 1;
		}else if(f){
		    head += lines[i] + "\n";
		    if(lines[i].match(/\*\/\s*$/)){ f = 0; }
		}else if(lines[i].match(/[^\s]/)){  f = 2; }
	    }
	    if(f == 2){
		js += lines[i] + "\n";
	    }   
	}
	var async = 0;
	if(js.match(/^\s*async/)){
	    js = js.replace(/^\s*async/,"");
	    async = 1;
	}
	if(js.match(/^\s*\(\s*\{[\w\,\s]*\}\s*\)\s*\=\>\s*\{[\s\S]+\}\s*;*\s*$/)){
	    var tmp = js.match(/^\s*\(\s*\{([\w\,\s]*)\}\s*\)\s*\=\>\s*\{([\s\S]+)\}\s*;*\s*$/);
	    arg = tmp[1];
	    code = tmp[2];
	    f = 1;
	}else if(js.match(/^\s*function\s*\(\s*\{[\w\,\s]*\}\s*\)\s*\{[\s\S]+\}\s*\(\s*\)\s*;*\s*$/)){
	    var tmp = js.match(/^\s*function\s*\(\s*\{([\w\,\s]*)\}\s*\)\s*\{([\s\S]+)\}\s*\(\s*\)\s*;*\s*$/);
	    arg = tmp[1];
	    code = tmp[2];
	    f = 1;
	}else if(js.match(/^\s*\(\s*\{\s*\w+\s*\(\s*\{[\w\,\s]*\}\s*\)\s*\{[\s\S]+\}\s*,\s*\w+\s*\(\s*\{[\w\,\s]*\}\s*\)\s*\{[\s\S]+\}\s*\}\s*\)\s*;*\s*$/)){
	    var tmp = js.match(/^\s*\(\s*\{\s*(\w+)\s*\(\s*\{([\w\,\s]*)\}\s*\)\s*\{([\s\S]+)\}\s*,\s*(\w+)\s*\(\s*\{([\w\,\s]*)\}\s*\)\s*\{([\s\S]+)\}\s*\}\s*\)\s*;*\s*$/);
	    if(tmp[1] == "json"){
		arg = tmp[2];
		code = tmp[3];
		f = 1;
	    }else if(tmp[4] == "json"){
		arg = tmp[5];
		code = tmp[6];
		f = 1;
	    }
	}

	if(d3.select("#slsConsoleLog_" + id).empty()){
	    var div = d3.select('#res_div_slsTa_' + id);
	    div.html("");
	    div.append("div").style("white-space", "pre").style("color", "#888888").style("font-size", "12px").style("margin-left", "10px").attr("id", "res_time_" + id);
	    div.append("div").style("white-space", "pre").style("color", "#888888").style("font-size", "12px").style("margin-left", "10px").attr("id", "slsConsoleLog_" + id);
	    div.append("pre").attr("id", "inner_result_json").style("display", "none");
	    div.append("pre").attr("id", "inner_result_text_" + id).style("margin-left", "10px");
	}

	if(code && code.match(/console.log\([^\)]+\)/)){
	    code = code.replace(/console.log\(([^\)]+)\)/g, function(){ return arguments[0] + "; slsConsoleLog += " + arguments[1] + " + '\\n';"; });
	    code = code.replace(/return /g, "if(slsConsoleLog != '') d3.select('#res_div_slsTa_" + id + "').select('#slsConsoleLog_" + id + "').html( '==== console log ====\\n' + slsConsoleLog);\nreturn ");
	    code = "var slsConsoleLog = '';\n" + code;
	}
	
	// set variables
	if(f == 1){
	    var params_h = {};
	    var parameters_object = d3.select("#res_div_slsTa_" + sparqlet + "___Parameters");
	    if(parameters_object.empty() == false && parameters_object.select("pre").html().match(/\w/)){
		params_h = JSON.parse(parameters_object.select("pre").html().replace(/\\&lt;/g, "<").replace(/\\&gt;/g, ">").replace(/\\&amp;/g, "&"));
	    }
	    params = arg.replace(/\s/g, "").split(/,/);
	    for(var j = 0; j < params.length; j++){
		if(!params[j].match(/\w/)) continue;
		if(d3.select("#res_div_slsTa_" + sparqlet + "___" + params[j]).empty() == false){
		    param += "var " + params[j] + "=JSON.parse(d3.select('#res_div_slsTa_" + sparqlet + "___" + params[j] + "').select('pre').html().replace(/\\&lt;/g, \"<\").replace(/\\&gt;/, \">\").replace(/\\&amp;/g, \"&\"));"; 
		}else if(params_h[params[j]]){
		    param += "var " + params[j] + "=\"" + params_h[params[j]] + "\";";
		}else{
		    param += "var " + params[j] + ";";  // undef ver
		}
	    }
	    js = "JSON.stringify(((" + arg + ") => {" + code + "})(" + arg + "), null, '  ')";	
	    if(async) js = "JSON.stringify(await((async(" + arg + ") => {" + code + "})(" + arg + ")), null, '  ')"; //.replace(/\\\\n/g, '\\n')";
	}else{
	    js = "\'parse error: \\n\\n/* sample code ========================== */\\n\\n({var1, var2}) => {\\n  ... code ...\\n  return json;\\n};\\n\\n/* content negotiation (last section) === */\\n\\n({\\n  json({var1, var2}) {\\n    ... code ...\\n    return json;\\n  },\\n  text({var1, var2}) {\\n    ... code ...\\n    return text;\\n  }\\n});\\n\\n/* Fetch API ============================ */\\n\\nasync ({var1, var2}) => {\\n   const options = {\\n    method: \\'POST\\',\\n    body: \\'key=\\' + encodeURIComponent(value),\\n    headers: {\\n      \\'Accept\\': \\'application/json\\',\\n      \\'Content-Type\\': \\'application/x-www-form-urlencoded\\'\\n    }\\n  }\\n  try{\\n    var json = await fetch(\\'http://example.org/rest/api/hoge\\', options).then(res=>res.json());\\n    return json;\\n  }catch(error){\\n    console.log(error);\\n  }\\n};\\n\\n'";
	}

	var code = "var div = d3.select('#res_div_slsTa_" + id + "');";
	code += "var pre = div.select('pre').html('');";
	code += "var preTxt = div.select('#inner_result_text_" + id + "').html('');";
	code += "var resTime = div.select('#res_time_" + id + "').html('');";
	code += "var startTime = Date.now();";
	code += "div.select('#slsConsoleLog_" + id + "').html('');";
	code += "d3.select('#slsSubmitTable_" + id + "').select('#slsLoading_slsTa_" + id + "').style('visibility', 'visible');";
	code += "var loadingTimer = setInterval(function(){SPARQListSupport.loadingVis('" + id + "');}, 30);";
	code += param;
	code += "pre.text(" + js + ");";
	code += "preTxt.text(pre.text().replace(/\\\\n/g, '\\n').replace(/\\\\t/g, '\\t'));";
	code += "d3.select('#slsSubmitTable_" + id + "').select('#slsLoading_slsTa_" + id + "').style('visibility', 'hidden');";
	code += "clearInterval(loadingTimer);";
	code += "var endTime = Date.now();";
	code += "var sec = Math.round((endTime - startTime) / 100) / 10;";
	code += "resTime.text('[ ' + sec + ' sec. ]');";
	if(async) code = "(async()=>{" + code + "})();";

	console.log(code);
	//document.getElementById(id).innerHTML = code;
	SPARQListSupport.runJS = function(){ (new Function(code))(); }
    },

    loadingVis: function(id){
	var icon = document.getElementById("slsLoading_slsTa_" + id);
	if(SPARQListSupport.rotate === undefined) SPARQListSupport.rotate = 360;
	SPARQListSupport.rotate -= 5;
	if(SPARQListSupport.rotate < 0) SPARQListSupport.rotate += 360;
	icon.style.visibility = "visible";
	icon.style.transform = "rotate(" + SPARQListSupport.rotate + "deg)";
    },

    editSparqlQuery: function(id){
	var tmp = SPARQListSupport.getName(id);
	var sparqlet = tmp[0];
	var object = tmp[1];

	var textarea = d3.select("#slsTa_" + id);
	//	var query = textarea.property("value");
	var query = localStorage[SPARQListSupport.path + "_sparql_code_0_slsTa_" + id];
	
	var pre = d3.select("#res_div_slsTa_" + id).select('pre');
	if(pre.empty() == true){
	    pre = d3.select("#res_div_slsTa_" + id).append('pre');
	}
	
	var lines = query.split(/\n/);
	for(var i = 0; i < lines.length; i++){
	    if(lines[i].match(/\{\{[\w\[\]\.]+\}\}/) && !lines[i].match(/^\s*#/)){
		lines[i] = SPARQListSupport.setVariablesSparqlQuery(lines[i], sparqlet, object);
		if(lines[i] === false) return 0;
	    }
	}
	var query = lines.join("\n");
//	console.log(query);
	textarea.property("value", query);
    },
    
    setVariablesSparqlQuery: function(text, sparqlet, object){
	var res = "";
	var words = text.split(/\s+/);
	for(var i = 0; i < words.length; i++){
	    while(words[i].match(/\{\{[\w\[\]\.]+\}\}/)){
		if(words[i].match(/\{\{[\w\[\]\.]+\}\}/)){
		    var variable = words[i].match(/(.*)\{\{([\w\[\]\.]+)\}\}(.*)/);
		    var tmp = [];
		    if(variable[2].match(/[^\.]\.[^\.]/)){
			tmp = variable[2].split(/\./);
		    }else if(d3.select("#res_div_slsTa_" + sparqlet + "___" + variable[2]).select('pre').empty() == false){
			tmp[0] = variable[2];
		    }else{
			tmp[0] = "Parameters";
			tmp[1] = variable[2];
		    }
		    var json;
		    var pre = d3.select("#res_div_slsTa_" + sparqlet + "___" + tmp[0]).select('pre');
		    if(pre.empty() == false && pre.html().match(/\w/)){
			var json = JSON.parse(pre.html().replace(/\&lt;/g, "<").replace(/\&gt;/g, ">").replace(/\&amp;/g, "&"));
		    }else{
			d3.select("#res_div_slsTa_" + sparqlet + "___" + object).select('pre').text("'" + variable[2] + "' not found.");
			return false;
		    }
		    for(var j = 1; j < tmp.length; j++){
			if(tmp[j].match(/\[\d+\]$/)){   // array
			    var k = tmp[j].match(/^(.+)\[(\d+)\]$/);
			    json =  json[k[1]][k[2]];
			}else{
			    json = json[tmp[j]];
			}
		    }
		    var value = json;
		    words[i] = variable[1] + value + variable[3];
		}
	    }
	    res += " " + words[i];
	}
	return res;
    },
    
    makeHtml: function (id){
	var tmp = SPARQListSupport.getName(id);
	var sparqlet = tmp[0];
	var object = tmp[1];

	SPARQListSupport.run_id = id;
	var source = d3.select("#slsTa_" + id).property("value");
	var values = SPARQListSupport.getStepJsons(sparqlet, object);
	var div = d3.select("#res_div_slsTa_" + id);
	if(values.results && source){
	    var template = Handlebars.compile(source);
	    if(div.select("#slsHandle_" + id).empty() == true) div.append("div").attr("id", "slsHandle_" + id).style("margin-left", "20px");
	    div.select('pre').html("");
	    div.select("#slsHandle_" + id).html(template(values));
	}else{
	    if(div.select("#slsHandle_" + id).empty() == false) div.select("#slsHandle_" + id).html("");
	    div.select('pre').html("\n{{results}} will receive the return value of the last step.\n");
	}
    },

    getStepJsons: function (sparqlet, object){
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(/\s/);	
	var results = false;
	
	for(var i = 0; i < objects.length; i++){
	    if(objects[i] == object){
		var id =  sparqlet + "___" + objects[i - 1];
		if(d3.select('#res_div_slsTa_' + id).select('pre').empty() == false
		   && d3.select('#res_div_slsTa_' + id).select('pre').html().match(/\w/)) {
		    results = JSON.parse(d3.select("#res_div_slsTa_" + id).select("pre").html());
		}
		break;
	    }
	}
//	console.log(results);
	return {results: results};
    },

    startCM: function (sparqlet, object, mode) {
	var ta_id = "slsTa_" + sparqlet + "___" + object;
	
	var params = {};
	if(mode == "sparql"){
	    params = {
		mode: "application/sparql-query",
		matchBrackets: true,
		autoCloseBrackets: true,
		lineNumbers: true,
		sparqlSupportAutoComp: ta_id,
		sparqlSupportInnerMode: ta_id,
		extraKeys: {"Tab": function(instance) { return false; },
			    "Ctrl-Space": function(instance) { return false; }}
	    };
	}else if(mode == "js"){
	    params = {
		mode: "javascript",
		matchBrackets: true,
		autoCloseBrackets: true,
		lineNumbers: true,
		sparqListSupportAutoSave: ta_id
	    };
	}else if(mode == "hbs"){
	    params = {
		mode: {name: "handlebars", base: "text/html"},
		matchBrackets: true,
		autoCloseBrackets: true,
		lineNumbers: true,
		sparqListSupportAutoSave: ta_id
	    };
	}else{
	    params = {
		mode: "text/plain",
		matchBrackets: true,
		autoCloseBrackets: true,
		lineNumbers: true,
		sparqListSupportAutoSave: ta_id
	    };
	}
	CodeMirror.fromTextArea(document.getElementById(ta_id), params);

	if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] != object){
	    d3.select("#slsDiv_" + sparqlet + "___" + object).style("display", "none");
	}else{
	    SPARQListSupport.setStyle(sparqlet, object);
	}
    },

    changeCM: function (sparqlet, object, mode){
	var id = sparqlet + "___" + object;

	var form = document.getElementById("slsForm_" + id);
	var childs = form.childNodes;
	for(var i = 0; i < childs.length; i++){
	    if((childs[i].className && childs[i].className.match(/CodeMirror/) && childs[i].className.match(/cm-s-default/))
	       || (childs[i].id && childs[i].id == "res_div_slsTa_" + id)){
		form.removeChild(childs[i]);
	    }
	}

	if( document.getElementById("query_tab_list_slsTa_" + id)){
	    var json = document.getElementById("query_tab_list_slsTa_" + id);
	    json.parentNode.removeChild(json);
	}
	
	var input = d3.select("#submit_button_slsTa_" + id);
	d3.select("#slsJsonButton_" + id).style("display", "none");
	if(mode == "text/plain"){
	    input.attr("value", "to JSON")
		.attr("type", "button")
		.on("mouseover", "")
		.on("click", function(){
		    d3.selectAll(".slsFocusNode").style("filter", "none");
		    d3.selectAll(".CodeMirror").style("filter", "none");
		    d3.select("#submit_button_slsTa_" + id).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))"); 
		    SPARQListSupport.focus = "runButton"; 
		    SPARQListSupport.focusRight = SPARQListSupport.focus;
		    (new Function("SPARQListSupport.params2json(\"" + id + "\");"))(); 
		});
	}else if(mode == "sparql"){
	    input.attr("value", "run query")
	    	.attr("type", "submit")
	    	.on("mouseover", function(){ (new Function("SPARQListSupport.editSparqlQuery(\"" + id + "\");"))(); })
		.on("click.", function(){ 
		    d3.selectAll(".slsFocusNode").style("filter", "none");
		    d3.selectAll(".CodeMirror").style("filter", "none");
		    d3.select("#submit_button_slsTa_" + id).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))"); 
		    SPARQListSupport.focus = "runButton"; 
		    SPARQListSupport.focusRight = SPARQListSupport.focus;
		});
	    d3.select("#slsJsonButton_" + id).style("display", "block");
	}else if(mode == "js"){
	    input.attr("value", "run script")
	    	.attr("type", "button")
		.on("mouseover", function(){ (new Function("SPARQListSupport.copyJS(\"" + id + "\");"))(); })
		.on("click", function(){ 
		    d3.selectAll(".slsFocusNode").style("filter", "none");
		    d3.selectAll(".CodeMirror").style("filter", "none");
		    d3.select("#submit_button_slsTa_" + id).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))"); 
		    SPARQListSupport.focus = "runButton"; 
		    SPARQListSupport.focusRight = SPARQListSupport.focus;
		    (new Function("SPARQListSupport.runJS();"))(); 
		});
	}else if(mode == "hbs"){
	    input.attr("value", "decompress")
	    	.attr("type", "button")
		.on("mouseover", "")
		.on("click", function(){ 
		    d3.selectAll(".slsFocusNode").style("filter", "none");
		    d3.selectAll(".CodeMirror").style("filter", "none");
		    d3.select("#submit_button_slsTa_" + id).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))"); 
		    SPARQListSupport.focus = "runButton"; 
		    SPARQListSupport.focusRight = SPARQListSupport.focus;
		    (new Function("SPARQListSupport.makeHtml(\"" + id + "\");"))(); 
		});
	}
	SPARQListSupport.startCM(sparqlet, object, mode);
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object] = mode;
	d3.select("#query_tab_list_slsTa_" + id).remove();
    },

    runAll: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	SPARQListSupport.runStep(sparqlet, objects[0]);
    },

    runStep: function(sparqlet, object){
	var id = sparqlet + "___" + object;
	var mode = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object];
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	SPARQListSupport.changeTextarea(sparqlet, object);

	var isJson = function(arg){
	    arg = (typeof arg === "function") ? arg() : arg;
	    if (typeof arg  !== "string") {
		return false;
	    }
	    try {
		arg = (!JSON) ? eval("(" + arg + ")") : JSON.parse(arg);
		return true;
	    } catch (e) {
		return false;
	    }
	};

	var loading;
	var checkDiv = function(){
	    var text = d3.select("#res_div_slsTa_" + id).select("pre").html();
	    if(mode == "hbs") text = d3.select("#res_div_slsTa_" + id).select("#slsHandle_" + id).html();
	    if(text.match(/\w/)){
		clearInterval(loading);
		if(isJson(text) == true || mode == "hbs"){
		 //   console.log(text);
		    for(var i = 0; i < objects.length; i++){
			if(object == objects[i]){
			    if(i != objects.length - 1) SPARQListSupport.runStep(sparqlet, objects[i + 1]);
			    break;
			}
		    }
		}
	    }
	};
	loading = setInterval(checkDiv, 500);	
	SPARQListSupport.clickFuncSubmitButton(sparqlet, object);
    },

    addStep: function (sparqlet, object, code, mode){
	var objects = [];
	if (localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"]) objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	if(!object) object = "step";
	object = SPARQListSupport.chkName(object, objects);
	var id = sparqlet + "___" + object;

	var font_family = SPARQListSupport.font_family;
	var font_size= SPARQListSupport.font_size;
	var line_height = SPARQListSupport.line_height;
	if(localStorage[SPARQListSupport.path + "_font_family"]) font_family = localStorage[SPARQListSupport.path + "_font_family"];
	if(localStorage[SPARQListSupport.path + "_font_size"]) font_size = localStorage[SPARQListSupport.path + "_font_size"];
	if(localStorage[SPARQListSupport.path + "_line_height"]) line_height = localStorage[SPARQListSupport.path + "_line_height"];
	
	var div = d3.select("#sparqlet_main");
	var ul = div.select("#sparqlet_objects");
	var li = ul.append("li")
	    .attr("id", "slsLi_" + id);
	var ul2 = li.append("ul").attr("class", "none_deco");
	ul2.append("li")
	    .attr("class", "sparqlet_object float_left slsFocusNode")
	    .attr("id", "slsLi2_" + id)
	    .text(object)
	    .on("click", function(){ SPARQListSupport.changeTextarea(sparqlet, object); });
	ul2.append("li").attr("class", "float_left")
	    .append("div").attr("class", "entypo-cancel-squared remove_icon")
	    .on("click", function(){
		d3.select("#remove_step_name").text("remove '" + object + "'");
		d3.select("#remove_step_sparqlet").property("value", sparqlet);
		d3.select("#remove_step_object").property("value", object);
		SPARQListSupport.showGrayPopup('remove_step');
	});
	ul2.append("li").attr("class", "float_clear");

	var textareas = div.select("#sparqlet_textareas");
	var textarea_div = textareas.append("div")
	    .attr("id", "slsDiv_" + id)
	    .attr("class", "sparqlet_textarea")
	    .style("width", "90%")
	    .style("display", "block");

	var form = textarea_div.append("form")
	    .attr("id", "slsForm_" + id);
	var mode_select = form.append("select")
	    .attr("class", "slsSelect")
	    .attr("id", "slsSelect_" + id)
	    .on("change", function(){
		var new_mode = this.value;
		SPARQListSupport.changeCM(sparqlet, object, new_mode);
	    });

	if(!mode){
	    if(object == "Parameters"){
		mode = "text/plain";
		localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object] = mode;
	    }else{
		mode = "sparql";
		localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object] = mode;
	    }
	}else{
	    localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object] = mode;
	}
	var options = [["text/plain", "Parameters"],
		       ["sparql", "SPARQL"],
		       ["js", "JavaScript"],
		       ["hbs","Handlebars"]];
	mode_select.selectAll(".mode_option")
	    .data(options)
	    .enter()
	    .append("option")
	    .attr("class", "mode_option")
	    .attr("value", function(d){ return d[0]; })
	    .attr("selected", function(d){ if(d[0] == mode) return "selected"; })
	    .text(function(d){ return d[1]; });
	form.append("ul")
	    .attr("class", "none_deco")
	    .style("margin-left", "120px").style("width", "50px")
	    .append("li")
	    .attr("class", "entypo-pencil slsStepIcon")
	    .style("height", "36px")
	    .on("click", function(){
		SPARQListSupport.showGrayPopup('rename_step');
	    });
	form.append("textarea")
	    .attr("class", "script_textarea")
	    .attr("id", "slsTa_" + id)
	    .style("width", "100%")
	    .style("font-family", font_family).style("font-size", font_size).style("line-height", line_height).style("border", "1px solid #888888")
	    .attr("rows", 10)
	    .property("value", code);
	var submit_table = form.append("table")
	    .attr("id", "slsSubmitTable_" + id)
	    .style("margin-top", "10px").style("margin-bottom", "10px").style("border", "0");
	var tr = submit_table.append("tr");
	tr.append("td")
	    .append("input")
	    .attr("id", "submit_button_slsTa_" + id)
	    .attr("class", "slsSubmitButton slsFocusNode")
	    .attr("type", "submit")
	    .attr("value", "submit");
	tr.append("td")
	    .append("div")
	    .attr("id", "slsLoading_slsTa_" + id)
	    .style("width", "40px").style("height", "40px").style("text-align", "center").style("visibility", "hidden")
	    .append("span")
	    .style("font-size", "40px").style("position", "relative").style("top", "-8px").style("color", "#bbbbbb")
	    .attr("class", "entypo-arrows-ccw");
	tr.append("td")
	    .append("input")
	    .attr("type", "button")
	    .attr("value", "json")
	    .attr("class", "slsJsonButton")
	    .attr("id", "slsJsonButton_" + id)
	    .style("display", "none")
	    .on("click", function(){ SPARQListSupport.swichSparqlRes(id); });

	if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object] == "sparql"){
	    d3.select("#slsJsonButton_" + id).style("display", "block");
	}
	
	objects.push(object);
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"] = objects.join(" ");
	SPARQListSupport.changeCM(sparqlet, object, mode);
	SPARQListSupport.changeTextarea(sparqlet, object);
    },

    replaceStep: function(sparqlet, object, f){
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	for(var i = 0; i < objects.length; i++){
	    if(objects[i] == object){
		if(f == -1){
		    objects[i] = objects[i-1];
		    objects[i-1] = object;
		}else if(f == 1){
		    objects[i] = objects[i+1];
		    objects[i+1] = object;
		}
		break;
	    }
	}
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"] = objects.join(" ");
	SPARQListSupport.makeObjectList(sparqlet, objects);
    },
    
    changeTextarea: function(sparqlet, object){
	var div = d3.select("#sparqlet_main");

	// get current style (width ,height)
	SPARQListSupport.getStyle();

	// chage display
	div.selectAll(".sparqlet_textarea").style("display", "none");
	div.select("#slsDiv_" + sparqlet + "___" + object).style("display", "block");

	// set style to new objest
	SPARQListSupport.setStyle(sparqlet, object);
	
	var selected = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	d3.selectAll(".slsFocusNode").style("filter", "none");
	d3.selectAll(".CodeMirror").style("filter", "none");
	d3.select("#slsLi2_" + sparqlet + "___" + selected).style("background-color", "#ffffff").style("cursor", "pointer");
	d3.select("#slsLi2_" + sparqlet + "___" + object).style("background-color", "#d3e5f1").style("cursor", "move").style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))");
	localStorage[SPARQListSupport.path + "_selectedSparqlet"] = sparqlet;
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] = object;
	SPARQListSupport.focus = "step";
	SPARQListSupport.stepTarget = object;
    },

    moveFocus: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	var object = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	d3.selectAll(".slsFocusNode").style("filter", "none");
	d3.selectAll(".CodeMirror").style("filter", "none");
	if(SPARQListSupport.focus == "step"){
	    d3.select("#slsLi2_" + sparqlet + "___" + SPARQListSupport.stepTarget).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))");
	}else if(SPARQListSupport.focus == "runButton"){
	    d3.select("#submit_button_slsTa_" + sparqlet + "___" + object).style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))");
	}else{
	    var childs = document.getElementById("slsForm_" + sparqlet + "___" + object).childNodes;
	    for(var i = 0; i < childs.length; i++){
		if(childs[i].className.match(/CodeMirror cm-s-default/)){
		    childs[i].style.filter =  "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))";
		    break;
		}
	    }
	}
    },

    copyMarkdown: function (sparqlet){
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(/\s/);

	var md = "# " + sparqlet + "\n\n";
	for(var i = 0; i < objects.length; i++){
	    var id = sparqlet + "___" + objects[i];
	    var textarea = d3.select("#slsTa_" + id);
	    if(textarea.property("value").match(/\w/)){
		var text = textarea.property("value");
		var mode = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + objects[i]];
		if(mode == "text/plain"){
		    md += "## Parameters\n\n";
		    var lines = text.split("\n");
		    for(var j = 0; j < lines.length; j++){
			if(lines[j].match(/^\*\s*\w+:\s*\w+/)){
			    var tmp = lines[j].match(/^\*\s*(\w+): *(.+)/);
			    md += "* `" + tmp[1] + "`\n  * default: " + tmp[2] + "\n";
			}else if(lines[j].match(/[^\s]/)){
			    md += lines[j] + "\n";
			}
		    }
		    md += "\n\n";
		}else if(mode == "sparql"){
		    text = localStorage[SPARQListSupport.path + "_sparql_code_0_slsTa_" + id];
		    md += "## Endpoint\n\n";
		    var endpoint = "no endpoint";
		    var lines = text.split("\n");
		    for(var j = 0; j < lines.length; j++){
			if(j == 0 && lines[j].match(/^#.*https*:\/\//)){
			    endpoint = lines[j].match(/^#.*(https*:\/\/[^\s]+)/)[1];
			}
			if(j == 0){
			    md += endpoint + "\n\n";
			    md += "## \`" + objects[i] + "\`\n\n";
			    md += "\`\`\`sparql\n";
			    continue;
			}
			if(lines[j].match(/[^\s]/)) md += lines[j] + "\n";
		    }
		    md += "\`\`\`\n\n";
		}else if(mode == "js"){
		    md += "## \`" + objects[i] + "\`\n\n";
		    var lines = text.split("\n");
		    md += "\`\`\`javascript\n";
		    for(var j = 0; j < lines.length; j++){
			if(lines[j].match(/[^\s]/)) md += lines[j] + "\n";
		    }
		    md += "\`\`\`\n\n";
	/*	}else if(mode == "hbs"){
		    md += "## \`" + id + "\`\n\n";
		    var lines = text.split("\n");
		    md += "\`\`\`handlebars template\n";
		    for(var j = 0; j < lines.length; j++){
			if(lines[j].match(/[^\s]/)) md += lines[j] + "\n";
		    }
		    md += "\`\`\`\n\n";  */
		}
	    }
	}
//	console.log(md);
	SPARQListSupport.copyStringToClipboard(md);
    },

    readMarkdown: function (){
	var text = d3.select("#markdown").property("value");
	if(text.match(/^\s*https*:/)){
	    var api_url = text.match(/^\s*(https*:[^\s]+)\/([^\s\/]+)/)[1];
	    var sparqlet = text.match(/^\s*(https*:[^\s]+)\/([^\s\/]+)/)[2];
	    var sparqlet_url = api_url + "/-api/sparqlets/" + sparqlet;
	    var options = {
		method: "get",
		headers: {
		    "Accept": "application/json"   
		}
	    };
	    fetch(sparqlet_url, options).then(res => res.json()).then(function(json){
	//	console.log(json.data.attributes.src);
		var md = json.data.attributes.src.replace(/^\s*# *([^\s]+)/, "# " + sparqlet);
		d3.select("#markdown").property("value", md);
		SPARQListSupport.readMarkdown();
	    });

	}else if(text.match(/^\s*# *.+/)){
	    var lines = text.replace(/[\n\r]/g, "\n").split(/\n/);
	    var f = 0;
	    var f2 = 0;
	    var code = "";
	    var sparqlet;
	    var object;
	    var endpoint;
	    for(var i = 0; i < lines.length; i++){
		if(i == 0 && lines[i].match(/^# *[\w\-]+/)){
		    sparqlet = lines[i].match(/^# *([\w\-]+)/)[1];
		    var sparqlist = localStorage[SPARQListSupport.path + "_sparqletList"].split(" ");
		    sparqlet = SPARQListSupport.chkName(sparqlet, sparqlist);
		    sparqlist.push(sparqlet);
		    localStorage[SPARQListSupport.path + "_sparqletList"] = sparqlist.join(" ");
		}else if(lines[i].match(/^## .+/) || i == lines.length - 1){
		    if(code.match(/[^\s]/)){
			if(f == 2 && code.match(/^http/)){
			    endpoint = code;
			    code = "";
			}else{
			    if(f == 3){ code = "## endpoint " + endpoint + code;}
			    var mode = "";
			    if(f == 1){ mode = "text/plain"; }
			    else if(f == 3){ mode = "sparql"; }
			    else if(f == 4){ mode = "js"; }
			    else if(f == 5){ mode = "hbs"; }
	
			    SPARQListSupport.addStep(sparqlet, object, code, mode); 
			   // console.log(code);
			    code = "";
			}
		    }
		    if(i == lines.length - 1) break;
		    var name = lines[i].match(/^## *([\w\`\s]+)/)[1];
		    if(name.toLowerCase() == "parameters"){
			object = name;
			f = 1;
			f2 = 1;
		    }else if(name.toLowerCase() == "endpoint"){
			f = 2;
			f2 = 1;
		    }else if(name.match(/^\`\w+\`/)){
			object = name.match(/^\`(\w+)\`/)[1];
		    }else{
			object = name.replace(/\s/g, "_");
		    }
		}else if(lines[i].match(/^\`\`\`/)){
		    if(lines[i].match(/^\`\`\`sparql/)){ f = 3; f2 = 1;}		    
		    else if(lines[i].match(/^\`\`\`javascript/)){ f = 4; f2 = 1;}
		    else if(lines[i].match(/^\`\`\`handlebars/)){ f = 5; f2 = 1;}
		    else if(lines[i].match(/^\`\`\`$/)){ f2 = 0; }
		}else if(f2 && ((f > 0 && lines[i].match(/[^\s]/)) || f >= 3)){
		    code += lines[i] + "\n";
		}
	    }
	}
	SPARQListSupport.readSparqList();
	SPARQListSupport.hideGrayPopup();
    },

    readSparqlet: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	if(!localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"]){
	    localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"] = "Parameters";
	    localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] = "Parameters";
	    localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_Parameters"] = "text/plain";
	}
	if(!localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"]) localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] = "Parameters";    
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	var font_family = SPARQListSupport.font_family;
	var font_size= SPARQListSupport.font_size;
	var line_height = SPARQListSupport.line_height;
	if(localStorage[SPARQListSupport.path + "_font_family"]) font_family = localStorage[SPARQListSupport.path + "_font_family"];
	if(localStorage[SPARQListSupport.path + "_font_size"]) font_size = localStorage[SPARQListSupport.path + "_font_size"];
	if(localStorage[SPARQListSupport.path + "_line_height"]) line_height = localStorage[SPARQListSupport.path + "_line_height"];
	
	// sparqlet object buttons
	var div = d3.select("#sparqlet").append("div").attr("id", "sparqlet_main");
	div.append("h3").text(sparqlet);
	var object_list = div.append("div").attr("id", "object_list").attr("class", "float_left");
	var ul = object_list.append("ul").attr("id", "sparqlet_objects").attr("class", "none_deco");
	SPARQListSupport.makeObjectList(sparqlet, objects);

	// play icon
	var ul = object_list.append("ul").attr("class", "none_deco")
	    .style("width", "177px").style("height", "30px").style("margin-left", "20px").style("margin-top", "20px");
	ul.append("li")
	    .append("div").attr("class", "entypo-play")
	    .style("text-align", "center").style("font-size", "30px").style("cursor", "pointer")
	    .on("click", function(){
		d3.select("#add_step_sparqlet").property("value", sparqlet);
		SPARQListSupport.runAll();
	    });

	// add step button
	var ul = object_list.append("ul").attr("class", "none_deco add_step_button")
	    .append("li").append("ul").attr("class", "none_deco");
	ul.append("li").attr("class", "sparqlet_object float_left")
	    .text("add step").on("click", function(){
		d3.select("#add_step_sparqlet").property("value", sparqlet);
		SPARQListSupport.showGrayPopup('add_step');
	    });
	ul.append("li").attr("class", "float_left")
	    .append("div").attr("class", "entypo-list-add remove_icon")
	.on("click", function(){
		d3.select("#add_step_sparqlet").property("value", sparqlet);
		SPARQListSupport.showGrayPopup('add_step');
	    });
	ul.append("li").attr("class", "float_clear");

	// copy markdown button
	var ul = object_list.append("ul").attr("class", "none_deco copy_md_button")
	    .append("li").append("ul").attr("class", "none_deco");
	ul.append("li").attr("class", "sparqlet_object float_left")
	    .text("copy markdown").on("click", function(){ SPARQListSupport.copyMarkdown(sparqlet); });    
	ul.append("li").attr("class", "float_left")
	    .append("div").attr("class", "entypo-clipboard remove_icon")
	    .on("click", function(){ SPARQListSupport.copyMarkdown(sparqlet); });
	ul.append("li").attr("class", "float_clear");

	// textareas
	var textareas = div.append("div")
	    .attr("id", "sparqlet_textareas");
	var textarea_div = textareas.selectAll(".sparqlet_textarea")
	    .data(objects)
	    .enter()
	    .append("div")
	    .attr("id", function(d){ return "slsDiv_" + sparqlet + "___" + d; })
	    .attr("class", "sparqlet_textarea")
	    .style("width", "90%")
	    .style("display", "block");
	var form = textarea_div.append("form")
	    .attr("id", function(d){ return "slsForm_" + sparqlet + "___" + d; });
	var mode_select = form.append("select")
	    .attr("class", "slsSelect")
	    .attr("id", function(d){ return "slsSelect_" + sparqlet + "___" + d; })
	    .on("change", function(d){
		var new_mode = this.value;
		SPARQListSupport.changeCM(sparqlet, d, new_mode);
	    });
	var options = [["text/plain", "Parameters"],
		       ["sparql", "SPARQL"],
		       ["js", "JavaScript"],
		       ["hbs","Handlebars"]];
	mode_select.selectAll(".mode_option")
	    .data(options)
	    .enter()
	    .append("option")
	    .attr("class", "mode_option")
	    .attr("value", function(d){ return d[0]; })
	    .text(function(d){ return d[1]; });
	form.append("ul")
	    .attr("class", "none_deco")
	    .style("margin-left", "120px").style("width", "50px")
	    .append("li")
	    .attr("class", "entypo-pencil slsStepIcon")
	    .style("height", "36px")
	    .on("click", function(){
		SPARQListSupport.showGrayPopup('rename_step');
	    });
	form.append("textarea")
	    .attr("class", "script_textarea")
	    .attr("id", function(d){ return "slsTa_" + sparqlet + "___" + d;} )
	    .style("width", "100%")
	    .style("font-family", font_family).style("font-size", font_size).style("line-height", line_height).style("border", "1px solid #888888")
	    .attr("rows", 10);
	var submit_table = form.append("table")
	    .attr("id", function(d){ return "slsSubmitTable_" + sparqlet + "___" + d;})
	    .style("margin-top", "10px").style("margin-bottom", "10px").style("border", "0");
	var tr = submit_table.append("tr");
	tr.append("td")
	    .append("input")
	    .attr("id", function(d){ return "submit_button_slsTa_" + sparqlet + "___" + d; })
	    .attr("class", "slsSubmitButton slsFocusNode")
	    .attr("type", "submit")
	    .attr("value", "submit");
	tr.append("td")
	    .append("div")
	    .attr("id", function(d){ return "slsLoading_slsTa_" + sparqlet + "___" + d; })
	    .style("width", "40px").style("height", "40px").style("text-align", "center").style("visibility", "hidden")
	    .append("span")
	    .style("font-size", "40px").style("position", "relative").style("top", "-8px").style("color", "#bbbbbb")
	    .attr("class", "entypo-arrows-ccw");
	tr.append("td")
	    .append("input")
	    .attr("type", "button")
	    .attr("value", "json")
	    .attr("class", "slsJsonButton")
	    .attr("id", function(d){ return "slsJsonButton_" + sparqlet + "___" + d; })
	    .style("display", "none")
	    .on("click", function(d){ SPARQListSupport.swichSparqlRes(sparqlet + "___" + d); });

	for(var i = 0; i < objects.length; i++){
	    var mode = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + objects[i]];
	    d3.select("#slsSelect_" + sparqlet + "___" + objects[i])
		.selectAll(".mode_option")
		.attr("selected", function(d){ if(this.value == mode){ return "selected"; }});
	    var mode = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + objects[i]];
	    if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + objects[i]] == "sparql"){
		d3.select("#slsJsonButton_" + sparqlet + "___" + objects[i]).style("display", "block");
	    }
	    SPARQListSupport.changeCM(sparqlet, objects[i], mode);
	}

	SPARQListSupport.changeTextarea(sparqlet, localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"]);
	
	// mouse
	SPARQListSupport.mouseEvent(d3.select("#sparqlet_objects"));
    },

    makeObjectList: function(sparqlet, objects){
	var ul = d3.select("#sparqlet_objects");
	ul.html("");
	var li = ul.selectAll(".sparqlet_object")
	    .data(objects)
	    .enter()
	    .append("li")
	    .attr("id", function(d){ return "slsLi_" + sparqlet + "___" + d; });
	var ul2 = li.append("ul").attr("class", "none_deco");
	ul2.append("li")
	    .attr("class", "sparqlet_object float_left slsFocusNode")
	    .attr("id", function(d){ return "slsLi2_" + sparqlet + "___" + d; })
	    .text(function(d){ return d; })
	    .style("background-color", function(d){
		if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] == d){
		    return "#d3e5f1";
		}else{
		    return "#ffffff";
		}
	    })
	    .style("cursor", function(d){
		if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] == d){
		    return "move";
		}else{
		    return "pointer";
		}
	    })
	    .style("filter", function(d){
		if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] == d){
		    return "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))";
		}else{
		    return "none";
		}
	    })
	    .on("click", function(d){SPARQListSupport.changeTextarea(sparqlet, d); });
	ul2.append("li").attr("class", "float_left")
	    .append("div").attr("class", "entypo-cancel-squared remove_icon")
	    .on("click", function(d){
		d3.select("#remove_step_name").text("Remove '" + d + "':");
		d3.select("#remove_step_sparqlet").property("value", sparqlet);
		d3.select("#remove_step_object").property("value", d);
		SPARQListSupport.showGrayPopup('remove_step');
	});
	ul2.append("li").attr("class", "float_clear");
    },
    
    //make sparqlet_"select"_tag
    readSparqList: function(){
	localStorage[SPARQListSupport.path + "_sparql_tmp"] = "";
	if(!localStorage[SPARQListSupport.path + "_sparqletList"]) localStorage[SPARQListSupport.path + "_sparqletList"] = "SPARQLet";
	var sparqlist = localStorage[SPARQListSupport.path + "_sparqletList"].split(" ");
	if(!localStorage[SPARQListSupport.path + "_selectedSparqlet"]) localStorage[SPARQListSupport.path + "_selectedSparqlet"] = sparqlist[0];

	if(d3.select("#sparqlet_name_select").empty() == false) d3.select("#sparqlet_name_select").remove();
	if(d3.select("#sparqlet_main").empty() == false) d3.select("#sparqlet_main").remove();

	var sparqlet_list = d3.select("#sparqlet_list");
	var sparqlet_name = sparqlet_list.select("#sparqlet_name")
	    .append("select")
	    .attr("id", "sparqlet_name_select")
	    .attr("class", "slsSelect")
	    .on("change", function(){
		var sparqlet = this.value;
		localStorage[SPARQListSupport.path + "_selectedSparqlet"] = sparqlet;
		SPARQListSupport.readSparqList();
	    });
	sparqlet_name.selectAll(".sparqlet_name_select_option")
	    .data(sparqlist)
	    .enter()
	    .append("option")
	    .attr("class", "sparqlet_name_select_option")
	    .attr("value", function(d){ return d; })
	    .text(function(d){ return d; })
	    .attr("selected", function(d){
		if(localStorage[SPARQListSupport.path + "_selectedSparqlet"] == d) return "selected";
	    });

	SPARQListSupport.readSparqlet();
    },

    clickFuncSubmitButton: function(sparqlet, object){
	var id = sparqlet + "___" + object;
	var mode = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object];
	if(mode == "sparql"){
	    SPARQListSupport.editSparqlQuery(id);
	    document.getElementById("submit_button_slsTa_" + id).click();
	}else if(mode == "text/plain"){ 
	    SPARQListSupport.params2json(id);
	}else if(mode == "js"){
	    SPARQListSupport.copyJS(id);
	    SPARQListSupport.runJS(id);
	}else{
	    SPARQListSupport.makeHtml(id);
	}
    },

    showGrayPopup: function(class_name){
	d3.selectAll("." + class_name).style("display", "block");
	if(class_name == "remove_sparqlet"){
	    var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	    d3.select("#remove_sparqlet_name").html("Remove '" + sparqlet + "':");
	}else if(class_name == "rename_step"){
	    var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	    d3.select("#renew_step_name").property("value", localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"]);
	}else if(class_name == "config"){
	    var font_family = SPARQListSupport.font_family;
	    var font_size= SPARQListSupport.font_size;
	    var line_height = SPARQListSupport.line_height;
	    if(localStorage[SPARQListSupport.path + "_font_family"]) font_family = localStorage[SPARQListSupport.path + "_font_family"];
	    if(localStorage[SPARQListSupport.path + "_font_size"]) font_size = localStorage[SPARQListSupport.path + "_font_size"];
	    if(localStorage[SPARQListSupport.path + "_line_height"]) line_height = localStorage[SPARQListSupport.path + "_line_height"];
	    d3.select("#font_family").property("value", font_family);
	    d3.select("#font_size").property("value", font_size);
	    d3.select("#line_height").property("value", line_height);
	}
    },
    
    hideGrayPopup: function(){
	d3.selectAll(".grayout_popup").style("display", "none");
    },

    getAddSparqletName: function(){
	var sparqlet = d3.select("#new_sparqlet_name").property("value");
	if(!sparqlet) sparqlet = "SPARQLet";
	var sparqlist = localStorage[SPARQListSupport.path + "_sparqletList"].split(" ");
	sparqlet = SPARQListSupport.chkName(sparqlet, sparqlist);
	sparqlist.push(sparqlet);
	localStorage[SPARQListSupport.path + "_sparqletList"] = sparqlist.join(" ");
	localStorage[SPARQListSupport.path + "_selectedSparqlet"] = sparqlet;
	SPARQListSupport.readSparqList();
	SPARQListSupport.hideGrayPopup();
    },

    removeSparqlet: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	var sparqlist = localStorage[SPARQListSupport.path + "_sparqletList"].split(" ");
	
	delete(localStorage[SPARQListSupport.path + "_selectedSparqlet"]);
	delete(localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"]);
	delete(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"]);
	for(var i = 0; i < objects.length; i++){
	    delete(localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + objects[i]]);
	    var id = "slsTa_" + sparqlet + "___" + objects[i];
	    delete(localStorage[SPARQListSupport.path + '_sparql_code_0_' + id]);
	}

	var list = [];
	for(var i = 0; i < sparqlist.length; i++){
	    if(sparqlet != sparqlist[i]){
		list.push(sparqlist[i]);
	    }
	}
	localStorage[SPARQListSupport.path + "_sparqletList"] = list.join(" ");
	SPARQListSupport.readSparqList();
	SPARQListSupport.hideGrayPopup();
    },
    
    getAddStepName: function(){
	var sparqlet = d3.select("#add_step_sparqlet").property("value");
	var object = d3.select("#new_step_name").property("value");
	SPARQListSupport.addStep(sparqlet, object, "");
	SPARQListSupport.hideGrayPopup();
    },

    removeStep: function(){
	var sparqlet = d3.select("#remove_step_sparqlet").property("value");
	var object = d3.select("#remove_step_object").property("value");
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(/\s/);
	var list = [];
	var new_obj;
	for(var i = 0; i < objects.length; i++){
	    if(object != objects[i]){
		list.push(objects[i]);
	    }else if(localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] == object){
		if(objects[i+1]) new_obj = objects[i+1];
		else if(objects[i-1]) new_obj = objects[i-1];
	    }
	}
	
	if(new_obj) SPARQListSupport.changeTextarea(sparqlet, new_obj);
	
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"] = list.join(" ");
	d3.select("#slsLi_" + sparqlet + "___" + object).remove();
	d3.select("#slsDiv_" + sparqlet + "___" + object).remove();
	SPARQListSupport.hideGrayPopup();	
    },

    renameStep: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	var object = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	var new_object = d3.select("#renew_step_name").property("value");
	var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(/\s/);
	var list = [];
	for(var i = 0; i < objects.length; i++){
	    if(object != objects[i]){
		list.push(objects[i]);
	    }else{
		list.push(new_object);
		localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"] = new_object;
		localStorage[SPARQListSupport.path + "_sparql_code_0_slsTa_" + sparqlet + "___" + new_object] = localStorage[SPARQListSupport.path + "_sparql_code_0_slsTa_" + sparqlet + "___" + object];
		localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + new_object] = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object];
		delete(localStorage[SPARQListSupport.path + "_slsTa_" + sparqlet + "___" + object]);
		delete(localStorage[SPARQListSupport.path + "_" + sparqlet + "_objectMode_" + object]);
	    }
	}
	localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"] = list.join(" ");
	SPARQListSupport.readSparqList();
	SPARQListSupport.hideGrayPopup();	
    },

    setFontStyle: function(f){
	var font_family = SPARQListSupport.font_family;
	var font_size= SPARQListSupport.font_size;
	var line_height = SPARQListSupport.line_height;
	if(f){
	    if(d3.select("#font_family").property("value").match(/\w/)){
		font_family = d3.select("#font_family").property("value");
	    }
	    if(d3.select("#font_size").property("value").match(/\d+px/)){
		font_size = d3.select("#font_size").property("value").match(/(\d+px)/)[1];
	    }
	    if(d3.select("#line_height").property("value").match(/\d+px/)){
		line_height = d3.select("#line_height").property("value").match(/(\d+px)/)[1];
	    }
	}
	localStorage[SPARQListSupport.path + "_font_family"] = font_family;
	localStorage[SPARQListSupport.path + "_font_size"] = font_size;
	localStorage[SPARQListSupport.path + "_line_height"] = line_height;
	SPARQListSupport.readSparqList();
	SPARQListSupport.hideGrayPopup();
    },

    swichSparqlRes: function(id){
	var res = d3.select("#res_div_slsTa_" + id);
	var table = res.select("table");
	var pre = res.select("pre");
	if(table.style("display") == "none"){
	    table.style("display", "block");
	    pre.style("display", "none");
	}else{
	    table.style("display", "none");
	    pre.style("display", "block");
	}
    },
    
    getName: function(id){
	var tmp = id.split(/___/);
	return tmp;
    },

    chkName: function(name, list){
	name = name.replace(/[^\w]/g, "_");
	var original = name;
	var post = 0;
	var f = 1;
	while(f){
	    f = 0;
	    for(var i = 0; i < list.length; i++){
		if(list[i] == name){
		    f = 1;
		    post++;
		    name = original + "_" + post;
		    break;
		}
	    }
	}
	return name;
    },

    getStyle: function(){
	var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	var object = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	var form = document.getElementById("slsForm_" + sparqlet + "___" + object);
	var childs = form.childNodes;
	for(var i = 0; i < childs.length; i++){
	    if(childs[i].className && childs[i].className.match(/CodeMirror/) && childs[i].className.match(/cm-s-default/)){
		SPARQListSupport.cmDivWidth = childs[i].style.width;
		SPARQListSupport.cmDivHeight = childs[i].style.height;
	    }else if(childs[i].id && childs[i].id == "res_div_slsTa_" + sparqlet + "___" + object){
		SPARQListSupport.resDivWidth = childs[i].style.width;
		SPARQListSupport.resDivHeight = childs[i].style.height;
	    }
	}
    },
    
    setStyle: function(sparqlet, object){
	if(SPARQListSupport.cmDivWidth && SPARQListSupport.cmDivHeight && SPARQListSupport.resDivWidth && SPARQListSupport.resDivHeight){
	    var form = document.getElementById("slsForm_" + sparqlet + "___" + object);
	    var childs = form.childNodes;
	    for(var i = 0; i < childs.length; i++){
		if(childs[i].className && childs[i].className.match(/CodeMirror/) && childs[i].className.match(/cm-s-default/)){
		    if(SPARQListSupport.cmDivWidth) childs[i].style.width = SPARQListSupport.cmDivWidth;
		    if(SPARQListSupport.cmDivHeight) childs[i].style.height = SPARQListSupport.cmDivHeight;
		}else if(childs[i].id && childs[i].id == "res_div_slsTa_" + sparqlet + "___" + object){
		    if(SPARQListSupport.resDivWidth) childs[i].style.width = SPARQListSupport.resDivWidth;
		    if(SPARQListSupport.resDivHeight) childs[i].style.height = SPARQListSupport.resDivHeight;
		}
	    }
	}
    },
    
    copyStringToClipboard: function(string){
	var temp = document.createElement('div');
	temp.appendChild(document.createElement('pre')).textContent = string;
	var s = temp.style;
	s.position = 'fixed';
	s.left = '-100%';
	document.body.appendChild(temp);
	document.getSelection().selectAllChildren(temp);
	var result = document.execCommand('copy');
	document.body.removeChild(temp);
	return result;
    },

    escape_html: function (string) {
	if(typeof string !== 'string') {
	    return string;
	}
	return string.replace(/[&'`"<>]/g, function(match) {
	    return {
		'&': '&amp;',
		"'": '&#x27;',
		'`': '&#x60;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;',
	    }[match]
	});
    },

    mouseEvent: function(mouseEveElement){
	var dragTarget = false;
	var startY;
	var sideFlag = 0;

	var mouseDownEvent = function(e){
	    var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	    var object = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	    if(d3.event.target.id == "slsLi2_" + sparqlet + "___" + object){
		dragTarget = d3.select("#slsLi_" + sparqlet + "___" + object);
		startY = d3.mouse(this)[1];
		var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
		if(object == objects[0]) sideFlag = -1;
		else if(object == objects[objects.length - 1]) sideFlag = 1;
		else sideFlag = 0;
	    }
	};

	var mouseUpEvent = function(){
	    if(dragTarget){
		var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
		var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
		SPARQListSupport.makeObjectList(sparqlet, objects);
		dragTarget = false;
	    }
	    if(document.activeElement.tagName.toLowerCase() == "textarea"){
		d3.selectAll(".slsFocusNode").style("filter", "none");
		d3.selectAll(".CodeMirror").style("filter", "none");
		SPARQListSupport.focus = false;
	    }
	};

	var mouseMoveEvent = function(e){
	    if(dragTarget){
		var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
		var object = localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
		var dy = d3.mouse(this)[1] - startY;
		if((dy < 0 && sideFlag != -1) ||( dy > 0 && sideFlag != 1)){
		    dragTarget.style("transform", "translateY(" + dy + "px)");
		}
		if(dy < -46 && sideFlag != -1){
		    SPARQListSupport.replaceStep(sparqlet, object, -1);
		    dragTarget = d3.select("#slsLi_" + sparqlet + "___" + object);
		    startY += dy;
		}else if(dy > 46 && sideFlag != 1){
		    SPARQListSupport.replaceStep(sparqlet, object, 1);
		    dragTarget = d3.select("#slsLi_" + sparqlet + "___" + object);
		    startY += dy;
		}
		var objects = localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
		if(object == objects[0]) sideFlag = -1;
		else if(object == objects[objects.length - 1]) sideFlag = 1;
		else sideFlag = 0;
	    }
	};
	
	var keyUpEvent = function(){
	    var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
	    var object =  localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
	    var id = sparqlet + "___" + object;
	    var objects =  localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
	    var focus = SPARQListSupport.stepTarget;
	    if(d3.event.keyCode == 13){ // enter
		if(d3.event.ctrlKey){
		    if(SPARQListSupport.focus == false) SPARQListSupport.clickFuncSubmitButton(sparqlet, object);
		}else{
		    if(SPARQListSupport.focus == "step") SPARQListSupport.changeTextarea(sparqlet, SPARQListSupport.stepTarget);
		    else if(SPARQListSupport.focus == "runButton"){
			SPARQListSupport.clickFuncSubmitButton(sparqlet, object);
		    }else{
			var nodes = document.getElementById("slsForm_" + id).elements;
			var select = document.getElementById("slsSelect_" + id);
			for(var i = 0; i < nodes.length; i++){
			    if(nodes[i] == select){
				nodes[i + 2].focus();
				d3.selectAll(".CodeMirror").style("filter", "none");
				SPARQListSupport.focus = false;
			    }
			}
		    }
		}
	    }
	};
	
	var keyDownEvent = function(){
	    if(SPARQListSupport.focus != false){
		var sparqlet = localStorage[SPARQListSupport.path + "_selectedSparqlet"];
		var object =  localStorage[SPARQListSupport.path + "_" + sparqlet + "_selectedObject"];
		var id = sparqlet + "___" + object;
		var objects =  localStorage[SPARQListSupport.path + "_" + sparqlet + "_objects"].split(" ");
		var focus = SPARQListSupport.stepTarget;
		if(d3.event.keyCode == 16) { // Shift(+Alt): move neighbor tab
		    if(d3.event.altKey) {
			if(SPARQListSupport.focus == "runButton") SPARQListSupport.focus = "textarea";
			else if(SPARQListSupport.focus == "textarea"){
			    SPARQListSupport.focus = "step";
			    SPARQListSupport.stepTarget = objects[objects.length - 1];
			}else if(objects[0] == focus) SPARQListSupport.focus = "runButton";
			else{
			    SPARQListSupport.focus = "step";
			    for(var i = 0; i < objects.length; i++){
				if(objects[i] != focus) SPARQListSupport.stepTarget = objects[i];
				else break; 
			    }
			}
		    }else{
			if(SPARQListSupport.focus == "textarea") SPARQListSupport.focus = "runButton";
			else if(SPARQListSupport.focus == "runButton"){
			    SPARQListSupport.focus = "step";
			    SPARQListSupport.stepTarget = objects[0];
			}else if(objects[objects.length - 1] == focus) SPARQListSupport.focus = "textarea";
			else{
			    SPARQListSupport.focus = "step";
			    for(var i = 0; i < objects.length; i++){
				if(objects[i] ==focus) {
				    SPARQListSupport.stepTarget = objects[i + 1];
				    break; 
				}
			    }
			}
		    }
		    SPARQListSupport.moveFocus();
		}else if(d3.event.keyCode >= 37 && d3.event.keyCode <= 40){ // move
		    if(d3.event.keyCode == 38 || d3.event.keyCode == 40){
			if(SPARQListSupport.focus == "step"){
			    if(d3.event.keyCode == 38){
				if(objects[0] == focus) SPARQListSupport.stepTarget = objects[objects.length - 1];
				else{
				    for(var i = 0; i < objects.length; i++){
					if(objects[i] != focus) SPARQListSupport.stepTarget = objects[i];
					else break; 
				    }
				}
			    }else{
				if(objects[objects.length - 1] == focus) SPARQListSupport.stepTarget = objects[0];
				else{
				    for(var i = 0; i < objects.length; i++){
					if(objects[i] ==focus) {
					    SPARQListSupport.stepTarget = objects[i + 1];
					    break; 
					}
				    }
				}
			    }
			}else{
			    if(SPARQListSupport.focus == "textarea") SPARQListSupport.focus = "runButton";
			    else SPARQListSupport.focus = "textarea";
			    SPARQListSupport.focusRight = SPARQListSupport.focus;
			}
		    }else{
			if(SPARQListSupport.focus == "step") SPARQListSupport.focus = SPARQListSupport.focusRight;
			else SPARQListSupport.focus = "step";
		    }
		    SPARQListSupport.moveFocus();	
		}
	    }else{
		if(d3.event.keyCode == 27){ // esc
		    document.activeElement.blur();
		    d3.selectAll(".CodeMirror").style("filter", "drop-shadow(0px 0px 5px rgba(255,127,0,0.6))");
		    SPARQListSupport.focus = "textarea";
		}
	    }
	};

	mouseEveElement.on("mousedown", mouseDownEvent, false);
	d3.select(window).on("mouseup", mouseUpEvent, false);
	mouseEveElement.on("mousemove", mouseMoveEvent, false);
	d3.select(window).on("keydown", keyDownEvent, false);
	d3.select(window).on("keyup", keyUpEvent, false);
    },
};

window.onerror = function (message, file, line, col, error) {
    if(d3.select("#res_div_slsTa_" + SPARQListSupport.run_id).select('pre').empty() == false){
	d3.select("#res_div_slsTa_" + SPARQListSupport.run_id).select('pre').html("line " + line + ":" + col + " ; " + error);
    }
    return false;
};


// CodeMirror addon for SPARQList-support
CodeMirror.defineOption("sparqListSupportAutoSave", false, function(cm, id) {
	var data = cm.state.selectionPointer;
	if (id) {
	    data = cm.state.selectionPointer = {
		value: typeof id == "string" ? id : "default",
		keydown: function(e) { keyDown(cm, e, id); },
		keyup: function(e) { keyUp(cm, e, id); }
	    };
	    CodeMirror.on(cm.getWrapperElement(), "keydown", data.keydown);
	    CodeMirror.on(cm.getWrapperElement(), "keyup", data.keyup);
	    
	    initDiv(cm, id);
	    initDivInner(cm, id);
	}
});
   
var Pos = CodeMirror.Pos;
    
var ssParam = {
	preString: ""
}

/// event
//////////////////////////////////
    
function keyDown(cm, e, id){
	saveCode(cm, id);
}

function keyUp(cm, e, id){
	saveCode(cm, id);
}
    

/// div value <-> textarea code --> localStorage
//////////////////////////////////

function saveCode(cm, id){
	var text =  cm.getValue();
	ssParam.textarea[id].value = text;
	var selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id] = text;
	if(text.match(/^##+ *endpoint +https*:\/\//)){ ssParam.formNode[id].action = text.match(/^##+ *endpoint +(https*:\/\/[^\s,;]+)/)[1];}
	else{ssParam.formNode[id].action = ssParam.defaultEndpoint[id];}
}

function setCmDiv(cm, id){
	var text = ssParam.textarea[id].value;
	cm.setValue(text);
	if(text.match(/^##+ *endpoint +https*:\/\//)){ ssParam.formNode[id].action = text.match(/^##+ *endpoint +(https*:\/\/[^\s,;]+)/)[1];}
	else{ssParam.formNode[id].action = ssParam.defaultEndpoint[id];}
}
    
/// init
//////////////////////////////////
    
function initDiv(cm, id){
	// CodeMirror style
	if(!ssParam.textarea) {
	    ssParam.textarea = {};
	    ssParam.codeMirrorDiv = {};
	    ssParam.resultNode = {};
	    ssParam.formNode = {};
	    ssParam.defaultEndpoint = {};
	    ssParam.job = {};
	    ssParam.results = {};
	}
	ssParam.textarea[id] = document.getElementById(id);
	var textarea = ssParam.textarea[id];
	var parentNode = textarea.parentNode;
	var childNodes = parentNode.childNodes;
	var codeMirrorDiv;
	for(var i = 0; childNodes[i]; i++){
	    if(childNodes[i].className && childNodes[i].className.match("cm-s-default")) {
		codeMirrorDiv = childNodes[i];
		break;
	    }
	}
	ssParam.codeMirrorDiv[id] = codeMirrorDiv;
	// parent form
	for(var i = 0; i < 100; i++){
	    if(parentNode.tagName.toLowerCase() == "form"){
		break;
	    }else{
		parentNode = parentNode.parentNode;
	    }
	}
	ssParam.formNode[id] = parentNode;
	ssParam.defaultEndpoint[id] = ssParam.formNode[id].action;
	
	var cmStyle = document.getElementById("sparqlSupportCmDivStyle");
	var baseStyle = {}, borderWidth = [], borderStyle = [], borderColor = [], borderRadius = [], margin = [], padding = [], areaWidth, areaHeight;
	
	if(!cmStyle){
	    textarea.style.display = "inline";
	    baseStyle = textarea.currentStyle || document.defaultView.getComputedStyle(textarea, '');
	    var width = textarea.offsetWidth;
	    var height = textarea.offsetHeight;
	    borderWidth = [baseStyle.borderTopWidth, baseStyle.borderRightWidth, baseStyle.borderBottomWidth, baseStyle.borderLeftWidth];
	    borderStyle = [baseStyle.borderTopStyle, baseStyle.borderRightStyle, baseStyle.borderBottomStyle, baseStyle.borderLeftStyle];
	    borderColor = [baseStyle.borderTopColor, baseStyle.borderRightColor, baseStyle.borderBottomColor, baseStyle.borderLeftColor];
	    borderRadius = [baseStyle.borderTopLeftRadius, baseStyle.borderTopRightRadius, baseStyle.borderBottomRightRadius, baseStyle.borderBottomLeftRadius];
	    margin = [baseStyle.marginTop, baseStyle.marginRight, baseStyle.marginBottom, baseStyle.marginLeft];
	    padding = [baseStyle.paddingTop, baseStyle.paddingRight, baseStyle.paddingBottom, baseStyle.paddingLeft];
	    textarea.style.display = "none";
	    ssParam.areaDeltaWidth = parseInt(padding[1].replace(/px/, "")) + parseInt(padding[3].replace(/px/, "")) + parseInt(borderWidth[1].replace(/px/, ""))  + parseInt(borderWidth[3].replace(/px/, ""));
	    ssParam.areaDeltaHeight = parseInt(padding[0].replace(/px/, "")) + parseInt(padding[2].replace(/px/, "")) + parseInt(borderWidth[0].replace(/px/, ""))  + parseInt(borderWidth[2].replace(/px/, ""));
	    areaWidth = width - ssParam.areaDeltaWidth;
	    areaHeight = height - ssParam.areaDeltaHeight;
	}else{
	    var a = cmStyle.value.split("|");
	    areaHeight = a[1];
	    areaWidth = a[2];
	    borderWidth = [a[3], a[4], a[5], a[6]];
	    borderStyle = [a[7], a[8], a[9], a[10]];
	    borderColor = [a[11], a[12], a[13], a[14]];
	    borderRadius = [a[15], a[16], a[17], a[18]];
	    margin = [a[19], a[20], a[21], a[22]];
	    padding = [a[23], a[24], a[25], a[26]];
	    baseStyle.fontSize = a[27];
	    baseStyle.lineHeight = a[28];
	    baseStyle.fontFamily = a[29];
	    cmStyle.parentNode.removeChild(cmStyle);
	}
	
	codeMirrorDiv.style.top = '0px';
	codeMirrorDiv.style.left = '0px';
	codeMirrorDiv.style.width = areaWidth + 'px';
	codeMirrorDiv.style.height = areaHeight + 'px';
	codeMirrorDiv.style.borderStyle = borderStyle.join(" ");
	codeMirrorDiv.style.borderWidth = borderWidth.join(" ");
	codeMirrorDiv.style.borderColor = borderColor.join(" ");
	codeMirrorDiv.style.borderRadius = borderRadius.join(" ");
	//	codeMirrorDiv.style.padding = padding.join(" ");
	codeMirrorDiv.style.padding = '0px 0px 0px 0px';
	codeMirrorDiv.style.margin = margin.join(" ");
	codeMirrorDiv.style.fontSize = baseStyle.fontSize;
	codeMirrorDiv.style.fontFamily = baseStyle.fontFamily;
	codeMirrorDiv.style.lineHeight = baseStyle.lineHeight;
	codeMirrorDiv.style.resize = 'both';

	// localStorage
	ssParam.pathName = location.pathname;
	var selTab = 0;
	if(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]){
	    selTab = localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id];
	}else{
	    localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id] = selTab;
	}
	if(localStorage[ssParam.pathName + '_sparql_code_' + selTab + '_' + id] != null){
	    textarea.value = localStorage[ssParam.pathName + '_sparql_code_' + selTab + '_' + id];
	    setCmDiv(cm, id);
	}
	ssParam.freqTerm = {};
	ssParam.freqPrefix = {};
	ssParam.freqTermPre = [];
	if(localStorage[ssParam.pathName + '_sparql_term_freq']){
	    var array = localStorage[ssParam.pathName + '_sparql_term_freq'].split(" ");
	    for(var i = 0; array[i]; i++){
		ssParam.freqTermPre.push(array[i]);
		if(ssParam.freqTerm[array[i]]) ssParam.freqTerm[array[i]]++;
		else ssParam.freqTerm[array[i]] = 1;
		var prefix = array[i].split(":")[0] + ":";
		if(ssParam.freqPrefix[prefix]) ssParam.freqPrefix[prefix]++;
		else ssParam.freqPrefix[prefix] = 1;		
	    }
	}
	
	// Query tab
	var ulNode = document.createElement("ul");
	codeMirrorDiv.appendChild(ulNode);
	ulNode.id = "query_tab_list_" + id;
	ulNode.style.display = "none";
	ulNode.style.margin = "0px";
	ulNode.style.padding = "0px";
	ulNode.style.lineHeight = "14px";
	ulNode.style.position = "absolute";
	ulNode.style.top = "5px";
	ulNode.style.right = "5px";
	ulNode.style.zIndex = "2";
	ulNode.style.display = "inline";
	
	ssParam.resultNode[id] = document.createElement("div");
	ssParam.textarea[id].parentNode.appendChild(ssParam.resultNode[id]);
	ssParam.resultNode[id].style.backgroundColor = "#f8f8f8";
	ssParam.resultNode[id].style.width = areaWidth + 'px';
	ssParam.resultNode[id].style.height = '300px';
	ssParam.resultNode[id].style.border = "solid 3px #dddddd";
	ssParam.resultNode[id].style.borderRadius = "10px";
	ssParam.resultNode[id].style.overflow = "scroll";
	ssParam.resultNode[id].style.resize = 'both';
	ssParam.resultNode[id].style.zIndex = '2';
	ssParam.resultNode[id].style.display = "none";
	ssParam.resultNode[id].id = "res_div_" + id;

	var pre = document.createElement("pre");
	pre.id = "inner_result_json";
	ssParam.resultNode[id].appendChild(pre);
	
	var confirm = document.createElement("ul");
	ssParam.confirmBox = confirm;
	confirm.id = "confirm_" + id;
	confirm.style.display = "none";
	confirm.style.position = "absolute";
	confirm.style.top = "15px";
	confirm.style.right = "5px";
	confirm.style.zIndex = '2';
	codeMirrorDiv.appendChild(confirm);

	// userAgent
	ssParam.userAgent = navigator.userAgent.toLowerCase();
	if(ssParam.userAgent.match("applewebkit")) ssParam.userAgent = 'webkit';
	else if(ssParam.userAgent.match("firefox")) ssParam.userAgent = 'firefox';
	else if(ssParam.userAgent.match("trident")) ssParam.userAgent = 'ie';

	if(ssParam.userAgent == "webkit"){  // for edit-area resize in webkit
	    var cmS = document.getElementsByClassName("CodeMirror-scroll");
	    for(var i = 0; i < cmS.length; i++){
		cmS[i].style.width = "99.5%";
	    }
	}
	
	saveCode(cm, id);
}

function initDivInner(cm, id){
	var codeMirrorDiv = ssParam.codeMirrorDiv[id];
	var ulNode = document.getElementById("query_tab_list_" + id);
	var liNode = document.createElement("li");
	if(!ssParam.innerMode) ssParam.innerMode = {};
	ssParam.innerMode[id] = 0;
	
	ulNode.appendChild(liNode);
	liNode.id = "query_tab_inner_" + id;
	liNode.className = "query_tab";
	liNode.style.width = "14px";
	liNode.innerHTML = "i";
	
	if(localStorage[ssParam.pathName + '_sparql_target_' + id]){
	    var target = localStorage[ssParam.pathName + '_sparql_target_' + id];
	    if(target == "inner") { switchInnerMode(id); }
	    if(target == "inner_j"){ switchInnerMode(id); switchInnerMode(id);}
	}else{
	    switchInnerMode(id);
	}
	
	ssParam.color = { "f": 1, "n": 63, "q": false};
}

function switchInnerMode(id){
	if(ssParam.resultNode[id].style.display == "none"){
	    ssParam.resultNode[id].style.display = "block";

	    localStorage[ssParam.pathName + '_sparql_target_' + id] = "inner";
	    document.getElementById("query_tab_inner_" + id).style.backgroundColor = "rgba(255, 255, 255, 0.5)";
	    document.getElementById("query_tab_inner_" + id).style.color =  "rgba(127, 127, 127, 1)";
	    ssParam.innerMode[id] = 1;
	}else{
	    if(ssParam.innerMode[id] == 1){
		if(document.getElementById("inner_result_table")){
		    document.getElementById("inner_result_table").style.display = "none";
		    document.getElementById("inner_result_json").style.display = "block";
		}
		document.getElementById("query_tab_inner_" + id).innerHTML = "j";
		localStorage[ssParam.pathName + '_sparql_target_' + id] = "inner_j";
		ssParam.innerMode[id] = 2;
	    }else{
		if(document.getElementById("inner_result_table")){
		    document.getElementById("inner_result_json").style.display = "none";
		    document.getElementById("inner_result_table").style.display = "block";
		}
		ssParam.resultNode[id].style.display = "none";
		var inputNode = document.getElementById("submit_button");
		inputNode.type = "submit";
		document.getElementById("query_tab_inner_" + id).innerHTML = "i";
		localStorage[ssParam.pathName + '_sparql_target_' + id] = "_self";
		document.getElementById("query_tab_inner_" + id).style.backgroundColor = "rgba(127, 127, 127, 0.5)";
		document.getElementById("query_tab_inner_" + id).style.color = "rgba(255, 255, 255, 1)";
		ssParam.innerMode[id] = 0;
	    }
	}
}

export default SPARQListSupport;
