#!/usr/bin/env python
"""
table_generator.py --- generator of parser tables for sparql_parser.py
Based on:
    n3mp - An N3 Metaparser using n3.n3
    Author: Sean B. Palmer, inamidst.com
    Licence:    http://www.w3.org/Consortium/Lega l/copyright-software
    Documentation: http://inamidst.com/n3p/
    Derived from: 
       http://www.w3.org/2000/10/swap/grammar/predictiveParser.py
       - predictiveParser.py, Tim Berners-Lee, 2004
"""

import sys, os, re, pprint
import cPickle as pickle

import sys, re
from rdflib.TripleStore import TripleStore
from rdflib.Namespace import Namespace
from rdflib.URIRef import URIRef as URI
from rdflib.Literal import Literal
from rdflib.BNode import BNode as bNode

class Graph(TripleStore): 
   def theObject(self, subj, pred): 
      objects = tuple(self.objects(subj, pred))
      if len(objects) == 1: 
         return objects[0]
      elif len(objects) == 0: 
         return None
      else: raise "Some kind of an error"

SPARQL = Namespace('http://www.w3.org/2000/10/swap/grammar/sparql#')
BNF = Namespace('http://www.w3.org/2000/10/swap/grammar/bnf#')
RDF = Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#')

def abbr(prodURI): 
   return prodURI.split('#').pop()

class N3Metaparser(object): 
   def __init__(self, verbose=False): 
      self.branches = {}
      self.regexps = {}

      self.verbose = verbose
      self.todo = []
      self.done = []

   def __call__(self, start): 
      self.doProduction(start)
      while self.todo: 
	first = self.todo.pop(0)
	self.done.append(first)
	self.doProduction(first)

   def progress(self, msg, err=False): 
      if err or self.verbose: 
         print >> sys.stderr, msg

   def doProduction(self, prod): 
      self.progress("Doing production: %s" % prod)
      if isinstance(prod, Literal): 
         return

      rhs = G.triples((prod, RDF['type'], BNF['Token']))
      if [a for a in rhs]:
         #self.match(prod, rhs)
         return

      rhs = G.theObject(prod, BNF['mustBeOneSequence'])
      if rhs: self.sequence(prod, rhs)
      elif prod == BNF['eof']: pass # print "@@ EOF"
      else: raise Exception("No definition of %s" % prod)

   def sequence(self, prod, rhs): 
      prodBranch = {}
      self.progress("Found mustBeOneSequence: %s" % rhs)

      for branch in G.objects(prod, BNF['branch']): 
         self.progress("Branch: %s" % branch)

         optionName = G.theObject(branch, BNF['sequence'])
         options = tuple(G.items(optionName))
         self.progress("Branch option: %s" % optionName)

         for item in options: 
            if not ((item in self.todo) or (item in self.done)): 
               self.todo.append(item)
         conditions = G.objects(branch, BNF['condition'])
         self.checkSelector(conditions, prod, optionName, options)
         # Pythonise the options
         pyoptions = []
         for option in options: 
            if isinstance(option, Literal): 
               pyoptions.append(unicode(option))
            else: pyoptions.append(str(option))
         for condition in conditions: 
            self.checkCondition(condition, prodBranch, prod, options)
            prodBranch[condition] = pyoptions

      self.checkProdBranch(prod, prodBranch)
      self.branches[prod] = prodBranch

   def checkSelector(self, conditions, prod, optionName, options): 
      if not conditions: 
         msg = "Error! No selector for %s:%s" % (prod, optionName)
         self.progress(msg, err=True)
         if not options: 
            for successor in G.object(prod, BNF['canPrecede']): 
               self.progress("   Successor: %s" % successor, err=True)

   def checkCondition(self, condition, prodBranch, prod, options): 
      if prodBranch.has_key(condition) and prodBranch[condition] != options: 
         self.progress("Warning: in %s: %s is the condition for %s. We are changing it to %s" % \
                       (prod, condition, prodBranch[condition], options), err=True)
         #raise RuntimeError(condition, prodBranch)

   def checkProdBranch(self, prod, prodBranch): 
      for p in prodBranch.iterkeys(): 
         for q in prodBranch.iterkeys(): 
            if (p.startswith(q) or q.startswith(p)) and p != q and prodBranch[p] != prodBranch[q]: 
               self.progress("Warning: for %s, %s -> %s, but %s -> %s" % \
                      (prod, p, prodBranch[p], q, prodBranch[q]), err=True)

def mkmodule(result, out): 
   branches = result['branches']
   regexps = result['regexps']

   pp = pprint.PrettyPrinter()
   print >> out, '#!/usr/bin/env python'
   print >> out, '"""n3meta - For use with n3p.py."""'
   print >> out, '# Automatically generated by n3mp.py'
   print >> out
   print >> out, 'import re'
   print >> out
   print >> out, 'branches =', pp.pformat(branches)
   print >> out, 'regexps = {'
   for (key, regexp) in regexps.iteritems():
      print >> out, '   %r: re.compile(%r), ' % (key, regexp.pattern)
   print >> out, '}'
   print >> out
   print >> out, 'if __name__=="__main__": '
   print >> out, '   print __doc__'

def metaparse(grammar, start, output, pickle=False, verbose=False): 
   global G
   G = Graph(grammar)

   metaparser = N3Metaparser(verbose=verbose)
   metaparser(start)
   result = {'branches': metaparser.branches, 
             'regexps': metaparser.regexps}
   if pickle: 
      pickle.dump(result, output)
   else: mkmodule(result, output)

def barf(msg): 
   print >> sys.stderr, msg
   sys.exit(1)

def main(argv=None): 
   from optparse import OptionParser
   parser = OptionParser(usage='%prog [options] <output>')
   parser.add_option("-g", "--grammar", dest="grammar", 
                     default='sparql-selectors.rdf', metavar="URI", 
                     help="RDF/XML RDF BNF grammar file URI")
   parser.add_option("-s", "--start", dest="start", default=False, 
                     help="start production URI", metavar="URI")
   parser.add_option("-p", "--pickle", dest="pickle", 
                     action="store_true", default=False, 
                     help="output a pickle file, not python module")
   parser.add_option("-v", "--verbose", dest="verbose", 
                     action="store_true", default=False, 
                     help="toggle verbosity mode")
   options, args = parser.parse_args(argv)

   grammar = options.grammar
   verbose = options.verbose

   if options.start: 
      start = URI(options.start)
   else: start = SPARQL['Query']

   if len(args) > 1: 
      barf("Error: you may only specify one output filename")
   elif args: 
      fn = args[0]
   elif options.pickle: 
      fn = 'n3meta.pkl'
   else: fn = 'n3meta.py'

   if os.path.exists(fn): 
      barf("Error: File <%s> already exists, won't overwrite" % fn)
   else: output = open(fn, 'wb')

   metaparse(grammar, start, output, pickle=options.pickle, verbose=verbose)

if __name__=="__main__": 
   main()
