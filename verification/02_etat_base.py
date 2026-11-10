# -*- coding: utf-8 -*-
"""Lecture seule, en super administrateur : etat global de la base + comptes residuels."""
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


print("=== 1. Reglages d'authentification (anon) ===")
st, cfg = req("GET", "/auth/v1/settings")
if isinstance(cfg, dict):
    print("   HTTP %s" % st)
    for k in ("mailer_autoconfirm", "disable_signup", "enable_signup",
              "require_email_change_confirmation", "password_min_length"):
        if k in cfg:
            print("   %-36s = %s" % (k, cfg[k]))
    au = cfg.get("mailer") or {}
    if au:
        print("   mailer.autoconfirm                      = %s" % au.get("autoconfirm"))
        print("   mailer.confirmations                   = %s" % au.get("confirmations"))
else:
    print("   HTTP %s %s" % (st, str(cfg)[:200]))

print("\n=== 2. Connexion super administrateur ===")
st, b = req("POST", "/auth/v1/token?grant_type=password",
            {"email": "admin@gestiopro.com", "password": "Admin@2025"})
if not (isinstance(b, dict) and b.get("access_token")):
    print("   ECHEC HTTP %s %s" % (st, str(b)[:200]))
    raise SystemExit(0)
T = b["access_token"]
print("   admin@gestiopro.com : OK")


def get(table, extra=""):
    st, r = req("GET", "/rest/v1/%s?select=*%s" % (table, extra), None, T)
    return r if isinstance(r, list) else []


print("\n=== 3. Toutes les societes ===")
orgs = get("organizations")
for o in sorted(orgs, key=lambda x: x.get("created_at") or ""):
    print("   %-26s licence=%-26s bloque=%-6s created=%s"
          % (o.get("name"), o.get("licence_expires_at"), o.get("blocked"),
             (o.get("created_at") or "")[:10]))

print("\n=== 4. Tous les profils (comptes) ===")
profs = get("profiles")
for p in sorted(profs, key=lambda x: x.get("created_at") or ""):
    print("   %-36s role=%-9s super=%-6s actif=%-6s org=%s"
          % (p.get("email"), p.get("role"), p.get("is_super_admin"),
             p.get("is_active"), (p.get("organization_id") or "-")[:8]))

print("\n=== 5. Recherche de comptes de test residuels ===")
motifs = ("test.local", "regle-", "regle test", "regle-%", "demo")
residu = []
for p in profs:
    mail = (p.get("email") or "").lower()
    if any(m in mail for m in motifs):
        residu.append(p)
if residu:
    for p in residu:
        print("   !! %-36s role=%-9s org=%s created=%s"
              % (p.get("email"), p.get("role"),
                 (p.get("organization_id") or "-")[:8], (p.get("created_at") or "")[:10]))
else:
    print("   Aucun profil correspondant aux motifs de test connus.")

print("\n=== 6. Volume des donnees par societe ===")
tables = ["products", "clients", "suppliers", "sales", "purchases",
          "receivables", "stock_movements"]
for o in orgs:
    ligne = []
    for t in tables:
        n = len(get(t, "&organization_id=eq." + (o.get("id") or "")))
        ligne.append("%s=%d" % (t[:4], n))
    print("   %-26s %s" % (o.get("name"), " ".join(ligne)))

print("\n=== 7. Cles d'inscription administrateur (reserve a l'admin principal) ===")
st, r = req("POST", "/rest/v1/rpc/list_admin_signup_keys", {}, T)
if isinstance(r, list):
    for k in r:
        print("   %-14s %-10s licence=%-5s utilisee=%-8s revoke=%s"
              % (k.get("code", "")[:12], "CONSUMEE" if k.get("used_at") else "LIBRE",
                 k.get("licence_days"), (k.get("used_at") or "-")[:10],
                 (k.get("revoked_at") or "-")[:10]))
else:
    print("   HTTP %s %s" % (st, str(r)[:200]))

print("\n=== 8. Cles d'invitation ===")
st, r = req("POST", "/rest/v1/rpc/list_invitation_keys", {}, T)
if isinstance(r, list):
    for k in r:
        print("   %-14s role=%-8s poste=%-14s usages=%-3s expire=%-10s revoke=%s"
              % (k.get("code", "")[:12], k.get("target_role"), k.get("target_position"),
                 k.get("uses_count"), (k.get("expires_at") or "-")[:10],
                 (k.get("revoked_at") or "-")[:10]))
else:
    print("   HTTP %s %s" % (st, str(r)[:200]))
