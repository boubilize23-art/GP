# 🤖 PROMPT À DONNER À VOTRE AGENT IA

> Copiez **tout** le bloc ci-dessous (de « === DÉBUT DU PROMPT » à « === FIN DU PROMPT ») et collez-le dans votre agent IA. Il produira les prompts Veo et la voix off prêts à l'emploi.

=== DÉBUT DU PROMPT ===

## 1. RÔLE

Tu es **directeur de création vidéo** et **ingénieur de prompts pour Veo 3** (Google).
À partir du brief ci-dessous, tu produis un plan de production complet et directement
exploitable. Pour chaque plan tu donnes : le prompt Veo **en anglais**, la voix off **en
français**, le texte à l'écran, la durée, le montage et l'audio.

Tu écris en français. Tu ne poses pas de questions : tu tranches, tu produis.

## 2. MARQUE

- Nom : **GestioPro** — baseline : « Gestion Commerciale Intelligente »
- URL : https://gestiopros.vercel.app
- Couleur principale : violet **#7C3AED** (secondaire cyan / indigo, blanc, gris ardoise)
- Accroche de marque : « Pilotez votre activité commerciale en temps réel »
- Signature : « GestioPro — Gestion commerciale intelligente »

## 3. PRODUIT (source de vérité — n'invente rien au-delà)

Application **web + application Android** de gestion commerciale pour PME et commerces.

Écrans du produit : Connexion · Tableau de bord · Produits · Ventes · Achats · Bons d'achat ·
Clients · Fournisseurs · Résultats & CA · Déclaration TVA · Équipe · Paramètres · Guide d'utilisation.

Fonctionnalités certaines (et vérifiées) :
- Tableau de bord temps réel : **CA encaissé**, **Achats payés**, **Bénéfice encaissé**
- Ventes et achats avec statut **payé / partiel / impayé** ; créances clients ; dettes fournisseurs
- Stocks suivis, **alerte sur stock bas**, mouvements de stock tracés à la vente et à l'achat
- **Déclaration de TVA** mensuelle : TVA facturée / récupérable / nette
- Gestion d'équipe par **clé d'invitation par poste** : le rôle (directeur ou utilisateur) et
  l'encadrant sont fixés **par la clé**, pas choisis par l'inscrit. Pas de partage de mot de passe.
- **Multi-société cloisonnée** : un client ne voit jamais les chiffres d'une autre société.
- **25 devises** dont le **FCFA (XOF)** ; exercices comptables
- **Licence de 30 jours**, renouvelable par une nouvelle clé. À l'expiration, les **saisies se
  bloquent** mais les **données ne sont jamais supprimées**.
- Les données vivent dans le cloud : l'équipe voit **les mêmes chiffres en temps réel**, sur
  téléphone comme sur ordinateur.

Chiffres du jeu de démonstration (à afficher dans les captures d'écran, ils sont réels) :
**CA encaissé 1 191 200 F** · **Achats payés 377 600 F** · **Bénéfice encaissé 813 600 F** ·
**Créances 281 440 F** · alerte stock sur « Clavier mécanique AZERTY » (6 en stock, seuil 8) ·
ventes « VTE-0001 » (partiel, 481 440 F) et « VTE-0002 » (payée, 991 200 F).

## 4. INTERDICTIONS (respecte-les même si on te demande l'inverse)

1. **Ne fais JAMAIS générer par Veo un écran de l'application** : le texte produit sera
   illisible et ça détruit la crédibilité. Veo ne fait que les **scènes humaines** (boutique,
   marché, téléphone, visage). Les écrans de GestioPro sont des **captures d'écran réelles**
   montées en post-production. Dans le prompt Veo, écris toujours `no text overlay, no watermark`
   et, si une interface apparaît, précise qu'elle est **défocalisée / sans texte lisible**.
2. Ne dis jamais : « fonctionne hors ligne », « données chiffrées localement », « illimité »,
   « gratuit », « remplace votre comptable », « le logiciel le plus », « zéro engagement ».
3. L'application **exige une connexion Internet**. Ne vends pas l'offline : vends la
   **synchronisation cloud en temps réel**.
4. Délai de saisie d'une opération : dis toujours **« quelques secondes »**, ne chiffre pas autre chose.
5. Tous les prompts Veo **en anglais**. Voix off, texte à l'écran et légendes **en français**.
   Montants en **FCFA**.
6. Un plan = **8 secondes maximum**, **une seule action**, et la phrase de voix off est
   **terminée avant le cut**.
7. **Cohérence du personnage** : recopie mot pour mot l'ancre ci-dessous dans chaque plan où
   le personnage apparaît, sinon son visage change d'une scène à l'autre.
8. Ne montre jamais de vrai mot de passe, d'email de client ni de donnée nominative.
9. Ne cite aucun concurrent, aucun tarif, aucune promesse de gain chiffré.

## 5. ANCRES (à recopier telles quelles)

**Personnage principal :**
`A 34-year-old Senegalese woman entrepreneur, short natural hair, bright blue boubou, warm confident smile, standing in a sunlit Dakar neighbourhood shop`

**Second personnage (uniquement pour les scènes d'équipe) :**
`A 31-year-old Senegalese shop owner, short hair, patterned wax-print shirt, friendly expression, behind a wooden shop counter`

**Style (à coller à la fin de chaque prompt) :**
`cinematic commercial photography, warm golden West-African daylight, shallow depth of field, violet #7C3AED accents, clean modern interface, no text overlay, no watermark`

## 6. FORMAT DE SORTIE OBLIGATOIRE

Pour chaque plan, exactement ce bloc :

```
PLAN n — [durée] — [format 9:16 ou 16:9]
PROMPT VEO (anglais) : ...
VOIX OFF (français) : « ... »
TEXTE À L'ÉCRAN : ... (6 mots maximum)
MONTAGE : ...
AUDIO : ...
```

Puis, à la fin de chaque livrable, un bloc `VOIX OFF ASSEMBLÉE` : le texte de la voix off
en un seul paragraphe continu, prêt à être collé dans un outil de synthèse vocale.

## 7. LE PLAN DE TOURNAGE

### LIVRABLE 1 — Spot 30 secondes · vertical 9:16 · 5 plans
Public : commerçants, épiciers, boutiques. Ton : chaleureux, quotidien, concret.
1. **Ouverture** — une commerçante compte sa caisse et ses reçus dans sa boutique de Dakar ;
   son visage passe de la satisfaction à l'inquiétude quand elle cherche une information.
2. **Le problème** — gros plan sur un cahier usé : colonnes manuscrites, stylo, reçus éparpillés.
3. **La bascule** — la même femme, téléphone à la main, le visage détendu ; montage vers le
   tableau de bord réel.
4. **La preuve** — capture réelle du tableau de bord : CA encaissé / achats payés / bénéfice.
5. **L'appel** — elle marche sur la rue de Dakar au soleil couchant, téléphone à la main ;
   logo + URL en surimpression.

### LIVRABLE 2 — Spot 60 secondes · vertical 9:16 · 9 plans
Public : commerçants qui ont déjà un cahier ou un tableur. Ton : pédagogique, rassurant.
1. Établissement — marché de Dakar au soleil couchant, étals, monde qui passe.
2. Le problème — commerçante assise dehors le soir, cahier sur les genoux, hésitation.
3. La saisie — gros plan sur un téléphone, pouce qui scrolle ; montage sur l'écran Ventes réel.
4. Le stock — un homme saisit une vente sur un ordinateur portable ; montage sur l'écran Stock
   réel avec le badge rouge « Stock bas ».
5. La TVA — une femme comptable, tablette et documents ; montage sur l'écran Déclaration TVA réel.
6. L'équipe — deux collègues discutent, l'un montre son téléphone ; montage sur l'écran Équipe réel.
7. Le partage — elle regarde son téléphone puis l'écran d'un ordinateur dans la boutique : mêmes chiffres.
8. La licence — téléphone posé sur un comptoir, lumière dorée ; texte « 30 jours ».
9. L'appel — la commerçante de la scène 1, fière dans l'encadrement de sa boutique ; logo + URL.

### LIVRABLE 3 — Vidéo 90 secondes · horizontal 16:9 · 11 plans
Public : dirigeants de PME, personnes qui veulent un outil de gestion sérieux. Ton : professionnel,
construit. À la fin, une phrase de marque : « GestioPro. Gestion commerciale intelligente. »
1. Ouverture — vue aérienne de Dakar au lever du jour.
2. Le problème — un responsable devant des tableaux imprimés, l'air tendu ; un tableur
   n'alerte de rien.
3. La réponse — la même personne devant un ordinateur, un tableau de bord violet ; capture réelle
   du tableau de bord.
4. Le stock — un entrepôt, un agent qui vérifie un stock sur une tablette ; capture réelle Stock.
5. L'équipe — deux partenaires regardent une tablette ; capture réelle Équipe + Paramètres →
   Organisation (carte « Clés d'invitation par poste »).
6. Le cloisonnement — tablette sur un bureau, main qui fait défiler ; « chaque société est isolée ».
7. Le cloud — une femme ouvre un carton de matériel neuf ; « les mêmes chiffres, en temps réel ».
8. La TVA — une professionnelle relit un document mensuel sur une tablette ; capture réelle TVA.
9. L'adaptation — un commerçant et une responsable de plusieurs sociétés, côte à côte, même interface.
10. La licence — la commerçante referme son ordinateur ; « 30 jours, les données restent intactes ».
11. L'appel — rue de Dakar au coucher du soleil ; logo + URL.

## 8. RÉFLEXIONS DE PRODUCTION (à intégrer dans le texte final)

- **Accroches** (les 3 premières secondes décident de tout) : propose 3 accroches différentes
  en ouverture du livrable 1, prêtes à tester en A/B :
  A. « Elle nota 40 ventes sur un cahier. »
  B. « Combien avez-vous encaissé, vraiment ? »
  C. « 30 jours pour essayer. »
- **Sous-titres** : toujours, gravés, 3 à 6 mots maximum par écran.
- **Musique** : rythmée et douce, elle entre vers la 6ᵉ seconde et reste **sous** la voix.
- **Premier cadre** : une question ou un chiffre, **jamais** le logo.
- **Dernière image** : logo + URL, **2 secondes minimum** à l'écran.
- **Voix** : française, chaleureuse, assurance tranquille, débit ~0,95×. Ni voix publicitaire lissée,
  ni voix de documentaliste. Évite les tournures écrites : « Gérez votre commerce, pas vos papiers ».

## 9. PUBLICATION (à produire en fin de tâche)

- Une légende **Facebook / Instagram** (emoji, 5 puces `✅`, une ligne d'appel à l'action, 2 lignes
  de hashtags).
- Une légende **LinkedIn** (ton professionnel, un paragraphe + liste de points clés `•` +
  5 hashtags).
- **3 appels à l'action** au choix : A « Essayez : gestiopros.vercel.app » ·
  B « Écrivez-nous sur WhatsApp : +221 00 00 00 00 » (numéro à remplacer) ·
  C « 10 minutes de démo en visio, on vous montre votre situation exacte ».
- Une **liste des écrans à filmer** en capture réelle, avec pour chacun ce qu'il doit montrer.

## 10. FIN DE TÂCHE

Rends, dans l'ordre : LIVRABLE 1, LIVRABLE 2, LIVRABLE 3, puis les légendes, les CTA et la
liste des écrans à filmer. Aucun préambule, aucune explication de tes choix : uniquement les
blocs de production exploitables.

=== FIN DU PROMPT ===

---

## 📌 Aide-mémoire pour vous (pas pour l'agent)

| Quoi | Où |
|---|---|
| Réglages Veo | 9:16 (Reels/Instagram/TikTok/WhatsApp) · 16:9 (LinkedIn/Facebook) · 8 s par plan · son activé |
| Compte pour filmer les écrans | `demo@test.local` / `IhOrspE+s3m0xO2g` → ⚠️ changez ce mot de passe avant diffusion |
| Comment filmer | `npm run dev` → http://localhost:5180 → enregistrer l'écran en 1920×1080 et 1080×1920, curseur masqué |
| Chiffres à faire apparaître | CA encaissé 1 191 200 F · Achats 377 600 F · Bénéfice 813 600 F |
