# -*- coding: utf-8 -*-
"""Les ventes referencent-elles des produits existants ? (en super administrateur)"""
import json
import urllib.request
import urllib.error

URL = "https://bdoodzgwriyqsejspajf.supabase.co"
PK = "sb_publishable_YyET21izLenA6fkDy4aH9g_comJm1OO"


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


st, b = req("POST", "/auth/v1/token?grant_type=password",
            {"email": "admin@gestiopro.com", "password": "Admin@2025"})
T = b["access_token"]


def get(table, extra=""):
    st, r = req("GET", "/rest/v1/%s?select=*%s" % (table, extra), None, T)
    return r if isinstance(r, list) else []


orgs = get("organizations")
for o in orgs:
    oid = o["id"]
    prods = get("products", "&organization_id=eq." + oid)
    sales = get("sales", "&organization_id=eq." + oid)
    purch = get("purchases", "&organization_id=eq." + oid)
    moves = get("stock_movements", "&organization_id=eq." + oid)
    if not sales and not purch:
        continue
    pids = {p["id"] for p in prods}
    print("=" * 100)
    print("SOCIETE %s   (produits=%d ventes=%d achats=%d mouvements=%d)"
          % (o.get("name"), len(prods), len(sales), len(purch), len(moves)))
    for p in prods:
        print("   produit %-30s stock=%-7s created=%s"
              % (p.get("name"), p.get("stock"), (p.get("created_at") or "")[:16]))
    for s in sales:
        items = s.get("items") or []
        refs = [(it.get("productName"), it.get("productId"), it.get("qty")) for it in items]
        ok = [r for r in refs if r[1] in pids]
        ko = [r for r in refs if r[1] not in pids]
        print("   VENTE %-9s date=%-12s items=%d  refs_ok=%d refs_orphelines=%d"
              % (s.get("ref"), s.get("date"), len(items), len(ok), len(ko)))
        for r in ko:
            print("        !! produit inconnu : %s  qty=%s  id=%s" % (r[0], r[2], (r[1] or "")[:8]))
        for r in ok:
            print("        ok  %-30s qty=%s" % (r[0], r[2]))
    for p in purch:
        items = p.get("items") or []
        for it in items:
            flag = "ok " if it.get("productId") in pids else "!! "
            print("   ACHAT  %-9s %s %-30s qty=%s"
                  % (p.get("ref"), flag, it.get("productName"), it.get("qty")))
    for m in moves:
        print("   MOUVEMENT %-5s x%-4s %-28s %s" % (m.get("type"), m.get("qty"),
              m.get("product_name"), m.get("reason")))
