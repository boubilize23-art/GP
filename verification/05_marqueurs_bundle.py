# -*- coding: utf-8 -*-
"""Comparaison de marqueurs de code entre le bundle en ligne et le build local."""
import io
import re

BASE = r"C:\Users\HP\.minimax\sessions\mvs_163adefb7fdc42adafde4a3c522c4d0a\workspace"


def norm(path):
    t = io.open(path, encoding="utf-8", errors="replace").read()
    t = re.sub(r"//[^\n]*", "", t)
    return re.sub(r"\s+", "", t)


a = norm(BASE + r"\live.js")
b = norm(BASE + r"\dist.js")

markers = [
    ("Garde-fou 30 j : 86400000 (ms/jour)", "86400000"),
    ("Garde-fou 30 j : 2592000000 (ms)", "2592000000"),
    ("Ancienne regle : 'generee' (orth. sans accents)", "generee"),
    ("Ancienne regle : 'generation de cle' sans accents", "Une nouvelle"),
    ("Message 'rotation' sans accents", "rotation"),
    ("Nouvelle regle : 'Aucune limite'", "Aucune limite"),
    ("Commentaire source 'Aucune limite de rotation'", "Aucune limite de rotation"),
    ("Ecart de 30 jours en jours", "30 jours"),
    ("Votre cle d'acces (RegisterPage 01/11)", "Votre clé d'accès"),
    ("Cle d'invitation par poste (11/11)", "clés d'invitation par poste"),
    ("Licence expiree (bandeau)", "Licence expirée"),
    ("Bloquer la societe (super admin)", "Bloquer la société"),
    ("Texte 'ci-dessus' (LIVE)", "ci-dessus"),
    ("Texte '(section plus bas)' (LOCAL)", "(section plus bas)"),
    ("Puce '5. Recommande' (LOCAL)", "5. Recommandé"),
]

print("%-48s %-10s %-10s" % ("marqueur", "LIVE", "DIST"))
print("-" * 72)
for lab, m in markers:
    ia, ib = a.find(m), b.find(m)
    print("%-48s %-10s %-10s"
          % (lab, "PRESENT" if ia >= 0 else "-", "PRESENT" if ib >= 0 else "-"))

print()
print("--- Contextes du garde-fou de rotation (recherche de 30 jours) ---")
for nom, s in (("LIVE", a), ("DIST", b)):
    hits = [m.start() for m in re.finditer(r"86400000|2592000000", s)]
    print("  %-5s occurrences 86400000/2592000000 : %d" % (nom, len(hits)))
    for h in hits[:4]:
        print("      ...%s..." % s[max(0, h - 180):h + 120])
