# $Id: Makefile,v 1.1 2001-08-31 18:46:59 connolly Exp $

PYTHON=python2

YAPPS=yapps2.py

rdfn3.py: rdfn3.g
	$(PYTHON) $(YAPPS) rdfn3.g $@