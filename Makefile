# $Id: Makefile,v 1.3 2001-08-31 22:15:44 connolly Exp $

PYTHON=python2

YAPPS=yapps2.py

TESTIN=test/sameDan.n3

test: rdfn3_yapps.py rdfn3_yappstest.py
	$(PYTHON) rdfn3_yappstest.py <$(TESTIN) >,xxx.n3

rdfn3_yapps.py: rdfn3.g
	$(PYTHON) $(YAPPS) rdfn3.g $@