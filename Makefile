# $Id: Makefile,v 1.2 2001-08-31 21:28:39 connolly Exp $

PYTHON=python2

YAPPS=yapps2.py

TESTIN=test/sameDan.n3

test: rdfn3_yapps.py rdfn3_yappstest.py
	$(PYTHON) rdfn3_yappstest.py <$(TESTIN)

rdfn3_yapps.py: rdfn3.g
	$(PYTHON) $(YAPPS) rdfn3.g $@