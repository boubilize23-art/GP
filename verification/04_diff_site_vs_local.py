# -*- coding: utf-8 -*-
"""Diff robuste (par blocs) + comptage de marqueurs SANS ESPACE."""
import io
import re
import difflib

BASE = r"C:\Users\HP\.minimax\sessions\mvs_163adefb7fdc42adafde4a3c522c4d0a\workspace"


def norm(path):
    t = io.open(path, encoding="utf-8", errors="replace").read()
    t = re.sub(r"//[^\n]*", "", t)
    return re.sub(r"\s+", "", t)


a = norm(BASE + r"\live.js")
b = norm(BASE + r"\dist.js")

print("=== 1. Comptage de marqueurs (espaces supprimes) ===")
for lab, m in [("ci-dessus", "ci-dessus"),
               ("(sectionplusbas)", "(sectionplusbas)"),
               ("5.Recommande", "5.Recommande"),
               ("Recommande", "Recommande"),
               ("86400000", "86400000"),
               ("2592000000", "2592000000"),
               ("Votrecle dacces", "Votreclé"),
               ("clsdinvitationparposte", "clésd'invitationparposte"),
               ("Licenseexpiree", "Licenseexpirée"),
               ("Bloquerlasociete", "Bloquerlasociété")]:
    print("   %-26s LIVE=%-3d DIST=%-3d" % (lab, a.count(m), b.count(m)))

print()
print("=== 2. Diff par blocs de 120 caracteres ===")
CH = 120
la = [a[i:i + CH] for i in range(0, len(a), CH)]
lb = [b[i:i + CH] for i in range(0, len(b), CH)]
sm = difflib.SequenceMatcher(None, la, lb, autojunk=False)
ops = [o for o in sm.get_opcodes() if o[0] != "equal"]
print("   blocs: LIVE=%d DIST=%d | zones differentes=%d" % (len(la), len(lb), len(ops)))
for n, (tag, i1, i2, j1, j2) in enumerate(ops, 1):
    print("\n   --- zone %d (%s) ---" % (n, tag))
    print("   LIVE : %r" % "".join(la[i1:i2])[:420])
    print("   DIST : %r" % "".join(lb[j1:j2])[:420])
