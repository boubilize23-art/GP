# REPRISE — GestioPro (point de reprise au 05/11/2026)

> Ce fichier est un **brief de reprise**. L'ancienne session de travail est cassée
> (l'API MiniMax refuse son historique : `invalid params, 410 (2013)` — ce n'est pas
> une panne du service). Nouvelle session = historique propre = tout remarche.
> Tu peux supprimer ce fichier une fois la reprise faite.

## 0. MISE À JOUR 05/11/2026 20:20 — reprise faite, voici l'état réel

| Point | État vérifié (par l'API, en lecture) |
|---|---|
| **Données de démonstration** | ✅ **CRÉÉES et cohérentes** (voir §A). Le script `demo_donnees_v3.py` a bien tourné le 04/11 vers 17:45. |
| **Site en ligne** | ✅ **Pas d'erreur fonctionnelle**. Diff complet bundle en ligne vs build local : **1 seule phrase** diffère (« ci-dessus » → « (section plus bas) »). |
| **APK debug** | ❌ **OBSOLÈTE** — le bundle embarqué date du 30/10 (voir §C). |
| **Mouvements de stock** | ❌ **Bug trouvé** — l'app ne les enregistre pas en base (voir §D). |
| **Sécurité** | ✅ Garde-fou d'inscription vérifié (voir §E). `mailer_autoconfirm = true` (confirmation par email désactivée). |

Scripts de contrôle rejouables : `verification/01_etat_demo.py`, `02_etat_base.py`,
`03_mouvements_stock.py`, `04_diff_site_vs_local.py` (Python, lecture seule).

### A. Données de démonstration — présentes
Org « Démo Gestion » `4fea5ab6-de6e-4904-90f1-505c77ca588b`, licence jusqu'au 04/12/2026.
4 produits · 2 clients · 1 fournisseur · 2 ventes · 1 achat · 1 créance · 5 mouvements.
KPI (calcul identiques à `DashboardPage.tsx`) : CA encaissé 1 191 200 · Achats 377 600 ·
**Bénéfice encaissé +813 600** · marge 74,3 % · créances 281 440 · dettes 0.
1 alerte stock (Clavier mécanique AZERTY, 6 ≤ 8). Chaîne de stock cohérente. RLS OK.

> ⚠️ Les 5 mouvements ont le **même `created_at`** (le patch `_patch4.py` du 04/11 17:50
> n'a jamais été rejoué). Sans conséquence : l'app n'affiche jamais l'historique brut des
> mouvements, elle ne fait que des agrégats (`StockPage.tsx`).

### B. Site en ligne — à jour, sauf une phrase
Live `index-C01tR-Ob.js` vs local `index-Ci9OHCJV.js` : **2 zones de diff sur 7 904 blocs**,
et la 2e n'est qu'un **décalage** provoqué par la 1re (mêmes chaînes des deux côtés).
Seule différence réelle : `SettingsPage.tsx:953` — en ligne « ci-dessus » alors que la
section « Clés d'invitation par poste » est **plus bas** (`SettingsPage.tsx:1281`).
→ Un simple redéploiement suffit.

### C. APK debug — à reconstruire impérativement
`android/app/src/main/assets/public` date du **30/10** ; `src/` a bougé les 01/11 et 02/11.
Le bundle embarqué (`index-BI9W7Bhd.js`) ne contient **ni** « Votre clé d'accès » (écran
d'inscription), **ni** « Clés d'invitation par poste », **ni** « Licence expirée », **ni**
« Bloquer la société » — et contient encore **« une fois par mois » ×4** (l'ancienne règle
que la base n'applique plus). Aucun fichier `.jks` n'existe : la signature release n'a
jamais été créée.

### D. Bug — les mouvements de stock ne sont pas enregistrés
Constaté sur 2 sociétés réelles : **7 ventes + 2 achats → 0 mouvement** en base,
alors que `products.stock` est lui **correctement** décrémenté (vérifié arithmétiquement :
LAIT 100 + 1000 − 41 = 1059 ✔). La société « Démo Gestion » n'est pas concernée : le script
a inséré ses 5 mouvements en direct par l'API.
→ Symptôme pour un client : l'écran Stock affiche « — » dans les colonnes **Entrées / Sorties**.
Cause probable : `AppContext.tsx:578` (et `:651`) appelle `setStockMovements(...)` **à
l'intérieur** de l'updater de `setProducts(...)` — un `setState` imbriqué dans un updater
(React exige des updaters purss). Correctif : calculer les mouvements **avant**
`setProducts`, puis un seul `setStockMovements([...moves, ...])`.

### E. Sécurité — ce qui est vérifié
- `check_signup_key('INVENTE-NOPE-000')` → `{"ok":false,"reason":"invalide"}` (idem vide / format
  clé d'organisation). Le déclencheur `handle_new_user` (script 14) refuse toute inscription
  sans clé exploitable → **plus de compte orphelin**.
- RLS : cloisonnement strict par société, branche `is_super_admin()` conservée.
- Licence expirée → écritures bloquées **par la base**, données jamais supprimées.
- ⚠️ `mailer_autoconfirm = true` → la confirmation par email est **désactivée** : la clé est la
  seule barrière, et les e-mails de réinitialisation de mot de passe ne partent pas (pas de SMTP).
- Comptes de test qui subsistent : `client-employe@demo.test` (société « Societe Client Demo »,
  vide), `demo@test.local` + `demo.directeur@test.local` (démo, voulus). Mots de passe connus →
  ne pas les laisser sur un site public en dehors de la démo.
- Clé d'inscription admin encore **utilisable** : `2FEDFE5D1D9F` (2 autres révoquées, 3 consommées).
- Clé d'invitation encore active : `ED6CBAA1B1C2` (expire le 02/12/2026).

## 1. Contexte complet à lire (ne pas redécouvrir)

1. **Mémoire projet** : `C:\Users\HP\.minimax\agents\mavis\memory\topics\gestiopro-licences.md`
   → modèle de licence 30 jours, clés d'invitation par poste, pièges RLS, état production.
2. **Docs du projet** (ce dossier) : `SUPABASE_SETUP.md`, `ANDROID_APK.md`.
3. **Ancien workspace de la session cassée** (scripts de test + démo + guide Word) :
   `C:\Users\HP\.minimax\sessions\mvs_9a730d78c86847578c344df8df7bb775\workspace`

## 2. Projet en une ligne

React + Vite + Supabase (Postgres + Auth + RLS), packaged en application Android via
Capacitor. Site en ligne : **https://gestiopros.vercel.app**. Identité Android :
`com.gestiopro.app`, v1.0.0, couleur #7C3AED.

## 3. Ce qui est DÉJÀ fait (ne pas refaire)

- **Licences 30 jours + clés d'invitation par poste** : scripts `supabase/11_licences_cles_invitation.sql`
  à `supabase/15_generation_cles_illimitee.sql` — **appliqués en production**, rejouables.
- Règles actives : génér. de clé **illimitée**, durée bornée à `least(p_days, 30)` et à la fin
  de licence, refus d'inscription sans clé exploitable, RLS bloque les écritures à licence expirée
  (données jamais supprimées).
- Clé d'inscription administrateur à usage unique : `supabase/10_cles_inscription_admin.sql`.
- Guide client Word/PDF : `GestioPro_Guide_utilisateur.docx` (+ `.pdf`) dans l'ancien workspace.
- APK **debug** déjà produit : `C:\Users\HP\Downloads\GestioPro-v1.0.0-debug.apk`.
- Tests de référence (ancien workspace) : `test_licence_30j.ps1` (39/39),
  `test_regles_cles.ps1` (10/10), `test_generation_illimitee.ps1` (11/11).

## 4. Ce qui était EN COURS (par ordre de priorité)

1. **Compte / données de démonstration** — demande du 04/11 17:40 : « lance le compte demo ».
   Scripts déjà écrits dans l'ancien workspace :
   `demo_donnees_v3.py` (modifié 04/11 17:50), `_verify_demo.py`, `_demo_ids.json`.
   → **Vérifier d'abord** si les données démo ont réellement été créées dans Supabase
   (le script a été écrit 5 min avant la panne ; l'exécution n'est pas confirmée).
2. **Publication LinkedIn + Facebook** pour promouvoir gestiopros.vercel.app (demandé le 04/11 17:36).
3. **Sécurité** — question du 04/11 17:39 : « en créant le compte on ne va pas me pirater »
   → répondre sur l'hébergement et la sécurisation de la création de compte (RLS, pas de compte orphelin, pas de double base).
4. **L'idée du 05/11** (« j'ai une idée dans la tête… ») → **demander à l'utilisateur** de l'exposer.
5. **APK release signé** — reste à faire (cf. `ANDROID_APK.md`) : l'APK debug embarque l'ancien
   bundle, il faut le reconstruire et produire une version release signée pour les clients.

## 5. Points de vigilance (pièges déjà payés)

- Toujours conserver la branche `public.is_super_admin() or (...)` dans les politiques RLS.
- `create or replace function` avec signature/retour différents → surcharge : `drop function if exists` d'abord.
- Une fonction qui renvoie `null` comme refus doit distinguer « introuvable » de « trouvé mais bloqué ».
- Le plafond de rotation vivait **dans la base** (`organizations.join_code_rotated_at`) **et** dans le client
  (`AuthContext.createOrgKey`) → supprimer les deux.
- PowerShell 5.1 : `ConvertFrom-Json` ne déballe pas un tableau de premier niveau → `@($j)` + `foreach`.
- Nettoyage après chaque série de tests : `workspace/blocs/nettoyage_test_licence.sql`.

---

## 1. MISE À JOUR 10/11/2026 — Logo de société + Rapports PDF (nouvelle fonctionnalité)

**Idée de l'utilisateur :** une partie « Rapports » qui génère un **fichier PDF** de
synthèse des activités (achats, ventes, sorties de stock…), et un emplacement pour
déposer **le logo de chaque entreprise**, qui doit apparaître sur les factures.

### Ce qui est fait (code écrit, build vérifié ✅)

| Livrable | Fichiers |
|---|---|
| **Rapports PDF** | `src/pages/ReportsPage.tsx` (nouveau) · `src/lib/reportPdf.ts` (nouveau) |
| **Logo de société** | `src/components/LogoUploader.tsx` (nouveau) · `src/lib/organizationLogo.ts` (nouveau) · `src/hooks/useOrganizationLogo.ts` (nouveau) |
| **Intégration** | `src/pages/SettingsPage.tsx` (onglet Organisation) · `src/components/InvoiceModal.tsx` (aperçu + impression) · `src/components/Layout.tsx` (menu « Rapports ») · `src/App.tsx` (routage) |
| **Migration base** | `supabase/16_logo_societe.sql` (nouveau) |
| **Correction stock** | `src/context/AppContext.tsx` |

- Page **Rapports** : admin + manager. Période (6 presets + personnalisée), 7 sections
  au choix, aperçu chiffré, bouton « Générer le PDF ».
- PDF **natif** (jspdf + jspdf-autotable) : vrai fichier `.pdf` partageable, en-tête
  (logo + société + période) et pied de page (pagination) **sur chaque page**.
- Le logo est **redimensionné à 512 px et converti en PNG dans le navigateur** (le SVG
  et le WebP ne sont pas acceptés en sortie : jsPDF ne sait pas les incorporer).
- **Chargé à la demande** : `import("../lib/reportPdf")` → le bundle principal ne gagne
  que ~22 Ko (1 315 Ko au total), le moteur PDF (427 Ko) n'est chargé qu'au clic.

### ⚠️ UNE SEULE ACTION RESTE À FAIRE (par l'utilisateur)

Exécuter **`supabase/16_logo_societe.sql`** dans Supabase → SQL Editor.
Sans cela : la colonne `logo_url` et le bucket `logos` n'existent pas → le dépôt de
logo échoue, le reste fonctionne.
*(Le dashboard Supabase fait expirer le navigateur piloté : la migration n'a pas pu
être appliquée automatiquement.)*

### Correction majeure au passage : les mouvements de stock

**Constat (production, 2 sociétés réelles) : 7 ventes + 2 achats → 0 mouvement en base**,
alors que `products.stock` était correctement décrémenté.

**Cause :** `setStockMovements(...)` était appelé **à l'intérieur** de l'updater de
`setProducts(...)`. React n'exécute pas de façon fiable un `setState` imbriqué dans un
autre `setState` → l'update était **purement et simplement perdue**.

**Correctif :** des miroirs synchrones (`useLayoutEffect` → `productsRef`, `salesRef`,
`purchasesRef`, `clientsRef`, `suppliersRef`, `receivablesRef`) + calcul synchrone +
application par setter à **valeur simple** (jamais une fonction). Corrigé dans :
`addSale`, `addPurchase`, `addStockMovement`, `payClient`, `paySupplier`,
`addReceivablePayment`.

> Règle à retenir : **jamais de setter dans un setter.**

⚠️ Les mouvements **antérieurs** au correctif n'existent pas en base : les rapports
« Stock & mouvements » des sociétés existantes seront vides pour la période passée.

### Vérification du PDF

Test hors navigateur (esbuild + Node) avec les données de démo :
`rapport_test.pdf` = 70 583 octets, en-tête `%PDF-1.3`, **3 pages**, `%%EOF` présent,
toutes les sections présentes et les chiffres justes (bénéfice, marge, TVA, totaux).
