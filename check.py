"""Check a proof

This is a simple proof checker.  It hasn't itself been proved,
and there are probably lots of ways to fool it especially as a deliberate
malicious attack. That is because there are simple things I may have forgotten
to check.

"""
# check that proof

from swap.myStore import load, Namespace
from swap.RDFSink import CONTEXT, PRED, SUBJ, OBJ
from swap.term import List
from swap.llyn import Formula #@@ dependency should not be be necessary
from swap.diag import verbosity, setVerbosity, progress
from swap.query import testIncludes

# Standard python
import sys, getopt
from sys import argv, exit

import swap.llyn # Chosen engine registers itself

reason = Namespace("http://www.w3.org/2000/10/swap/reason#")
log = Namespace("http://www.w3.org/2000/10/swap/log#")
rdf=Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
rei = Namespace("http://www.w3.org/2004/06/rei#")

chatty = 0
debugLevelForInference = 0
debugLevelForParsing = 0

def fail(str, level=0):
    if chatty > 0:
	progress(" "*(level*4), "Proof failed: ", str)
    return None

def fyi(str, level=0):
    if chatty > 50:
	progress(" "*(level*4),  str)
    return None

def bind(x, bindings):
    return x.substitution(bindings)
#    for var, val in bindings:     #  DUH
#	if x is var: return val
#    return x
    
def parse(resourceURI):
    global parsed
    f = parsed.get(resourceURI, None)
    if f == None:
	setVerbosity(debugLevelForParsing)
	f = load(resourceURI)
	setVerbosity(0)
	parsed[resourceURI] = f
    return f

def statementFromFormula(f):
    "Check just one statement and return it"
    if len(f) > 1:
	raise RuntimeError("I think this was supposed tro be a single statement: %s" % f.statements)
    return f.statements[0]

def valid(proof, r, level=0):
    """Check whether this reason is valid. Returns the formula proved or None if not"""
    f = proof.any(r,reason.gives)
    if f != None:
	assert isinstance(f, Formula), "%s gives: %s which should be Formula" % (`r`, f)
	if len(f) == 1:
#	s = statementFromFormula(f)
#	if s != None:
	    s = f.statements[0]
	    fs = " proof of {%s %s %s}" % (s.subject(), s.predicate(), s.object())
	else:
	    fs = " proof of %s" % f
    else:
	fs = ""
#    fyi("Reason for %s is %s."%(f, r), level)

    if r == None:
	str = f.n3String()
	return fail("No reason for "+`f` + " :\n\n"+str +"\n\n", level=level)
    t = proof.any(subj=r, pred=rdf.type)
    fyi("%s %s %s"%(t,r,fs), level=level)
    level = level + 1
    
    if t is reason.Parsing:
	res = proof.any(subj=r, pred=reason.source)
	if res == None: return fail("No source given to parse", level=level)
	u = res.uriref()
	try:
	    v = verbosity()
	    setVerbosity(0)
	    g = parse(u)
	    setVerbosity(v)
	except:
	    return fail("Can't retreive/parse <%s> because:\n  %s." %(u, sys.exc_info()[1].__str__()), level)
	if f != None:  # Additional intermediate check not essential
	    for sf in f.statements:
		for sg in g.statements:
		    bindings = {f: g}
		    if (bind(sf[PRED], bindings) is sg[PRED] and
			bind(sf[SUBJ], bindings) is sg[SUBJ] and
			bind(sf[OBJ],  bindings) is sg[OBJ]):
			break
		else:
		    progress("Statements parsed from %s:\n%s" %(u, `g.statements`))
		    return fail("Can't verify that <%s> says %s" %(u, sf), level=level)
	return g

    elif t is reason.Inference:
	evidence = proof.each(subj=r, pred=reason.evidence)
	bindings = {}
	for b in proof.each(subj=r, pred=reason.binding):
	    var_rei  = proof.the(subj=b, pred=reason.variable)  # de-reify  symbool
	    var_uri   = proof.the(subj=var_rei, pred=rei.uri)
	    var	      = proof.newSymbol(var_uri.string)
	    val_rei  = proof.the(subj=b, pred=reason.boundTo) # @@@ Check that they really are variables in the rule!
	    val_uri   = proof.the(subj=val_rei, pred=rei.uri)
	    if val_uri != None:
		val = proof.newSymbol(val_uri.string)
	    else:
		val_value   = proof.the(subj=val_rei, pred=rei.value)
		if val_value != None:
		    val = proof.newLiteral(val_value.string, val_value.datatype, val_value.lang)
		else:
		    raise RuntimeError("Can't de-reify %s" % val_rei)
	    bindings[var] = val

	rule = proof.any(subj=r, pred=reason.rule)
	if not valid(proof, rule, level):
	    return fail("No justification for rule "+`rule`, level)
	for s in proof.the(rule, reason.gives).statements:
	    if s[PRED] is log.implies:
		ruleStatement = s
		break
	else: return fail("Rule has %s instead of log:implies as predicate.", level)
	evidenceStatements = []
	for e in evidence:
	    f2 = valid(proof, e, level)
	    if f2 == None:
		return fail("Evidence %s was not proved."%(e))
	    evidenceStatements.append(f2)
	for s in ruleStatement[SUBJ]: # Antecedent
	    context, pred, subj, obj = s.quad
	    pred = bind(pred, bindings)
	    subj = bind(subj, bindings)
	    obj  = bind(obj, bindings) 
	    for x in evidenceStatements:
		for t in x.statements:
		    if t[SUBJ] is subj and t[PRED] is pred and t[OBJ] is obj:
			break
		else: continue
		break
	    else:
		for p, part in (subj, "subject"), (obj, "object"):
		    if isinstance(p, List):
			fyi("Looking for %s: %s" %(part, `p`), level=level) 
			for i in range(len(p)):
			    fyi("   item %i = %s" %(i, `p[i]`), level=level)
		for x in evidenceStatements:
		    for t in x.statements:
			if  t[PRED] is pred:
			    fyi("With same predicate %s" %(pred), level=level)
			    for p, part in (t[SUBJ], "subject"), (t[OBJ], "object"):
				if isinstance(p, List):
				    fyi("Found for %s: %s" %(part, `p`), level=level) 
				    for i in range(len(p)):
					fyi("   item %i = %s" %(i, `p[i]`), level=level)
		return fail("Can't find %s in evidence for rule %s: \nEvidence:%s\nBindings:%s\n"
			      %((subj, pred,  obj), ruleStatement, evidenceStatements, bindings),
			    level=level)

	for e in evidence:
	    if not valid(proof, e, level):
		return fail("Evidence could not be proved: " + `e`, level=level)
	fyi("Rule %s conditions met" % ruleStatement, level=level)

	proved = proof.newFormula()
	for s in ruleStatement[OBJ]: # Conclusion
	    context, pred, subj, obj = s.quad
	    pred = bind(pred, bindings)
	    subj = bind(subj, bindings)
	    obj  = bind(obj, bindings)
	    proved.add(subj, pred, obj)
	proved=proved.close()
	return proved
	
    elif t is reason.Conjunction:
	components = proof.each(subj=r, pred=reason.component)
	proved = []
	for e in components:
	    if not valid(proof, e, level):
		return fail("In Conjunction %s, evidence %s could not be proved."%(r,e), level=level)
	    proved.append(proof.the(subj=e, pred=reason.gives))
	
	return f
	
    elif t is reason.Fact:
	con, pred, subj, obj = statementFromFormula(f).quad
	fyi("Function: @@ Taking for granted that {%s %s %s}" % (subj, pred, obj), level=level)
	return f
    elif t is reason.Extraction:
	r2 = proof.the(r, reason.because)
	if r2 == None:
	    return fail("Extraction: no source formula given for %s." % (`r`), level)
	f2 = valid(proof, r2, level)
	if f2 == None:
	    return fail("Extraction: validation of source forumla failed.", level)
	setVerbosity(debugLevelForInference)
	if not testIncludes(f2, f):
	    return fail("""Extraction %s not included in formula  %s.\n______________\n%s\n______________not included in: ______________\n%s"""
		    %(f, f2, f.debugString(), f2. debugString()), level=level)
	setVerbosity(0)
	return f

    s = ""
    for x in proof.statementsMatching(subj=r): s = `x` + "\n"
    return fail("Reason %s is of unknown type %s.\n%s"%(r,t, s), level=level)

# Main program 

def usage():
    sys.stderr.write(__doc__)
    
def main():
    global chatty
    global parsed
    global debugLevelForInference
    global debugLevelForParsing
    parsed = {}
    setVerbosity(0)
    
    
    try:
        opts, args = getopt.getopt(sys.argv[1:], "hv:c:p:",
	    [ "help", "verbose=", "chatty=", "parsing="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)
    output = None
    for o, a in opts:
        if o in ("-h", "--help"):
            usage()
            sys.exit()
        if o in ("-v", "--verbose"):
	    chatty = int(a)
        if o in ("-p", "--verboseParsing"):
	    debugLevelForParsing = int(a)
        if o in ("-c", "--chatty"):
	    debugLevelForInference = int(a)
    
    
#    chatty=60
    #inputURI = argv[1]
    #fyi("Reading proof from "+inputURI)
    fyi("Reading proof from standard input.")
    proof = load()
    # setVerbosity(60)
    fyi("Length of proof: "+`len(proof)`)
    proof2 = proof.the(pred=rdf.type, obj=reason.Proof)  # the thing to be proved
    
    
    proved = valid(proof, proof2)
    if proved != None:
	fyi("Proof looks OK.")
	setVerbosity(0)
	print proved.n3String()
	exit(0)
    progress("Proof invalid.")
    exit(-1)

if __name__ == "__main__":
    """This trick prevents the pydoc from actually running the script"""
    main()
#ends

