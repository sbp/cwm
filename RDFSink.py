#!/usr/bin/python
"""RDFSink -- RDF parser/serializer/store interface

HISTORY

This module is being factored out of notation3.py

REFERENCES
  Python Style Guide
  Author: Guido van Rossum
  http://www.python.org/doc/essays/styleguide.html

"""

__version__ = "$Id: RDFSink.py,v 1.26 2003-08-25 14:54:51 timbl Exp $"

import uripath
import time
from diag import progress

# The statement is stored as a quad - affectionately known as a triple ;-)
# offsets when a statement is stored as a Python tuple (c, p, s, o)
CONTEXT = 0
PRED = 1  
SUBJ = 2
OBJ = 3

PARTS =  PRED, SUBJ, OBJ
ALL4 = CONTEXT, PRED, SUBJ, OBJ

# A sink takes quads where each item is a pair   type, value
# However, the recopmmended way is for the source to call the factory methods new* rather
# than just make up pairs.

SYMBOL = 0          # URI which or may not have a fragment.
                    # (formerly: RESOURCE)
FORMULA = 1         # A { } set of statements. (identifier is arbitrary)
LITERAL = 2         # string etc - maps to data: @@??
ANONYMOUS = 3       # As SYMBOL except actual symbol is arbitrary, can be regenerated


# quanitifiers... @@it's misleading to treat these as predicates...
Logic_NS = "http://www.w3.org/2000/10/swap/log#"
# For some graphs you can express with NTriples, there is no RDF syntax. The 
# following allows an anonymous node to be merged with another node.
# It really is the same node, at the ntriples level, do not confuse with daml:equivalentTO
NODE_MERGE_URI = Logic_NS + "is"  # Pseudo-property indicating node merging
forSomeSym = Logic_NS + "forSome"
forAllSym = Logic_NS + "forAll"

RDF_type_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
RDF_NS_URI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
# DAML_NS=DPO_NS = "http://www.daml.org/2001/03/daml+oil#"  # DAML plus oil
OWL_NS = "http://www.w3.org/2002/07/owl#"
DAML_equivalentTo_URI = OWL_NS+"equivalentTo"
parsesTo_URI = Logic_NS + "parsesTo"
RDF_spec = "http://www.w3.org/TR/REC-rdf-syntax/"

#List_NS = DPO_NS     # We have to pick just one all the time
List_NS = RDF_NS_URI     # From 20030808


_Old_Logic_NS = "http://www.w3.org/2000/10/swap/log.n3#"


# For lists:
N3_first = (SYMBOL, List_NS + "first")
N3_rest = (SYMBOL, List_NS + "rest")
N3_nil = (SYMBOL, List_NS + "nil")
N3_List = (SYMBOL, List_NS + "List")
N3_Empty = (SYMBOL, List_NS + "Empty")


# Standard python modules:
from os import getpid
from time import time

# SWAP modules:
from diag import verbosity, progress
from os import environ

runNamespaceValue = None

def runNamespace():
    "Return a URI suitable as a namespace for run-local objects"
    # @@@ include hostname (privacy?) (hash it?)
    global runNamespaceValue
    if runNamespaceValue == None:
	try:
	    runNamespaceValue = environ["CWM_RUN_NS"]
	except KeyError:
	    runNamespaceValue = uripath.join(
		uripath.base(), ".run-" + `time()` + "p"+ `getpid()` +"#")
    return runNamespaceValue

class URISyntaxError(ValueError):
    """A parameter is passed to a routine that requires a URI reference"""
    pass


class RDFSink:

    """interface to connect modules in RDF processing.
    OBSOLETE

    This is a superclass for other RDF processors which accept RDF events
    or indeed Swell events. It is superceded, effectively, by the class Formula,
    as a sink of data and a soiurce of new symbols.
    
    Keeps track of prefixes.
    
    This interface has the advantage that it does n ot have any dependencies
    on object types, it is really one-way (easily serialized as no return values).
    It has the disadvantages that
	- It uses the pseudoproperties log:forSome and log:forAll to
	  make variables, which is a bit of a kludge.
	- It may involve on the receiver side the same thing being interned
	  many times, which wastes time searching hash tables.
    The superclass handles common functions such as craeting new arbitray
    identifiers
    """

    def __init__(self, genPrefix=None):
	"""If you give it a URI prefix to use for generated IDs it
	will use one; otherwise, it will use the name of an imaginary temporary file
	in the current directory."""
        self.prefixes = { }     # Convention only - human friendly to
                                # track these.
        self.namespaces = {}    # reverse mapping of prefixes
        self.defaultNamespace = None
	self.usingRunNamespace = 0
	self.declaredRunNamespace = 0

	self._genPrefix = genPrefix
	if genPrefix == None:
	    self._genPrefix = runNamespace()  + "_g"
	    self.usingRunNamespace = 1
	self._nextId = 0

    def startDoc(self):
        pass

    def endDoc(self, rootFormulaPair):
	"""End a document
	
	Call this once only at the end of parsing so that the receiver can wrap
	things up, oprimize, intern, index and so on.  The pair given is the (type, value)
	identifier of the root formula of the thing parsed."""
        pass

    def reopen(self):
	"""Un-End a document
	
	If you have added stuff to a document, thought you were done, and
	then want to add more, call this to get back into the sate that makeSatement
	is again acceptable. Remember to end the document again when done."""
        pass

    def makeStatement(self, tuple, why=None):
        """add a statement to a stream/store.

        raises URISyntaxError on bad URIs
        tuple is a quad (context, predicate, subject, object) of things generated by calls to newLiteral etc
	why is reason for the statement.
        """
        
        pass

    def bind(self, prefix, uri):
	"""Pass on a binding hint for later use in output

	This really is just a hint. The parser calls bind to pass on the prefix which
	it came across, as this is a useful hint for a human readable prefix for output
	of the same namespace. Otherwise, output processors will have to invent
	or avoid useing namespaces, which will look ugly
	"""
	assert type(uri) is type("")
        if ':' not in uri:
            # can't raise exceptions inside SAX callback
            print "must be absolute", nsPair
            import traceback
            for ln in traceback.format_stack():
                print ln
            print "@@@@"
        
        # If we don't have a prefix for this ns...
        if self.prefixes.get(uri, None) == None:
            if self.namespaces.get(prefix,None) == None:   # For conventions
                self.prefixes[uri] = prefix
                self.namespaces[prefix] = uri
		if verbosity() > 29:
		    progress("RDFSink.bind:  prefix %s: to <%s>. "%(prefix, uri))
            else:
                self.bind(prefix+"_", uri) # Recursion unnecessary

    def setDefaultNamespace(self, uri):
	"""Pass on a binding hint for later use in output

	This really is just a hint. The parser calls this to pass on the default namespace which
	it came across, as this is a useful hint for a human readable prefix for output
	of the same namespace. Otherwise, output processors will have to invent
	or avoid useing namespaces, which will look ugly.
	"""
	assert type(uri) is type("")
        self.defaultNamespace = uri
  
    def makeComment(self, str):
	"""This passes on a comment line which of course has no semantics.
	
	This is only useful in direct piping of parsers to output, to preserve
	comments in the original file.
	"""
	pass
	
    def genId(self):
        subj = None
        while not subj:
            subj = self._genPrefix
            assert subj # don't mask bugs
            subj = subj + `self._nextId`
            self._nextId = self._nextId + 1
            try:
                self.checkNewId(subj)  # For a store, just in case, check really unique
            except ValueError:
                subj = None
    
	if self.usingRunNamespace and not self.declaredRunNamespace:
	    self.declaredRunNamespace = 1
	    ns =  self._genPrefix
	    hash = ns.find("#")
	    self.bind("run", ns[:hash+1])
        return subj

    def setGenPrefix(self, genPrefix):
	if not self._genPrefix:
	    self._genPrefix = genPrefix

    def newLiteral(self, str, dt=None, lang=None):
	if dt != None: raise ValueError("This sink cannot accept datatyped values")
	if lang != None: raise ValueError("This sink cannot accept values with languages")
	return (LITERAL, str)

    def newSymbol(self, uri):
	return (SYMBOL, uri)

    def newFormula(self, uri=None):
	if uri==None: return FORMULA, self.genId()
	else: return (FORMULA, uri)

    def newBlankNode(self, context, uri=None, why=None):
	return self.newExistential(context, uri, why=why)
	
    def checkNewId(self, uri):
	"""The store can override this to raise an exception if the
	id is not in fact new. This is useful because it is usfeul
	to generate IDs with useful diagnostic ways but this lays them
	open to possibly clashing in pathalogical cases."""
	return
	

    def newUniversal(self, context, uri=None, why=None):
	if uri==None:
	    subj = ANONYMOUS, self.genId()  # ANONYMOUS means "arbitrary symbol"
	else: subj=(SYMBOL, uri)
        self.makeStatement((context,
                            (SYMBOL, forAllSym), #pred
                            context,  #subj
                            subj), why=why)                      # obj	
	return subj
	
    def newExistential(self, context, uri=None, why=None):
	if uri==None: subj = ANONYMOUS, self.genId()
	else: subj=(SYMBOL, uri)
        self.makeStatement((context,
                            (SYMBOL, forSomeSym), #pred
                            context,  #subj
                            subj), why=why)                      # obj	
	return subj
	

class RDFStructuredOutput(RDFSink):

    # The foillowing are only used for structured "pretty" outyput of structrued N3.
    # They roughly correspond to certain syntax forms in N3, but the whole area
    # is just a kludge for pretty output and not worth going into unless you need to.
    
    # These simple versions may be inherited, by the reifier for example

    def startAnonymous(self,  triple, isList=0):
        return self.makeStatement(triple)
    
    def endAnonymous(self, subject, verb):    # Remind me where we are
        pass
    
    def startAnonymousNode(self, subj):
        pass
    
    def endAnonymousNode(self, endAnonymousNode):    # Remove default subject, restore to subj
        pass

    def startBagSubject(self, context):
        pass

    def endBagSubject(self, subj):    # Remove context
        pass
     
    def startBagNamed(self, context, subj):
        pass

    def endBagNamed(self, subj):    # Remove context
        pass
     
    def startBagObject(self, triple):
        return self.makeStatement(triple)

    def endBagObject(self, pred, subj):    # Remove context
        pass
    

from diag import printState
class TracingRDFSink:
    """An implementation of the RDFSink interface which helps me
    understand it, especially how it gets used by parsers vs. by an
    RDF store.    [ -sandro ]

    Set .backing to be some other RDFSink if you want to get proper
    results while tracing.

    Try:

    bash-2.04$ python cwm.py test/rules12.n3 --language=trace
    bash-2.04$ python cwm.py --pipe test/rules12.n3 --language=trace
    bash-2.04$ python cwm.py test/rules12.n3 --bySubject --language=trace

    ... and see the different outputs

    """

    # These ones get called normally on a Sink...
    
    def __init__(self, outURI, base=None, flags=None):
        printState()
        self.backing = None

    def makeComment(self, comment):
        printState()
        if self.backing: self.backing.makeComment(comment)

    def startDoc(self):
        printState()
        if self.backing: self.backing.startDoc()

    def setDefaultNamespace(self, ns):
        printState()
        if self.backing: self.backing.setDefaultNamespace(ns)

    def bind(self, prefix, uri):
        printState()
        if self.backing: self.backing.bind(prefix, uri)

    def makeStatement(self, tuple, why=None):
        printState()
        if self.backing: self.backing.makeStatement(tuple, why)

    def endDoc(self, rootFormulaPair="<<strangely omitted>>"):
        printState()
        if self.backing: self.backing.endDoc(rootFormulaPair)

    # These ones get called when there's nesting, pretty-printed...

    def startBagSubject(self, context):
        printState()
        if self.backing: self.backing.startBagSubject(context)

    def endBagSubject(self, subj):
        printState()
        if self.backing: self.backing.endBagSubject(subj)

    def startBagObject(self, triple):
        printState()
        if self.backing: self.backing.startBagObject(triple)

    def endBagObject(self, pred, subj):
        printState()
        if self.backing: self.backing.endBagObject(pred, subj)

    # These are called by "cwm --pipe", they *need* backing to work.

    def newFormula(self, uri=None):
        printState()
        return self.backing.newFormula(uri)

    def newSymbol(self, uri):
        printState()
        return self.backing.newSymbol(uri)

    def newLiteral(self, str, dt=None, lang=None):
        printState()
        return self.backing.newSymbol(str, dt, lang)

# ends
