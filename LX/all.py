#! /usr/bin/env python
"""When you're feeling lazy and just want to import all of LX, you can
do "from LX.all import *".

"""

__version__ = "$Revision: 1.2 $"
# $Id: all.py,v 1.2 2003-09-17 16:08:29 sandro Exp $

import LX

for x in LX.__all__:
    exec "from LX."+x+" import *"

# $Log: all.py,v $
# Revision 1.2  2003-09-17 16:08:29  sandro
# made simple & automatic
#
# Revision 1.1  2003/02/13 19:42:49  sandro
# first version
#
