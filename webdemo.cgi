#!/usr/bin/env python2.2
"""
Stage 1 of web demo CGI: set up error handling

By having two stages, we can trap and report syntax errors in the
second stage (which is the part most-often edited).

$Id: webdemo.cgi,v 1.1 2003-08-01 15:47:38 sandro Exp $

"""

# get nice error reporting when running as a CGI script
import cgitb
cgitb.enable()

# manually mess with our path
import sys
sys.path.append('/usr/local/src/WWW/2000/10/swap')

import webdemo2
webdemo2.main()

