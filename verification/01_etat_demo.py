# -*- coding: utf-8 -*-
"""Lecture seule : etat reel du jeu de demonstration dans Supabase."""
import json
import urllib.request
import urllib.error

URL = "https://bdoodzgwriyqsejspajf.supabase.co"
PK = "sb_publishable_YyET21izLenA6fkDy4aH9g_comJm1OO"
ORG = "4fea5ab6-de6e-4904-90f1-505c77ca588b"


def req(method, path, body=None, token=None):
    h = {"apikey": PK, "Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    d = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(URL + path, data=d, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=40) as resp:
            raw, st = resp.read().decode("utf-8"), resp.status
    except urllib.error.HTTPError as e:
        raw, st = e.read().decode("utf-8", "replace"), e.code
    try:
        return st, (json.loads(raw) if raw.strip() else None)
    except Exception:
        return st, raw


print("=== 1. Connexion des comptes de demonstration ===")
T = None
for mail in ("demo@test.local", "demo.directeur@test.local"):
    st, b = req("POST", "/auth/v1/token?grant_type=password",
                {"email": mail, "password": "IhOrspE+s3m0xO2g"})
    ok = st < 400 and isinstance(b, dict) and b.get("access_token")
    print("   %-32s HTTP %-4s %s" % (mail, st, "OK" if ok else "ECHEC -> %s" % str(b)[:160]))
    if ok and mail == "demo@test.local":
        T = b["access_token"]

if not T:
    print("\n!! Connexion demo admin impossible : verification par cle anonyme.")
    T = None


def get(table, extra="", tok=T):
    st, r = req("GET", "/rest/v1/%s?select=*%s" % (table, extra), None, tok)
    if st >= 400:
        return None, st
    return (r if isinstance(r, list) else []), st


print("\n=== 2. Organisation de demonstration ===")
orgs, st = get("organizations", "&id=eq." + ORG)
print("   HTTP %s" % st)
if orgs:
    for o in orgs:
        print("   nom=%s | id=%s | licence_expires_at=%s | join_code=%s | created_at=%s"
              % (o.get("name"), o.get("id"), o.get("licence_expires_at"),
                 o.get("join_code"), o.get("created_at")))
else:
    print("   Aucune ligne visible (org absente, ou RLS masque)")

print("\n=== 3. Comptage des lignes par table (org de demonstration) ===")
tables = ["products", "clients", "suppliers", "sales", "purchases",
          "receivables", "stock_movements", "purchase_requests", "profiles"]
counts = {}
for t in tables:
    rows, st = get(t, "&organization_id=eq." + ORG)
    if rows is None:
        print("   %-18s ERREUR HTTP %s" % (t, st))
        counts[t] = None
        continue
    counts[t] = len(rows)
    print("   %-18s %d" % (t, len(rows)))

print("\n=== 4. Contenu detaille ===")
prods, _ = get("products", "&organization_id=eq." + ORG)
if prods:
    print("   -- Produits --")
    for p in prods:
        print("      %-32s stock=%-4s min=%-4s achat=%-8s vente=%-8s"
              % (p.get("name"), p.get("stock"), p.get("min_stock"),
                 p.get("buy_price"), p.get("sell_price")))
sales, _ = get("sales", "&organization_id=eq." + ORG)
if sales:
    print("   -- Ventes --")
    for s in sales:
        print("      %-10s total=%-10s paid=%-10s status=%-8s client=%s"
              % (s.get("ref"), s.get("total"), s.get("paid"), s.get("status"),
                 s.get("client_name")))
purch, _ = get("purchases", "&organization_id=eq." + ORG)
if purch:
    print("   -- Achats --")
    for p in purch:
        print("      %-10s total=%-10s paid=%-10s status=%-8s fourn=%s"
              % (p.get("ref"), p.get("total"), p.get("paid"), p.get("status"),
                 p.get("supplier_name")))
clts, _ = get("clients", "&organization_id=eq." + ORG)
if clts:
    print("   -- Clients --")
    for c in clts:
        print("      %-30s balance=%-10s total_paid=%s"
              % (c.get("name"), c.get("balance"), c.get("total_paid")))
sups, _ = get("suppliers", "&organization_id=eq." + ORG)
if sups:
    print("   -- Fournisseurs --")
    for s in sups:
        print("      %-30s balance=%-10s total_paid=%s"
              % (s.get("name"), s.get("balance"), s.get("total_paid")))
recs, _ = get("receivables", "&organization_id=eq." + ORG)
if recs:
    print("   -- Creances --")
    for r in recs:
        print("      %-10s amount=%-10s paid=%-10s remaining=%-10s status=%s"
              % (r.get("sale_ref"), r.get("amount"), r.get("paid"),
                 r.get("remaining"), r.get("status")))
moves, _ = get("stock_movements", "&organization_id=eq." + ORG)
if moves:
    print("   -- Mouvements de stock (%d) --" % len(moves))
    for m in sorted(moves, key=lambda x: (x.get("created_at") or "", x.get("date") or "")):
        print("      %-5s x%-3s %-32s %-14s %s -> %s  (%s)"
              % (m.get("type"), m.get("qty"), m.get("product_name"),
                 m.get("reason"), m.get("balance_before"), m.get("balance_after"),
                 m.get("created_at")))

print("\n=== 5. Coherence des stocks ===")
if prods and moves is not None:
    for p in prods:
        ms = sorted([m for m in moves if m.get("product_id") == p.get("id")],
                    key=lambda x: (x.get("created_at") or "", x.get("date") or ""))
        bal = None
        ok = True
        for m in ms:
            if bal is None:
                bal = m.get("balance_before")
            if m.get("balance_before") != bal:
                ok = False
                break
            bal = m.get("balance_after")
        if not ms:
            ok = True
        else:
            ok = ok and (bal == p.get("stock"))
        print("   %-32s stock=%-4s %s"
              % (p.get("name"), p.get("stock"), "OK" if ok else "INCOHERENT"))

if T:
    print("\n=== 6. KPI recalcules (comme DashboardPage.tsx) ===")
    sales, _ = get("sales", "&organization_id=eq." + ORG)
    purch, _ = get("purchases", "&organization_id=eq." + ORG)
    clts, _ = get("clients", "&organization_id=eq." + ORG)
    sups, _ = get("suppliers", "&organization_id=eq." + ORG)
    r2 = lambda n: round(n * 100) / 100
    ca = r2(sum(s.get("paid") or 0 for s in sales))
    ach = r2(sum(p.get("paid") or 0 for p in purch))
    print("   CA encaisse      : %d" % ca)
    print("   Achats payes     : %d" % ach)
    print("   Benefice encaisse: %d" % r2(ca - ach))
    print("   CA total facture : %d" % r2(sum(s.get("total") or 0 for s in sales)))
    print("   Total achats     : %d" % r2(sum(p.get("total") or 0 for p in purch)))
    print("   Creances         : %d" % r2(sum(c.get("balance") or 0 for c in clts)))
    print("   Dettes           : %d" % r2(sum(s.get("balance") or 0 for s in sups)))

    print("\n=== 7. Isolation RLS (ce que voit le compte demo) ===")
    for t in ("products", "clients", "sales", "profiles"):
        rows, _ = get(t, "")
        print("   %-10s lignes visibles : %d" % (t, len(rows) if rows else 0))
    rows, _ = get("profiles", "&select=email,role,organization_id,is_super_admin")
    if rows:
        print("   profils visibles :")
        for p in rows:
            print("      %-32s role=%-10s org=%s super_admin=%s"
                  % (p.get("email"), p.get("role"), p.get("organization_id"),
                     p.get("is_super_admin")))

    print("\n=== 8. Cles (invitation / admin signup) ===")
    st, r = req("POST", "/rest/v1/rpc/list_invitation_keys", {}, T)
    print("   invitation (HTTP %s) : %s" % (st, r if not isinstance(r, list) else
          [(k.get("code", "")[:8] + "...", "REVOKEE" if k.get("revoked_at") else "ACTIVE",
            k.get("target_role"), k.get("uses_count")) for k in r]))
    st, r = req("POST", "/rest/v1/rpc/list_admin_signup_keys", {}, T)
    print("   admin signup (HTTP %s) : %s" % (st, r if not isinstance(r, list) else
          [(k.get("code", "")[:8] + "...", "CONSUMEE" if k.get("used_at") else "LIBRE",
            k.get("licence_days")) for k in r]))
