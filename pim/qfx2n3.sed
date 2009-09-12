# ofx format to n3
1i\
@prefix ofx: <http://www.w3.org/2000/10/swap/pim/ofx#>.\
@prefix ofxh: <http://www.w3.org/2000/10/swap/pim/ofx-headers#>.\
\
<> ofxh:headers [  # Generated by $Id: qfx2n3.sed,v 1.7 2009-09-12 15:43:49 timbl Exp $
# Below is for "Content- type"
/:/s/- /-/g
s?^\([A-Za-z0-9-]*\):\(.*\)$?    ofxh:\1 "\2";?
s?<OFX>?]; ofx:OFX [?
s?</OFX>?]. # OFX?
s?^<\([A-Z][A-Z0-9]*\)>$?   ofx:\1[?
#
# End tag:
s?^[ \t]*</\([A-Z0-9]*\)>?    ];   # \1?
#
# Special case remove .
s?<INTU.BID>\(..*\)?    ofx:INTU_BID "\1"?
#
# Start with data and explicit end tag
s?<\([A-Z][A-Z0-9]*\)>\(.[^<]*\)</\([A-Z][A-Z0-9]*\)>?        ofx:\1 "\2";?
#
# Start with data is assumed implcit end tag
s?<\([A-Z][A-Z0-9]*\)>\(..*\)?        ofx:\1 "\2";?
#
# Start tag without data is assumed to be closed later
s?<\([A-Z][A-Z0-9]*\)>$?        ofx:\1 [?
#
# Strip trailing spaces at ends of values:
s? *";?";?
#
# Convert datetime format to W3C standard
/ofx:DT/s?"\([0-9][0-9][0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)"?"\1-\2-\3T\4:\5:\6"?
# Convert datetime format to W3C standard with timezone
/ofx:DT/s?"\([0-9][0-9][0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\([0-9][0-9]\)\[\([-+]\)\([0-9]\):[A-Z]*\]"?"\1-\2-\3T\4:\5:\6\70\800"?
s/&amp;/\&/g
/ofx:FITID/s?\([0-9]\) \([0-9]\)?\1_\2?
