#!/usr/local/bin/python
"""
$Id: webAccess.py,v 1.2 2004-01-29 23:32:11 connolly Exp $

Web access functionality building on urllib

"""

import urllib

def urlopenForRDF(addr):
    """A version of urllib.urlopen() which asks for RDF by preference
    """
    z = urllib.FancyURLopener()
    z.addheaders.append(('Accept', 'application/rdf+xml'))
    return z.open(addr)
