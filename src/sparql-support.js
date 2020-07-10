/* name:    SPARQL support
// version: __VERSION__
//
// Released under the MIT license
// Copyright (c) 2015 Yuki Moriya (DBCLS)
// http://opensource.org/licenses/mit-license.php */

import CodeMirror from "codemirror/lib/codemirror";

CodeMirror.defineOption("sparqlSupportAutoComp", false, function(cm, id) {
    let data = cm.state.selectionPointer;
    if(id === true) id = "query";
    if(id == "ctrlEnterSubmitOff"){
	id = "query";
	ssParam.ctrlEnterSubmitFlag = false;
    }
    if (id) {
	data = cm.state.selectionPointer = {
	    value: typeof id == "string" ? id : "default",
	    keydown: function(e) { keyDown(cm, e, id); },
	    keyup: function(e) { keyUp(cm, e, id); }
	};
	CodeMirror.on(cm.getWrapperElement(), "keydown", data.keydown);
	CodeMirror.on(cm.getWrapperElement(), "keyup", data.keyup);

	initDiv(cm, id);
    }
});

CodeMirror.defineOption("sparqlSupportQueries", false, function(cm, id) {
    let data = cm.state.selectionPointer;
    if(id === true) id = "query";
    if (id) {
	data = cm.state.selectionPointer = {
	    value: typeof id == "string" ? id : "default",
	    mousedown: function(e) { mouseDown(cm, e, id); },
	    mouseup: function() { mouseUp(cm, id); },
	    mousemove: function(e) { mouseMove(cm, e, id); }
	};
	// CodeMirror.on(cm.getWrapperElement(), "mousedown", data.mousedown);
	// CodeMirror.on(cm.getWrapperElement(), "mousemove", data.mousemove);
	document.addEventListener("mousedown", data.mousedown, false);
	document.addEventListener("mousemove", data.mousemove, false);
	window.addEventListener ("mouseup", data.mouseup, false);

	initDivQueries(cm, id);
    }
});

CodeMirror.defineOption("sparqlSupportInnerMode", false, function(cm, id) {
    let data = cm.state.selectionPointer;
    if(id === true) id = "query";
    if (id) {
	data = cm.state.selectionPointer = {
	    value: typeof id == "string" ? id : "default",
	    mousedown: function(e) { mouseDownInner(e, id); }
	};
	document.addEventListener("click", data.mousedown, false);
	//  CodeMirror.on(cm.getWrapperElement(), "mousedown", data.mousedown);

	initDivInner(cm, id);
    }
});

let Pos = CodeMirror.Pos;

let ssParam = {
    version: "__VERSION__",
    preString: "",
    mixedContent: 1,
    prefixList: "",
    prefixListUrl: [],
    ctrlEnterSubmitFlag: true,
    sparqlProxyFlag: false
}

/// event
//////////////////////////////////

function keyDown(cm, e, id){
    let caret = cm.getCursor('anchor');
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    //	console.log("'" + e.key + "'" + " " + e.code);
    if(ssParam.confirmFlag && !e.ctrlKey && e.key != 'Shift'){ ssParam.confirmFlag = 0; ssParam.confirmBox.style.display = "none"; }
    if(e.key == 'Tab' || (e.key == ' ' && e.ctrlKey)){
	cm.indentLine(caret.line);
	caret = cm.getCursor('anchor');
	let tmp = tabKeyDown(cm, caret, id, e.shiftKey);
	let string = tmp[0];
	let prefixCopy = tmp[1];
	if(string != false){
	    let stringLen = ssParam.termFrag.length;
	    if(ssParam.preString){
		stringLen = ssParam.preString.length;
		if(ssParam.preString.match(/[\(\[\{\<][\)\]\}\>]$/)) caret.ch++;
	    }
	    if(prefixCopy){
		cm.replaceRange(string, Pos(0, 0), Pos(caret.line, caret.ch));
	    }else{
		cm.replaceRange(string, Pos(caret.line, caret.ch - stringLen), Pos(caret.line, caret.ch));
	    }
	    caret = cm.getCursor();
	    if(string.match(/[\(\[\{\<][\)\]\}\>]$/)) cm.setCursor(Pos(caret.line, caret.ch - 1));
	    ssParam.preString = string;
	}
    }else if(e.ctrlKey && e.key == 'Enter') { // Ctrl+Enter: decision (submit query, remove query, command...)
	let line = cm.getLine(caret.line);
	if(line.match(/^#.+;\s*$/)){
	    ssCommand(cm, id, caret, line);
	}else if(ssParam.confirmFlag){
	    if(ssParam.confirmFlag == 1){
		removeTabRun(cm, id);
	    }
	    ssParam.confirmFlag = 0;
	    ssParam.confirmBox.style.display = "none";
	}else if(ssParam.ctrlEnterSubmitFlag == true){
	    if(ssParam.innerMode[id]){
		innerModeRunQuery(selTab, id);
	    }else{
		ssParam.textarea[id].form.submit();
	    }
	}
    }else if(e.ctrlKey && parseInt(e.key) >= 1 && parseInt(e.key) <= 9) { // Ctrl+[1-9]: move tab
	changeTab(cm, parseInt(e.key) - 1, id);
    }else if(e.ctrlKey && e.key == 'Shift') { // Ctrl+Shift(+Alt): move neighbor tab
	if(ssParam.confirmFlag){
	    changeRemoveConfirm();
	}else{
	    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
	    let newTab;
	    if(e.altKey){ newTab = selTab - 1; }
	    else{ newTab = selTab + 1;}
	    if(newTab < 0) newTab = tabNum;
	    else if(newTab > tabNum) newTab = 0;
	    changeTab(cm, newTab, id);
	}
    }else if(e.ctrlKey && (e.key == '+' || e.key == '-')){ // Ctrl+[+-]: make,remove tab
	if(e.key == '+') addTab(cm, id);
	else removeTab(cm, id);
    }else if(e.key != 'Control'){ // not ctrl
	if(ssParam.preString.match(/^\w+:\w+$/)) {
	    if(ssParam.freqTerm[ssParam.preString]) ssParam.freqTerm[ssParam.preString]++;
	    else ssParam.freqTerm[ssParam.preString] = 1;
	    if(ssParam.freqTermPre.length > 3000) ssParam.freqTermPre.shift().push(ssParam.preString);
	    else ssParam.freqTermPre.push(ssParam.preString);
	    localStorage[ssParam.pathName + '_sparql_term_freq'] = ssParam.freqTermPre.join(" ");
	}
	ssParam.termFrag = "";
	ssParam.preString = "";
    }
    hidePopupCopyForm();
    saveCode(cm, id);
}

function keyUp(cm, e, id){
    chkQueryPrefix(id);
    saveCode(cm, id);
}

function mouseDown(cm, e, id) {
    ssParam.termFrag = "";
    ssParam.preString = "";
    ssParam.confirmFlag = 0;
    ssParam.queryTabFlag = false;
    ssParam.dragFlag = false;
    ssParam.confirmBox.style.display = "none";
    if(!e.target.className.match("copy_popup_form")) hidePopupCopyForm();
    if(e.target.className.match("query_tab")){
	if(e.target.id == "query_tab_plus_" + id){
	    addTab(cm, id);
	}else if(e.target.id == "query_tab_minus_" + id){
	    if(parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]) != 0){
		removeTab(cm, id);
	    }
	}else if(e.target.id == "query_tab_inner_" + id){
	    //	innerMode(id);
	}else if(e.target.id == "query_tab_help_" + id){
	    // help button click
	}else{
	    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	    if(parseInt(e.target.innerHTML) - 1 != selTab) changeTab(cm, parseInt(e.target.innerHTML) - 1, id);
	    else{
		let button = document.getElementById("query_tab_0_" + id);
		let baseStyle = button.currentStyle || document.defaultView.getComputedStyle(button, '');
		let width = baseStyle.width.replace("px", "") - 0;
		let margin = baseStyle.marginRight.replace("px", "") - 0;
		ssParam.queryTabSize = width + margin + 2;
		ssParam.mouseXstart = e.pageX;
		ssParam.dragFlag = true;
	    }
	}
	ssParam.queryTabFlag = true;
    }else if(e.target.className.match("confirm_button")){
	if(e.target.id == "query_tab_remove_" + id){
	    removeTabRun(cm, id);
	}
    }
}

function mouseUp(cm, id) {
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    document.getElementById("query_tab_" + selTab + "_" + id).style.left = "0px";
    ssParam.dragFlag = false;
    if(ssParam.queryTabFlag){
	cm.focus();
	ssParam.queryTabFlag = false;
    }
    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
    if(ssParam.codeMirrorDiv[id].offsetWidth - ssParam.textareaWidthDelta != ssParam.ctrlTabsDiv[id].offsetWidth){
	ssParam.ctrlTabsDiv[id].style.width = ssParam.codeMirrorDiv[id].offsetWidth - ssParam.textareaWidthDelta + "px";
	console.log( ssParam.ctrlTabsDiv[id].offsetWidth);
	setQueryTabWidth(tabNum);
    }
}

function mouseMove(cm, e, id) {
    if(ssParam.dragFlag){
	let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
	let dist = e.pageX - ssParam.mouseXstart;
	if(!(selTab == 0 && dist < 0) && !(selTab == tabNum && dist > 0)){
	    document.getElementById("query_tab_" + selTab + "_" + id).style.left = dist + "px";
	    if(dist < ssParam.queryTabSize * (-1)){
		replaceTab(cm, id, -1);
		ssParam.mouseXstart = e.pageX;
	    }else if(dist > ssParam.queryTabSize){
		replaceTab(cm, id, 1);
		ssParam.mouseXstart = e.pageX;
	    }
	}
    }
}

function mouseDownInner(e, id) {
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    if(e.target.id == "submit_button_" + id && ssParam.innerMode[id]){
	innerModeRunQuery(selTab, id);
    }else if(e.target.id == "query_tab_inner_" + id){
	switchInnerMode(id);
    }else if(e.target.className == "describe" && e.which == 1){ // left click
	let uri = decodeURIComponent(e.target.href);
	e.preventDefault();
	innerModeRunQuery(selTab, id, uri);
    }else if(e.target.id == "cm-ss_delete_subres_li"){
	ssParam.subResNode[id].style.display = "none";
	resetDescribeLog();
    }else if(e.target.id == "cm-ss_prev_subres_li"){
	ssParam.subResNode[id].innerHTML = "";
	ssParam.describeTarget--;
	setSubResButton(id);
	ssParam.subResNode[id].appendChild(ssParam.describeLog[ssParam.describeTarget]);
    }else if(e.target.id == "cm-ss_next_subres_li"){
	ssParam.subResNode[id].innerHTML = "";
	ssParam.describeTarget++;
	setSubResButton(id);
	ssParam.subResNode[id].appendChild(ssParam.describeLog[ssParam.describeTarget]);
    }
}

/// div value <-> textarea code --> localStorage
//////////////////////////////////

function saveCode(cm, id){
    let text = cm.getValue();
    ssParam.textarea[id].value = text;
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id] = text;
    setFormAction(cm, id, text);
}

function setCmDiv(cm, id){
    let text = ssParam.textarea[id].value;
    //cm.replaceRange(text, Pos(0, 0), Pos(cm.lineCount(), 0));
    cm.setValue(text);
    cm.focus();
    setFormAction(cm, id, text);
}

/// completion
//////////////////////////////////

function tabKeyDown(cm, caret, id, shiftKey){
    let string;
    let prefixCopy = false;
    let line = cm.getLine(caret.line);
    if(!ssParam.termFrag) getTermFrag(cm, caret);
    if(caret.line == 0 && (ssParam.queryFormer.match(/^##+$/) && ssParam.termFrag.match(/^##+$/)
			   || ssParam.queryFormer.match(/^##+ *$/) && ssParam.termFrag.match(/^endpoint$/)
			   || ssParam.queryFormer.match(/^##+ *endpoint $/) && ssParam.termFrag.match(/^http$/))) { string = autoCompletionEndpoint(); }
    else if(!ssParam.queryFormer && ssParam.termFrag.match(/^C$/) && caret.line == 0) { string = "COPY" }
    else if(!ssParam.queryFormer && ssParam.termFrag.match(/^D[Ee][Ff]$/)) { string = "DEFINE sql:select-option \"order\"" }
    else if(!ssParam.termFrag) return [false, false];
    else { let tmp = autoCompletion(cm, caret, id, shiftKey); string = tmp[0]; prefixCopy = tmp[1]; }
    return [string, prefixCopy];

    function getTermFrag(cm, caret){
	let lineString = cm.getLine(caret.line);
	ssParam.queryFormer = lineString.substr(0, caret.ch).replace(/( *)([\(\{\[]*)\<*[\w:\?\$]*\>*$/, "$1$2");
	ssParam.queryLatter = lineString.substr(caret.ch);
	if(!lineString.substr(caret.ch, 1) || lineString.substr(caret.ch, 1).match(/^[\s\/\^\,\.\;\"\'\(\[\{\<\)\]\}\>]/)){
	    let tmpTerms = lineString.substr(0, caret.ch).split(/[\s\/\^\,\.\;\"\'\(\[\{\)\]\}]/);
	    ssParam.termFrag = tmpTerms[tmpTerms.length - 1].replace(/^[\(\{\[]+/, "").replace(/[\)\}\]]+$/, "");
	    if(ssParam.termFrag.match(/[\.\)\}\]]$/)) ssParam.termFrag = "";
	}else{
	    ssParam.termFrag = "";
	}
	ssParam.termFragTmp = "";
    }

    function autoCompletion(cm, caret, id, shiftKey){
	let string;
	let prefixCopy = false;
	getWords(1, id);
	if((ssParam.queryFormer.toUpperCase().match(/^PREFIX\s+#$/) || ssParam.queryFormer.toUpperCase().match(/^COPY\s+#$/)) && ssParam.termFrag.match(/^#\d+$/) && caret.line == 0) {
	    string = copyPrefix(cm, id);
	    if(string != false) prefixCopy = true;
	}else if(ssParam.queryFormer.toUpperCase().match(/PREFIX\s+$/) && ssParam.termFrag.match(/^\w+:$/)){
	    string = autoCompletionPrefix(cm, caret, id);
	}else if(ssParam.termFrag.match(/^<\w+>$/)) {
	    string = autoCompletionUri();
	}else {
	    string = autoCompletionTerms(id, shiftKey);
	}
	return [string, prefixCopy];
    }

    function autoCompletionTerms(id, shiftKey){
	let terms = [];
	if(ssParam.termFrag.match(/^[A-Z]/) || (ssParam.termFrag.match(/^[a-z]/) && shiftKey)){
	    Array.prototype.push.apply(terms, ssParam.defaultSparqlTerm);
	}else if(ssParam.termFrag.match(/^\$\w+/) || ssParam.termFrag.match(/^\?\?/)){
	    Array.prototype.push.apply(terms, ssParam.resultTerms);
	}else{
	    Array.prototype.push.apply(terms, getWords(1, id));
	}
	terms.unshift(ssParam.termFrag);
	terms = unique(terms);
	let setTermFrag = ssParam.termFrag.toLowerCase();
	let setTermFragTmp = ssParam.termFragTmp.toLowerCase();
	if(!setTermFragTmp){
	    ssParam.termFragTmp = ssParam.termFrag;
	    setTermFragTmp = setTermFrag;
	}
	let flag2 = "";
	let flag3 = 0;
	for(let i = 0; i < terms.length; i++){
	    let string = terms[i].toLowerCase();
	    let stringPrefix = string.substr(0, setTermFrag.length);
	    let stringNoBracket = string.replace(/[\s\(\[\{\)\]\}]/g, "");
	    if(stringPrefix == setTermFrag){
		if(string == setTermFragTmp || stringNoBracket == setTermFragTmp){
		    flag3 = 1;
		    if(terms.length == i + 1) ssParam.termFragTmp = ssParam.termFrag;
		}else if(flag3){
		    ssParam.termFragTmp = terms[i];
		    break;
		}
		if(!flag2) flag2 = terms[i];
	    }else if(flag2 && !(stringPrefix == setTermFrag)){
		if(flag2){
		    ssParam.termFragTmp = flag2;
		}else{
		    ssParam.termFragTmp = ssParam.termFrag;
		}
	    }
	}
	if(ssParam.termFragTmp){
	    let setTerm = ssParam.termFragTmp;
	    if(ssParam.termFrag.match(/^\$\w+$/)) setTerm = setTerm.replace(/^\$\w+:/, "");
	    if(ssParam.termFrag.match(/^\?\?$/)) setTerm = setTerm.replace(/^\?\?:/, "");
	    return setTerm;
	}else{
	    return false;
	}
    }

    function autoCompletionPrefix(cm, caret, id){
	let prefix = ssParam.termFrag.replace(/:$/, "");
	if(ssParam.prefix2Uri[prefix]){
	    cm.replaceRange(" <" + ssParam.prefix2Uri[prefix] + ">", Pos(caret.line, caret.ch), Pos(caret.line, caret.ch));
	    saveCode(cm, id);
	    ssParam.termFrag = "";
	    ssParam.preString = "";
	    return false;
	}else{
	    setPrefixUri(cm, caret, id, prefix, 1);
	    ssParam.termFrag = "";
	    ssParam.preString = "";
	    return false;
	}
    }

    function autoCompletionUri(){
	let term = ssParam.termFrag.replace(/[<>]/g, "");
	let uri = false;
	if(ssParam.defaultUri[term]) uri = "<" + ssParam.defaultUri[term] + ">";
	return uri;
    }

    function autoCompletionEndpoint(){
	let domain = getDomain(ssParam.pathName);
	let string = "## endpoint ";
	if(ssParam.termFrag == "endpoint") string = "endpoint ";
	else if(ssParam.termFrag == "http") string = "";
	let next = "";
	if(localStorage[domain + '_endpoint_list']){
	    let pre = ssParam.termFragTmp;
	    let endpoints = localStorage[domain + '_endpoint_list'].split(" ");
	    if(!pre.match(/^https*:\/\//)){
		next = endpoints[0];
	    }else{
		for(let i = 0; i < endpoints.length; i++){
		    if(pre == endpoints[i]){
			if(endpoints[i + 1]) next = endpoints[i + 1];
			else next = endpoints[0];
			break;
		    }else if(!endpoints[i + 1])next = endpoints[0];
		}
	    }
	}
	if(next){
	    string += next;
	    ssParam.termFragTmp = next;
	}
	return string;
    }

    function copyPrefix(cm, id){
	let copy = ssParam.queryFormer.toUpperCase();
	let tarTab = parseInt(ssParam.termFrag.replace(/^#/, "")) - 1;
	let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
	let string = false;
	if(copy.match(/PREFIX/)){
	    if(tarTab != selTab && tarTab <= tabNum){
		string = "";
		let code = localStorage[ssParam.pathName + '_sparql_code_' + tarTab + "_" + id].split("\n");
		for(let i = 0; i < code.length; i++){
		    if(code[i].toUpperCase().match(/^\s*PREFIX /) || (i == 0 && code[i].toUpperCase().match(/^\s*DEFINE /))){
			string = string + code[i] + "\n";
		    }
		}
	    }
	}else{
	    string = localStorage[ssParam.pathName + '_sparql_code_' + tarTab + "_" + id];
	}
	return string;
    }

    function getWords(allQueryFlag, id){
	let text = "";
	if(allQueryFlag){
	    if(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id] === undefined) localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id] = 0;
	    for(let i = 0; i <= parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]); i++){
		text += " " + localStorage[ssParam.pathName + '_sparql_code_' + i + "_" + id];
	    }
	    if(id.match(/^slsTa_/)){ // for SLARQList support
		let sparqlet = id.match(/^slsTa_(\w+)___/)[1];
		if(localStorage[ssParam.pathName + "_" + sparqlet + "_objects"]){
		    let objects = localStorage[ssParam.pathName + "_" + sparqlet + "_objects"].split(" ");
		    for(let i = 0; i < objects.length; i++){
			let sls_id = "slsTa_" + sparqlet + "___" + objects[i];
			text += " " + localStorage[ssParam.pathName + '_sparql_code_0_' + sls_id];
		    }
		}
	    }
	}else{
	    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	    text = localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id];
	}
	let freqTerm = ssParam.freqTerm;
	let freqPrefix = ssParam.freqPrefix;
	let variable = [];
	let prefix = [];
	//	    let uri = [];
	Array.prototype.push.apply(prefix, ssParam.defaultPrefix);
	//	    Array.prototype.push.apply(uri, ssParam.defaultUri);
	let strings = text.replace(/\s+/g, " ").split(" ");
	for(let j = 0; j < strings.length; j++){
	    if(strings[j].match(/^\w+:<[^<>]+>$/)){
		let array = strings[j].split(/:</);
		ssParam.defaultUri[array[0]] = array[1].replace(/>$/, "");
	    }else{
		let words = strings[j].split(/[ \(\)\{\}\[\],\/\|\^]+/);
		for(let i = 0; i < words.length; i++){
		    words[i] = words[i].replace(/^\^/, "").replace(/[\.\+\*]$/, "");
		    if(words[i].match(/^\?\w/)){
			variable.push(words[i]);
		    }else if(words[i].match(/^https*:/)){
			continue;
		    }else if(words[i].match(/^\w+:$/)){
			if(!ssParam.freqPrefix[words[i]]) freqPrefix[words[i]] = 1;
		    }else if(words[i].match(/^\w+:\w+/)){
			if(!ssParam.freqTerm[words[i]]) freqTerm[words[i]] = 1;
			if(!ssParam.freqPrefix[words[i].split(/:/)[0] + ":"]) freqPrefix[words[i].split(/:/)[0] + ":"] = 1;
		    }else if(words[i].match(/^:\w+/)){
			if(!ssParam.freqTerm[words[i].replace(/[\*\+]$/, "")]) freqTerm[words[i].replace(/[\*\+]$/, "")] = 1;
		    }
		}
	    }
	}
	let terms = unique(variable).sort();
	Array.prototype.push.apply(terms, Object.keys(freqPrefix).sort(function(a,b){
	    if(freqPrefix[a] > freqPrefix[b]) return -1;
	    if(freqPrefix[a] <= freqPrefix[b]) return 1;
	}));
	Array.prototype.push.apply(terms, Object.keys(freqTerm).sort(function(a,b){
	    if(freqTerm[a] > freqTerm[b]) return -1;
	    if(freqTerm[a] <= freqTerm[b]) return 1;
	}));
	return terms;
    }
}

function uriCheck(spang, j){
    let string = spang[j];
    if(string.match(/^\'/) && !string.match(/\'$/) && !string.match(/\'\^\^xsd:\w+/) && !string.match(/\'\@\w+/)){
	for(let i = j + 1; i < spang.length; i++){
	    string = string + " " + spang[i];
	    if(spang[i].match(/'$/) || string.match(/\'\^\^xsd:\w+/) || string.match(/\'\@\w+/)) break;
	}
    }else if(string.match(/^\"/) && !string.match(/\"$/) && !string.match(/\"\^\^xsd:\w+/) && !string.match(/\"\@\w+/)){
	for(let i = j + 1; i < spang.length; i++){
	    string = string + " " + spang[i];
	    if(spang[i].match(/"$/) || string.match(/\"\^\^xsd:\w+/) || string.match(/\"\@\w+/)) break;
	}
    }
    if(string.match(/^[\'\"]https*:\/\/.+[\'\"]$/)) string = string.replace(/^[\'\"]/, "").replace(/[\'\"]$/, "");
    if(string.match(/^https*:\/\//)) string = "<" + string + ">";
    return string;
}

function chkQueryPrefix(id){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    let text = ssParam.prefixList + localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id];
    let lines = text.split(/[\n\r]/);
    let queryPrefix = [];
    let unknownPrefix = [];
    for(let i = 0; i < lines.length; i++){
	if(lines[i].match(/^\s*prefix\s+[\w\d\-_]*:/i)){
	    queryPrefix[lines[i].match(/^\s*prefix\s+([\w\d\-_]*:)/i)[1]] = 1;
	}
    }
    text = text.replace(/#[^\n]+\n/g, "\n");
    text = text.replace(/\<https*:\/\/[^\>\s]+/g, "\n");
    text = text.toLowerCase().replace(/^\s*define\s+\w+:.*/g, "\n");
    let strings = text.replace(/\s+/g, " ").split(" ");
    for(let i = 0; i < strings.length; i++){
	let words = strings[i].split(/[ \(\)\{\}\[\],\/\|\^]+/);
	for(let j = 0; j < words.length; j++){
	    if(words[j].match(/^\w*:/)){
		if(words[j].match(/^https*:/)) continue;
		let prefix = words[j].match(/^(\w*:)/)[1];
		if(!queryPrefix[prefix]){
		    unknownPrefix[prefix] = 1;
		}
	    }
	}
    }
    if(Object.keys(unknownPrefix).length > 0){
	let pre = document.createElement("pre");
	pre.id = "inner_result";
	pre.style = "margin-left:5px;";
	pre.appendChild(document.createTextNode("Undefined prefix: " + Object.keys(unknownPrefix).join(" ")));
	ssParam.resultNode[id].innerHTML = "";
	ssParam.resultNode[id].appendChild(pre);
    }else if(ssParam.resultNode[id].getElementsByTagName("pre")[0]
	     && ssParam.resultNode[id].getElementsByTagName("pre")[0].innerHTML.match(/Undefined prefix:/)){
	ssParam.resultNode[id].innerHTML = "";
    }
}

/// inner mode
//////////////////////////////////

async function innerModeRunQuery(queryTab, id, describe){

    //// loading loop
    let loadingVis = function(runId, id){
	let runTab = ssParam.job[runId];
	let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	if(ssParam.color.q == runTab || ssParam.color.q == false){
	    if(ssParam.color.q == false) ssParam.color.q = runTab;
	    if(ssParam.color.f){
		ssParam.color.n = ssParam.color.n + 8;
		if(ssParam.color.n > 255){
		    ssParam.color.n = 255;
		    ssParam.color.f = 0;
		}
	    }else{
		ssParam.color.n = ssParam.color.n - 8;
		if(ssParam.color.n < 63){
		    ssParam.color.n = 63;
		    ssParam.color.f = 1;
		}
	    }
	}
	if(document.getElementById("query_tab_" + runTab + "_" + id)){
	    document.getElementById("query_tab_" + runTab + "_" + id).style.borderColor = "rgba(255," + ssParam.color.n + ",63,0.7)";

	    if(runTab == selTab
	       && !document.getElementById("loadingIcon_" + runTab + "_" + id)
	       && !document.getElementById("slsLoading_" + id)){ 	// for SPARQList support id
		console.log("loadingIcon_" + runTab + "_" + id);
		let loadingIcon = document.createElement("div");
		loadingIcon.style.width = "24px";
		loadingIcon.style.height = "24px";
		loadingIcon.style.border = "solid 8px #999999";
		loadingIcon.style.borderRight = "solid 8px #99ccff";
		loadingIcon.style.borderRadius = "20px";
		loadingIcon.style.margin = "20px"; 
		loadingIcon.style.boxSizing = "content-box";
		loadingIcon.setAttribute("id", "loadingIcon_" + runTab + "_" + id); 
		ssParam.resultNode[id].innerHTML = "";
		ssParam.resultNode[id].appendChild(loadingIcon);
	    }
	    
	    let icon = document.getElementById("loadingIcon_" + runTab + "_" + id);
	    if(document.getElementById("slsLoading_" + id)) icon = document.getElementById("slsLoading_" + id); 	// for SPARQList support id
	    if(icon){
		if(ssParam.rotate === undefined) ssParam.rotate = 360;
		ssParam.rotate -= 5;
		if(ssParam.rotate < 0) ssParam.rotate += 360;
		icon.style.visibility = "visible";
		icon.style.transform = "rotate(" + ssParam.rotate + "deg)";
	    }
	}
    }

    //// handle fetch response
    let handleResponse = async function(res) {
	if(!res.ok){
	    let obj = { error: 1,
			status: res.status + " " + res.statusText};
	    if(res.status == "405"){
		obj.text = "Please check the endpoint in the first line.\n\ne.g.\n'## endpoint http://example.org/endpoint'\n";
	    }else if(res.headers.get('content-type').match('text\/plain')){
		obj.text = await res.text();
		console.log(endpointLine);
		if(endpointLine && obj.text.match(/line \d+: syntax error /)) obj.text = obj.text.replace(/line (\d+): syntax error /, "line " + (parseInt(obj.text.match(/line (\d+): syntax error /)[1]) + 1) + ": syntax error ");
	    }else if(res.headers.get('content-type').match('application/json')){
		res = await res.json();
		obj.text = res.message + "\n\n" + res.data;
		let plus = 0;
		if(endpointLine) plus++;
		if(defineLine) plus++;
		if(plus && obj.text.match(/Parse error on line \d+:/)) obj.text = obj.text.replace(/Parse error on line (\d+):/, "Parse error on line " + (parseInt(obj.text.match(/Parse error on line (\d+):/)[1]) + plus) + ":");
	    }
	    return obj;
	}else if(res.headers.get('content-type').match('text\/html')){
	    return { error: 1,
		     status: "",
		     text: "endpoint error\n\nPlease set an endpoint in the first line.\n\ne.g.\n'## endpoint http://example.org/endpoint'\n"
		   };
	}
	return res.json();
    }

    //// output endpoint error to inner html
    let outError = function(res, runId){
	let runTab = ssParam.job[runId];
	let pre = document.createElement("pre");
	pre.id = "inner_result";
	pre.appendChild(document.createTextNode(res.status + "\n\n" + res.text));
	let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	if(selTab == runTab){
	    ssParam.resultNode[id].innerHTML = "";
	    ssParam.resultNode[id].appendChild(pre);
	}
	ssParam.results['sparql_res_' + runTab + "_" + id] = pre;
	clearInterval(loadingTimer);
	if(document.getElementById("query_tab_" + runTab + "_" + id)){
	    document.getElementById("query_tab_" + runTab + "_" + id).style.borderColor = "rgba(127, 127, 127, 0.5)";
	}else if(document.getElementById("slsLoading_" + id)){ // for SPARQList support
	    document.getElementById("slsLoading_" + id).style.visibility = "hidden";
	}
	delete ssParam.job[runId];
	return 0;
    }

    //download button
    let mkDlButton = function(resDiv, tab, id){
	let dlSelect = document.createElement("select");
	dlSelect.classList.add("result_download_button");
	dlSelect.add( (new Option("Download", "dl", "defaultselected", "selected")));
	dlSelect.add( (new Option("JSON", "json")));
	dlSelect.add( (new Option("CSV", "csv")));
	dlSelect.add( (new Option("TSV", "tsv")));
	dlSelect.onchange = function(){
	    let type = this.value;
	    if(type != "dl"){
		let res = ssParam.dlResults["dl_json_" + tab + " " + id];
		let data = JSON.stringify(res, null, "  ");
		let filename = "result.json";
		if(type == "csv" || type == "tsv"){
		    let delimiter = ",";
		    filename = "result.csv";
		    if(type == "tsv"){
			delimiter = "\t";
			filename = "result.tsv";
		    }
		    let heads = [];
		    let lines = [];
		    for(let param of res.head.vars){
			param = decodeURI(escape(param));
			if(searchPredicate && param == "__p__") param = "??";
			if(type == "csv") param = "\"" + param + "\"";
			heads.push(param);
		    }
		    for(let i = 0; i < res.results.bindings.length; i++){
			let values = []
			for(let param of res.head.vars){
			    let value = "";
			    if(res.results.bindings[i][param]){
				value = res.results.bindings[i][param].value;
				if(type == "csv"){
				    value = value.replace(/\"/g, '""');
				    value = "\"" + value + "\"";
				}
			    }
			    values.push(value);
			}
			lines[i] = values.join(delimiter);
		    }
		    data = heads.join(delimiter) + "\n";
		    data += lines.join("\n");
		}
		var blob = new Blob([data], { "type" : "text/plain" });
                if (window.navigator.msSaveBlob) { 
		    window.navigator.msSaveBlob(blob, filename); 
		    window.navigator.msSaveOrOpenBlob(blob, filename); 
                } else {
		    let element = document.createElement("a");
		    element.style.display = "none";
		    resDiv.appendChild(element);
		    element.href = window.URL.createObjectURL(blob);
		    element.download = filename;
		    element.click();
		    element.remove();
                }
	    }
	}
	resDiv.appendChild(dlSelect);
    }

    //// output result to inner html
    let outResult = function(res, runId, endpoint, describe){
	let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	let endTime = Date.now();
	let vars = res.head.vars;
	let head = [];
	let resDiv = document.createElement("div");
	let resTime = document.createElement("p");
	let sec = Math.round((endTime - startTime) / 100) / 10;
	resTime.appendChild(document.createTextNode("[ " + res.results.bindings.length + " bindings. -- " + sec + " sec. ]"));
	resTime.className = "inner_result_time";
	resDiv.appendChild(resTime);
	if(!describe) mkDlButton(resDiv, selTab, id);
	
	if(describe){
	    let p = document.createElement("p");
	    p.className = "inner_result_sub_title";
	    p.appendChild(document.createTextNode("DESCRIBE <" + describe + ">"));
	    resDiv.appendChild(p);
	}
	let resTable = document.createElement("table");
	resTable.id = "inner_result_table";
	let resTr = document.createElement("tr");
	let resTh, resTd, resInput;
	for(let i = 0; i < vars.length; i++){
	    let regex = new RegExp("\\s\\$" + vars[i] + "\\s");
	    resTh = document.createElement("th");
	    let tmp = decodeURI(escape(vars[i]));
	    if(searchPredicate && vars[i] == "__p__") tmp = "??";
	    resTh.appendChild(document.createTextNode(tmp));
	    resTr.appendChild(resTh);
	}
	resTable.appendChild(resTr);
	for(let i = 0; i < res.results.bindings.length; i++){
	    resTr = document.createElement("tr");
	    for(let j = 0; j < vars.length; j++){
		resTd = document.createElement("td");
		if(res.results.bindings[i][vars[j]]){
		    let type = res.results.bindings[i][vars[j]].type;
		    let value = res.results.bindings[i][vars[j]].value;
		    if(type == "uri"){
			let text = value;
			let tmp = "$" + vars[j];
			if(searchPredicate && vars[j] == "__p__") tmp = "??";
			let term = tmp + ":<" + value + ">";
			for(let key in uri2prefix){
			    if(uri2prefix.hasOwnProperty(key) && value.match(key)){
				text = value.replace(key, uri2prefix[key] + ":");
				if(text.match(/^\w+:[^:#\/]*$/)) term = tmp + ":" + text;
				break;
			    }
			}
			if(describe == value){
			    resTd.appendChild(document.createTextNode(text));
			    resTd.className = "inner_result_selected_td";
			}else{
			    let resA = document.createElement("a");
			    resA.href = value;
			    resA.className = "describe";
			    resA.appendChild(document.createTextNode(text));
			    resTd.appendChild(resA);
			    ssParam.resultTerms.push(term);
			}
		    }else if(type == "literal"){
			resTd.appendChild(document.createTextNode("\"" + value + "\""));
			ssParam.resultTerms.push("$" + vars[j] + ":\"" + value + "\"");
		    }else{
			resTd.appendChild(document.createTextNode(value));
		    }
		}
		resTr.appendChild(resTd);
	    }
	    resTable.appendChild(resTr);
	}
	if(ssParam.innerMode[id] == 2) resTable.style.display = "none";
	resDiv.appendChild(resTable);
	ssParam.resultTerms = unique(ssParam.resultTerms);

	let resJson = document.createElement("pre");
	resJson.id = "inner_result_json";
	resJson.style.backgroundColor = "transparent";
	resJson.appendChild(document.createTextNode(JSON.stringify(res, null, "  ")));
	if(ssParam.innerMode[id] == 1) resJson.style.display = "none";
	resDiv.appendChild(resJson);

	selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
	let runTab = ssParam.job[runId];
	if(!describe){
	    if(selTab == runTab){
		ssParam.resultNode[id].innerHTML = "";
		ssParam.resultNode[id].appendChild(resDiv);
		ssParam.subResNode[id].style.display = "none";
	    }
	    ssParam.results['sparql_res_' + runTab + "_" + id] = resDiv;
	}else{
	    if(selTab == runTab){
		ssParam.describeTarget++;
		ssParam.describeLog[ssParam.describeTarget] = resDiv;
		ssParam.describeLog[ssParam.describeTarget + 1] = "";
		ssParam.subResNode[id].innerHTML = "";
		setSubResButton(id);
		ssParam.subResNode[id].appendChild(resDiv);
		ssParam.subResNode[id].style.display = "block";
	    }
	}
	if(ssParam.color.q == runTab) ssParam.color.q = false;
	clearInterval(loadingTimer);
	if(document.getElementById("query_tab_" + runTab + "_" + id)){
	    let className = "query_tab";
	    if(selTab == runTab) className = "query_tab query_tab_active";
	    document.getElementById("query_tab_" + runTab + "_" + id).style.borderColor = null;
	    document.getElementById("query_tab_" + runTab + "_" + id).className = className;
	}else if(document.getElementById("slsLoading_" + id)){ // for SPARQList support
	    document.getElementById("slsLoading_" + id).style.visibility = "hidden";
	}
	ssParam.dlResults["dl_json_" + runTab + " " + id] = res;
	delete ssParam.job[runId];

	// save endpoint list
	let domain = getDomain(ssParam.pathName);
	if(localStorage[domain + '_endpoint_list'] === undefined) localStorage[domain + '_endpoint_list'] = endpoint;
	else{
	    let endpoints = localStorage[domain + '_endpoint_list'].split(" ");
	    let list = [endpoint];
	    for(let i = 0; i < endpoints.length; i++){
		if(endpoints[i] != endpoint) list.push(endpoints[i]);
		if(list.length == 10) break;
	    }
	    localStorage[domain + '_endpoint_list'] = list.join(" ");
	}
    }

    //// start http request
    let startTime = Date.now();
    let runId = startTime + "_" + queryTab;
    ssParam.job[runId] = queryTab;
    let loadingTimer = setInterval(function(){loadingVis(runId, id);}, 30);
    ssParam.resultTerms = [];


    //// construct SPARQL query
    let sparqlQuery = ssParam.textarea[id].value;
    sparqlQuery = sparqlQuery.replace(/([\s\.\;])=b(\s)/g, "$1\n=b\n$2").replace(/([\s\.\;])=e(\s)/g, "$1\n=e\n$2").replace(/([\s\.\;])=begin(\s)/g, "$1\n=begin\n$2").replace(/([\s\.\;])=end(\s)/g, "$1\n=end\n$2").replace(/\n\s*\n/g, "\n"); // for multi-line coment
    let lines = sparqlQuery.split(/\n/);
    let searchPredicate = false;
    let multiLineComment = false;
    let mlcF = 1;
    let sparqlApiMd = false;     // SPARQList markdown format
    let sparqlDoc = false;       // SPARQL doc format
    let sparqlMustache = false;  // mustache parameters

    //// get endpoint
    let endpoint = ssParam.formNode[id].action;
    let endpointLine = false;
    let defineLine = false;
    if(lines[0].toLowerCase().match(/^define +sql:select-option +"order"/) && lines[1].match(/^\s*#+.* *http/)){ // replace DEFINE-line to endpoint-line
	let tmp = lines[0];
	lines[0] = lines[1];
	lines[1] = tmp;
	defineLine = true;
    }
    if(lines[0] && lines[0].toLowerCase().match(/^\s*##+ *endpoint +https*:\/\//) || lines[0].match(/^\s*#+ *https*:\/\//)){
	endpoint = lines[0].match(/(http[^\s,;]+)/)[1];
	lines.shift();
	sparqlQuery = lines.join("\n");
	endpointLine = true;
    }
    if(lines[0] && lines[0].toLowerCase().match(/^define +sql:select-option +"order"/)){
	defineLine = true;
    }

    //// edit SPARQL query for multi-line comments
    for(let i = 0; i < lines.length; i++){
	if(lines[i].match(/^\`\`\`sparql/)) sparqlApiMd = true;
	if(lines[i].match(/^# +@endpoint +https*:/) 
	   || lines[i].match(/^# +@param +\w+/)
	   || lines[i].match(/^# +@temp-proxy +true/)) sparqlDoc = true;
	if(lines[i].match(/\{\{\w+\}\}/)) sparqlMustache = true;
	if(lines[i].toLowerCase().match(/^\s*prefix\s+/)){ 
	    let tmp = lines[i].replace(/(\w+):\</, function(){ return arguments[1] + ": <"; }).replace(/^\s*/, "").split(/\s+/);
	    tmp[1] = tmp[1].replace(/:$/, "");
	    tmp[2] = tmp[2].replace(/[\<\>]/g, "");
	    ssParam.prefix2Uri[tmp[1]] = tmp[2];
	}
	if((lines[i].match(/ \^*\?\?\s/) || lines[i].match(/ \^*\?\?$/)) && !lines[i].match(/^ *#/) && mlcF == 1) searchPredicate = true;
	if(lines[i].match(/^\s*=begin\s*$/) || lines[i].match(/^\s*=b\s*$/)){ multiLineComment = true; mlcF = 0; }
	else if(lines[i].match(/^\s*=end\s*$/) || lines[i].match(/^\s*=e\s*$/)){ mlcF = 1;}
    }
    
    let uri2prefix = {};
    for(let key in ssParam.prefix2Uri){
	if(ssParam.prefix2Uri.hasOwnProperty(key)){
	    uri2prefix[ssParam.prefix2Uri[key]] = key;
	}
    }  

    //// edit SPARQL query
    if(describe){
	sparqlQuery = "DESCRIBE <" + describe + ">";
    }else if(sparqlApiMd || searchPredicate || multiLineComment || sparqlDoc || sparqlMustache){
	sparqlQuery = "";
	let f = 1;
	if(sparqlApiMd) f = 0;
	if(sparqlDoc) ssParam.prefixList = "";
	let sparqlMustacheParams = [];
	ssParam.temporary_proxy = false;
	for(let i = 0; i < lines.length; i++){
	    if(sparqlApiMd){ // for SPARQList markdown format
		if(f == 0 && lines[i].match(/^\* +\`\w+\`/)){
		    let key = lines[i].match(/^\* +\`(\w+)\`/)[1];
		    let value = lines[i+1].match(/^ +\* *default: *(.+)$/)[1];
		    sparqlMustacheParams[key] = value;
		}
		if(f == 0 && lines[i].match(/^\s*https*:\/\//)){ endpoint = lines[i].match(/^\s*(https*:\/\/[^\s;,]+)/)[1]; }
		else if(lines[i].match(/^\`\`\`sparql/)){ f = 1; continue; }
		else if(lines[i].match(/^\`\`\`/)){ f = 2; }
	    }
	    if(sparqlDoc){ // for sparql-doc format
		if(lines[i].match(/^# +@param +.+/)){
		    let param_line = lines[i].match(/^# +@param +(\w+)\s*=\s*(.+)/);
		    let key = param_line[1];
		    let value = param_line[2];
		    if(param_line[2].match(/^\'/)) value = param_line[2].match(/^\'([^\']+)\'/)[1];
		    else if(param_line[2].match(/^\"/)) value = param_line[2].match(/^\"([^\"]+)\"/)[1];
		    else value = param_line[2].match(/^([^\s]+)/)[1];
		    sparqlMustacheParams[key] = value;
		}else if(lines[i].toLowerCase().match(/^# +@prefixes +https*:\/\//)) {
		    let url = lines[i].match(/^# +@.+ +(https*:\/\/[^\s;]+)/)[1];
		    if(!ssParam.prefixListUrl[url]){
			ssParam.prefixListUrl[url] = await getCustomPrefixList(url.replace(/,/g, "%2C"));
			ssParam.prefixList += ssParam.prefixListUrl[url];
		    }else if(ssParam.prefixListUrl[url]){
			ssParam.prefixList += ssParam.prefixListUrl[url];
		    }
		}else if(lines[i].toLowerCase().match(/^# +@temp-proxy +true/)) {
		    ssParam.temporary_proxy = true;
		}
	    }
	    if(sparqlMustache && (sparqlDoc || sparqlApiMd)){ // for mustache parameters
		while(lines[i].match(/\{\{\w+\}\}/)){
		    if(lines[i].match(/\{\{\w+\}\}/)){
			var words = lines[i].match(/(.*)\{\{(\w+)\}\}(.*)/);
			if(sparqlMustacheParams[words[2]]) lines[i] = words[1] + sparqlMustacheParams[words[2]] + words[3];
		    }
		}
	    }
	    if(searchPredicate && f == 1){ // for predicate seaech
		if(searchPredicate && lines[i].toUpperCase().match(/\s*SELECT /)){ lines[i] = "\nSELECT DISTINCT ?__p__ (SAMPLE(?__o__) AS ?sample)"; }
		else if(searchPredicate && (lines[i].match(/ \?\?\s/) || lines[i].match(/ \?\?$/))){lines[i] = "\n" + lines[i].match(/(.+) \?\?/)[1] + " $__p__ ?__o__ ."; }
		else if(searchPredicate && (lines[i].match(/ \^\?\?\s/) || lines[i].match(/ \^\?\?$/))){lines[i] = "\n $__o__ ?__p__ " + lines[i].match(/(.+) \^\?\?/)[1] + " ."; }
	    }
	    if(multiLineComment){ // for multi-line comment out
		if((lines[i].match(/^\s*=begin\s*$/) || lines[i].match(/^\s*=b\s*$/)) && f == 1){ f = 0; }
		else if((lines[i].match(/^\s*=end\s*/) || lines[i].match(/^\s*=e\s*$/)) && f == 0){ f = 1; continue; }
	    }
	    if(f == 1) sparqlQuery = sparqlQuery + "\n" + lines[i];
	}
	if(ssParam.prefixList) sparqlQuery = ssParam.prefixList + sparqlQuery;
    }
    if(!describe) resetDescribeLog();

    console.log(sparqlQuery);
    
    //// set fetch body
    let body = "query=" + encodeURIComponent(sparqlQuery);
    if(document.getElementById("default-graph-uri")) body += "&default-graph-uri=" + encodeURIComponent(document.getElementById("default-graph-uri").value);
    if(document.getElementById("timeout")) body += "&timeout=" + document.getElementById("timeout").value;
    if(document.getElementById("debug")) { if(document.getElementById("debug").checked) body += "&debug=on"; }
    let options = {
	method: 'POST',
	body: body,
	mode: 'cors',
	headers: {
	    'Accept': 'application/sparql-results+json',
	    'Content-Type': 'application/x-www-form-urlencoded'
	}
    };

    // relay https://sparql-support.dbcls.jp/api/relay for 'HTTP'-endpoint from 'HTTPS'-SPARQL_spport (for SSL Mixed Content)
    let original_endpoint = false;
    if((ssParam.mixedContent == 1 && location.protocol == "https:" && endpoint.match(/^http:/)) || ssParam.temporary_proxy){
	options.body += "&endpoint=" + encodeURIComponent(endpoint);
	original_endpoint = endpoint;
	endpoint = "https://sparql-support.dbcls.jp/api/relay";
    }

    // set timeout of fetch (https://stackoverflow.com/questions/46946380/fetch-api-request-timeout/46946573#46946573)
    function timeout(ms, promise) {
	return new Promise(function(resolve, reject) {
	    setTimeout(function() {
		reject(new Error("timeout"))
	    }, ms)
	    promise.then(resolve, reject)
	})
    }
    
    //// run fetch
    try{
	let res = await timeout(600000, fetch(endpoint, options)).then(handleResponse);
	if(res.error){
	    outError(res, runId);
	}else{
	    if(original_endpoint) endpoint = original_endpoint;
	    outResult(res, runId, endpoint, describe);
	}
    }catch(error){
	console.log(error);
	let endTime = Date.now();
	let submesse = "SPARQL support message:\nendpoint error, or blocked CORS req.\nIf CORS blocking. Set a option to access endpoint via 'sparql-support.dbcls.jp'.\n\n    Option: '# @temp-proxy true' in comment\n";
	if(location.protocol == "https:" && endpoint.match(/^http:/)) submesse = "SPARQL support message:\nSSL Mixed Content Error: When the endpoint is not HTTPS, you should use SPARQL support on HTTP. \nOr, set a option to access endpoints via 'sparql-support.dbcls.jp'.\n\n    Temporary: '# @temp-proxy true' in comment\n    Permanent: set command: '# mixed-content-proxy: true;' -> 'Ctrl+Enter'\n";
	let text = "Browser error message:\n" + error.message + "\n\n\n" + submesse;
	if(endTime - startTime > 30000) text += "\nor endpoint timeout (" + (Math.round((endTime - startTime) / 100) / 10) + " sec.)";
	outError({status: "", text: text}, runId);
    }
}

/// init
//////////////////////////////////

function initDiv(cm, id){
    // CodeMirror style
    if(!ssParam.textarea) {
	ssParam.textarea = {};
	ssParam.codeMirrorDiv = {};
	ssParam.resultNode = {};
	ssParam.subResNode = {};
	ssParam.formNode = {};
	ssParam.defaultEndpoint = {};
	ssParam.job = {};
	ssParam.results = {};
	ssParam.dlResults = {};
	ssParam.ctrlTabsDiv = {};
    }

    // check on SPARQL-proxy
    if(document.getElementsByTagName("title")){
	let page_title = document.getElementsByTagName("title")[0].innerHTML;
	if(page_title == "sparql-proxy" && document.getElementsByTagName("nav")){
	    let page_nav = document.getElementsByTagName("nav")[0].innerHTML;
	    if(page_nav.match("SPARQL Proxy")) ssParam.sparqlProxyFlag = true;
	}
    }
    
    let codeMirrorDiv = cm.display.wrapper;
    ssParam.codeMirrorDiv[id] = codeMirrorDiv;
    let parentNode = codeMirrorDiv.parentNode;
    let childNodes = parentNode.childNodes;
    let textarea;
    for(let i = 0; childNodes[i]; i++){
	if(childNodes[i].tagName && childNodes[i].tagName.toLowerCase().match("textarea")) {
	    textarea = childNodes[i];
	    break;
	}
    }
    ssParam.textarea[id] = textarea;

    // query tab div
    let newNode = document.createElement("div")
    let controlNode = parentNode.insertBefore(newNode, codeMirrorDiv)
    controlNode.className = "control_tabs";
    controlNode.id = "control_tabs";
    ssParam.ctrlTabsDiv[id] = controlNode;
    
    // copy to clipboard div
    newNode = document.createElement("div")
    let clipboardNode = parentNode.insertBefore(newNode, codeMirrorDiv.nextSibling)
    clipboardNode.className = "clipboard_ctrl";
    
    // parent form
    for(let i = 0; i < 100; i++){
	if(parentNode.tagName.toLowerCase() == "form"){
	    break;
	}else{
	    parentNode = parentNode.parentNode;
	}
    }
    ssParam.formNode[id] = parentNode;
    ssParam.defaultEndpoint[id] = ssParam.formNode[id].action;

    let cmStyle = document.getElementById("sparqlSupportCmDivStyle");
    let baseStyle = {}, borderWidth = [], borderStyle = [], borderColor = [], borderRadius = [], margin = [], padding = [], areaWidth, areaHeight;

    if(!cmStyle){
	textarea.style.display = "inline";
	baseStyle = textarea.currentStyle || document.defaultView.getComputedStyle(textarea, '');
	let width = textarea.offsetWidth;
	let height = textarea.offsetHeight;
	borderWidth = [baseStyle.borderTopWidth, baseStyle.borderRightWidth, baseStyle.borderBottomWidth, baseStyle.borderLeftWidth];
	borderStyle = [baseStyle.borderTopStyle, baseStyle.borderRightStyle, baseStyle.borderBottomStyle, baseStyle.borderLeftStyle];
	borderColor = [baseStyle.borderTopColor, baseStyle.borderRightColor, baseStyle.borderBottomColor, baseStyle.borderLeftColor];
	borderRadius = [baseStyle.borderTopLeftRadius, baseStyle.borderTopRightRadius, baseStyle.borderBottomRightRadius, baseStyle.borderBottomLeftRadius];
	margin = [baseStyle.marginTop, baseStyle.marginRight, baseStyle.marginBottom, baseStyle.marginLeft];
	padding = [baseStyle.paddingTop, baseStyle.paddingRight, baseStyle.paddingBottom, baseStyle.paddingLeft];
	textarea.style.display = "none";
	ssParam.areaDeltaWidth = parseInt(padding[1].replace(/px/, "")) + parseInt(padding[3].replace(/px/, "")) + parseInt(borderWidth[1].replace(/px/, "")) + parseInt(borderWidth[3].replace(/px/, ""));
	ssParam.areaDeltaHeight = parseInt(padding[0].replace(/px/, "")) + parseInt(padding[2].replace(/px/, "")) + parseInt(borderWidth[0].replace(/px/, "")) + parseInt(borderWidth[2].replace(/px/, ""));
	areaWidth = width - ssParam.areaDeltaWidth;
	areaHeight = height - ssParam.areaDeltaHeight;
    }else{
	let a = cmStyle.value.split("|");
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
    codeMirrorDiv.style.padding = '0px 0px 0px 0px';
    codeMirrorDiv.style.margin = margin.join(" ");
    codeMirrorDiv.style.fontSize = baseStyle.fontSize;
    codeMirrorDiv.style.fontFamily = baseStyle.fontFamily;
    codeMirrorDiv.style.lineHeight = baseStyle.lineHeight;
    codeMirrorDiv.style.resize = 'both';
    ssParam.textareaWidthDelta = codeMirrorDiv.offsetWidth - areaWidth;
    // for chrome default
    if(parseInt(baseStyle.fontSize.replace("px", "")) < 16) codeMirrorDiv.style.fontSize = "16px" ;
    if(baseStyle.fontFamily != "monospace" && baseStyle.fontFamily != "Courier" && baseStyle.fontFamily != "Consolas" && baseStyle.fontFamily != "Monaco") codeMirrorDiv.style.fontFamily = "monospace, Courier, Consolas, Monaco";

    // query tab div, clipboard div
    controlNode.style.width = areaWidth + 'px';
    //	clipboardNode.style.width = areaWidth + 'px';
    
    ssParam.pathName = location.pathname;

    // sparql default
    ssParam.defaultSparqlTerm = setDefaultSparqlTerm();
    ssParam.defaultPrefix = setDefaultPrefix();
    ssParam.prefix2Uri = {};
    let now = Date.now();
    let getPrefixFlag = false;
    if(localStorage[ssParam.pathName + '_prefix_uri_' + id]){
	let list = localStorage[ssParam.pathName + '_prefix_uri_' + id].split(" ");
	let time = list.shift();
	if(now - time > 86400000){ // 1 day
	    getPrefixFlag = true;
	}else{
	    for(let i = 0; i < list.length; i++) {
		let pair = list[i].split(",");
		ssParam.prefix2Uri[pair[0]] = pair[1];
	    }
	}
    }else{
	getPrefixFlag = true;
    }
    if(getPrefixFlag){
	localStorage[ssParam.pathName + '_prefix_uri_' + id] = now;
	setPrefixUri(cm, 0, id, ssParam.defaultPrefix.join(",").replace(/:/g, ""), 0);
    }
    setDefaultUri();

    // localStorage
    let selTab = 0;
    if(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]){
	selTab = localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id];
    }else{
	localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id] = selTab;
    }
    if(localStorage[ssParam.pathName + '_sparql_code_' + selTab + '_' + id] != null && localStorage[ssParam.pathName + '_sparql_code_' + selTab + '_' + id].match(/\w/)){
	textarea.value = localStorage[ssParam.pathName + '_sparql_code_' + selTab + '_' + id];
	setCmDiv(cm, id);
    }
    if(localStorage[ssParam.pathName + '_mixed_content_' + id]){
	ssParam.mixedContent = localStorage[ssParam.pathName + '_mixed_content_' + id];
    }
    ssParam.freqTerm = {};
    ssParam.freqPrefix = {};
    ssParam.freqTermPre = [];
    if(localStorage[ssParam.pathName + '_sparql_term_freq']){
	let array = localStorage[ssParam.pathName + '_sparql_term_freq'].split(" ");
	for(let i = 0; array[i]; i++){
	    ssParam.freqTermPre.push(array[i]);
	    if(ssParam.freqTerm[array[i]]) ssParam.freqTerm[array[i]]++;
	    else ssParam.freqTerm[array[i]] = 1;
	    let prefix = array[i].split(":")[0] + ":";
	    if(ssParam.freqPrefix[prefix]) ssParam.freqPrefix[prefix]++;
	    else ssParam.freqPrefix[prefix] = 1;
	}
    }

    // query set from url parameter
    let pair = location.search.substring(1).split('&');
    let param_code = "";
    let param_end = "";
    let param_exec = 0;
    for(let i = 0; pair[i]; i++) {
	let keyVal = pair[i].split('=');
	if(keyVal[0] == "query"){
	    param_code = decodeURIComponent(keyVal[1].replace(/\%20/g, " ").replace(/\+/g, " "));
	}else if(keyVal[0] == "endpoint"){
	    param_end = decodeURIComponent(keyVal[1].replace(/\%20/g, " ").replace(/\+/g, " "));
	}else if(keyVal[0] == "exec"){
	    param_exec = keyVal[1];
	}
    }
    if(param_code){
	if(param_end) { 
	    param_code = "## endpoint " + param_end + "\n" + param_code;
	}
	let path = location.pathname;
	let f = 1;
	if(localStorage[path + "_sparql_code_tab_num_query"]){
	    var tabNum = parseInt(localStorage[path + "_sparql_code_tab_num_query"]);
	    for(let i = 0; i <= tabNum; i++){
		if(typeof localStorage[path + "_sparql_code_" + i + "_query"] == 'undefined'){
		    f = 2;
		    tabNum = i;
		    break;
		}else if(localStorage[path + "_sparql_code_" + i + "_query"].replace(/[\n\r]+/g, "\n") == param_code.replace(/[\n\r]+/g, "\n")){
		    localStorage[path + "_sparql_code_select_tab_query"] = i;
		    f = 0;
		    break;
		}
	    }
	    if(f){
		if(f == 1) tabNum++;
		localStorage[path + "_sparql_code_tab_num_query"] = tabNum;
		localStorage[path + "_sparql_code_select_tab_query"] = tabNum;
		localStorage[path + "_sparql_code_" + tabNum + "_query"] = param_code;
	    }
	}
	if(param_exec == 1) localStorage[path + "_sparql_target_query"] = "inner";
	textarea.value = param_code;
	setCmDiv(cm, id);
    }
    
    // Query tab
    let ulNode = document.createElement("ul");
    controlNode.appendChild(ulNode);
    ulNode.id = "query_tab_list_" + id;
    ulNode.className = "cm-ss_query_tab_list";
    
    let resParent = document.createElement("div");
    resParent.id = "inner_mode_div";
    ssParam.formNode[id].appendChild(resParent);
    
    ssParam.resultNode[id] = document.createElement("div");
    resParent.appendChild(ssParam.resultNode[id]);
    ssParam.resultNode[id].style.width = areaWidth + 'px';
    ssParam.resultNode[id].style.display = "none";
    ssParam.resultNode[id].id = "res_div_" + id;
    ssParam.resultNode[id].className = "cm-ss_result";

    ssParam.subResNode[id] = document.createElement("div");
    resParent.appendChild(ssParam.subResNode[id]);
    ssParam.subResNode[id].style.width = areaWidth + 'px';
    ssParam.subResNode[id].style.display = "none";
    ssParam.subResNode[id].id = "subres_div_" + id;
    ssParam.subResNode[id].className = "cm-ss_result cm-ss_subres";

    let confirm = document.createElement("ul");
    ssParam.confirmBox = confirm;
    confirm.id = "confirm_" + id;
    confirm.className = "cm-ss_query_tab_confirm";
    confirm.style.display = "none";
    codeMirrorDiv.appendChild(confirm);

    // userAgent
    ssParam.userAgent = navigator.userAgent.toLowerCase();
    if(ssParam.userAgent.match("applewebkit")) ssParam.userAgent = 'webkit';
    else if(ssParam.userAgent.match("firefox")) ssParam.userAgent = 'firefox';
    else if(ssParam.userAgent.match("trident")) ssParam.userAgent = 'ie';

    if(ssParam.userAgent == "webkit"){ // for edit-area resize in webkit
	let cmS = document.getElementsByClassName("CodeMirror-scroll");
	for(let i = 0; i < cmS.length; i++){
	    cmS[i].style.width = "99.5%";
	}
    }

    // clipboard ctrl
    if(!id.match(/^slsTa_/)){  // if not SPARQList
	clipboardNode.style.height = "24px";
	clipboardNode.innerHTML = `
          <div class="fontawesome-paste copy_popup_form" id="copyIcon"></div>
	  <p id="popupCopy" class="copy_popup_form">
	    <input type="button" class="button copy_popup_form" id="copyButton" value="copy to clipboard">
	    <span class="bottom_line copy_popup_form">
	      <input type="radio" name="mode" id="rawQueryRadio" class="copy_popup_form" value="0" style="margin-left:30px;"> raw query
	      <input type="radio" name="mode" id="queryUrlRadio" class="copy_popup_form" value="1" style="margin-left:10px;" checked="checked"> query URL
	      <span style=" margin-right:30px;" class="copy_popup_form"><input type="radio" name="mode" class="copy_popup_form" id="shortUrlRadio" value="2" style="margin-left:10px;"> short URL</span>
	      <span id="autorun" style="margin-right:30px;" class="copy_popup_form"><input type="checkbox" class="copy_popup_form" id="autoRunChkBox" value="1"> auto run </span>
	    </span>
	  </p>
	  <span class="fontawesome-file-alt" id="fileIcon"></span>`;
	document.getElementById("copyIcon").onclick = function(){ popupCopyForm(); };
	document.getElementById("copyButton").onclick = function(){ copyToClipboard(); };
	document.getElementById("rawQueryRadio").onclick = function(){ showAutoRunBox(0); };
	document.getElementById("queryUrlRadio").onclick = function(){ showAutoRunBox(1); };
	document.getElementById("shortUrlRadio").onclick = function(){ showAutoRunBox(2); };
	document.getElementById("autoRunChkBox").onclick = function(){ setShortUrl(); };
    }
    
    saveCode(cm, id);
}

function initDivQueries(cm, id){
    let codeMirrorDiv = ssParam.codeMirrorDiv[id];
    let ulNode = document.getElementById("query_tab_list_" + id);
    if(!ssParam.results) ssParam.results = {};

    let tabNum = 0;
    let selTab = 0;
    if(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]) tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
    else localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id] = 0;
    if(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]) selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    else localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id] = 0;
    for(let i = 0; i <= tabNum + 2; i++){
	let liNode = document.createElement("li");
	ulNode.appendChild(liNode);
	liNode.innerHTML = 1 + i;
	liNode.className = "query_tab";
	liNode.id = "query_tab_" + i + "_" + id;
	if(i == selTab){
	    liNode.className = "query_tab query_tab_active";
	    liNode.style.cursor = "move";
	    liNode.style.left = "0px";
	}else if(i == tabNum + 1){
	    liNode.className = "query_tab query_tab_button";
	    liNode.id = "query_tab_plus_" + id;
	    liNode.style.width = "18px";
	    liNode.innerHTML = "+";
	}else if(i == tabNum + 2){
	    liNode.className = "query_tab query_tab_button";
	    liNode.id = "query_tab_minus_" + id;
	    liNode.style.width = "18px";
	    liNode.innerHTML = "-";
	}
    }

    let cancel = document.createElement("li");
    ssParam.rmCancel = cancel;
    cancel.className = "confirm_button";
    cancel.id = "query_tab_cancel_" + id;
    cancel.style.width = "70px";
    cancel.innerHTML = "cancel";
    let remove = document.createElement("li");
    ssParam.rmDone = remove;
    remove.className = "confirm_button";
    remove.id = "query_tab_remove_" + id;
    remove.style.width = "70px";
    remove.innerHTML = "remove";
    ssParam.confirmBox.appendChild(cancel);
    ssParam.confirmBox.appendChild(remove);

    setQueryTabWidth(tabNum);
    saveCode(cm, id);
}

function initDivInner(cm, id){
    let codeMirrorDiv = ssParam.codeMirrorDiv[id];
    let ulNode = document.getElementById("query_tab_list_" + id);
    let ulNodeHelp = document.getElementById("query_help_" + id);
    let liNode = document.createElement("li");
    if(!ssParam.innerMode) ssParam.innerMode = {};
    ssParam.innerMode[id] = 0;

    let moveSwitchTab = function(hideNode, showNode){
	let count = 0;
	let moveTab = function(){
	    count++;
	    if(count <= 10){
		let tmp = count * (-3);
		hideNode.style.top = tmp + "px";
	    }else if(count <= 20){
		let tmp = (count - 10) * 3 - 25;
		showNode.style.top = tmp + "px";
	    }else clearInterval(timer);
	};
	let timer = setInterval(moveTab, 30);
    }
    
    // switch button (inner mode, json)
    ulNode.appendChild(liNode);
    liNode.id = "query_tab_inner_" + id;
    liNode.className = "query_tab query_tab_button";
    liNode.style.width = "80px";
    liNode.style.marginLeft = "10px";
    liNode.innerHTML = "endpoint";
    
    // help button
    let url = "https://sparql-support.dbcls.jp/sparql-support.html";
    if(window.navigator.languages && window.navigator.languages[0] == "ja") url = "https://sparql-support.dbcls.jp/sparql-support_j.html";
    liNode = document.createElement("li");
    ulNode.appendChild(liNode);
    liNode.id = "query_tab_help_" + id;
    liNode.className = "query_tab query_tab_button";
    liNode.style.width = "18px";
    liNode.innerHTML = "?";
    liNode.onclick = function(){ window.open(url, "_blank"); };
    
    if(localStorage[ssParam.pathName + '_sparql_target_' + id]){
	let target = localStorage[ssParam.pathName + '_sparql_target_' + id];
	if(target == "inner") { switchInnerMode(id); }
	else if(target == "inner_j"){ switchInnerMode(id); switchInnerMode(id);}
	else if(ssParam.sparqlProxyFlag) { switchInnerMode(id); }
    }else{
	switchInnerMode(id);
    }

    ssParam.color = { "f": 1, "n": 63, "q": false};

    let params = location.search.substring(1).split('&');
    for(let i = 0; i < params.length; i++){
	if(params[i] == "exec=1"){
	    innerModeRunQuery(localStorage[ssParam.pathName + "_sparql_code_select_tab_" + id], id, 0);
	    break;
	}
    }
}

/// tabbed  mode
//////////////////////////////////

function addTab(cm, id){
    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]) + 1;
    let liNode = document.createElement("li");
    let plusNode = document.getElementById("query_tab_list_" + id).childNodes[tabNum];
    plusNode.parentNode.insertBefore(liNode, plusNode);
    localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id] = tabNum;
    liNode.appendChild(document.createTextNode(tabNum + 1));
    liNode.id = "query_tab_" + tabNum + "_" + id;
    liNode.name = "query_tab";
    liNode.className = "query_tab";
    ssParam.results['sparql_res_' + tabNum + "_" + id] = "";
    changeTab(cm, tabNum, id);
    localStorage[ssParam.pathName + '_sparql_code_tab_' + tabNum + "_" + id] = "";
    setQueryTabWidth(tabNum);
}

function removeTab(cm, id){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    if(localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id]){
	changeRemoveConfirm();
	ssParam.confirmBox.style.display = "block";
    }else{
	removeTabRun(cm, id);
    }
}

function removeTabRun(cm, id){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
    for(let i = selTab; i < tabNum; i++){
	let nextTab = i + 1;
	if(localStorage[ssParam.pathName + '_sparql_code_' + nextTab + "_" + id]){
	    localStorage[ssParam.pathName + '_sparql_code_' + i + "_" + id] = localStorage[ssParam.pathName + '_sparql_code_' + nextTab + "_" + id];
	    if(ssParam.results['sparql_res_' + nextTab + "_" + id]){
		ssParam.results['sparql_res_' + i + "_" + id] = ssParam.results['sparql_res_' + nextTab + "_" + id];
	    }else{
		ssParam.results['sparql_res_' + i + "_" + id] = "";
	    }
	}
    }
    if(selTab == tabNum){
	selTab--;
	changeTab(cm, selTab, id);
    }
    localStorage[ssParam.pathName + '_sparql_code_' + tabNum + "_" + id] = "";
    delete localStorage[ssParam.pathName + '_sparql_code_' + tabNum + "_" + id];
    let ulNode = document.getElementById("query_tab_list_" + id);
    let liNodes = ulNode.childNodes;
    ulNode.removeChild(liNodes[tabNum]);
    tabNum--;
    localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id] = tabNum;
    ssParam.textarea[id].value = localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id];
    ssParam.resultNode[id].innerHTML = "";
    if(ssParam.results['sparql_res_' + selTab + "_" + id]){
	let resTable = ssParam.results['sparql_res_' + selTab + "_" + id];
	ssParam.resultNode[id].appendChild(resTable);
    }
    setQueryTabWidth(tabNum);
    setCmDiv(cm, id);
}

function changeTab(cm, newTab, id){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
    if(selTab == newTab || newTab > tabNum) return 0;
    if(localStorage[ssParam.pathName + '_sparql_code_' + newTab + "_" + id]) ssParam.textarea[id].value = localStorage[ssParam.pathName + '_sparql_code_' + newTab + "_" + id];
    else ssParam.textarea[id].value = "";

    ssParam.resultNode[id].innerHTML = "";
    ssParam.subResNode[id].style.display = "none";
    if(ssParam.results['sparql_res_' + newTab + "_" + id]){
	let resTable = ssParam.results['sparql_res_' + newTab + "_" + id];
	ssParam.resultNode[id].appendChild(resTable);
	if(ssParam.innerMode[id] == 1){
	    if(document.getElementById("inner_result_table")){
		document.getElementById("inner_result_json").style.display = "none";
		document.getElementById("inner_result_table").style.display = "block";
	    }
	}else{
	    if(document.getElementById("inner_result_table")){
		document.getElementById("inner_result_table").style.display = "none";
		document.getElementById("inner_result_json").style.display = "block";
	    }
	}
    }

    setCmDiv(cm, id);
    document.getElementById("query_tab_" + newTab + "_" + id).classList.add("query_tab_active");
    document.getElementById("query_tab_" + newTab + "_" + id).style.cursor = "move";
    document.getElementById("query_tab_" + selTab + "_" + id).classList.remove("query_tab_active");
    document.getElementById("query_tab_" + selTab + "_" + id).style.cursor = "default";
    localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id] = newTab;
    resetDescribeLog();
}

function replaceTab(cm, id, move){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    let tabNum = parseInt(localStorage[ssParam.pathName + '_sparql_code_tab_num_' + id]);
    let targetTab = selTab + move;
    if(targetTab >= 0 && targetTab <= tabNum){
	if(!localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id]) localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id] = "";
	if(!localStorage[ssParam.pathName + '_sparql_code_' + targetTab + "_" + id]) localStorage[ssParam.pathName + '_sparql_code_' + targetTab + "_" + id] = "";
	let tmp = localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id];
	localStorage[ssParam.pathName + '_sparql_code_' + selTab + "_" + id] = localStorage[ssParam.pathName + '_sparql_code_' + targetTab + "_" + id];
	localStorage[ssParam.pathName + '_sparql_code_' + targetTab + "_" + id] = tmp;
	tmp = ssParam.results['sparql_res_' + selTab + "_" + id];
	ssParam.results['sparql_res_' + selTab + "_" + id] = ssParam.results['sparql_res_' + targetTab + "_" + id];
	ssParam.results['sparql_res_' + targetTab + "_" + id] = tmp;
	let jobs = Object.keys(ssParam.job);
	for(let i = 0; i < jobs.length; i++){
	    if(ssParam.job[jobs[i]] == targetTab){
		document.getElementById("query_tab_" + targetTab + "_" + id).classList.remove("query_tab_active");
		ssParam.job[jobs[i]] = selTab;
		ssParam.color.q = selTab;
	    }else if(ssParam.job[jobs[i]] == selTab){
		document.getElementById("query_tab_" + selTab + "_" + id).classList.remove("query_tab_active");
		ssParam.job[jobs[i]] = targetTab;
		ssParam.color.q = targetTab;
	    }
	}
	document.getElementById("query_tab_" + selTab + "_" + id).style.left = "0px";
	document.getElementById("query_tab_" + targetTab + "_" + id).classList.add("query_tab_active");
	document.getElementById("query_tab_" + targetTab + "_" + id).style.cursor = "move";
	document.getElementById("query_tab_" + selTab + "_" + id).classList.remove("query_tab_active");
	document.getElementById("query_tab_" + selTab + "_" + id).style.cursor = "default";
	localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id] = targetTab;
    }
    setCmDiv(cm, id);
}

function changeRemoveConfirm(){
    if(ssParam.confirmFlag == 1){
	ssParam.rmCancel.classList.add("confirm_button_active");
	ssParam.rmDone.classList.remove("confirm_button_active");
	ssParam.confirmFlag = 2;
    }else{
	ssParam.rmCancel.classList.remove("confirm_button_active");
	ssParam.rmDone.classList.add("confirm_button_active");
	ssParam.confirmFlag = 1;
    }
}

function switchInnerMode(id){
    if(ssParam.resultNode[id].style.display == "none"){
	ssParam.resultNode[id].style.display = "block";
	let tags = ["input", "button"];
	for(let j = 0; tags[j]; j++){
	    let inputNodes = document.getElementsByTagName(tags[j]);
	    for(let i = 0; i < inputNodes.length; i++){
		if(inputNodes[i].type == "submit"){
		    inputNodes[i].type = "button";
		    inputNodes[i].id = "submit_button_" + id;
		    break;
		}
	    }
	}
	document.getElementById("query_tab_inner_" + id).innerHTML = "table";
	localStorage[ssParam.pathName + '_sparql_target_' + id] = "inner";
	ssParam.innerMode[id] = 1;
    }else{
	if(ssParam.innerMode[id] == 1){
	    if(document.getElementById("inner_result_table")){
		document.getElementById("inner_result_table").style.display = "none";
		document.getElementById("inner_result_json").style.display = "block";
	    }
	    document.getElementById("query_tab_inner_" + id).innerHTML = "json";
	    localStorage[ssParam.pathName + '_sparql_target_' + id] = "inner_j";
	    ssParam.innerMode[id] = 2;
	}else{
	    if(document.getElementById("inner_result_table")){
		document.getElementById("inner_result_json").style.display = "none";
		document.getElementById("inner_result_table").style.display = "block";
	    }
	    ssParam.resultNode[id].style.display = "none";
	    let inputNode = document.getElementById("submit_button_" + id);
	    inputNode.type = "submit";
	    document.getElementById("query_tab_inner_" + id).innerHTML = "endpoint";
	    localStorage[ssParam.pathName + '_sparql_target_' + id] = "_self";
	    ssParam.innerMode[id] = 0;
	    if(ssParam.sparqlProxyFlag) switchInnerMode(id);
	}
    }
}

function setSubResButton(id){
    let ul = document.createElement("ul");
    ul.className = "cm-ss_subres_button";
    let prevButton = document.createElement("li");
    prevButton.innerHTML = "&lt;";
    prevButton.id = "cm-ss_prev_subres_li";
    prevButton.className = "cm-ss_subres_li cm-ss_subres_li_valid";
    if(ssParam.describeTarget == 0){
	prevButton.id = "cm-ss_prev_subres_li_off";
	prevButton.className = "cm-ss_subres_li cm-ss_subres_li_invalid";
    }
    ul.appendChild(prevButton);
    let nextButton = document.createElement("li");
    nextButton.innerHTML = "&gt;";
    nextButton.id = "cm-ss_next_subres_li";
    nextButton.className = "cm-ss_subres_li cm-ss_subres_li_valid";
    if(!ssParam.describeLog[ssParam.describeTarget + 1]){
	nextButton.id = "cm-ss_next_subres_li_off";
	nextButton.className = "cm-ss_subres_li cm-ss_subres_li_invalid";
    }
    ul.appendChild(nextButton);
    let deleteButton = document.createElement("li");
    deleteButton.innerHTML = "&#x00D7"; // "×"
    deleteButton.id = "cm-ss_delete_subres_li";
    deleteButton.className = "cm-ss_subres_li cm-ss_subres_li_valid";
    ul.appendChild(deleteButton);
    ssParam.subResNode[id].appendChild(ul);
}

function resetDescribeLog(){
    ssParam.describeLog = [];
    ssParam.describeTarget = -1;
}

function setQueryTabWidth(tabNum){
    let tab_width = 56;
    let width = document.getElementById("control_tabs").offsetWidth;
    if((tabNum + 1) * 62 + 170 > width){
	tab_width = Math.floor((width - 170) / (tabNum + 1) - 6);
	if(tab_width < 30) tab_width = 30;
    }
    let list = document.getElementsByClassName("query_tab");
    for(let i in list){
	if(list[i].id && list[i].id.match(/^query_tab_\d+_query$/)) list[i].style.width = tab_width + "px";
    }
}

/// popup clipboard copy
//////////////////////////////////

function copyStringToClipboard(string){
    let temp = document.createElement('div');
    temp.appendChild(document.createElement('pre')).textContent = string;
    let s = temp.style;
    s.position = 'fixed';
    s.left = '-100%';
    document.body.appendChild(temp);
    document.getSelection().selectAllChildren(temp);
    let result = document.execCommand('copy');
    document.body.removeChild(temp);
    return result;
}

function makeSparqlQueryLink(){
    let textarea = document.getElementsByTagName("textarea")[0];
    let query = textarea.value;
    let url = location.href.match(/([^\?]+)/)[1];
    let string = url + "?query=" + encodeURIComponent(query);
    if(document.getElementById("autoRunChkBox").checked) string += "&exec=1";
    return string;
}

function copyToClipboard(){
    document.getElementById("popupCopy").style.display = "none";
    let mode = document.getElementsByName("mode");
    let string =  document.getElementsByTagName("textarea")[0].value;
    for(let i = 0; i < mode.length; i++){
	if(mode[i].checked){
	    if(mode[i].value == "1") string = makeSparqlQueryLink();
	    else if(mode[i].value == "2") string = document.getElementById("shortUrlRadio").alt;
	}
    }
    //navigator.clipboard.writeText(string);
    copyStringToClipboard(string);
    let icon = document.getElementById("fileIcon");
    icon.style.display = "inline";
    let count = 1;
    let anime = function(){
	let pos = 200 - (count - 20) ** 1.5;
	if(count < 20) pos = 200;
	icon.style.marginLeft = pos + "px";
	count++;
	if(count > 57){
	    clearInterval(timer);
	    icon.style.display = "none";
	}
    }
    let timer = setInterval(anime, 10);
}

async function popupCopyForm(){
    let popup = document.getElementById("popupCopy");
    if(popup.style.display != "inline"){
	popup.style.display = "inline";
	let mode = document.getElementsByName("mode");
	for(let i = 0; i < mode.length; i++){
	    if(mode[i].checked && mode[i].value == "2"){
		setShortUrl();
		break;
	    }
	}
    }else{
	popup.style.display = "none";
    }
}

async function setShortUrl(){
    let string = makeSparqlQueryLink();
    let json = await fetch("https://is.gd/create.php?format=json&url=" + encodeURIComponent(string)).then(res=>res.json());
    document.getElementById("shortUrlRadio").alt = json.shorturl;
}

function showAutoRunBox(f){
    if(f) document.getElementById("autorun").style.display = "inline";
    else document.getElementById("autorun").style.display = "none";
    if(f == 2 && !document.getElementById("shortUrlRadio").alt) setShortUrl();
}

function hidePopupCopyForm() {
    let popup = document.getElementById("popupCopy");
    if(popup.style.display = "inline") popup.style.display = "none";
}

/// command
//////////////////////////////////

function ssCommand(cm, id, caret, line){
    let selTab = parseInt(localStorage[ssParam.pathName + '_sparql_code_select_tab_' + id]);
    if((line.match(/^#\s*clear_sparql_queries\s*;\s*$/) || line.match(/^#\s*バルス\s*;\s*$/)) && caret.line == 0){ 	// clear all
	localStorage.clear();
	ssParam.textarea[id].value = "";
	location.reload();
    }else if(line.match(/^#\s*font-size\s*:\s*\d+.*\s*;$/)){ //change font-size
	let size = line.match(/^#\s*font-size\s*:\s*(\d+).*\s*;\s*$/)[1] - 0;
	ssParam.codeMirrorDiv[id].style.fontSize = size + "px";
	size = size + Math.round(size / 8);
	ssParam.codeMirrorDiv[id].style.lineHeight = size + "px";
	addTab(cm, id);
	removeTab(cm, id);
	changeTab(cm, selTab, id);
	setCmDiv(cm, id);
    }else if(line.match(/^#\s*font-family\s*:\s*.+\s*;$/)){ //change font-family
	let family = line.match(/^#\s*font-family\s*:\s*(.+)\s*;\s*$/)[1];
	ssParam.codeMirrorDiv[id].style.fontFamily = family;
	addTab(cm, id);
	removeTab(cm, id);
	changeTab(cm, selTab, id);
	setCmDiv(cm, id);
    }else if(line.toUpperCase().match(/#\s*SPANG\s+.*;/) || line.toUpperCase().match(/#\s*SPANG;$/)) {
	cm.setCursor(Pos(caret.line, line.length));
	let string = autoCompletionSpang(line, id);
	caret = cm.getCursor('anchor');
	let end = cm.lineCount();
	cm.replaceRange(string, Pos(caret.line, caret.ch), Pos(end, 0));
    }else if(line.match(/^#\s*mixed-content-proxy\s*:\s*.+\s*;$/)){
	let f = line.match(/^#\s*mixed-content-proxy\s*:\s*(.+)\s*;\s*$/)[1];
	if(f == "true"){
	    ssParam.mixedContent = 1;
	    localStorage[ssParam.pathName + '_mixed_content_' + id] = 1;
	}else if(f == "false"){
	    ssParam.mixedContent = 0;
	    localStorage[ssParam.pathName + '_mixed_content_' + id] = 0;
	}
    }

    function autoCompletionSpang(spangLine){
	let s = "?s";
	let p = "?p";
	let o = "?o";
	let limit = "";
	let order = "";
	let from = "";
	let select = "SELECT";
	let count = false;
	let graph = false;
	if(spangLine.match(/[^\s];$/)) spangLine = spangLine.replace(/;$/, " ;");
	let spang = spangLine.split(/\s+/);
	for(let j = 0; j < spang.length; j++){
	    if(spang[j].match("-S")){ let tmp = uriCheck(spang, j + 1); if(tmp.match(/^[^\-]/)) s = tmp; }
	    else if(spang[j].match("-P")){ let tmp = uriCheck(spang, j + 1); if(tmp.match(/^[^\-]/)) p = tmp; }
	    else if(spang[j].match("-O")){ let tmp = uriCheck(spang, j + 1); if(tmp.match(/^[^\-]/)) o = tmp; }
	    else if(spang[j].match("-F")){ let tmp = uriCheck(spang, j + 1); if(tmp.match(/^[^\-]/)) from = "FROM " + tmp; }
	    else if(spang[j].match("-L")){ let tmp = spang[j + 1]; if(tmp.match(/[^\d]/)){ tmp = "10";} limit = "LIMIT " + tmp; }
	    else if(spang[j].match("-N")){ count = true; }
	    else if(spang[j].match("-G")){ graph = true;}
	}
	let code = s + " " + p + " " + o + " .";
	if(count) select = select + " COUNT(*)";
	else select = select + " *";
	if(graph){ select = "SELECT ?graph"; code = "GRAPH ?graph { " + code + " }"; order = "GROUP BY ?graph\nORDER BY ?graph"; if(limit){ limit = order + "\n" + limit; }else{ limit = order; } }
	if(from){ select = select + "\n" + from; }
	return "\n" + select + "\nWHERE {\n  " + code + "\n}\n" + limit;
    }
}

/// default params
//////////////////////////////////

function setDefaultSparqlTerm() {
    return ["AVG ()", "ASK {}", "ABS ()",
	    "BASE", "BIND ()", "BOUND ()", "BNODE ()",
	    "COUNT ()", "CONCAT ()", "CONTAINS ()", "CONSTRUCT {}", "COALESCE ()", "CEIL ()",
	    "DISTINCT", "DATATYPE ()", "DAY ()", "DESC ()", "DESCRIBE",
	    "EXISTS {}", "ENCODE_FOR_URI ()",
	    "FILTER ()", "FROM <>", "FLOOR ()",
	    "GRAPH", "GROUP BY", "GROUP_CONCAT ()",
	    "HAVING ()", "HOURS ()",
	    "IRI ()", "IN ()", "IF ()", "IsBlank ()", "IsIRI ()", "IsURI ()", "IsLiteral ()", "IsNumeric ()",
	    "LIMIT", "LANG ()", "LangMatches ()", "LCASE ()",
	    "MAX ()", "MIN ()", "MINUS {}", "MINUITES ()", "MONTH ()", "MD5 ()",
	    "NOT EXISTS {}", "NOT IN ()", "NOW ()",
	    "ORDER BY", "OFFSET", "OPTIONAL {}",
	    "PREFIX",
	    "REGEX ()", "REPLACE ()", "REDUCED", "RAND ()", "ROUND ()",
	    "SELECT", "SUM ()", "STR ()", "SUBSTR ()", "SERVICE {}", "STRDT ()", "SameTerm ()", "STRLEN ()", "STRLANG ()", "STRUUID ()", "STRSTARTS ()", "STRENDS ()", "STRBEFORE ()", "STRAFTER ()", "SAMPLE ()", "SECONDS ()", "SHA1 ()", "SHA256 ()", "SHA384 ()", "SHA512 ()",
	    "TIMEZONE ()", "TZ ()",
	    "URI ()", "UNION", "UCASE ()", "UUID ()",
	    "VALUES",
	    "WHERE {}",
	    "YEAR ()"];
}

function setDefaultPrefix() {
    return ["rdf:", "yago:", "foaf:", "rdfs:", "dbo:", "dbp:", "gr:", "dc:", "spacerel:", "owl:", "skos:", "geo:", "dcat:", "xsd:", "ont:", "xtypes:", "qb:", "sioc:", "onto:", "org:", "sio:", "dct:", "dcterms:", "dcterm:", "void:", "obo:", "prov:", "dbpedia:"];
}

function setDefaultUri(){
    let uri = {"id": "http://identifiers.org/"};
    ssParam.defaultUri = {};
    for(let key in ssParam.prefix2Uri){
	ssParam.defaultUri[key] = uri[key];
    }
    for(let key in uri){
	ssParam.defaultUri[key] = uri[key];
    }
}

async function setPrefixUri(cm, caret, id, prefix, flag) {
    let url = "https://prefix.cc/" + prefix + ".file.json";
    let options = { method: 'GET' };
    let res = await fetch(url, options).then(res=>res.json());
    let prefixes = prefix.split(",");
    for(let i = 0; i < prefixes.length; i++){
	let prefix = prefixes[i].replace(/:$/, "");
	let uri = await res[prefix];
	ssParam.prefix2Uri[prefix] = uri;
	localStorage[ssParam.pathName + '_prefix_uri_' + id] += " " + prefix + "," + uri;
	if(flag){
	    cm.replaceRange(" <" + uri + ">", Pos(caret.line, caret.ch), Pos(caret.line, caret.ch));
	    saveCode(cm, id);
	}
    }
}

async function getCustomPrefixList(url) {
    if(ssParam.mixedContent == 1 && location.protocol == "https:" && url.match(/^http:/)){
	url = "https://sparql-support.dbcls.jp/api/relay?endpoint=" + encodeURIComponent(url);
    }
    let options = { method: 'GET' };
    let res = await fetch(url, options).then(res=>res.text());
    let list = res;
    if(isJson(res)){
	list = "";
	let json = JSON.parse(res);
	let prefixes = Object.keys(json);
	for(let i = 0; i < prefixes.length; i++){
	    list += "PREFIX " + prefixes[i] + ": <" + json[prefixes[i]] + ">\n";
	}
    }
    if(list) return list;
    else return false;
}

async function setFormAction(cm, id, text){
    let lines = text.split(/\n/);
    if(lines[0].toLowerCase().match(/^##+ *endpoint +https*:\/\/[^\s]/)){
	ssParam.formNode[id].action = lines[0].match(/^##+.* +(https*:\/\/[^\s,;]+)/)[1];
    }else{
	ssParam.formNode[id].action = ssParam.defaultEndpoint[id];
    }
    ssParam.prefixList = "";
    for(let i = 0; i < lines.length; i++){
	if(lines[i].toLowerCase().match(/^# +@endpoint +https*:\/\/[^\s]/)) {
	    ssParam.formNode[id].action = lines[i].match(/^# +@.+ +(https*:\/\/[^\s,;]+)/)[1];
	}else if(lines[i].toLowerCase().match(/^# +@prefixes +https*:\/\/[^\s]/)) {
	    let caret = cm.getCursor('anchor');
	    if(caret.line == i) continue;
	    let url = lines[i].match(/^# +@.+ +(https*:\/\/[^\s;]+)/)[1];
	    if(!ssParam.prefixListUrl[url]){
		ssParam.prefixListUrl[url] = await getCustomPrefixList(url.replace(/,/g, "%2C"));
		ssParam.prefixList += ssParam.prefixListUrl[url];
	    }else if(ssParam.prefixListUrl[url]){
		ssParam.prefixList += ssParam.prefixListUrl[url];
	    }
	}
    }
}

function getDomain(path) {
    let domain = "localhost";
    if(path.match(/^https*\/\/[^\/]+\//)){
	domain = path.match(/^(https*\/\/[^\/]+\/)/)[1];
    }
    return domain;
}

function unique(a){
    return Array.from(new Set(a));
}

function isJson(arg){
    arg = (typeof arg === "function") ? arg() : arg;
    if (typeof arg  !== "string") {
        return false;
    }
    try {
        arg = JSON.parse(arg);
        return true;
    } catch (e) {
        return false;
    }
}
