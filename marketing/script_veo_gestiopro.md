# 🎬 GestioPro — Kit de production vidéo (Veo 3)

> Document de travail pour la promotion de **GestioPro** — https://gestiopros.vercel.app
> Rédigé le 05/11/2026. Les chiffres cités dans les scripts correspondent **exactement**
> au jeu de démonstration en base (société « Démo Gestion »), donc les captures d'écran
> que vous filmez seront cohérents avec la voix off.

---

## ⚠️ À LIRE AVANT DE TOURNER — 3 règles qui font la différence

**1. Ne laissez PAS Veo générer les écrans de l'application.**
Les modèles vidéo inventent du texte illisible à l'écran (« Gestiopm », « 1 119 200 F » en
charabia). Sur un réseau social, un écran flou fait fuir. La bonne méthode :
- **Veo** → les scènes *humaines* (la boutique, le téléphone, le marché, la cliente).
- **Enregistrement d'écran réel** → les écrans de GestioPro (voir §5 : liste exacte des écrans à filmer).
- **Montage** → Veo + captures + sous-titres + musique.

**2. L'interface ne fonctionne qu'avec Internet.** Ne dites ni ne montrez « fonctionne hors
ligne » ou « sans connexion ». Le vrai avantage est ailleurs : vos chiffres vous suivent partout.

**3. Ne reprenez pas le texte « données chiffrées localement » de l'écran de connexion.**
C'est faux aujourd'hui : les données vivent dans le cloud (Supabase) et sont cloisonnées par
Row Level Security. Vos arguments solides et vérifiables sont : *chaque société est isolée,
une licence de 30 jours, des clés d'invitation par poste, 25 devises, la TVA déclarable*.

---

## 1. Réglages Veo 3

| Format | Où le publier | Réglage |
|---|---|---|
| **9:16** (1080×1920) | Facebook Reels, Instagram Reels, TikTok, WhatsApp Status, Stories | Format vertical, 8 s max par plan |
| **16:9** (1920×1080) | Facebook (fil), LinkedIn, YouTube, site web | Format paysage, 8 s max par plan |
| **1:1** | Facebook (carré), publication LinkedIn classique | Recadrage depuis le 9:16 |

**Réglages** :Son activé (Veo 3 génère la voix et l'ambiance) · 1 plan = 1 action · description en **anglais** · dialogue en **français** · toujours finir une phrase avant de couper.

**Ancre de personnage** (à recopier mot pour mot dans chaque scène, sinon le personnage change d'une scène à l'autre) :

```
A 34-year-old Senegalese woman entrepreneur, short natural hair, bright blue boubou,
warm confident smile, standing in a sunlit Dakar neighbourhood shop
```

**Ancre visuelle** : `cinematic commercial photography, warm golden West-African daylight,
shallow depth of field, violet #7C3AED brand accents, clean modern UI, no text overlay`

---

## 2. SCRIPT A — 30 secondes · vertical (9:16) · accroche forte

> **Usage** : Facebook Reels / Instagram / WhatsApp / TikTok. Le spot le plus court, à tester en premier.
> **Budget** : ~72 mots.

| # | Durée | Visuel — prompt Veo (anglais) | Voix off (français) | Texte à l'écran |
|---|---|---|---|---|
| 1 | 0–6 s | `A 34-year-old Senegalese woman entrepreneur, bright blue boubou, counting cash and receipts in a small busy Dakar shop, shelves of colorful packages behind her, cinematic commercial photography, warm golden daylight, no text overlay` — elle compte, sourit, puis son visage se charge d'inquiétude. Audio : ambiance de boutique, douce. | « Fatou tient une boutique à Dakar. Chaque jour, elle vend, elle achète, elle encaisse… » | **Une boutique. Des ventes. Du stock.** |
| 2 | 6–12 s | `Close-up on a worn paper notebook on a wooden counter, handwritten columns of numbers, a pen, several loose receipts scattered, shallow depth of field, warm afternoon light, no readable text` — la caméra glisse sur les pages. Audio : papier, stylo. | « …et le soir, elle cherche encore qui n'a pas payé. » | **Le cahier ne répond plus à rien.** |
| 3 | 12–19 s | `The same woman holding a smartphone with a blank dark screen, tapping it with one finger, her expression relaxing, a soft violet glow reflecting on her face, cinematic commercial photography, no text overlay` — elle glisse vers un tableau de bord coloré (capture réelle montée en post-prod). Audio : un « clic » souple. | « Avec GestioPro, elle saisit une vente en quelques secondes. Le stock se met à jour tout seul. » | **Une vente. Le stock à jour.** |
| 4 | 19–25 s | `The same woman in her shop at dusk, holding the phone, looking satisfied and calm, warm interior light, violet reflections, cinematic commercial photography, no text overlay` — montage : capture réelle du tableau de bord (CA encaissé 1 191 200 F · Bénéfice encaissé 813 600 F). | « Le soir, un seul écran lui dit : ce qu'elle a encaissé, ce qu'elle a acheté, ce qu'elle a gagné. » | **CA encaissé · Achats · Bénéfice** |
| 5 | 25–30 s | `The same woman walking confidently on a Dakar street at golden hour, she glances at her phone and smiles, cinematic commercial photography, warm golden light, no text overlay` — logo GestioPro + adresse en surimpression (poste-prod). Audio : musique qui monte. | « GestioPro. Essayez-le : gestiopros.vercel.app. » | **GestioPro** + *gestiopros.vercel.app* |

---

## 3. SCRIPT B — 60 secondes · vertical (9:16) · la version qui vend

> **Usage** : Facebook (fil + Reels), Instagram, WhatsApp. Budget ~145 mots.

| # | Durée | Visuel — prompt Veo (anglais) | Voix off (français) | Texte à l'écran |
|---|---|---|---|---|
| 1 | 0–6 s | `Wide establishing shot of a busy Dakar street market at golden hour, stalls with colorful goods, people moving, a scooter passing, cinematic commercial photography, warm light, no text overlay` | « Au Sénégal, des milliers de petites entreprises tiennent leurs comptes… sur un cahier. » | **Des milliers d'entreprises… sur un cahier.** |
| 2 | 6–13 s | `A tired shop owner sitting outside her shop in the evening, paper ledger on her knees, pen in hand, hesitation in her expression, warm dusk light, cinematic commercial photography, no text overlay` | « Une vente notée ici, un achat oublié là. Le stock faux, un client qui ne paie plus. » | **Stock faux. Clients perdus.** |
| 3 | 13–20 s | `Close-up of a smartphone in a hand, screen glowing violet, thumb scrolling a clean mobile app interface, soft focus background of a shop, cinematic commercial photography, no text overlay` — plan suivant : capture réelle de l'écran Ventes. | « GestioPro remet tout à plat. Une vente, un achat, un client : quelques secondes. » | **Quelques secondes par opération.** |
| 4 | 20–27 s | `A young man in a small office entering a sale on a laptop, clean modern interface glowing on screen, focused expression, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Stock (badge rouge sur un produit). | « Le stock se met à jour. L'alerte tombe quand un produit descend trop bas. » | **Stock à jour. Alertes automatiques.** |
| 5 | 27–34 s | `A woman accountant reviewing documents at a desk with a tablet beside her, calm professional atmosphere, natural window light, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Déclaration TVA. | « La TVA du mois se calcule toute seule. Le reste, c'est du reporting. » | **TVA déclarable en 1 clic.** |
| 6 | 34–41 s | `Two colleagues in a shop talking, one holding a smartphone showing a violet interface, they smile and agree, warm daylight, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Équipe. | « Vous êtes plusieurs ? Vous donnez une clé par poste : le rôle et l'encadrant sont déjà réglés. » | **Une clé par poste.** |
| 7 | 41–48 s | `A small shop owner looking at her phone, then at the screen of a laptop across the shop showing the same numbers, realization and relief on her face, cinematic commercial photography, no text overlay` | « Et où que vous soyez, vous voyez les mêmes chiffres que votre équipe. » | **Les mêmes chiffres, partout.** |
| 8 | 48–54 s | `Close-up on a smartphone resting on a wooden counter in a shop, clean violet logo on the lock screen, golden light, cinematic commercial photography, no text overlay` | « Votre licence commence à 30 jours. Vos données ne sont jamais supprimées. » | **30 jours. Données conservées.** |
| 9 | 54–60 s | `The same woman from scene 1 standing proudly in her shop doorway, arms crossed, smiling at the camera, golden hour, cinematic commercial photography, no text overlay` — logo + URL en surimpression. | « GestioPro. Gérez votre commerce, pas vos papiers. » | **GestioPro** · *gestiopros.vercel.app* |

---

## 4. SCRIPT C — 90 secondes · horizontal (16:9) · LinkedIn / présentation pro

> **Usage** : LinkedIn (post vidéo + message), Facebook (vidéo), site web, rendez-vous client.
> **Ton** : professionnel, destiné aux *dirigeants* et *investisseurs*, pas seulement les commerçants.
> **Budget** ~215 mots.

| # | Durée | Visuel — prompt Veo (anglais) | Voix off (français) | Texte à l'écran |
|---|---|---|---|---|
| 1 | 0–7 s | `Aerial drone shot of Dakar at sunrise, coastline and city skyline, warm golden light, cinematic commercial photography, no text overlay` | « Au Sénégal, la gestion commerciale reste un métier de papier. » | **La gestion commerciale, encore sur papier.** |
| 2 | 7–15 s | `A manager in a modern office looking at a wall of printed spreadsheets and charts, concerned expression, cool window light, cinematic commercial photography, no text overlay` | « Excel ne parle pas. Une erreur d'êtreinte devient invisible, et une créance oubliée devient une perte sèche. » | **Un tableur ne vous alerte de rien.** |
| 3 | 15–23 s | `The same manager sitting in front of a laptop, a clean violet dashboard fills the screen, her posture relaxes, warm modern light, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Tableau de bord. | « GestioPro centralise ventes, achats, stock, clients, fournisseurs et TVA — et affiche le chiffre d'affaires encaissé, les achats payés, et le bénéfice réel. » | **CA encaissé · Achats payés · Bénéfice** |
| 4 | 23–31 s | `A warehouse shelf with boxes, a worker checking stock on a tablet, organized shelves, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Stock. | « Le stock et les mouvements de stock sont suivis à la vente comme à l'achat. Les stocks bas sont signalés. » | **Stock & mouvements tracés.** |
| 5 | 31–39 s | `Two business partners reviewing a tablet together in a bright office, one nodding, professional and warm, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Équipe + Paramètres → Organisation. | « Vous organisez votre équipe avec une clé d'invitation par poste : le rôle, l'encadrant, la durée. Pas de partage de mot de passe. » | **Clés d'invitation par poste.** |
| 6 | 39–47 s | `A tablet on a desk showing a violet interface, a hand swiping between screens, soft violet glow, cinematic commercial photography, no text overlay` | « Chaque société est cloisonnée : un client ne voit jamais les chiffres d'un autre. Le rôle d'administrateur principal, c'est vous. » | **Chaque société isolée.** |
| 7 | 47–55 s | `A woman opening a box of new computer equipment in a shop storeroom, bright daylight, cinematic commercial photography, no text overlay` | « Les données vivent dans le cloud. Vos équipes les voient en temps réel, sur téléphone comme sur ordinateur. » | **Cloud, en temps réel.** |
| 8 | 55–63 s | `A calm professional woman reviewing a monthly TVA document on a tablet at a desk, confident, natural light, cinematic commercial photography, no text overlay` — plan suivant : capture réelle Déclaration TVA. | « La déclaration de TVA du mois s'établit en quelques minutes. Les rapports, c'est fait. » | **TVA & rapports automatisés.** |
| 9 | 63–71 s | `A large retailer and a small shop owner side by side, both using the same interface on different devices, warm daylight, cinematic commercial photography, no text overlay` | « Que vous gériez une boutique ou plusieurs sociétés, le même outil s'adapte à votre organisation. » | **De 1 à N sociétés.** |
| 10 | 71–80 s | `The shop owner from the previous scene closing her laptop, calm and confident, evening light through the doorway, cinematic commercial photography, no text overlay` | « La licence est de trente jours. Elle se renouvelle avec une clé. Et à l'expiration, les saisies se bloquent — mais vos données restent là, intactes. » | **30 jours · données jamais supprimées** |
| 11 | 80–90 s | `Wide shot of the Dakar street at sunset, the woman walking away from her shop, phone in hand, warm golden light, cinematic commercial photography, no text overlay` — logo + URL. | « GestioPro. Gestion commerciale intelligente. Essayez : gestiopros.vercel.app. » | **GestioPro** · *gestiopros.vercel.app* |

---

## 5. Écrans à filmer (captures réelles, pas Veo)

| Écran | Ce qu'on doit voir | Pourquoi |
|---|---|---|
| **Connexion** (`/`) | Écran sombre violet + logo « GestioPro — Gestion Commerciale Intelligente » | La première image de la vidéo |
| **Tableau de bord** | Les 3 cartes : **CA Encaissé 1 191 200 F**, **Achats Payés 377 600 F**, **Bénéfice Encaissé 813 600 F** (en vert) | La promesse tient en un écran |
| **Ventes** | Liste des ventes **VTE-0001** (partiel, 481 440 F) et **VTE-0002** (payée, 991 200 F) | Montre « payé / partiel » |
| **Stock** | Les 4 produits, dont **Clavier mécanique AZERTY — 6 en stock, seuil 8** avec le badge rouge « Stock bas » | Le alerteur de stock |
| **Résultats & CA** | Graphique CA encaissé vs Achats payés | Le «profit » |
| **Déclaration TVA** | TVA facturée / récupérable / nette | L'argument pro |
| **Équipe** | Les 2 membres et leur poste | Les clés par poste |
| **Paramètres → Organisation** | Panneau licence (J-29) + carte « Clés d'invitation par poste » | Le modèle économique |

**Comment filmer** : `npm run dev` → ouvrir `http://localhost:5180` → se connecter avec le
compte de démonstration → enregistrer l'écran en **1920×1080** (paysage) et en **1080×1920**
(vertical) → **masquer le curseur** → faire un zoom lent sur l'onglet Produits (barre violette).

> Compte de démonstration : `demo@test.local` / `IhOrspE+s3m0xO2g`
> ⚠️ Il est en accès libre : changez ce mot de passe avant toute diffusion, ou recréez un
> compte de démonstration dédié à la vidéo.

---

## 6. Voix off seule (à coller dans un TTS type ElevenLabs / PlayHT)

> **Réglage voix** : française, chaleureuse, assurance tranquille, débit ~0,95×, pas de voix
> « publicitaire » trop lissée. Une voix féminine douce ou un timbre neutre fonctionnent bien.
> Si vous générez la voix **avec Veo** (audio natif), mettez la même phrase dans le prompt
> du plan concerné, entre guillemets.

### Version 30 s (≈ 72 mots · ~26 s de parole)
```
Fatou tient une boutique à Dakar. Chaque jour, elle vend, elle achète, elle encaisse…
et le soir, elle cherche encore qui n'a pas payé.
Avec GestioPro, elle saisit une vente en quelques secondes. Le stock se met à jour tout seul.
Le soir, un seul écran lui dit : ce qu'elle a encaissé, ce qu'elle a acheté, ce qu'elle a gagné.
GestioPro. Essayez-le : gestiopros.vercel.app.
```

### Version 60 s (≈ 145 mots · ~52 s de parole)
```
Au Sénégal, des milliers de petites entreprises tiennent leurs comptes… sur un cahier.
Une vente notée ici, un achat oublié là. Le stock faux, un client qui ne paie plus.
GestioPro remet tout à plat. Une vente, un achat, un client : quelques secondes.
Le stock se met à jour. L'alerte tombe quand un produit descend trop bas.
La TVA du mois se calcule toute seule. Le reste, c'est du reporting.
Vous êtes plusieurs ? Vous donnez une clé par poste : le rôle et l'encadrant sont déjà réglés.
Et où que vous soyez, vous voyez les mêmes chiffres que votre équipe.
Votre licence commence à 30 jours. Vos données ne sont jamais supprimées.
GestioPro. Gérez votre commerce, pas vos papiers.
```

### Version 90 s (≈ 215 mots · ~78 s de parole)
```
Au Sénégal, la gestion commerciale reste un métier de papier.
Excel ne parle pas. Une erreur d'encaissement devient invisible, et une créance oubliée devient une perte sèche.
GestioPro centralise ventes, achats, stock, clients, fournisseurs et TVA — et affiche le chiffre d'affaires encaissé, les achats payés, et le bénéfice réel.
Le stock et les mouvements de stock sont suivis à la vente comme à l'achat. Les stocks bas sont signalés.
Vous organisez votre équipe avec une clé d'invitation par poste : le rôle, l'encadrant, la durée. Pas de partage de mot de passe.
Chaque société est cloisonnée : un client ne voit jamais les chiffres d'un autre. Le rôle d'administrateur principal, c'est vous.
Les données vivent dans le cloud. Vos équipes les voient en temps réel, sur téléphone comme sur ordinateur.
La déclaration de TVA du mois s'établit en quelques minutes. Les rapports, c'est fait.
Que vous gériez une boutique ou plusieurs sociétés, le même outil s'adapte à votre organisation.
La licence est de trente jours. Elle se renouvelle avec une clé. Et à l'expiration, les saisies se bloquent — mais vos données restent là, intactes.
GestioPro. Gestion commerciale intelligente. Essayez : gestiopros.vercel.app.
```

---

## 7. Accroches — les 3 premières secondes décident de tout

Testez-les **en A/B** sur le même budget.

| # | Accroche (texte à l'écran) | Voix off |
|---|---|---|
| A | **« Elle nota 40 ventes sur un cahier. »** | « Fatou tient une boutique à Dakar. Chaque jour, elle vend, elle achète, elle encaisse… » |
| B | **« Combien avez-vous encaissé, vraiment ? »** | « Une vente notée ici, un achat oublié là. Le stock faux, un client qui ne paie plus. » |
| C | **« 30 jours pour essayer. »** | « Votre licence commence à 30 jours. Vos données ne sont jamais supprimées. » |

---

## 8. Légendes et hashtags

### Facebook / Instagram (le même texte)
```
📊 Vous notez vos ventes sur un cahier ? Il y a mieux.

GestioPro centralise vos ventes, achats, stocks, clients et fournisseurs.
Le chiffre d'affaires encaissé, les achats payés et le bénéfice réel : un seul écran, en temps réel.

✅ Stock mis à jour automatiquement, alertes sur les produits qui baissent
✅ TVA du mois prête à déclarer
✅ Clés d'invitation par poste pour votre équipe (rôle et encadrant inclus)
✅ Licence 30 jours — et vos données ne sont jamais supprimées
📱 Sur téléphone et sur ordinateur, les mêmes chiffres

👉 Essayez : https://gestiopros.vercel.app

#gestioncommerciale #logicielgestion #pme #entreprise #comptabilite
#dakar #senegal #entrepreneuriat #vente #stock #tva
```

### LinkedIn (ton pro, moins de hashtags)
```
Vendre chaque jour, c'est la moitié du métier. Savoir ce qu'on a réellement encaissé,
ce qu'il reste en stock et ce qui doit être encaissé — c'est l'autre moitié.

GestioPro est un logiciel de gestion commerciale (ventes, achats, stock, clients,
fournisseurs, TVA) pensé pour les entreprises qui suivent leur activité chaque jour.

Points clés :
• Chiffre d'affaires encaissé, achats payés et bénéfice réel, calculés en direct
• Mouvements de stock tracés à chaque vente et à chaque achat, alertes sur les stocks bas
• Déclaration de TVA mensuelle établie en quelques minutes
• Gestion d'équipe par clé d'invitation par poste : le rôle et l'encadrant sont définis
  par la plateforme, pas par un partage de mot de passe
• Cloisonnement strict : chaque société ne voit que ses propres données
• Application Android et web — les mêmes chiffres pour tout le monde, en temps réel
• Licence de 30 jours, renouvelable par clé. À l'expiration, les saisies se bloquent ;
  les données, elles, restent intactes.

Démonstration sur demande — https://gestiopros.vercel.app

#gestioncommerciale #pme #comptabilite #saas #entreprise
```

---

## 9. Les 3 appels à l'action (choisissez-en un)

| Variante | Texte | Quand l'utiliser |
|---|---|---|
| **A — Essai** | « Essayez : gestiopros.vercel.app » | Post classique, trafic froid. Le moins engageant, le plus simple. |
| **B — WhatsApp** | « Écrivez-nous sur WhatsApp : +221 00 00 00 00 » | Posts sponsorisés, publics locaux, quand vous voulez des conversations. |
| **C — Démo** | « 10 minutes de démo en visio, on vous montre votre situation exacte » | Public B2B, LinkedIn, clients à forte valeur. |

> ⚠️ Remplacez le numéro et l'adresse WhatsApp par les vôtres avant publication.

---

## 10. Checklist de production

- [ ] Générer les plans Veo **plan par plan** (8 s max), en gardant les mêmes 2 descriptions d'ancre
- [ ] Filmer les écrans réels de GestioPro en 1080×1920 **et** 1920×1080
- [ ] Monter : Veo (humain) → captures (produit) → Veo (CTA)
- [ ] Poser la voix off : soit audio natif Veo, soit TTS sur le texte du §6
- [ ] **Sous-titres gravés** (80 % des gens regardent sans le son) — 3 à 6 mots à l'écran max
- [ ] Musique : rythmée, douce, entrant à 6 s. Volume sous la voix, toujours
- [ ] Logo + URL sur la dernière image, 2 s minimum à l'écran
- [ ] Premier cadre visible = une **question ou un chiffre**, pas le logo
- [ ] Format de sortie : 1080×1920 (H.264, < 100 Mo pour Facebook/Instagram)
- [ ] Relire la voix off à voix haute avant d'enregistrer — si vous butez sur une phrase, réécrivez-la
- [ ] Vérifier les chiffres de la voix off contre l'écran filmé (même montant, même unité FCFA)

---

## 11. Ce qu'il ne faut pas dire (risques réels)

| ❌ À éviter | ✅ À dire à la place |
|---|---|
| « Fonctionne hors ligne » | « Vos données vous suivent sur téléphone et ordinateur » |
| « Données chiffrées localement » | « Chaque société est cloisonnée, l'accès est géré par rôle » |
| « Illimité / gratuit » | « Licence de 30 jours, renouvelable » |
| « Remplace votre comptable » | « Prépare votre TVA et vos rapports » |
| « Vos données ne sont jamais perdues » | « Vos données ne sont jamais supprimées, même à l'expiration de la licence » |
| « Le logiciel le plus » | « Gestion commerciale complète, ventes jusqu'à la TVA » |

---

## 12. Idée de série (campagne sur 3 semaines)

| Semaine | Format | Sujet |
|---|---|---|
| S1 | 30 s vertical | Le cahier vs l'écran (le spot ci-dessus) |
| S2 | 15 s vertical ×3 | « Une vente en quelques secondes », « Le stock qui alerte », « La TVA en 1 clic » |
| S3 | 90 s horizontal | La version LinkedIn + un témoignage client filmé (FONDATION T. Touadera, JKCG…) |

> Témoignage : les sociétés **JKCG** (youssou@jkcg.org) et **FONDATION TINA TOUADERA**
> (dioufmoussa@gmail.com) existent déjà en production avec une licence active. Un témoignage
> filmé de 60 secondes vaut dix posts — demandez-leur.
