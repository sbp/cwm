#! /usr/bin/python 
"""

$Id: cwm_string.py,v 1.28 2004-10-19 20:23:08 syosi Exp $

String built-ins for cwm
This started as http://www.w3.org/2000/10/swap/string.py

See cwm.py
"""

import string
import re

from diag import verbosity, progress

import urllib # for hasContent
import md5, binascii  # for building md5 URIs

from term import LightBuiltIn, ReverseFunction, Function
from decimal import Decimal

LITERAL_URI_prefix = "data:text/rdf+n3;"


STRING_NS_URI = "http://www.w3.org/2000/10/swap/string#"


###############################################################################################
#
#                               S T R I N G   B U I L T - I N s
#
# This should be in a separate module, imported and called once by the user
# to register the code with the store
#
#   Light Built-in classes

class BI_GreaterThan(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (subj.string > obj.string)

class BI_NotGreaterThan(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (subj.string <= obj.string)

class BI_LessThan(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (subj.string < obj.string)

class BI_NotLessThan(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (subj.string >= obj.string)

class BI_StartsWith(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return subj.string.startswith(obj.string)

class BI_EndsWith(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return subj.string.endswith(obj.string)

# Added, SBP 2001-11:-

class BI_Contains(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return subj.string.find(obj.string) >= 0

class BI_ContainsIgnoringCase(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return subj.string.lower().find(obj.string.lower()) >= 0

class BI_ContainsRoughly(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return normalizeWhitespace(subj.string.lower()).find(normalizeWhitespace(obj.string.lower())) >= 0

class BI_DoesNotContain(LightBuiltIn): # Converse of the above
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return subj.string.find(obj.string) < 0

class BI_equalIgnoringCase(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (subj.string.lower() == obj.string.lower())

class BI_notEqualIgnoringCase(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (string.lower(subj.string) != string.lower(obj.string))


def normalizeWhitespace(s):
    "Normalize whitespace sequences in a string to single spaces"
    res = ""
    for ch in s:
	if ch in " \t\r\n":
	    if res[-1:]!=" ": res = res + " " 
	else:
	    res = res + ch
    return res

#  String Constructors - more light built-ins
make_string = str

class BI_concat(LightBuiltIn, ReverseFunction):
    def evaluateSubject(self, obj_py):
        if verbosity() > 80: progress("Concat input:"+`obj_py`)
        str = ""
        for x in obj_py:
            if not isString(x): return None # Can't
            str = str + x 
        return str

class BI_concatenation(LightBuiltIn, Function):
    def evaluateObject(self, subj_py):
        if verbosity() > 80: progress("Concatenation input:"+`subj_py`)
        str = ""
        for x in subj_py:
            if not isString(x):
                if type(x) == type(long()) or isinstance(x, Decimal):
                    x = make_string(x)
                else:
                    x = `x`
		if verbosity() > 34: progress("Warning: Coercing to string for concat:"+`x`)
#		return None # Can't
            str = str + x 
        return str

class BI_scrape(LightBuiltIn, Function):
    """a built-in for scraping using regexps.
    takes a list of 2 strings; the first is the
    input data, and the second is a regex with one () group.
    Returns the data matched by the () group.

    see also: test/includes/scrape1.n3
    Hmm... negative tests don't seem to work.
    """
    
    def evaluateObject(self, subj_py):
#        raise Error
        store = self.store
        if verbosity() > 80: progress("scrape input:"+`subj_py`)

        str, pat = subj_py
        patc = re.compile(pat)
        m = patc.search(str)

        if m:
            if verbosity() > 80: progress("scrape matched:"+m.group(1))
            return m.group(1)
        if verbosity() > 80: progress("scrape didn't match")

class BI_search(LightBuiltIn, Function):
    """a more powerful built-in for scraping using regexps.
    takes a list of 2 strings; the first is the
    input data, and the second is a regex with one or more () group.
    Returns the list of data matched by the () groups.

    see also: test/includes/search.n3
    """
    
    def evaluateObject(self, subj_py):
#        raise Error
        store = self.store
        if verbosity() > 80: progress("search input:"+`subj_py`)

        str, pat = subj_py
        patc = re.compile(pat)
        m = patc.search(str)

        if m:
            if verbosity() > 80: progress("search matched:"+m.group(1))
            return m.groups()
        if verbosity() > 80: progress("search didn't match")


class BI_format(LightBuiltIn, Function):
    """a built-in for string formatting,
    ala python % or C's sprintf or common-lisp's format
    takes a list; the first item is the format string, and the rest are args.
    see also: test/@@
    """
    
    def evaluateObject(self, subj_py):
        return subj_py[0] % tuple(subj_py[1:])

class BI_matches(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (re.compile(obj.string).search(subj.string))

class BI_notMatches(LightBuiltIn):
    def eval(self,  subj, obj, queue, bindings, proof, query):
        return (not re.compile(obj.string).search(subj.string))


dataEsc = re.compile(r"[\r<>&]")  # timbl removed \n as can be in data
attrEsc = re.compile(r"[\r<>&'\"\n]")

class BI_xmlEscapeData(LightBuiltIn, Function):
    """Take a unicode string and return it encoded so as to pass in an XML data
    You will need the BI_xmlEscapeAttribute on for attributes, escaping quotes."""
    
    def evaluateObject(self, subj_py):
	return xmlEscape(subj_py, dataEsc)
	
class BI_xmlEscapeAttribute(LightBuiltIn, Function):
    """Take a unicode string and return it encoded so as to pass in an XML data
    You may need stg different for attributes, escaping quotes."""
    
    def evaluateObject(self, subj_py):
	return xmlEscape(subj_py, attrEsc)

def xmlEscape(subj_py, markupChars):
    """Escape a string given a regex of the markup chars to be escaped
    from toXML.py """
    i = 0
    result = ""
    while i < len(subj_py):
	m = markupChars.search(subj_py, i)
	if not m:
	    result = result + subj_py[i:]
	    break
	j = m.start()
	result = result + subj_py[i:j]
	result = result +  ("&#%d;" % (ord(subj_py[j]),))
	i = j + 1
    return result



#  Register the string built-ins with the store

def isString(x):
    # in 2.2, evidently we can test for isinstance(types.StringTypes)
    return type(x) is type('') or type(x) is type(u'')

def register(store):
    str = store.symbol(STRING_NS_URI[:-1])
    
    str.internFrag("greaterThan", BI_GreaterThan)
    str.internFrag("notGreaterThan", BI_NotGreaterThan)
    str.internFrag("lessThan", BI_LessThan)
    str.internFrag("notLessThan", BI_NotLessThan)
    str.internFrag("startsWith", BI_StartsWith)
    str.internFrag("endsWith", BI_EndsWith)
    str.internFrag("concat", BI_concat)
    str.internFrag("concatenation", BI_concatenation)
    str.internFrag("scrape", BI_scrape)
    str.internFrag("search", BI_search)
    str.internFrag("format", BI_format)
    str.internFrag("matches", BI_matches)
    str.internFrag("notMatches", BI_notMatches)
    str.internFrag("contains", BI_Contains)
    str.internFrag("containsIgnoringCase", BI_ContainsIgnoringCase)
    str.internFrag("containsRoughly", BI_ContainsRoughly)
    str.internFrag("doesNotContain", BI_DoesNotContain)
    str.internFrag("equalIgnoringCase", BI_equalIgnoringCase)
    str.internFrag("notEqualIgnoringCase", BI_notEqualIgnoringCase)
    str.internFrag("xmlEscapeAttribute", BI_xmlEscapeAttribute)
    str.internFrag("xmlEscapeData", BI_xmlEscapeData)

    
