"""Call doctest on all our modules, or something.

"""

__version__ = "$Revision: 1.2 $"
# $Id: test.py,v 1.2 2003-01-08 17:51:22 sandro Exp $

import doctest
import LX
import LX.engine

for x in [ "LX.expr", "LX.engine.otter" ]:
    print "Module", "%-25s" %x,
    __import__(x)
    print "failed %3d of %3d tests." % eval("doctest.testmod(%s)" % x)
    
# $Log: test.py,v $
# Revision 1.2  2003-01-08 17:51:22  sandro
# improved output format
#
# Revision 1.1  2003/01/08 17:48:27  sandro
# test harness for doctest across modules
#
