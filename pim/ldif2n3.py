#!/usr/bin/python
#
import sys
import string
import os
import re
import sha, binascii, base64

version = "$Id: ldif2n3.py,v 1.2 2007-01-07 23:26:50 timbl Exp $"[1:-1]

global verbose
global hideMailbox

def macroSubstitute(line, dict):
    return line  #@@@@@@

def convert(path):
    """Convert LDIF format to n3"""
    global nochange
    global verbose
    global hideMailbox

    dict = {}

    print "# http://www.w3.org/DesignIssues/Notation3"
    print "# Generated from", path
    print "# Generated by  ", version
    print
    print "@prefix foaf: <http://xmlns.com/foaf/0.1/>."
    print "@prefix ldif: <http://ww.w3.org/2007/ont/ldif#>."
    print

    input = open(path, "r")
    buf = input.read()  # Read the file
    input.close()

    line = 0
    
    blank = re.compile(r" *\r?\n")  #"
    lines = []
    inPerson = 0
    dataline = re.compile(r'([a-zA-Z0-9_]*): +(.*)')
    base64line = re.compile(r'([a-zA-Z0-9_]*):: +(.*)')

    
    asFoaf = { "cn": "foaf:name" }
    
    while 1:
        lines.append(line)
	line = buf.find("\n", line)
	if line <0: break
	line += 1
	
	here = 0
	m = blank.match(buf, line)
	if m:
	    print "    ]."
	    inPerson = 0
	    continue
	
	m = dataline.match(buf, line)
	if m:
	    field = m.group(1)
	    value = m.group(2)
	else:
	    m = base64line.match(buf, line)
	    if m:
		field = m.group(1)
		value = m.group(2)
		value = base64.decodestring(m.group(2))
	if m:
	    if not inPerson:
		print "    ["
		inPerson = 1
		
	    if field == "objectclass":
		if value == "top": continue # Zero content info
		print '\ta ldif:%s; '% (value[0:1].upper() + value[1:])
	    
	    elif field =="mail":
		mboxUri = "mailto:" + value
		hash = binascii.hexlify(sha.new(mboxUri).digest())
		print '\tfoaf:mbox_sha1sum "%s";' % (hash)
		if not hideMailbox:
		    print '\tfoaf:mbox <%s>;' % (mboxUri)
	    else:
	    
		if field == "modifytimestamp" and value == "0Z":
		    continue;  # ignore
		    
		foaf = asFoaf.get(field, None)
		if foaf:
		    print '\t%s "%s"; '% (foaf, value)
		else:
		    if not (hideMailbox and field == "dn"):
			print '\tldif:%s "%s"; '% (field, value)
	    continue

	print "# ERROR: Unknown line format:" + buf[line:line+20]
#    print "]."
	

def do(path):
    if verbose: sys.stderr.write("# make2n3: converting " + path + "\n")
    return convert(path)
        
######################################## Main program

nochange = 1
verbose = 0
hideMailbox = 0
doall = 0
files = []

for arg in sys.argv[1:]:
    if arg[0:1] == "-":
        if arg == "-?" or arg == "--help":
	    print """Convert Makfile format of make(1) to n3 format.

Syntax:    make2n3  <file>

    where <file> can be omitted and if so defaults to Makefile.
    This program was http://www.w3.org/2000/10/swap/util/make2p3.py
    $Id: ldif2n3.py,v 1.2 2007-01-07 23:26:50 timbl Exp $
    
    -v  verbose
    -m  hide mailbox
"""
        elif arg == "-v": verbose = 1
        elif arg == "-m": hideMailbox = 1
	else:
            print """Bad option argument."""
            sys.exit(-1)
    else:
        files.append(arg)

if files == []: files = [ "Makefile" ] # Default to Makefile

for path in files:
    do(path)
