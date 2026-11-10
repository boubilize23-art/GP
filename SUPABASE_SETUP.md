# 🚀 GestioPro — Connexion à Supabase

Ce guide explique comment brancher GestioPro sur votre projet Supabase
(`bdoodzgwriyqsejspajf`).

**Ce qui change :** les comptes, les produits, les ventes, les clients, les
fournisseurs et le stock ne sont plus stockés dans le navigateur de chaque
utilisateur — ils vivent dans votre base Supabase. Un collègue qui ouvre
l'application sur son téléphone voit les mêmes chiffres.

---

## Étape 1 — Créer les tables (2 minutes)

1. Ouvrez **https://supabase.com/dashboard** et connectez-vous.
2. Cliquez sur votre projet **GestioPro**.
3. Dans le menu de gauche, cliquez sur **SQL Editor** (icône `</>` ou
   « SQL Editor »), puis sur **New query**.
4. Ouvrez le fichier `supabase/01_schema.sql` de ce projet, copiez **tout** son
   contenu, et collez-le dans l'éditeur SQL.
5. Cliquez sur **Run** (ou `Ctrl+Entrée`).

✅ Vous devez voir apparaître `Success. No rows returned` — c'est normal, le
script crée des tables, pas des lignes.

> 💡 Vous pouvez relancer le script sans risque : toutes les commandes sont
> écrites pour ne pas casser une base déjà installée.

### Vérification (optionnel)

Dans le même éditeur, exécutez :

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Vous devez voir : `clients`, `organizations`, `profiles`, `products`,
`purchase_requests`, `purchases`, `receivables`, `sales`, `stock_movements`,
`suppliers`.

---

## Étape 2 — Créer les comptes de démonstration (2 minutes, optionnel)

Dans le même **SQL Editor**, ouvrez `supabase/02_comptes_demo.sql`, copiez
tout, collez et **Run**.

Cela crée trois comptes **déjà confirmés** (ils peuvent se connecter
immédiatement, sans email à valider) :

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@gestiopro.com` | `Admin@2025` | Administrateur |
| `manager@gestiopro.com` | `Manager@2025` | Manager |
| `utilisateur@gestiopro.com` | `User@2025` | Utilisateur |

Organisation : **GestioPro SARL** — clé d'organisation : `GEST-2025-DEMO`

> ⚠️ Ces comptes sont pour tester. Supprimez-les avant une mise en production
> réelle (dans le tableau de bord : Authentication → Users).

---

## Étape 3 — Réglages d'authentification

Dans le tableau de bord : **Authentication → Sign In / Providers → Email**

- **Confirm email** : **décoché** en ce moment (l'inscription est immédiate,
  sans email de validation). Lisez attentivement l'avertissement ci-dessous
  avant de le réactiver.
- **Enable email signup** : vérifiez que c'est bien **activé**.

### ⚠️ À lire absolument : la confirmation par email a besoin d'un service d'envoi

Par défaut, Supabase n'envoie que **2 à 3 emails par heure**, et uniquement
aux membres de votre équipe. Concrètement : un collègue qui s'inscrit ne
recevra **jamais** son email de confirmation, et ne pourra donc jamais entrer.

Pour que ça fonctionne réellement, configurez un service d'envoi (gratuit) :

1. Créez un compte sur **https://resend.com** (offre gratuite : 3 000
   emails/mois).
2. Dans Resend, ajoutez le domaine `votre-domaine.com` et vérifiez-le (une
   seule ligne DNS à ajouter chez votre registrar).
3. Dans Supabase : **Project Settings → API → SMTP** (ou Authentication →
   SMTP), renseignez :
   - **Host** : `smtp.resend.com`
   - **Port** : `587`
   - **Username** : `resend`
   - **Password** : votre clé API Resend (elle commence par `re_`)
4. **Project Settings → Auth → URL Configuration** :
   - **Site URL** : l'adresse de votre application
     (en local : `http://localhost:5180`)
   - **Redirect URLs** : ajoutez
     `http://localhost:5180/**` et `http://127.0.0.1:5180/**`
     (pour la production, ajoutez l'URL de votre site déployé)

> 🔁 **Vous voulez démarrer tout de suite sans configurer d'email ?**
> Décochez simplement **Confirm email** : l'inscription devient instantanée.
> Vous pourrez le réactiver plus tard une fois le SMTP configuré.
> **C'est l'état actuel du projet** (voir « État actuel » plus bas).

---

## Étape 4 — Lancer l'application

Les identifiants du projet sont déjà dans `.env.local` :

```
VITE_SUPABASE_URL=https://bdoodzgwriyqsejspajf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> ⚠️ Si vous modifiez `.env.local`, **redémarrez** le serveur de développement :
> Vite ne relit pas les variables d'environnement à chaud.

```bash
npm install
npm run dev
```

Puis ouvrez l'application et connectez-vous avec `admin` / `Admin@2025`
(ou `admin@gestiopro.com` / `Admin@2025`).

---

## Étape 5 — Correctif : rattachement à l'organisation (déjà appliqué)

Si la **confirmation par email est activée**, l'application ne peut pas
rattacher l'inscrit à son organisation au moment de l'inscription : à cet instant
l'utilisateur n'a pas encore de session. Le compte restait donc orphelin
(`organization_id` vide) et il ne voyait aucune donnée.

Le correctif déplace ce rattachement dans le déclencheur `handle_new_user()`,
qui s'exécute dès la création du compte.

- Sur une **base neuve** : `01_schema.sql` contient déjà la version corrigée.
- Sur une **base existante** : exécutez `supabase/03_fix_rattachement_organisation.sql`
  une seule fois dans le SQL Editor.

> Ce correctif est **déjà appliqué** sur la base `bdoodzgwriyqsejspajf`.

---

## Étape 6 — Ce qui a changé dans l'application

| Avant | Après |
|---|---|
| Comptes dans le `localStorage` de chaque navigateur | Comptes dans Supabase Auth (cloud) |
| Mots de passe hachés (SHA-256) stockés en local | Mots de passe gérés par Supabase (bcrypt) |
| Produits/ventes/clients : mémoire React uniquement (perdus au F5) | Stockés en base, synchronisés et conservés |
| Clé d'organisation locale | Table `organizations`, partagée entre membres |
| Mot de passe oublié : code affiché à l'écran | Email de réinitialisation (Supabase) |

**Sécurité :** chaque utilisateur ne voit que **les données de son
organisation** (Row Level Security). Un manager ne voit que ses utilisateurs
directs. Un utilisateur simple ne voit que lui-même.

---

## Étape 6 — Option : temps réel (au lieu du rafraîchissement toutes les 15 s)

Par défaut, l'application se resynchronise toutes les 15 secondes et
s'abonne déjà au temps réel. Pour que les changements arrivent **instantanément**
sur les autres écrans, ajoutez les tables à la publication Realtime :

**Database → Publications → supabase_realtime → Editer → cocher** :
`products`, `clients`, `suppliers`, `sales`, `purchases`, `receivables`,
`stock_movements`, `purchase_requests`.

---

## Étape 6 — Les clés d'organisation (une seule clé par société)

**Modèle retenu :**

1. L'**administrateur** crée le compte via le formulaire d'inscription.
   → Le serveur crée automatiquement sa société et lui attribue **une clé
   aléatoire unique** (12 caractères, ex. `H7KP-3MWQ-8TZ2`).
2. Il retrouve cette clé dans **Paramètres → Organisation** (après avoir
   confirmé son email) ou dans l'onglet **Équipe** de l'application.
3. Il **partage cette clé** avec ses employés.
4. Chaque employé s'inscrit en saisissant **la même clé** → il rejoint
   la société, avec l'encadrant défini automatiquement (un manager est
   encadré par l'administrateur, un utilisateur par le manager).

La clé n'est **jamais choisie à la main** : elle est générée par PostgreSQL
(`public.generate_join_code()`), ce qui garantit qu'elle est imprévisible et
unique. Une rotation de clé (possible une fois par mois) invalide
immédiatement l'ancienne.

| Script | Rôle |
|---|---|
| `supabase/01_schema.sql` | Schéma complet (contient déjà la version corrigée) |
| `supabase/03_fix_rattachement_organisation.sql` | Correctif : rattachement automatique à la société avec la confirmation par email |
| `supabase/04_cles_aleatoires.sql` | Correctif : clés aléatoires par société + création de la société par l'administrateur |

> Sur une base existante, exécutez `03` puis `04` (une seule fois chacun).

---

## La clé d'inscription administrateur (30 octobre 2026)

### Le problème corrigé

L'inscription d'un **administrateur** était impossible : l'application exigeait une
clé d'organisation d'au moins 8 caractères, alors que le formulaire n'en demandait
aucune et annonçait que le serveur la générait. Pire, **n'importe qui** pouvait
s'inscrire comme administrateur et créer une société sans autorisation.

### Le modèle retenu

| Qui | Fait quoi |
|---|---|
| **Administrateur principal** (`is_super_admin`) | Génère une **clé d'inscription administrateur** à **usage unique** et l'envoie à la personne concernée |
| **Administrateur destinataire** | S'inscrit avec cette clé → **sa société est créée automatiquement** → la clé est **consommée** (elle ne marchera plus jamais) |
| **Cet administrateur** | Retrouve la clé d'organisation de sa société dans **Paramètres → Organisation** et la partage à ses équipes (**une seule clé, renouvelée tous les 30 jours**) |

### Ce qui est appliqué par la base (pas seulement par l'interface)

- `admin_signup_keys` : table des clés, avec `used_at` / `used_by` / `revoked_at`.
- `consume_admin_signup_key()` : consommation **atomique** — même si deux
  inscriptions utilisent la même clé au même moment, une seule aboutit.
- `handle_new_user()` : refuse l'inscription d'un administrateur sans clé valide
  (message clair : *« Clé d'inscription administrateur requise… »*) et crée sa
  société quand la clé est bonne.
- `create_admin_signup_key()` : **réservé à l'administrateur principal**. Un
  administrateur client qui tente l'opération est refusé par la base.
- `rotate_join_code()` : la règle « une rotation tous les 30 jours » existe
  désormais **dans la base** (elle n'était affichée que dans le texte de
  l'interface).
- `create_organization()` : garde-fou — seul un administrateur peut créer une
  organisation (sinon un employé pouvait s'auto-attribuer le rôle).

| Script | Rôle |
|---|---|
| `supabase/10_cles_inscription_admin.sql` | Clé d'inscription administrateur à usage unique + règle des 30 jours côté base |

> Sur une base existante, exécutez `10` **une seule fois**.

---

## La licence 30 jours et les clés d'invitation par poste (1er novembre 2026)

### Le modèle retenu

| Qui | Fait quoi |
|---|---|
| **Administrateur principal** (`is_super_admin`) | Émet une **clé d'inscription administrateur** à usage unique. Whoever l'ouvre crée sa société avec une **licence de 30 jours**. Il peut aussi **renouveler** une licence en donnant une nouvelle clé, et **bloquer** une société entière. |
| **Administrateur de société** | Ouvre sa clé → sa société est créée, licence de 30 jours. Puis il émet une **clé d'invitation par poste** pour ses directeurs et ses utilisateurs. |
| **Clé d'invitation** | Elle est **réemployable** (plusieurs personnes peuvent s'en servir), valable **30 jours**, et elle **détermine le rôle** (directeur ou utilisateur) et **l'encadrant**. Ce n'est pas l'inscrit qui choisit son poste. |
| **Renouvellement** | L'administrateur de société colle une **nouvelle clé** → les 30 jours **repartent de zéro** et **les données sont conservées**. |
| **Expiration sans renouvellement** | Les **écritures sont bloquées par la base**. Les données **ne sont JAMAIS supprimées** : elles restent lisibles et prouvées. |
| **Suppression définitive** | Action **exclusive de l'administrateur principal**, jamais automatique. |

### Ce qui est appliqué par la base (pas seulement par l'interface)

- `organizations.licence_expires_at` : fin de licence de la société (`NULL` = illimitée).
- `invitation_keys` : table des clés d'invitation (poste, rôle visé, encadrant, `uses_count`, `expires_at`, `revoked_at`).
- `org_write_allowed()` : **la porte des écritures**. Les politiques RLS `insert`/`update`/`delete` des 8 tables métier (`products`, `clients`, `suppliers`, `sales`, `purchases`, `receivables`, `stock_movements`, `purchase_requests`) l'appellent : un compte bloqué ou une licence expirée ne peut plus écrire.
- `handle_new_user()` : rôle, poste et encadrant sont lus **dans la clé** ; la société est créée avec sa licence de 30 jours.
- `check_signup_key()` : répond à l'écran d'inscription *avant* la création du compte (type de clé, rôle, poste, durée).
- `consume_invitation_key()` : consommation atomique + compteur d'utilisations.
- `renew_licence()` : consommation atomique de la clé de renouvellement, `licence_expires_at = now() + 30 jours`, **données intactes**.
- `set_organization_blocked()` : bloque ou débloque **tous** les comptes d'une société (réservé à l'administrateur principal).
- `create_invitation_key()` / `list_invitation_keys()` / `revoke_invitation_key()` : réservés à l'administrateur de société — un simple membre est refusé par la base.

### Comment l'utilisateur voit la situation

| Écran | Ce qui s'affiche |
|---|---|
| Inscription | L'utilisateur colle sa clé ; la plateforme lui dit exactement ce qu'elle accorde (rôle, poste, société, durée) |
| Bandeau de l'application | « Licence expirée — les saisies sont bloquées » avec la consigne de demander une clé de renouvellement |
| Paramètres → Organisation | État de la licence, jours restants, saisie de la clé de renouvellement, et gestion des clés d'invitation par poste |
| Équipe → Toutes les sociétés | pastille de licence par société (illimitée / J-* / expirée) et bouton « Bloquer la société » |

> **Important** : en cas d'expiration, une `INSERT` est refusée par une erreur HTTP 403, mais un `UPDATE` ou un `DELETE` est **sans effet** (0 ligne touchée) au lieu de renvoyer une erreur. C'est le comportement normal de PostgreSQL : la politique RLS filtre la ligne au lieu de lever une exception.

| Script | Rôle |
|---|---|
| `supabase/11_licences_cles_invitation.sql` | Licence 30 jours, clés d'invitation par poste, blocage RLS des écritures **sans suppression** |
| `supabase/12_licence_days_dans_la_liste.sql` | La liste des clés d'inscription expose la durée de licence |

> Sur une base existante, exécutez `11` puis `12` (dans cet ordre). Les deux scripts sont ré-exécutables.

---

## La génération de clés : ILLIMITÉE, mais encadrée par les règles (2 novembre 2026)

### Le problème constaté

Un administrateur de société ne pouvait **pas** distribuer les accès à son équipe comme il
le voulait. Deux plafonds vivaient dans la **base** (pas dans l'interface) :

| Plafond | Où il se trouvait | Ce que l'utilisateur voyait |
|---|---|---|
| Une société dont la licence est expirée pouvait encore émettre une clé d'invitation | `create_invitation_key()` ne vérifiait ni la licence ni le blocage du compte | La clé était acceptée |
| Une clé pouvait être émise pour **365 jours** | `create_invitation_key()` ne bornait pas la durée | La clé dépassait la licence |
| La **clé d'organisation** ne pouvait être régénérée qu'**une fois tous les 30 jours** | `rotate_join_code()` levait `« Une nouvelle clé ne peut pas etre generee avant le … »` | « Vous ne pouvez modifier votre clé qu'une fois par mois » |

### Ce qui a été corrigé

| Script | Rôle |
|---|---|
| `supabase/13_regles_generation_cles.sql` | `create_invitation_key()` refuse si la licence est expirée, le compte bloqué ou la société inactive ; la durée est bornée à **30 jours maximum** et **jamais au-delà de la fin de licence** ; `consume_invitation_key()` exige une licence valide de la société invitée (contrôle atomique, dans le même `UPDATE`) ; `check_signup_key()` renvoie `licence_expiree` |
| `supabase/14_refus_inscription_cles_bloquees.sql` | `handle_new_user()` **refuse** l'inscription quand la clé est connue mais bloquée (licence expirée, clé révoquée, clé expirée) et refuse toute inscription sans clé exploitable → plus aucun compte orphelin (`organization_id` vide) |
| `supabase/15_generation_cles_illimitee.sql` | `rotate_join_code()` : **plus aucun plafond de rotation** (les règles restent : administrateur de société, compte actif, société active, licence valide) ; `check_join_code()` et `redeem_join_code()` : une société dont la licence est expirée ne peut plus être rejointe |

> **Le nombre de clés n'est jamais limité.** Une ou plusieurs clés par poste, chacune
> réemployable, chacune bornée à 30 jours et à la fin de licence. C'est la **base** qui
> décide de chaque émission ; l'interface ne fait qu'afficher sa décision.

### Les tests

| Script de test | Résultat |
|---|---|
| `workspace/test_licence_30j.ps1` | 39 réussis / 0 échec |
| `workspace/test_regles_cles.ps1` | 10 réussis / 0 manquement |
| `workspace/test_generation_illimitee.ps1` | 11 réussis / 0 manquement |

---

## Les rôles et les droits : administrateur principal vs administrateur client

Deux niveaux d'administration coexistent :

| | **Administrateur principal** | **Administrateur client** |
|---|---|---|
| Qui | vous, propriétaire de la plateforme | le responsable d'une société cliente |
| Sociétés visibles | **toutes** | **uniquement la sienne** |
| Comptes visibles | tous (toutes sociétés confondues) | ceux de sa société, **jamais ceux d'un administrateur principal** |
| Peut gérer | n'importe quel compte : bloquer, supprimer, réinitialiser le mot de passe | ses employés (manager, utilisateur) |
| Ne peut pas | supprimer le dernier administrateur principal | toucher à un administrateur, à un administrateur principal, ni à une autre société |

> **Un administrateur client ne voit jamais les comptes des administrateurs
> principaux**, même quand ils sont dans la même société : elzo
> (`boubilize23@gmail.com`) est administrateur de « GestioPro SARL » ; il voit
> son compte et ceux de ses employés, mais pas `admin@gestiopro.com`, qui
> dirige la même société. C'est appliqué **dans la base**
> (`supabase/07_isolation_admins.sql`, appliqué le 29 octobre 2026) :
> les politiques RLS de `profiles` excluent les lignes
> `is_super_admin = true` pour tout le monde sauf l'administrateur principal
> lui-même.
>
> Le seul administrateur principal est aujourd'hui `admin@gestiopro.com`.
> Pour en nommer un autre : `update public.profiles set is_super_admin = true
> where email = '...'`.

Le rôle est stocké dans `profiles.is_super_admin` (boolean). **C'est la base de
données qui applique ces règles** (politiques RLS + déclencheur
`profiles_protect_privileges`), pas l'application : un client qui-appelle
directement l'API ne peut pas contourner l'isolement.

### Le multi-société (vendre l'application à plusieurs entreprises)

Chaque société est **totalement cloisonnée** : ses produits, ventes, clients,
fournisseurs, achats, stock et bons d'achat ne sont visibles que par ses
propres membres. Un administrateur client (Musa Fall) **ne voit et ne peut
modifier** que les comptes et les données de sa société ; il ne voit ni Aicha
Ngaye, ni ses employés, ni les données de sa société.

| | Administrateur principal | Administrateur client | Manager / Utilisateur |
|---|---|---|---|
| Comptes des autres sociétés | ✅ tous | ❌ aucun | ❌ aucun |
| Données d'une autre société | ✅ (une société à la fois) | ❌ aucune | ❌ aucune |
| Écrire dans une autre société | ✅ | ❌ refusé par la base | ❌ refusé par la base |

L'exception « administrateur principal » est appliquée **dans la base**
(script `supabase/06_admin_principal_donnees.sql`, appliqué le 29 octobre 2026) :
les 8 tables métier (`products`, `clients`, `suppliers`, `sales`, `purchases`,
`receivables`, `stock_movements`, `purchase_requests`) autorisent
`public.is_super_admin()` en plus du filtre
`organization_id = public.current_organization_id()`.

Dans l'application, l'administrateur principal choisit la société affichée
avec le sélecteur violet de l'en-tête (« Ma société (…) »). Les écrans
(Produits, Ventes, Achats, Stock, Clients, CA…) ne montrent **qu'une société à
la fois** : les chiffres ne sont jamais mélangés. Ce sélecteur n'existe pas
pour les autres comptes.

**Changer le compte désigné comme administrateur principal :**

```sql
-- nommer
update public.profiles set is_super_admin = true where email = 'vous@votre-domaine.com';
-- retirer
update public.profiles set is_super_admin = false where email = '...';
```

Dans l'application, l'onglet **« Toutes les sociétés »** (écran Équipe) n'existe
que pour l'administrateur principal. Les autres ne voient que leur société.

### ⚠️ Correctif du 29 octobre 2026 — « bloquer / supprimer / modifier » ne fonctionnait pas

L'interface affichait bien « *X bloqué* », « *X supprimé* », « *Modifications
enregistrées* », **mais rien n'était écrit en base**.

Cause : le client Supabase (`postgrest-js`) n'envoie la requête HTTP **qu'au
moment du `await`**. L'application écrivait `void supabase.from("profiles")
.update(...)` : le `void` jetait le builder, la requête n'était **jamais
envoyée** (la base renvoyait un simple « OK » sans rien modifier).

Corrigé dans `src/context/AuthContext.tsx` : `blockUser`, `unblockUser`,
`deleteUser`, `updateProfile` et `updateOrgKey` sont désormais `async`, font
`await` sur l'écriture, **remontent l'erreur renvoyée par la base** et
rafraîchissent la liste. L'écran Équipe et l'écran Paramètres n'affichent plus
« réussi » tant que l'écriture n'a pas confirmé.

> Le même piège s'applique à toute écriture Supabase : ne jamais écrire
> `void supabase.from(...)` — toujours `await` (ou `.then()`).

**Réinitialiser le mot de passe d'un compte** : bouton « Réinitialiser le mot de
passe » sur la fiche du membre, dans l'écran Équipe. C'est la solution
provisoire indispensable tant que l'envoi d'emails aux clients n'est pas
configuré (le SMTP intégré de Supabase n'envoie qu'aux membres de l'équipe).

Script d'installation : `supabase/05_admin_principal.sql` — **déjà appliqué en
base** le 29 octobre 2026.

### Société de démonstration (pour vérifier l'isolement)

La base contient une société de test qui permet de contrôler le cloisonnement :

- `Societe Client Demo` — clé d'organisation `DEMO-2025-CLI1`
- `client-admin@demo.test` / `ClientAdmin@2025` → administrateur **client**
- `client-employe@demo.test` / `ClientEmploye@2025` → employé

Connecté avec ce compte, l'onglet « Toutes les sociétés » est absent et la liste
des membres ne contient que les 2 comptes de la société.

Pour la supprimer :

```sql
delete from public.organizations where join_code = 'DEMO2025CLI1';
-- les comptes auth liés sont supprimés en cascade (profiles -> auth.users)
```

---

## Les trois correctifs du 29 octobre 2026 (déjà en production)

### 1. La devise et les exercices : enregistrés **pour la société**, sur tous les appareils

La devise et les exercices étaient **purement en mémoire** : un simple
rafraîchissement du navigateur remettait tout en « € / EUR – Euro » et en
« Exercice 2026 ».

Ils sont désormais **en base**, dans une ligne par société — la même devise
sur le téléphone, le PC et la tablette de tous les membres :

```sql
select organization_id, currency, fiscal_years, updated_at
  from public.org_settings;
```

| Colonne | Contenu |
|---|---|
| `organization_id` | la société concernée (clé primaire : une ligne par société) |
| `currency` | la devise : `{"code","symbol","name","locale"}` |
| `fiscal_years` | la liste des exercices et l'exercice actif |
| `updated_at` | dernière modification |

Script d'installation : `supabase/09_reglages_organisation.sql` — **déjà
appliqué en base** le 29 octobre 2026.

Qui peut faire quoi (c'est la base qui l'applique, via RLS) :

| Action | Qui |
|---|---|
| **Lire** les réglages de sa société | tous les membres |
| **Modifier** les réglages de sa société | les administrateurs de la société (`role = 'admin'`) et l'administrateur principal |

Un simple employé qui change la devise dans l'en-tête la change **sur son
appareil seulement** (l'écriture est refusée par la base) ; l'écran
« Paramètres → Devise » le lui dit explicitement.

Le navigateur ne garde plus qu'un **cache** (`gp.currency`, `gp.fiscalYears`
dans `localStorage`) pour afficher la bonne devise immédiatement, sans
attendre la base. Au démarrage, l'application relit la base : **c'est elle
qui fait foi**. Code : `src/context/SettingsContext.tsx`.

> La devise suit **la société de l'utilisateur** (celle à laquelle il
> appartient), pas la société simplement consultée : l'administrateur
> principal garde donc sa devise en consultant une autre société.


### 2. L'administrateur principal ne mélange plus les sociétés

Le sélecteur violet de l'en-tête (**« Ma société (…) »**) choisit la société
affichée. **Un seul tableau de bord à la fois** : les ventes, les achats, le
stock, les clients et les chiffres ne sont jamais additionnés entre
sociétés.

Trois garde-fous :

1. **Lecture filtrée** — `src/lib/sync.ts` ajoute
   `.eq("organization_id", organizationId)` à chaque lecture ; les « bons
   d'achat » sont filtrés de la même façon dans
   `src/context/AuthContext.tsx` (`refreshPurchaseRequests`).
2. **Écriture faithfule** — une ligne déjà en base garde **sa** société
   d'origine (`orgByIdRef`) : une opération n'est jamais déplacée d'une société
   vers une autre.
3. **Droits en base** — les politiques RLS `_org_*` n'autorisent un client que
   sur sa propre société ; l'administrateur principal passe par le sélecteur
   et n'accède qu'à une société à la fois.

> Le choix de société n'est pas mémorisé : après un F5, l'administrateur
> principal revient sur sa propre société. C'est volontaire (on ne commence
> jamais sur les chiffres d'un client sans l'avoir choisi).

### 3. L'heure exacte des ventes, des achats et des mouvements de stock

Les trois tables portent maintenant une **horodatage** en plus de la date :

```sql
alter table public.sales          add column if not exists created_at timestamptz not null default now();
alter table public.purchases      add column if not exists created_at timestamptz not null default now();
alter table public.stock_movements add column if not exists created_at timestamptz not null default now();
```

Script d'installation : `supabase/08_heures_operations.sql` — **déjà appliqué
en base** le 29 octobre 2026.

L'interface affiche « 29 oct. 2026 à 21:32 » dans la liste des ventes, la
liste des achats et l'activité récente du tableau de bord
(`src/utils/datetime.ts` → `formatDateTime`).

> ⚠️ Piège : la colonne est `NOT NULL`. Les convertisseurs de l'application
> (`src/lib/mappers.ts`) envoient donc `created_at: … ?? undefined` et **jamais
> `null`** — une clé absente du JSON laisse la base appliquer son `default
> now()`, alors qu'un `null` explicite ferait échouer l'enregistrement.

---

## L'application mobile (PWA) — installée en 2 clics, envoyée par un lien

GestioPro n'est pas « dans le Play Store » : c'est une **application web
installable** (PWA). Sur le téléphone ou l'ordinateur, elle s'installe comme
une application normale (icône, plein écran, sans barre de navigateur), à
partir d'un simple lien.

### Fichiers concernés

| Fichier | Rôle |
|---|---|
| `public/manifest.webmanifest` | la fiche de l'application (nom, icônes, couleur, écran de démarrage) |
| `public/sw.js` | le service worker : garde l'application consultable hors ligne et met en cache les fichiers statiques |
| `public/icons/` | icônes 192, 512, maskable, iPhone (180) et favicon |
| `index.html` | les balises PWA (`manifest`, `theme-color`, `apple-touch-icon`…) |
| `src/main.tsx` | l'enregistrement du service worker (uniquement en production) |

### Installer sur un téléphone

- **Android (Chrome)** : ouvrir le lien → menu **⋮** → **« Installer l'application »**.
- **iPhone (Safari)** : ouvrir le lien → **Partager** → **« Sur l'écran d'accueil »**.
- **Ordinateur (Chrome/Edge)** : icône d'installation dans la barre d'adresse.

L'écran **Paramètres → Profil → « Installer l'application »** rappelle ces
instructions et affiche un bouton d'installation direct quand le navigateur le
propose.

### Partager l'application avec un client

On envoie **le lien** `https://gestiopros.vercel.app` (par WhatsApp, e-mail,
SMS…). Chaque personne l'installe elle-même sur son téléphone, puis se
connecte avec ses identifiants. Elle ne voit que les données de sa société :
le cloisonnement est appliqué dans la base, pas seulement dans l'interface.

### Comment les mises à jour se.font

Le service worker fonctionne en **« réseau d'abord »** pour les pages : une
nouvelle version déployée sur Vercel est visible dès le rechargement. Le cache
ne sert qu'en cas de coupure de connexion. Pour forcer une mise à jour,
fermer puis rouvrir l'application.

> ⚠️ Si l'application installée semble figée : désinstaller l'application
> (supprimer l'icône), puis rouvrir le lien et réinstaller. Cela vide le cache
> local du service worker.

### Pour aller plus loin (un vrai fichier APK sur le Play Store)

Si un jour tu veux une fiche Play Store, on ajoute **Capacitor** par-dessus
(il emballe le site dans une coquille native) puis on compile avec Android
Studio — ou Xcode pour l'iPhone. Le travail déjà fait (PWA, icônes, service
worker) sert tel quel : il n'y a rien à jeter.

---

## L'application Android (vrai fichier APK)

En plus de la PWA (installable en 2 clics), le projet contient une **application
Android native** : le dossier `android/` est un projet **Capacitor** prêt à
compiler, qui embarque le site et se connecte au même cloud Supabase.

| Élément | Valeur |
|---|---|
| Identifiant | `com.gestiopro.app` |
| Version | 1.0.0 (`versionCode` 1) |
| Android minimum | 7.0 (API 24) — API cible 36 |
| Icônes et écran de démarrage | déjà générés (logo violet GestioPro) |

Le guide complet, pas à pas (installation d'Android Studio, compilation,
installation sur le téléphone, signature pour le Play Store) se trouve dans
**[`ANDROID_APK.md`](ANDROID_APK.md)**.

Commandes utiles :

```bash
npm run android:sync   # recompile le site et le recopie dans le projet Android
npm run android:open   # ouvre le projet dans Android Studio
```

Après chaque modification du site, il faut relancer `npm run android:sync`
puis recompiler dans Android Studio, **et incrémenter `versionCode`** dans
`android/app/build.gradle` (sinon Android refuse la mise à jour).

---

## Étape 7 — Emails des clients (SMTP)

Le SMTP intégré de Supabase est **réservé aux membres de l'équipe** du projet :
un client externe ne recevra pas son email de validation tant qu'un service
d'envoi n'est pas branché (erreur `over_email_send_rate_limit`).

**Avec Resend (gratuit, 3 000 emails/mois) :**

1. Créez un compte sur <https://resend.com>.
2. **Domains → Add Domain** : ajoutez un domaine que vous possédez
   (ex. `mail.gestiopro.com`).
3. Resend affiche des **enregistrements DNS** (SPF, DKIM, MX) : ajoutez-les chez
   votre hébergeur de noms de domaine, puis attendez la validation
   (« Verified »).
4. Resend → **API Keys → Create API Key** : copiez la clé (`re_...`).
5. Supabase → **Authentication → Emails → SMTP Settings** :
   - activer **Enable custom SMTP**
   - SMTP server : `smtp.resend.com`
   - Port : `465`
   - Username : `resend`
   - Password : la clé API `re_...`
   - Sender : votre adresse d'envoi (ex. `no-reply@votre-domaine.com`)
   - **Save changes**
6. Testez : inscrivez un nouveau compte avec une adresse externe et vérifiez
   que l'email arrive.

> ⚠️ La clé API Resend est un secret : ne la collez jamais dans un message ou
> dans un fichier du projet. Saisissez-la uniquement dans le tableau de bord.

### État actuel (29 octobre 2026) : inscription immédiate

Le projet est en ligne sur **https://gestiopros.vercel.app** et la case
**Confirm email** est **décochée** : un client s'inscrit et entre directement
dans son espace, sans email de validation.

**Conséquence à connaître :** le SMTP intégré de Supabase n'envoie qu'aux
membres de l'équipe, donc **la réinitialisation de mot de passe par email ne
fonctionne pas encore pour un client externe** (page « Mot de passe oublié »).
Tant qu'un service d'envoi n'est pas branché, c'est l'administrateur qui
remet un mot de passe à un collaborateur.

**Le jour où vous achetez un nom de domaine :**

1. Branchez Resend comme décrit ci-dessus (un seul enregistrement DNS).
2. Dans Supabase → **Authentication → Sign In / Providers**, **recochez
   Confirm email**, puis **Save changes**.
3. C'est tout — **aucun redéploiement n'est nécessaire**. L'application
   détecte à la volée si une session est renvoyée par l'inscription : l'écran
   « Vérifiez votre email » réapparaît automatiquement, il n'avait jamais été
   supprimé.

---


| Symptôme | Cause probable | Solution |
|---|---|---|
| « Invalid supabaseUrl » au démarrage | `.env.local` absent ou mal lu | Vérifiez le fichier, redémarrez `npm run dev` |
| « Email not confirmed » | Confirmation email activée, email non reçu | Configurez le SMTP (étape 3) ou décochez *Confirm email* |
| Connexion refusée avec `admin` | Script démo non exécuté | Exécutez `02_comptes_demo.sql` |
| Les données ne se chargent pas | Compte sans organisation | Vérifiez que le compte a une organisation (`profiles.organization_id`) |
| Page blanche au chargement | Erreur JS | Ouvrez la console du navigateur (F12) |

**Vérifier l'état de la base :**

```sql
select p.username, p.role, o.name as organisation, o.join_code
from public.profiles p
left join public.organizations o on o.id = p.organization_id
order by p.role desc, p.username;
```

---

## Déploiement (Vercel)

Dans **Vercel → votre projet → Settings → Environment Variables**, ajoutez :

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://bdoodzgwriyqsejspajf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_YyET21izLenA6fkDy4aH9g_comJm1OO` |
| `VITE_AUTH_REDIRECT_URL` | l'adresse publique de l'app (`https://gestiopros.vercel.app`) |

Ces trois variables sont **déjà configurées** sur le projet Vercel `gestiopros`.

### Application en ligne

| Adresse | Usage |
|---|---|
| `https://gestiopros.vercel.app` | **Adresse officielle** (stable) — c'est celle à communiquer aux clients |
| `https://gestiopros-<id>-gestiopro.vercel.app` | Adresse technique de chaque déploiement (change à chaque mise en ligne) |

Pour mettre à jour le site après une modification du code (à lancer depuis le
dossier du projet) :

```bash
npm run build
npx --yes vercel@latest deploy --prod --yes
```

> ⚠️ Ne lancez **jamais** `vercel link` dans ce dossier : le CLI crée un projet
> parasite du même nom que le dossier, qui peut voler l'adresse
> `gestiopros.vercel.app`.

Puis, dans **Supabase → Authentication → URL Configuration** :
- **Site URL** : `https://gestiopros.vercel.app`
- **Redirect URLs** : l'adresse ci-dessus + les adresses locales
  (`http://localhost:5180`, `http://127.0.0.1:5180`, `http://192.168.1.8:5180`)

> ⚠️ **L'URL de redirection doit être identique à celle déclarée dans
> Redirect URLs.** C'est la cause n°1 des liens d'email cassés
> (`ERR_CONNECTION_REFUSED`). L'application envoie l'adresse **sans** barre
> oblique finale : `https://gestiopros.vercel.app`.

> 🔒 Ne placez **jamais** la clé secrète (`sb_secret_...`) dans Vercel côté
> front : elle contourne les règles RLS.

---

## Le logo de la société et les rapports PDF (10 novembre 2026)

### Ce que la nouvelle version apporte

| Fonctionnalité | Où | Détail |
|---|---|---|
| **Logo de la société** | Paramètres → Organisation → « Logo de la société » | Dépôt par glisser-déposer. L'image est **redimensionnée à 512 px** et **convertie en PNG** dans le navigateur, puis stockée dans Supabase Storage. |
| **Logo sur les factures** | Facture d'une vente (aperçu + impression) | Le logo s'affiche à gauche du nom de la société, à côté du nom de l'entreprise. |
| **Logo sur les rapports** | Nouvelle page « Rapports » | Le logo figure en haut de chaque page du PDF, avec le nom de la société et la période. |
| **Rapports PDF** | Nouvelle page « Rapports » (menu latéral, admin + manager) | Un **vrai fichier PDF** (téléchargeable, partageable par e-mail ou WhatsApp), généré **sur l'appareil**, sans envoi de données à un serveur. |

### Les sections disponibles dans le rapport

Synthèse · Ventes · Achats · Stock & mouvements · Créances & dettes · TVA · État des stocks.

La période est au choix : ce mois, mois dernier, ce trimestre, cette année, tout
l'historique, ou une période personnalisée.

### ⚠️ Script à exécuter (UNE FOIS) — `supabase/16_logo_societe.sql`

Dans **Supabase → SQL Editor → Nouvelle requête** : ouvrez
`supabase/16_logo_societe.sql`, copiez **tout**, collez et **Run**.

Le script fait trois choses, toutes **additives** (aucune donnée n'est touchée) :

1. ajoute la colonne `organizations.logo_url` ;
2. crée le bucket de stockage `logos` (public, 1 Mo maximum) ;
3. installe les 3 politiques RLS de `storage.objects` (`logos insert`, `logos update`,
   `logos delete`) : **seul l'administrateur de la société** peut déposer ou supprimer
   un logo, **uniquement dans le dossier de sa société**, et **seulement si sa licence
   est valide** (`org_write_allowed()`).

Le script se termine par une vérification qui affiche `OK` sur les 4 points.

> 🔒 Le bucket est **public** : c'est nécessaire pour que le logo figure sur une
> facture lue par un tiers, et une URL de logo n'est pas un secret. En revanche
> **l'écriture** est strictement réservée à l'administrateur de la société.

### Le correctif des mouvements de stock (dans le code, pas en base)

Un défaut Important a été corrigé dans l'application : les mouvements de stock créés
par une vente, un achat ou un ajustement **n'étaient jamais enregistrés en base**
(le stock du produit, lui, était bien mis à jour). La cause : un `setState` était
appelé **à l'intérieur** d'un autre `setState`, ce que React n'exécute pas de façon
fiable. Les fonctions concernées (`addSale`, `addPurchase`, `addStockMovement`,
`payClient`, `paySupplier`, `addReceivablePayment`) calculent désormais tout de façon
synchrone avant d'appliquer chaque setter.

**Conséquence pour vous :** les rapports « Stock & mouvements » des sociétés qui
utilisaient l'application avant cette correction restent vides — les mouvements
manquants n'ont jamais été écrits en base. Les mouvements **à venir** sont
enregistrés normalement.

### Performance : le moteur PDF est chargé à la demande

`jspdf` + `jspdf-autotable` pèsent ~427 Ko. Ils sont chargés **uniquement** quand
vous cliquez sur « Générer le PDF » (import dynamique), pas au démarrage de
l'application. Le bundle principal ne gagne que ~22 Ko.

---
