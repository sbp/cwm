// Things we need to define to make converted pythn code work in js
// environment of tabulator

var RDFSink_forSomeSym = "http://www.w3.org/2000/10/swap/log#forSome";
var RDFSink_forAllSym = "http://www.w3.org/2000/10/swap/log#forAll";


//  pyjs seems to reference runtime library which I didn't find

pyjslib_Tuple = function(theList) { return theList };

pyjslib_List = function(theList) { return theList };

pyjslib_Dict = function(listOfPairs) {
    if (listOfPairs.length > 0)
	throw "missing.js: oops nnonempty dict not imp";
    return [];
}

pyjslib_len = function(s) { return s.length }

pyjslib_slice = function(str, i, j) {
    if ((typeof j == 'undefined') || (j ==null)) return str.slice(i);
    return str.slice(i, j) // @ exactly the same spec?
}
StopIteration = Error('dummy error stop iteration')

pyjslib_Iterator = function(theList) {
    this.last = 0;
    this.li = theList;
    this.next = function() {
	if (this.last == this.li.length) throw StopIteration;
	return this.li[this.last++];
    }
    return this;
}

ord = function(str) {
    return str.charCodeAt(0)
}

string_find = function(str, s) {
    return str.indexOf(s)
}

assertFudge = function(condition, desc) {
    if (condition) return;
    if (desc) throw "python Assertion failed: "+desc;
    throw "(python) Assertion failed.";  
}

uripath_join = function(base, given) {
    return Util.uri.join(given, base)  // sad but true
}

var diag_tracking = 0;

// why_BecauseOfData = function(doc, reason) { return doc };


RDF_type_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
DAML_sameAs_URI = "http://www.w3.org/2002/07/owl#sameAs";

function SyntaxError(details) {
    return new __SyntaxError(details);
}

function __SyntaxError(details) {
    this.details = details
}

/*

$Id: n3parser.js,v 1.4 2007-06-25 11:48:44 timbl Exp $

HAND EDITED FOR CONVERSION TO JAVASCRIPT

This module implements a Nptation3 parser, and the final
part of a notation3 serializer.

See also:

Notation 3
http://www.w3.org/DesignIssues/Notation3

Closed World Machine - and RDF Processor
http://www.w3.org/2000/10/swap/cwm

To DO: See also "@@" in comments

- Clean up interfaces
______________________________________________

Module originally by Dan Connolly, includeing notation3
parser and RDF generator. TimBL added RDF stream model
and N3 generation, replaced stream model with use
of common store/formula API.  Yosi Scharf developped
the module, including tests and test harness.

*/

var N3_forSome_URI = RDFSink_forSomeSym;
var N3_forAll_URI = RDFSink_forAllSym;
var ADDED_HASH = "#";
var LOG_implies_URI = "http://www.w3.org/2000/10/swap/log#implies";
var INTEGER_DATATYPE = "http://www.w3.org/2001/XMLSchema#integer";
var FLOAT_DATATYPE = "http://www.w3.org/2001/XMLSchema#double";
var DECIMAL_DATATYPE = "http://www.w3.org/2001/XMLSchema#decimal";
var BOOLEAN_DATATYPE = "http://www.w3.org/2001/XMLSchema#boolean";
var option_noregen = 0;
var _notQNameChars = "\t\r\n !\"#$%&'()*.,+/;<=>?@[\\]^`{|}~";
var _notNameChars =  ( _notQNameChars + ":" ) ;
var _rdfns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
var N3CommentCharacter = "#";
var eol = new RegExp("^[ \\t]*(#[^\\n]*)?\\r?\\n", 'g');
var eof = new RegExp("^[ \\t]*(#[^\\n]*)?$", 'g');
var ws = new RegExp("^[ \\t]*", 'g');
var signed_integer = new RegExp("^[-+]?[0-9]+", 'g');
var number_syntax = new RegExp("^([-+]?[0-9]+)(\\.[0-9]+)?(e[-+]?[0-9]+)?", 'g');
var digitstring = new RegExp("^[0-9]+", 'g');
var interesting = new RegExp("[\\\\\\r\\n\\\"]", 'g');
var langcode = new RegExp("^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)?", 'g');
function SinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why) {
    return new __SinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why);
}
function __SinkParser(store, openFormula, thisDoc, baseURI, genPrefix, metaURI, flags, why) {
    if (typeof openFormula == 'undefined') openFormula=null;
    if (typeof thisDoc == 'undefined') thisDoc="";
    if (typeof baseURI == 'undefined') baseURI=null;
    if (typeof genPrefix == 'undefined') genPrefix="";
    if (typeof metaURI == 'undefined') metaURI=null;
    if (typeof flags == 'undefined') flags="";
    if (typeof why == 'undefined') why=null;
/*
 note: namespace names should *not* end in #;
	the # will get added during qname processing */

    this._bindings = new pyjslib_Dict([]);
    this._flags = flags;
    if ((thisDoc != "")) {
    assertFudge((thisDoc.indexOf(":") >= 0), "Document URI not absolute: <%s>" % thisDoc);
    this._bindings[""] = (  ( thisDoc + "#" ) );
    }
    this._store = store;
    if (genPrefix) {
    store.setGenPrefix(genPrefix);
    }
    this._thisDoc = thisDoc;
    this.source = store.sym(thisDoc);
    this.lines = 0;
    this.statementCount = 0;
    this.startOfLine = 0;
    this.previousLine = 0;
    this._genPrefix = genPrefix;
    this.keywords = new pyjslib_List(["a", "this", "bind", "has", "is", "of", "true", "false"]);
    this.keywordsSet = 0;
    this._anonymousNodes = new pyjslib_Dict([]);
    this._variables = new pyjslib_Dict([]);
    this._parentVariables = new pyjslib_Dict([]);
    this._reason = why;
    this._reason2 = null;
    if (diag_tracking) {
    this._reason2 = why_BecauseOfData(store.sym(thisDoc), this._reason);
    }
    if (baseURI) {
    this._baseURI = baseURI;
    }
    else {
    if (thisDoc) {
    this._baseURI = thisDoc;
    }
    else {
    this._baseURI = null;
    }
    }
    assertFudge(!(this._baseURI) || (this._baseURI.indexOf(":") >= 0));
    if (!(this._genPrefix)) {
    if (this._thisDoc) {
    this._genPrefix =  ( this._thisDoc + "#_g" ) ;
    }
    else {
    this._genPrefix = RDFSink_uniqueURI();
    }
    }
    if ((openFormula == null)) {
    if (this._thisDoc) {
    this._formula = store.newFormula( ( thisDoc + "#_formula" ) );
    }
    else {
    this._formula = store.newFormula();
    }
    }
    else {
    this._formula = openFormula;
    }
    this._context = this._formula;
    this._parentContext = null;
}
__SinkParser.prototype.here = function(i) {
    return "%s_L%iC%i" % new pyjslib_Tuple([this._genPrefix, this.lines,  (  ( i - this.startOfLine )  + 1 ) ]);
};
__SinkParser.prototype.formula = function() {
    return this._formula;
};
__SinkParser.prototype.loadStream = function(stream) {
    return this.loadBuf(stream.read());
};
__SinkParser.prototype.loadBuf = function(buf) {
/*
Parses a buffer and returns its top level formula*/

    this.startDoc();
    this.feed(buf);
    return this.endDoc();
};
__SinkParser.prototype.feed = function(octets) {
/*
Feed an octet stream tothe parser
	
	if BadSyntax is raised, the string
	passed in the exception object is the
	remainder after any statements have been parsed.
	So if there is more data to feed to the
	parser, it should be straightforward to recover.*/

    var str = octets;
    var i = 0;
    while ((i >= 0)) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return;
    }
    var i = this.directiveOrStatement(str, j);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "expected directive or statement");
    }
    }
};
__SinkParser.prototype.directiveOrStatement = function(str, h) {
    var i = this.skipSpace(str, h);
    if ((i < 0)) {
    return i;
    }
    var j = this.directive(str, i);
    if ((j >= 0)) {
    return this.checkDot(str, j);
    }
    var j = this.statement(str, i);
    if ((j >= 0)) {
    return this.checkDot(str, j);
    }
    return j;
};
__SinkParser.prototype.tok = function(tok, str, i) {
/*
Check for keyword.  Space must have been stripped on entry and
	we must not be at end of file.*/

    var whitespace = "\t\n\v\f\r ";
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) == "@")) {
    var i =  ( i + 1 ) ;
    }
    else {
    if (!(this.keywords.indexOf(tok) >= 0)) {
    return -1;
    }
    }
    var k =  ( i + pyjslib_len(tok) ) ;
    if ((pyjslib_slice(str, i, k) == tok) && (_notQNameChars.indexOf(str[k] >= 0))) {
    return k;
    }
    else {
    return -1;
    }
};
__SinkParser.prototype.directive = function(str, i) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return j;
    }
    var res = new pyjslib_List([]);
    var j = this.tok("bind", str, i);
    if ((j > 0)) {
    raiseFudge(BadSyntax(this._thisDoc, this.lines, str, i, "keyword bind is obsolete: use @prefix"));
    }
    var j = this.tok("keywords", str, i);
    if ((j > 0)) {
    var i = this.commaSeparatedList(str, j, res, this.bareWord);
    if ((i < 0)) {
    raiseFudge(BadSyntax(this._thisDoc, this.lines, str, i, "'@keywords' needs comma separated list of words"));
    }
    this.setKeywords(pyjslib_slice(res, null, null));
    if ((diag_chatty_flag > 80)) {
    diag_progress("Keywords ", this.keywords);
    }
    return i;
    }
    var j = this.tok("forAll", str, i);
    if ((j > 0)) {
    var i = this.commaSeparatedList(str, j, res, this.uri_ref2);
    if ((i < 0)) {
    raiseFudge(BadSyntax(this._thisDoc, this.lines, str, i, "Bad variable list after @forAll"));
    }

        var __x = new pyjslib_Iterator(res);
        try {
            while (true) {
                var x = __x.next();
                
        
    if (!(this._variables.indexOf(x) >= 0) || (this._parentVariables.indexOf(x) >= 0)) {
    this._variables[x] = ( this._context.newUniversal(x));
    }

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    return i;
    }
    var j = this.tok("forSome", str, i);
    if ((j > 0)) {
    var i = this.commaSeparatedList(str, j, res, this.uri_ref2);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "Bad variable list after @forSome");
    }

        var __x = new pyjslib_Iterator(res);
        try {
            while (true) {
                var x = __x.next();
                
        
    this._context.declareExistential(x);

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    return i;
    }
    var j = this.tok("prefix", str, i);
    if ((j < 0)) {
    return -1;
    }
    var t = new pyjslib_List([]);
    var i = this.qname(str, j, t);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "expected qname after @prefix");
    }
    var j = this.uri_ref2(str, i, t);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected <uriref> after @prefix _qname_");
    }
    var ns = t[1].uri;
    if (this._baseURI) {
    var ns = uripath_join(this._baseURI, ns);
    }
    else {
    assertFudge((ns.indexOf(":") >= 0), "With no base URI, cannot handle relative URI");
    }
    assertFudge((ns.indexOf(":") >= 0));
    this._bindings[t[0][0]] = ( ns);
    this.bind(t[0][0], hexify(ns));
    return j;
};
__SinkParser.prototype.bind = function(qn, uri) {
    return;
    if ((qn == "")) {
    this._store.setDefaultNamespace(uri);
    }
    else {
    this._store.bind(qn, uri);
    }
};
__SinkParser.prototype.setKeywords = function(k) {
/*
Takes a list of strings*/

    if ((k == null)) {
    this.keywordsSet = 0;
    }
    else {
    this.keywords = k;
    this.keywordsSet = 1;
    }
};
__SinkParser.prototype.startDoc = function() {
};
__SinkParser.prototype.endDoc = function() {
/*
Signal end of document and stop parsing. returns formula*/

    return this._formula;
};
__SinkParser.prototype.makeStatement = function(quad) {
    quad[0].add(quad[2], quad[1], quad[3], this.source);
    this.statementCount += 1;
};
__SinkParser.prototype.statement = function(str, i) {
    var r = new pyjslib_List([]);
    var i = this.object(str, i, r);
    if ((i < 0)) {
    return i;
    }
    var j = this.property_list(str, i, r[0]);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected propertylist");
    }
    return j;
};
__SinkParser.prototype.subject = function(str, i, res) {
    return this.item(str, i, res);
};
__SinkParser.prototype.verb = function(str, i, res) {
/*
 has _prop_
	is _prop_ of
	a
	=
	_prop_
	>- prop ->
	<- prop -<
	_operator_*/

    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return j;
    }
    var r = new pyjslib_List([]);
    var j = this.tok("has", str, i);
    if ((j >= 0)) {
    var i = this.prop(str, j, r);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "expected property after 'has'");
    }
    res.push(new pyjslib_Tuple(["->", r[0]]));
    return i;
    }
    var j = this.tok("is", str, i);
    if ((j >= 0)) {
    var i = this.prop(str, j, r);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "expected <property> after 'is'");
    }
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "End of file found, expected property after 'is'");
    return j;
    }
    var i = j;
    var j = this.tok("of", str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected 'of' after 'is' <prop>");
    }
    res.push(new pyjslib_Tuple(["<-", r[0]]));
    return j;
    }
    var j = this.tok("a", str, i);
    if ((j >= 0)) {
    res.push(new pyjslib_Tuple(["->", this._store.sym(RDF_type_URI)]));
    return j;
    }
    if ((pyjslib_slice(str, i,  ( i + 2 ) ) == "<=")) {
    res.push(new pyjslib_Tuple(["<-", this._store.sym( ( Logic_NS + "implies" ) )]));
    return  ( i + 2 ) ;
    }
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) == "=")) {
    if ((pyjslib_slice(str,  ( i + 1 ) ,  ( i + 2 ) ) == ">")) {
    res.push(new pyjslib_Tuple(["->", this._store.sym( ( Logic_NS + "implies" ) )]));
    return  ( i + 2 ) ;
    }
    res.push(new pyjslib_Tuple(["->", this._store.sym(DAML_sameAs_URI)]));
    return  ( i + 1 ) ;
    }
    if ((pyjslib_slice(str, i,  ( i + 2 ) ) == ":=")) {
    res.push(new pyjslib_Tuple(["->",  ( Logic_NS + "becomes" ) ]));
    return  ( i + 2 ) ;
    }
    var j = this.prop(str, i, r);
    if ((j >= 0)) {
    res.push(new pyjslib_Tuple(["->", r[0]]));
    return j;
    }
    if ((pyjslib_slice(str, i,  ( i + 2 ) ) == ">-") || (pyjslib_slice(str, i,  ( i + 2 ) ) == "<-")) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, ">- ... -> syntax is obsolete.");
    }
    return -1;
};
__SinkParser.prototype.prop = function(str, i, res) {
    return this.item(str, i, res);
};
__SinkParser.prototype.item = function(str, i, res) {
    return this.path(str, i, res);
};
__SinkParser.prototype.blankNode = function(uri) {
    return this._context.bnode(uri, this._reason2);
};
__SinkParser.prototype.path = function(str, i, res) {
/*
Parse the path production.
	*/

    var j = this.nodeOrLiteral(str, i, res);
    if ((j < 0)) {
    return j;
    }
    while (("!^.".indexOf(pyjslib_slice(str, j,  ( j + 1 ) >= 0) ))) {
    var ch = pyjslib_slice(str, j,  ( j + 1 ) );
    if ((ch == ".")) {
    var ahead = pyjslib_slice(str,  ( j + 1 ) ,  ( j + 2 ) );
    if (!(ahead) || (_notNameChars.indexOf(ahead) >= 0) && !(":?<[{(".indexOf(ahead) >= 0)) {
    break;
    }
    }
    var subj = res.pop();
    var obj = this.blankNode(this.here(j));
    var j = this.node(str,  ( j + 1 ) , res);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found in middle of path syntax");
    }
    var pred = res.pop();
    if ((ch == "^")) {
    this.makeStatement(new pyjslib_Tuple([this._context, pred, obj, subj]));
    }
    else {
    this.makeStatement(new pyjslib_Tuple([this._context, pred, subj, obj]));
    }
    res.push(obj);
    }
    return j;
};
__SinkParser.prototype.anonymousNode = function(ln) {
/*
Remember or generate a term for one of these _: anonymous nodes*/

    var term = this._anonymousNodes[ln];
    if (term) {
    return term;
    }
    var term = this._store.newBlankNode(this._context, this._reason2);
    this._anonymousNodes[ln] = ( term);
    return term;
};
__SinkParser.prototype.node = function(str, i, res, subjectAlready) {
    if (typeof subjectAlready == 'undefined') subjectAlready=null;
/*
Parse the <node> production.
	Space is now skipped once at the beginning
	instead of in multipe calls to self.skipSpace().
	*/

    var subj = subjectAlready;
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return j;
    }
    var i = j;
    var ch = pyjslib_slice(str, i,  ( i + 1 ) );
    if ((ch == "[")) {
    var bnodeID = this.here(i);
    var j = this.skipSpace(str,  ( i + 1 ) );
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF after '['");
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == "=")) {
    var i =  ( j + 1 ) ;
    var objs = new pyjslib_List([]);
    var j = this.objectList(str, i, objs);
None
    if ((j >= 0)) {
    var subj = objs[0];
    if ((pyjslib_len(objs) > 1)) {

        var __obj = new pyjslib_Iterator(objs);
        try {
            while (true) {
                var obj = __obj.next();
                
        
    this.makeStatement(new pyjslib_Tuple([this._context, this._store.sym(DAML_sameAs_URI), subj, obj]));

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    }
    var j = this.skipSpace(str, j);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF when objectList expected after [ = ");
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == ";")) {
    var j =  ( j + 1 ) ;
    }
    }
    else {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "objectList expected after [= ");
    }
    }
    if ((subj == null)) {
    var subj = this.blankNode(bnodeID);
    }
    var i = this.property_list(str, j, subj);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "property_list expected");
    }
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF when ']' expected after [ <propertyList>");
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) != "]")) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "']' expected");
    }
    res.push(subj);
    return  ( j + 1 ) ;
    }
    if ((ch == "{")) {
    var ch2 = pyjslib_slice(str,  ( i + 1 ) ,  ( i + 2 ) );
    if ((ch2 == "$")) {
    i += 1;
    var j =  ( i + 1 ) ;
    var List = new pyjslib_List([]);
    var first_run = true;
    while (1) {
    var i = this.skipSpace(str, j);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "needed '$}', found end.");
    }
    if ((pyjslib_slice(str, i,  ( i + 2 ) ) == "$}")) {
    var j =  ( i + 2 ) ;
    break;
    }
    if (!(first_run)) {
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) == ",")) {
    i += 1;
    }
    else {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected: ','");
    }
    }
    else {
    var first_run = false;
    }
    var item = new pyjslib_List([]);
    var j = this.item(str, i, item);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected item in set or '$}'");
    }
    __List.prototype.append.call(this._store.intern(item[0]));
    }
    res.push(this._store.newSet(List, this._context));
    return j;
    }
    else {
    var j =  ( i + 1 ) ;
    var oldParentContext = this._parentContext;
    this._parentContext = this._context;
    var parentAnonymousNodes = this._anonymousNodes;
    var grandParentVariables = this._parentVariables;
    this._parentVariables = this._variables;
    this._anonymousNodes = new pyjslib_Dict([]);
    this._variables = this._variables.copy();
    var reason2 = this._reason2;
    this._reason2 = becauseSubexpression;
    if ((subj == null)) {
    var subj = this._store.newFormula();
    }
    this._context = subj;
    while (1) {
    var i = this.skipSpace(str, j);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "needed '}', found end.");
    }
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) == "}")) {
    var j =  ( i + 1 ) ;
    break;
    }
    var j = this.directiveOrStatement(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected statement or '}'");
    }
    }
    this._anonymousNodes = parentAnonymousNodes;
    this._variables = this._parentVariables;
    this._parentVariables = grandParentVariables;
    this._context = this._parentContext;
    this._reason2 = reason2;
    this._parentContext = oldParentContext;
    res.push(subj.close());
    return j;
    }
    }
    if ((ch == "(")) {
    var thing_type = this._store.newList;
    var ch2 = pyjslib_slice(str,  ( i + 1 ) ,  ( i + 2 ) );
    if ((ch2 == "$")) {
    var thing_type = this._store.newSet;
    i += 1;
    }
    var j =  ( i + 1 ) ;
    var List = new pyjslib_List([]);
    while (1) {
    var i = this.skipSpace(str, j);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "needed ')', found end.");
    }
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) == ")")) {
    var j =  ( i + 1 ) ;
    break;
    }
    var item = new pyjslib_List([]);
    var j = this.item(str, i, item);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "expected item in list or ')'");
    }
    __List.prototype.append.call(this._store.intern(item[0]));
    }
    res.push(thing_type(List, this._context));
    return j;
    }
    var j = this.tok("this", str, i);
    if ((j >= 0)) {
    res.push(this._context);
    return j;
    }
    var j = this.tok("true", str, i);
    if ((j >= 0)) {
    res.push(true);
    return j;
    }
    var j = this.tok("false", str, i);
    if ((j >= 0)) {
    res.push(false);
    return j;
    }
    if ((subj == null)) {
    var j = this.uri_ref2(str, i, res);
    if ((j >= 0)) {
    return j;
    }
    }
    return -1;
};
__SinkParser.prototype.property_list = function(str, i, subj) {
/*
Parse property list
	Leaves the terminating punctuation in the buffer
	*/

    while (1) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF found when expected verb in property list");
    return j;
    }
    if ((pyjslib_slice(str, j,  ( j + 2 ) ) == ":-")) {
    var i =  ( j + 2 ) ;
    var res = new pyjslib_List([]);
    var j = this.node(str, i, res, subj);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "bad {} or () or [] node after :- ");
    }
    var i = j;
    continue;
    }
    var i = j;
    var v = new pyjslib_List([]);
    var j = this.verb(str, i, v);
    if ((j <= 0)) {
    return i;
    }
    var objs = new pyjslib_List([]);
    var i = this.objectList(str, j, objs);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "objectList expected");
    }

        var __obj = new pyjslib_Iterator(objs);
        try {
            while (true) {
                var obj = __obj.next();
                
        
    var pairFudge = v[0];
    var dir = pairFudge[0];
    var sym = pairFudge[1];
    if ((dir == "->")) {
    this.makeStatement(new pyjslib_Tuple([this._context, sym, subj, obj]));
    }
    else {
    this.makeStatement(new pyjslib_Tuple([this._context, sym, obj, subj]));
    }

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found in list of objects");
    return j;
    }
    if ((pyjslib_slice(str, i,  ( i + 1 ) ) != ";")) {
    return i;
    }
    var i =  ( i + 1 ) ;
    }
};
__SinkParser.prototype.commaSeparatedList = function(str, j, res, what) {
/*
return value: -1 bad syntax; >1 new position in str
	res has things found appended
	*/

    var i = this.skipSpace(str, j);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "EOF found expecting comma sep list");
    return i;
    }
    if ((str[i] == ".")) {
    return j;
    }
    var i = what(str, i, res);
    if ((i < 0)) {
    return -1;
    }
    while (1) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return j;
    }
    var ch = pyjslib_slice(str, j,  ( j + 1 ) );
    if ((ch != ",")) {
    if ((ch != ".")) {
    return -1;
    }
    return j;
    }
    var i = what(str,  ( j + 1 ) , res);
    if ((i < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "bad list content");
    return i;
    }
    }
};
__SinkParser.prototype.objectList = function(str, i, res) {
    var i = this.object(str, i, res);
    if ((i < 0)) {
    return -1;
    }
    while (1) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "EOF found after object");
    return j;
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) != ",")) {
    return j;
    }
    var i = this.object(str,  ( j + 1 ) , res);
    if ((i < 0)) {
    return i;
    }
    }
};
__SinkParser.prototype.checkDot = function(str, i) {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return j;
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == ".")) {
    return  ( j + 1 ) ;
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == "}")) {
    return j;
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == "]")) {
    return j;
    }
    throw BadSyntax(this._thisDoc, this.lines, str, j, "expected '.' or '}' or ']' at end of statement");
    return i;
};
__SinkParser.prototype.uri_ref2 = function(str, i, res) {
/*
Generate uri from n3 representation.

	Note that the RDF convention of directly concatenating
	NS and local name is now used though I prefer inserting a '#'
	to make the namesapces look more like what XML folks expect.
	*/

    var qn = new pyjslib_List([]);
    var j = this.qname(str, i, qn);
    if ((j >= 0)) {
    var pairFudge = qn[0];
    var pfx = pairFudge[0];
    var ln = pairFudge[1];
    if ((pfx == null)) {
    assertFudge(0, "not used?");
    var ns =  ( this._baseURI + ADDED_HASH ) ;
    }
    else {
    var ns = this._bindings[pfx];
    if (!(ns)) {
    if ((pfx == "_")) {
    res.push(this.anonymousNode(ln));
    return j;
    }
    throw BadSyntax(this._thisDoc, this.lines, str, i, "Prefix %s not bound" % pfx);
    }
    }
    var symb = this._store.sym( ( ns + ln ) );
    if ((this._variables.indexOf(symb) >= 0)) {
    res.push(this._variables[symb]);
    }
    else {
    res.push(symb);
    }
    return j;
    }
    var i = this.skipSpace(str, i);
    if ((i < 0)) {
    return -1;
    }
    if ((str[i] == "?")) {
    var v = new pyjslib_List([]);
    var j = this.variable(str, i, v);
    if ((j > 0)) {
    res.push(v[0]);
    return j;
    }
    return -1;
    }
    else if ((str[i] == "<")) {
    var i =  ( i + 1 ) ;
    var st = i;
    while ((i < pyjslib_len(str))) {
    if ((str[i] == ">")) {
    var uref = pyjslib_slice(str, st, i);
    if (this._baseURI) {
    var uref = uripath_join(this._baseURI, uref);
    }
    else {
    assertFudge((uref.indexOf(":") >= 0), "With no base URI, cannot deal with relative URIs");
    }
    if ((pyjslib_slice(str,  ( i - 1 ) , i) == "#") && !((pyjslib_slice(uref, -1, null) == "#"))) {
    var uref =  ( uref + "#" ) ;
    }
    var symb = this._store.sym(uref);
    if ((this._variables.indexOf(symb) >= 0)) {
    res.push(this._variables[symb]);
    }
    else {
    res.push(symb);
    }
    return  ( i + 1 ) ;
    }
    var i =  ( i + 1 ) ;
    }
    throw BadSyntax(this._thisDoc, this.lines, str, j, "unterminated URI reference");
    }
    else if (this.keywordsSet) {
    var v = new pyjslib_List([]);
    var j = this.bareWord(str, i, v);
    if ((j < 0)) {
    return -1;
    }
    if ((this.keywords.indexOf(v[0] >= 0))) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "Keyword \"%s\" not allowed here." % v[0]);
    }
    res.push(this._store.sym( ( this._bindings[""] + v[0] ) ));
    return j;
    }
    else {
    return -1;
    }
};
__SinkParser.prototype.skipSpace = function(str, i) {
/*
Skip white space, newlines and comments.
	return -1 if EOF, else position of first non-ws character*/

    while (1) {
    eol.lastIndex = 0;
    var m = eol.exec(str.slice(i));
    if ((m == null)) {
    break;
    }
    this.lines =  ( this.lines + 1 ) ;
    i += eol.lastIndex;
    this.previousLine = this.startOfLine;
    this.startOfLine = i;
    log.debug( (  (  ( "line " + this.lines )  + " " )  + str.slice(this.previousLine, this.startOfLine) ) );
    }
    ws.lastIndex = 0;
    var m = ws.exec(str.slice(i));
    if ((m != null) && (m[0] != "")) {
    i += ws.lastIndex;
    }
    if ((i == pyjslib_len(str))) {
    return -1;
    }
    return i;
};
__SinkParser.prototype.variable = function(str, i, res) {
/*
	?abc -> variable(:abc)
  	*/

    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return -1;
    }
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) != "?")) {
    return -1;
    }
    var j =  ( j + 1 ) ;
    var i = j;
    if (("0123456789-".indexOf(str[j] >= 0))) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "Varible name can't start with '%s'" % str[j]);
    return -1;
    }
    while ((i < pyjslib_len(str)) && !(_notNameChars.indexOf(str[i] >= 0))) {
    var i =  ( i + 1 ) ;
    }
    if ((this._parentContext == null)) {
    throw BadSyntax(this._thisDoc, this.lines, str, j, "Can't use ?xxx syntax for variable in outermost level: %s" % pyjslib_slice(str,  ( j - 1 ) , i));
    }
    var varURI = this._store.sym( (  ( this._baseURI + "#" )  + pyjslib_slice(str, j, i) ) );
    if (!(this._parentVariables.indexOf(varURI) >= 0)) {
    this._parentVariables[varURI] = ( this._parentContext.newUniversal(varURI, this._reason2));
    }
    res.push(this._parentVariables[varURI]);
    return i;
};
__SinkParser.prototype.bareWord = function(str, i, res) {
/*
	abc -> :abc
  	*/

    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return -1;
    }
    if (("0123456789-".indexOf(str[j] >= 0)) || (_notNameChars.indexOf(str[j] >= 0))) {
    return -1;
    }
    var i = j;
    while ((i < pyjslib_len(str)) && !(_notNameChars.indexOf(str[i] >= 0))) {
    var i =  ( i + 1 ) ;
    }
    res.push(pyjslib_slice(str, j, i));
    return i;
};
__SinkParser.prototype.qname = function(str, i, res) {
/*

	xyz:def -> ('xyz', 'def')
	If not in keywords and keywordsSet: def -> ('', 'def')
	:def -> ('', 'def')    
	*/

    var i = this.skipSpace(str, i);
    if ((i < 0)) {
    return -1;
    }
    var c = str[i];
    if (("0123456789-+".indexOf(c) >= 0)) {
    return -1;
    }
    if (!(_notNameChars.indexOf(c) >= 0)) {
    var ln = c;
    var i =  ( i + 1 ) ;
    while ((i < pyjslib_len(str))) {
    var c = str[i];
    if (!(_notNameChars.indexOf(c) >= 0)) {
    var ln =  ( ln + c ) ;
    var i =  ( i + 1 ) ;
    }
    else {
    break;
    }
    }
    }
    else {
    var ln = "";
    }
    if ((i < pyjslib_len(str)) && (str[i] == ":")) {
    var pfx = ln;
    var i =  ( i + 1 ) ;
    var ln = "";
    while ((i < pyjslib_len(str))) {
    var c = str[i];
    if (!(_notNameChars.indexOf(c) >= 0)) {
    var ln =  ( ln + c ) ;
    var i =  ( i + 1 ) ;
    }
    else {
    break;
    }
    }
    res.push(new pyjslib_Tuple([pfx, ln]));
    return i;
    }
    else {
    if (ln && this.keywordsSet && !(this.keywords.indexOf(ln) >= 0)) {
    res.push(new pyjslib_Tuple(["", ln]));
    return i;
    }
    return -1;
    }
};
__SinkParser.prototype.object = function(str, i, res) {
    var j = this.subject(str, i, res);
    if ((j >= 0)) {
    return j;
    }
    else {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return -1;
    }
    else {
    var i = j;
    }
    if ((str[i] == "\"")) {
    if ((pyjslib_slice(str, i,  ( i + 3 ) ) == "\"\"\"")) {
    var delim = "\"\"\"";
    }
    else {
    var delim = "\"";
    }
    var i =  ( i + pyjslib_len(delim) ) ;
    var pairFudge = this.strconst(str, i, delim);
    var j = pairFudge[0];
    var s = pairFudge[1];
    res.push(this._store.literal(s));
    diag_progress("New string const ", s, j);
    return j;
    }
    else {
    return -1;
    }
    }
};
__SinkParser.prototype.nodeOrLiteral = function(str, i, res) {
    var j = this.node(str, i, res);
    if ((j >= 0)) {
    return j;
    }
    else {
    var j = this.skipSpace(str, i);
    if ((j < 0)) {
    return -1;
    }
    else {
    var i = j;
    }
    var ch = str[i];
    if (("-+0987654321".indexOf(ch) >= 0)) {
    number_syntax.lastIndex = i;
    var m = number_syntax.match(str);
    if ((m == null)) {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "Bad number syntax");
    }
    var j = number_syntax.lastIndex;
    if ((m.group("exponent") != null)) {
    res.push(float(pyjslib_slice(str, i, j)));
    }
    else if ((m.group("decimal") != null)) {
    res.push(local_decimal_Decimal(pyjslib_slice(str, i, j)));
    }
    else {
    res.push(long(pyjslib_slice(str, i, j)));
    }
    return j;
    }
    if ((str[i] == "\"")) {
    if ((pyjslib_slice(str, i,  ( i + 3 ) ) == "\"\"\"")) {
    var delim = "\"\"\"";
    }
    else {
    var delim = "\"";
    }
    var i =  ( i + pyjslib_len(delim) ) ;
    var dt = null;
    var pairFudge = this.strconst(str, i, delim);
    var j = pairFudge[0];
    var s = pairFudge[1];
    var lang = null;
    if ((pyjslib_slice(str, j,  ( j + 1 ) ) == "@")) {
    var m = langcode.match(str,  ( j + 1 ) );
    if ((m == null)) {
    throw BadSyntax(this._thisDoc, startline, str, i, "Bad language code syntax on string literal, after @");
    }
    var i = m.end();
    var lang = pyjslib_slice(str,  ( j + 1 ) , i);
    var j = i;
    }
    if ((pyjslib_slice(str, j,  ( j + 2 ) ) == "^^")) {
    var res2 = new pyjslib_List([]);
    var j = this.uri_ref2(str,  ( j + 2 ) , res2);
    var dt = res2[0];
    }
    res.push(this._store.literal(s, lang, dt));
    return j;
    }
    else {
    return -1;
    }
    }
};
__SinkParser.prototype.strconst = function(str, i, delim) {
/*
parse an N3 string constant delimited by delim.
        return index, val
        */

    var j = i;
    var ustr = "";
    var startline = this.lines;
    while ((j < pyjslib_len(str))) {
    var i =  ( j + pyjslib_len(delim) ) ;
    if ((pyjslib_slice(str, j, i) == delim)) {
    return new pyjslib_Tuple([i, ustr]);
    }
    if ((str[j] == "\"")) {
    var ustr =  ( ustr + "\"" ) ;
    var j =  ( j + 1 ) ;
    continue;
    }
    interesting.lastIndex = 0;
    var m = interesting.exec(str.slice(j));
    if (!(m)) {
    throw BadSyntax(this._thisDoc, startline, str, j, "Closing quote missing in string at ^ in %s^%s" % new pyjslib_Tuple([pyjslib_slice(str,  ( j - 20 ) , j), pyjslib_slice(str, j,  ( j + 20 ) )]));
    }
    var i =  (  ( j + interesting.lastIndex )  - 1 ) ;
    var ustr =  ( ustr + pyjslib_slice(str, j, i) ) ;
    var ch = str[i];
    if ((ch == "\"")) {
    var j = i;
    continue;
    }
    else if ((ch == "\r")) {
    var j =  ( i + 1 ) ;
    continue;
    }
    else if ((ch == "\n")) {
    if ((delim == "\"")) {
    throw BadSyntax(this._thisDoc, startline, str, i, "newline found in string literal");
    }
    this.lines =  ( this.lines + 1 ) ;
    var ustr =  ( ustr + ch ) ;
    var j =  ( i + 1 ) ;
    this.previousLine = this.startOfLine;
    this.startOfLine = j;
    }
    else if ((ch == "\\")) {
    var j =  ( i + 1 ) ;
    var ch = pyjslib_slice(str, j,  ( j + 1 ) );
    if (!(ch)) {
    throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal (2)");
    }
    var k = string_find("abfrtvn\\\"", ch);
    if ((k >= 0)) {
    var uch = "\a\b\f\r\t\v\n\\\""[k];
    var ustr =  ( ustr + uch ) ;
    var j =  ( j + 1 ) ;
    }
    else if ((ch == "u")) {
    var pairFudge = this.uEscape(str,  ( j + 1 ) , startline);
    var j = pairFudge[0];
    var ch = pairFudge[1];
    var ustr =  ( ustr + ch ) ;
    }
    else if ((ch == "U")) {
    var pairFudge = this.UEscape(str,  ( j + 1 ) , startline);
    var j = pairFudge[0];
    var ch = pairFudge[1];
    var ustr =  ( ustr + ch ) ;
    }
    else {
    throw BadSyntax(this._thisDoc, this.lines, str, i, "bad escape");
    }
    }
    }
    throw BadSyntax(this._thisDoc, this.lines, str, i, "unterminated string literal");
};
__SinkParser.prototype.uEscape = function(str, i, startline) {
    var j = i;
    var count = 0;
    var value = 0;
    while ((count < 4)) {
    var chFudge = pyjslib_slice(str, j,  ( j + 1 ) );
    var ch = chFudge.lower();
    var j =  ( j + 1 ) ;
    if ((ch == "")) {
    throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal(3)");
    }
    var k = string_find("0123456789abcdef", ch);
    if ((k < 0)) {
    throw BadSyntax(this._thisDoc, startline, str, i, "bad string literal hex escape");
    }
    var value =  (  ( value * 16 )  + k ) ;
    var count =  ( count + 1 ) ;
    }
    var uch = unichr(value);
    return new pyjslib_Tuple([j, uch]);
};
__SinkParser.prototype.UEscape = function(str, i, startline) {
    var stringType = type("");
    var j = i;
    var count = 0;
    var value = "\\U";
    while ((count < 8)) {
    var chFudge = pyjslib_slice(str, j,  ( j + 1 ) );
    var ch = chFudge.lower();
    var j =  ( j + 1 ) ;
    if ((ch == "")) {
    throw BadSyntax(this._thisDoc, startline, str, i, "unterminated string literal(3)");
    }
    var k = string_find("0123456789abcdef", ch);
    if ((k < 0)) {
    throw BadSyntax(this._thisDoc, startline, str, i, "bad string literal hex escape");
    }
    var value =  ( value + ch ) ;
    var count =  ( count + 1 ) ;
    }
    var uch = stringType(value).decode("unicode-escape");
    return new pyjslib_Tuple([j, uch]);
};
__BadSyntax.prototype = new __SyntaxError;
function BadSyntax(uri, lines, str, i, why) {
    return new __BadSyntax(uri, lines, str, i, why);
}
function __BadSyntax(uri, lines, str, i, why) {
    this._str = str;
    this._i = i;
    this._why = why;
    this.lines = lines;
    this._uri = uri;
}
__BadSyntax.prototype.__str__ = function() {
    var str = this._str;
    var i = this._i;
    var st = 0;
    if ((i > 60)) {
    var pre = "...";
    var st =  ( i - 60 ) ;
    }
    else {
    var pre = "";
    }
    if (( ( pyjslib_len(str) - i )  > 60)) {
    var post = "...";
    }
    else {
    var post = "";
    }
    return "Line %i of <%s>: Bad syntax (%s) at ^ in:\n\"%s%s^%s%s\"" % new pyjslib_Tuple([ ( this.lines + 1 ) , this._uri, this._why, pre, pyjslib_slice(str, st, i), pyjslib_slice(str, i,  ( i + 60 ) ), post]);
};
function stripCR(str) {
    var res = "";

        var __ch = new pyjslib_Iterator(str);
        try {
            while (true) {
                var ch = __ch.next();
                
        
    if ((ch != "\r")) {
    var res =  ( res + ch ) ;
    }

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    return res;
}


function dummyWrite(x) {
}


function hexify(ustr) {
/*
Use URL encoding to return an ASCII string
    corresponding to the given UTF8 string

    >>> hexify("http://example/a b")
    'http://example/a%20b'
    
    */

    var str = "";

        var __ch = new pyjslib_Iterator(ustr);
        try {
            while (true) {
                var ch = __ch.next();
                
        
    if ((ord(ch) > 126) || (ord(ch) < 33)) {
    var ch = "%%%02X" % ord(ch);
    }
    else {
    var ch = "%c" % ord(ch);
    }
    var str =  ( str + ch ) ;

            }
        } catch (e) {
            if (e != StopIteration) {
                throw e;
            }
        }
        
    return str;
}


