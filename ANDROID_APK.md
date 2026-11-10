# GestioPro — Produire un fichier APK Android

Guide pas à pas pour obtenir un vrai fichier `.apk` installable sur Android,
à partir du projet GestioPro (React + Vite + Capacitor).

> Le projet Android est **déjà prêt** : dossier `android/`, icônes, écran de
> démarrage, couleurs de marque et site web embarqué. Il ne reste qu'à
> compiler.

---

## Étape 1 — Installer Android Studio

1. Téléchargez **Android Studio** : <https://developer.android.com/studio>
2. Lancez l'installateur et laissez les options par défaut :
   - **Android SDK** : laissez coché (c'est lui qui compile les APK).
   - **Android Virtual Device** : facultatif, on testera sur un vrai téléphone.
3. Au premier lancement, Android Studio propose de télécharger les composants.
   Acceptez, puis complétez si besoin :
   - menu **More Actions → SDK Manager**
   - onglet **SDK Platforms** → cochez **Android 16 (API 36)** → **Apply**
   - onglet **SDK Tools** → cochez **Android SDK Build-Tools 36** et
     **Android SDK Platform-Tools** → **Apply**

> Espace nécessaire : environ **15 Go** sur le disque.

---

## Étape 2 — Ouvrir le projet

1. Dans Android Studio : **File → Open…**
2. Choisissez le dossier `android` **du projet GestioPro** :
   `C:\Users\HP\Downloads\gestiopros-supabase-int-gration\gestiopros-supabase-int-gration\android`
   (le dossier `android`, pas le dossier du projet au-dessus).
3. Android Studio synchronise Gradle : **c'est long la première fois**
   (téléchargement de l'Android Gradle Plugin et des bibliothèques, environ
   1 Go). Laissez tourner, ça peut prendre 10 à 30 minutes selon la connexion.
4. Une fois la synchronisation terminée, plus aucun message d'erreur ne
   devrait s'afficher.

---

## Étape 3 — Compiler l'APK

### Méthode A — en ligne de commande (recommandée, déjà validée le 30/10/2026)

Le script `android:apk` de `package.json` fait tout : build web → copie dans
l'app → compilation Gradle.

```powershell
cd C:\Users\HP\Downloads\gestiopros-supabase-int-gration\gestiopros-supabase-int-gration
npm run android:apk
```

Pour lancer **uniquement** la compilation Gradle (le site est déjà embarqué) :

```powershell
$env:JAVA_HOME = 'C:\Users\HP\AndroidTools\jdk21'   # JDK 21 obligatoire (Java 25 refuse Gradle 8.14)
cd C:\Users\HP\Downloads\gestiopros-supabase-int-gration\gestiopros-supabase-int-gration\android
.\gradlew.bat assembleDebug --console=plain
```

Sortie : `android\app\build\outputs\apk\debug\app-debug.apk` (~4,3 Mo).
Premier build : ~5 min (téléchargement de Gradle + plugin Android).
Compilations suivantes : ~30 s.

> ⚠️ Ne lancez pas une synchronisation Gradle depuis Android Studio **en même
> temps** que la compilation en ligne de commande : les deux se disputent le
> verrou du dossier `android\.gradle` et le build échoue.

### Méthode B — depuis Android Studio

1. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
2. Validez l'avertissement (« Do you want to continue? »).
3. À la fin, un message propose **« locate »** : le fichier se trouve dans :

```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Étape 4 — Installer l'APK sur un téléphone

**Par câble USB (le plus simple)**

1. Branchez le téléphone sur l'ordinateur.
2. Sur le téléphone : **Paramètres → À propos de la tabletop → appuyez 7 fois
   sur « Numéro de build »** pour activer les options développeur.
3. **Paramètres → Options pour les développeurs → Débogage USB** → activé.
4. Sur le téléphone, une demande d'autorisation apparaît : **Autoriser**.
5. Dans Android Studio, cliquez sur **Run ▶** (le bouton vert) : l'application
   s'installe et s'ouvre directement sur le téléphone.

**Sans câble (en envoyant le fichier)**

1. Copiez `app-debug.apk` sur le téléphone (câble, carte mémoire, WhatsApp…).
2. Sur le téléphone : **Paramètres → Applications → Accès spécial →
   Installer des applications inconnues** → choisir l'application qui ouvre le
   fichier (Navigateur ou WhatsApp) → **Autoriser**.
3. Ouvrez le fichier `.apk` → **Installer**.

> ⚠️ Un APK signé avec la clé de **debug** ne peut pas être mis à jour
> ensuite, et Play Store le refuse. Pour envoyer une version durable à vos
> clients, faites l'**étape 5**.

---

## Étape 5 — Version signée (à envoyer aux clients / Play Store)

Menu **Build → Generate Signed Bundle / APK…**

1. Choose **APK** → **Next**.
2. **Create new…** (sous *Key store path*) :
   - emplacement : `android/gestiopro-release.jks`
   - mot de passe : **choisissez-en un et notez-le**
   - *First name / Last name* : `GestioPro`
   - *Validity* : **25 years**
   - alias : `gestiopro`, mot de passe : le même
3. **Next** → **release** → **Create**.
4. L'APK signé se trouve dans
   `android\app\build\outputs\apk\release/app-release.apk`.

> 🔒 **Conserve le fichier `gestiopro-release.jks` et son mot de passe
> absolument.** C'est la signature de l'application : sans lui, aucune mise à
> jour future ne peut être publiée (ni sur le Play Store, ni sur les téléphones
> déjà installés). Sauvegarde-le sur une clé USB ou un disque externe.

Pour mettre l'application sur le **Google Play Store** :
**Build → Generate Signed App Bundle…** (on obtient un `.aab`), puis téléverser
sur <https://play.google.com/console> (compte développeur : 25 $ une fois).
Compte de test fermé à 12 testeurs maximum, gratuit.

---

## Étape 6 — Mettre à jour l'application après une modification du site

Chaque fois que le site change (nouvelle version déployée sur Vercel) :

```bash
npm run android:sync
```

Cette commande recompile le site (`vite build`) et recopie les fichiers dans le
projet Android. Ensuite, dans Android Studio : **Build → Build APK(s)** de
nouveau.

> Pensez à **incrémenter `versionCode`** dans `android/app/build.gradle`
> (1 → 2 → 3 …) : Android refuse d'installer une version identique ou plus
> ancienne que celle déjà installée.

---

## Rappels techniques

| Élément | Valeur |
|---|---|
| Identifiant de l'application | `com.gestiopro.app` |
| Version | 1.0.0 (`versionCode` 1) |
| Android minimum | 7.0 (API 24) |
| API cible | 36 (Android 16) |
| Java requis | JDK 17 ou plus (fourni par Android Studio) |
| Connexion Internet | oui, obligatoire (les données sont sur le cloud) |

**L'application utilise le même serveur que le site** : pas de double base de
données, pas de synchronisation à faire. Tout ce que fait un client dans
l'application est immédiatement visible sur gestiopros.vercel.app, et
réciproquement.

> Note : si un jour on ajoute une connexion par Google ou Facebook dans
> l'application, il faudra déclarer l'URL `com.gestiopro.app://` dans les
> « Redirect URLs » du projet Supabase.
