"""


"""
__version__ = "$Revision: 1.1 $"
# $Id: term.py,v 1.1 2002-08-29 11:00:46 sandro Exp $

import LX
from LX.language.otter import serialize
from string import split

class Term:

    def __str__(self):
        return serialize(self)

class Function(Term):
    pass

class Symbol(Term):      # or is this a zero-arity Function?  
    pass
    
class Constant(Symbol):
    pass
    
class URIRef(Constant):

    def __init__(self, u):
        try:
            self.racine, self.fragment = split(u, "#")
            #print "initialized URIRef to %s, %s" % (self.racine, self.fragment)
        except ValueError:
            self.racine = u; self.fragment = None
        self.value = u

class String(Constant):

    def __init__(self, u):
        self._u = u

    def value(self):
        return self._u
    




# $Log: term.py,v $
# Revision 1.1  2002-08-29 11:00:46  sandro
# initial version, mostly written or heavily rewritten over the past
# week (not thoroughly tested)
#

 
