"""

Try to make a nice HTML page for this KB

"""
__version__ = "$Revision: 1.1 $"
# $Id: htables.py,v 1.1 2003-01-29 20:18:28 sandro Exp $

from html import *
import LX
import cStringIO


class Serializer:

    def __init__(self, stream, flags=""):
        # LX.language.abstract.Serializer.__init__(self)
        self.stream = stream
        # no flags right now... 
        self.d = Document()
        self.d.head.append(stylelink("style.css"))
        self.d.append(p("formatted by cwm"))

    def makeComment(self, comment):
        self.d.append(Comment(comment))
        
    def serializeKB(self, kb):
        d=self.d
        d.head.append(title("KB Dump [ Not Implemented ]"))
        d.writeTo(self.stream)

#defaultSerializer = Serializer()

#def serialize(x):
#    return defaultSerializer.serialize(x)

def test():
    s = Serializer()
    
if __name__ =='__main__':
    test()

# $Log: htables.py,v $
# Revision 1.1  2003-01-29 20:18:28  sandro
# Added scaffolding for --language=htables (etc) to route through lxkb
#

