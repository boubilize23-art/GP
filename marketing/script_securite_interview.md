# 🎬 Script vidéo — « La sécurité de GestioPro »

> **Format** : interview 2 personnes, 60 à 70 s, vertical 9:16 (Reels/Facebook) ou 16:9 (LinkedIn).
> **Rôles** : l'**INTERVIEWER** (conseil IT / journaliste) recommande l'application · la **DIRIGEANTE** pose les questions.
> **Règle d'or de ce script** : on ne dit jamais **comment** c'est protégé, on dit **ce que ça donne**. Aucun nom de table, de fonction, de clé, ni identifiant technique.

---

## 🎬 LE SCRIPT

### PLAN 1 — L'ACCROCHE (0–8 s)
> Visuel : la dirigeante, assise à son bureau, dossiers et ordinateur. L'interviewer entre avec un téléphone.

**INTERVIEWER** : « Madame Ndoye, on m'a parlé d'un logiciel de gestion qui tient vos ventes, vos stocks et vos clients. Je vous le recommande. Mais avant, la question qui revient toujours : est-ce que c'est vraiment sécurisé ? »

**DIRIGEANTE** : « Justement, c'est ma première question. J'ai mes clients, mes salariés, mes fournisseurs… je ne vais pas mettre tout ça en ligne sans savoir. »

---

### PLAN 2 — L'HÉBERGEMENT (8–22 s)
> Visuel : plan serré sur les mains de l'interviewer qui explique ; en incrustation, une silhouette de datacenter. **Ne pas filmer d'écran de console.**

**INTERVIEWER** : « Alors, où vivent vos données ? »

**DIRIGEANTE** : « C'est votre question. »

**INTERVIEWER** : « Sur deux plateformes professionnelles. Le site est servi par un hébergeur web de premier plan, et la base de données par un hébergeur spécialisé dans les bases PostgreSQL — le même que celui qui équipe de nombreuses administrations et entreprises européennes. Les deux sont reliés par un canal chiffré, et vos données sont stockées en Irlande, dans l'Union européenne. »

**DIRIGEANTE** : « En Europe. Donc si un jour on me demande où sont mes données, j'ai une réponse. »

**INTERVIEWER** : « Vous en avez même deux : l'infrastructure est en plus protégée par un réseau de distribution mondial qui absorbe les attaques et limite les requêtes abusives. »

---

### PLAN 3 — LE CLOISONNEMENT (22–36 s)
> Visuel : la dirigeante se redresse, attentive. Plan sur l'écran réel de l'application (2 secondes).

**INTERVIEWER** : « Et si un client essayait d'aller voir les données d'une autre société ? »

**DIRIGEANTE** : « Est-ce que c'est possible ? »

**INTERVIEWER** : « Non. Et c'est le point important : ce n'est pas l'application qui cache les données, c'est la base de données elle-même. Chaque société vit dans un compartiment séparé. Même quelqu'un qui écrirait directement dans l'API, sans passer par l'interface, ne verrait que sa société. La séparation est dans le moteur, pas dans l'écran. »

---

### PLAN 4 — L'ACCÈS (36–48 s)
> Visuel : gros plan sur l'écran d'inscription (flouté, sans saisie réelle), puis la clé à usage unique.

**INTERVIEWER** : « Et pour s'inscrire ? Est-ce que n'importe qui peut créer un compte ? »

**DIRIGEANTE** : « C'est bien le problème de ces applications. »

**INTERVIEWER** : « Ici, non. Il faut une clé d'invitation, délivrée par l'administrateur de la plateforme, et qui ne sert qu'une fois. Le rôle de la personne et son encadrant sont inscrits dans la clé elle-même. Résultat : pas de compte fantôme, pas de porte d'entrée ouverte, et pas de mot de passe partagé entre collègues. »

---

### PLAN 5 — LES MOTS DE PASSE (48–56 s)
> Visuel : plan sur l'écran de connexion (defocus), puis sur l'interviewer.

**DIRIGEANTE** : « Et mes mots de passe, ils sont stockés ? »

**INTERVIEWER** : « Jamais en clair. Ils sont transformés par un algorithme à sens unique : personne — pas même l'administrateur de la plateforme — ne peut relire votre mot de passe. Les connexions sont en HTTPS obligatoire, avec un verrouillage temporaire en cas de tentatives répétées. »

---

### PLAN 6 — LA PERTE ET LE VOL (56–64 s)
> Visuel : la dirigeante prend son téléphone, le range dans un tiroir. Sourire.

**DIRIGEANTE** : « Et si on me vole le téléphone ? »

**INTERVIEWER** : « Vos données ne sont pas dessus. Elles sont dans la base, derrière l'authentification. Un téléphone volé ne donne accès à rien. »

---

### PLAN 7 — L'EXPIRATION (64–72 s)
> Visuel : les deux, face à face, plan large.

**DIRIGEANTE** : « Et si j'arrête de payer un jour ? »

**INTERVIEWER** : « Vos saisies se bloquent. C'est tout. Vos données, elles, ne sont jamais supprimées. Aucune suppression automatique, jamais. »

---

### PLAN 8 — LA SIGNATURE (72–80 s)
> Visuel : plan sur l'interviewer, puis la logo + URL en surimpression.

**DIRIGEANTE** : « Vous le recommandez, alors ? »

**INTERVIEWER** : « Je le recommande parce que la sécurité n'est pas une option ajoutée à la fin du développement. Elle est dans la base de données elle-même. Et ça, c'est rare. »

**DIRIGEANTE** : « Je teste. »

**INTERVIEWER** : « Trente jours pour tester : gestiopros.vercel.app. »

---

# 🚫 CE QU'ON NE DIT PAS ET CE QU'ON NE MONTRE PAS

> Cette liste est pour **vous**, pas pour le texte de la vidéo. Elle protège réellement le site.

## 1. Aucun identifiant technique, à l'écran comme à l'oral

| ❌ Ne jamais montrer / dire | ✅ À dire |
|---|---|
| L'adresse de l'API, l'identifiant du projet, la clé d'accès du navigateur | « le site est relié à sa base par un canal chiffré » |
| Le nom d'une table (`profiles`, `sales`, `stock_movements`…) | « chaque société vit dans un compartiment séparé » |
| Le nom d'une fonction ou d'un déclencheur (`handle_new_user`, `check_signup_key`…) | « l'inscription est contrôlée à la création du compte » |
| Le terme technique « RLS » ou « Row Level Security » | « la séparation est faite dans la base, pas dans l'interface » |
| Le nom des tables ou le schéma de la base | « les données sont cloisonnées au niveau du moteur » |

**Pourquoi :** chaque nom technique est une porte d'entrée pour quelqu'un qui veut tester. « Les données sont isolées dans la base » est **aussi vrai** et ne donne strictement rien à exploiter.

## 2. Aucun code, aucun mot de passe, aucun accès

- ❌ Aucun code d'inscription administrateur ni code d'invitation — **même à l'image, même flouté**.
- ❌ Aucun mot de passe, y compris celui du **compte de démonstration** → **changez-le avant de tourner**.
- ❌ Aucune capture de la console d'administration, de la console Supabase ou de la console Vercel.
- ❌ Aucun email, nom, téléphone ou montant réel d'un client ou d'un salarié.
- ❌ Aucun QR code ou lien vers une page d'administration.

## 3. Ne jamais énumérer ce qui est désactivé ou manquant

C'est le point le plus sensible. Ces phrases seules suffisent à orienter un attaquant — **elles ne doivent jamais sortir en public** :

- ❌ « La confirmation par email est désactivée. »
- ❌ « Il n'y a pas de double authentification. »
- ❌ « Le mot de passe oublié ne part pas par email. »
- ❌ « On n'a pas encore de politique de confidentialité. »
- ❌ « L'application nécessite une connexion internet. »

> Si on vous pose la question **en face à face** ou en direct : répondez par le bénéfice, pas par la faille.
> « La question la plus fréquente, c'est le mot de passe oublié. Chez nous, c'est votre administrateur qui vous le réinitialise — il vous le refait en direct. Vous ne récupérez jamais un accès par un canal que vous ne contrôlez pas. »

## 4. Les formulations à ne pas utiliser

| ❌ Formulation risquée | ✅ Formulation sûre et vérifiable |
|---|---|
| « Vos données sont chiffrées localement sur votre téléphone » | « Vos données sont dans le cloud, cloisonnées par société » |
| « Chiffré avec votre propre clé » | « Stockage chiffré chez l'hébergeur, accès contrôlé par rôle » |
| « Incassable » / « blindé » / « à l'abri de toute attaque » | « La séparation des données est appliquée par la base de données elle-même » |
| « Le site est certifié » | « Le site est en HTTPS obligatoire, avec verrouillage temporaire des tentatives » |
| « 100 % sécurisé » | « La sécurité est intégrée à l'architecture, pas ajoutée après coup » |

---

# ✅ LES 3 CORRECTIONS À FAIRE AVANT DE TOURNER

1. **L'écran de connexion affiche « Sécurité renforcée — données chiffrées localement »** → c'est **faux** aujourd'hui (les données sont dans le cloud). Remplacer par : « Données cloisonnées par société · Hébergement européen ».
2. **Le badge « Anti brute-force actif »** → dire « limitation des tentatives ». Le verrouillage navigateur est une commodité d'interface ; la vraie barrière est côté serveur.
3. **Créer une page « Confidentialité »** (mentions légales, hébergeurs, durée de conservation, contact). Elle **n'existe pas encore** — et c'est la première page que regarde un client professionnel avant de s'engager. Une page simple, en français, sur le modèle suivant suffit :
   - Qui traite les données (la société), pour quoi (gestion commerciale du client)
   - Où sont hébergées les données (Europe) et quels sous-traitants
   - Qui a accès à quoi (rôles, société par société)
   - Durée de conservation (« les données ne sont jamais supprimées automatiquement »)
   - Comment exercer le droit d'accès et de suppression (via l'administrateur principal)
   - Cookies / mesure d'audience : à préciser selon ce que vous activez

---

# 📌 AIDE-MÉMOIRE TECHNIQUE (pour vous, pas pour la vidéo)

**Ce qui est vérifié et vrai :**

- Site : **Vercel** — `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  → **HTTPS obligatoire, préchargé par les navigateurs** (le navigateur interdit même une version en HTTP).
- API et base : **Supabase** (PostgreSQL) derrière **Cloudflare** → protection anti-DDoS + limitation de débit.
- Points de présence observés : **Dublin (API)** et **Londres (edge Vercel)** → infrastructure européenne.
- Mots de passe **bcrypt** (Supabase Auth), seul l'email est activé comme fournisseur d'authentification.
- Cloisonnement appliqué **dans la base** : vérifié — le compte de démonstration ne voit que les lignes de sa société, même en interrogeant l'API directement.

**Région de données — CONFIRMÉE le 07/11/2026 :**
Supabase → Project Settings → General → « Project region » = **`eu-west-1` — West EU (Ireland)**.
Contrôle indépendant : le pooler résout vers `pool-tcp-eu-west-1-….elb.eu-west-1.amazonaws.com`.

Contexte important : la région « Europe » de Supabase peut regrouper Londres ou Zurich, qui ne sont **pas**
des États membres de l'UE. Ici ce n'est pas le cas — l'Irlande **est** dans l'Union européenne, donc
la phrase « vos données sont hébergées dans l'Union européenne » est exacte et vérifiable.

Ce que couvre cette région : la base PostgreSQL, le service d'authentification, le stockage de fichiers
et les sauvegardes.
Ce qu'elle ne couvre pas : Supabase précise que certaines données de gestion de compte et de support
peuvent être traitées hors région. **Ne dites donc jamais « vos données ne quittent jamais l'Europe »** —
dites « vos données de gestion sont stockées dans l'Union européenne ».

**Piège à éviter sur les captures d'écran :** cet écran affiche aussi le **Project ID**
(`bdoodzgwriyqsejspajf`). Il n'est pas secret, mais inutile à montrer — recadrez sur le champ
« Project region ».

**Bonus pro :** votre projet s'appelle encore `boubilize23@gmail.com's Project` (nom par défaut).
Renommez-le en **« GestioPro »** dans ce même écran — c'est la première chose qu'un client voit
si vous lui montrez le tableau de bord.


**À ne pas oublier :** le mot de passe du compte de démonstration est connu (il figure dans les scripts du projet). **Changez-le avant toute diffusion.**
