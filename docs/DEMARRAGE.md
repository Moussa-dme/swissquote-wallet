# Tutoriel : installer et tester notre wallet Swissquote (pour le binôme)

Ce guide te permet de **faire tourner notre démo sur ton ordinateur** et de **refaire le scénario complet** : créer un wallet, perdre son appareil, le récupérer avec des gardiens. Tu n'as pas besoin de comprendre le code. Compte **20 à 30 minutes** la première fois.

> Tout se passe sur **Sepolia**, un réseau de test : aucun argent réel, aucun risque.

---

## 0. Ce que tu vas voir (en 30 secondes)

Notre wallet est un **compte intelligent** protégé par un **passkey** (Touch ID / Face ID / Windows Hello). Le client perd son téléphone ? Il désigne à l'avance **3 gardiens** et **2 sur 3** doivent approuver pour lui rendre l'accès :

1. **L'appareil de secours** du client
2. **Un contact de confiance**
3. **Swissquote**, mais seulement après une vérification d'identité **en personne** (simulée). **Swissquote seule ne peut jamais rien faire.**

Pour simuler plusieurs appareils sur un seul ordinateur, on utilise **plusieurs navigateurs** : chacun joue un appareil.

| Navigateur / fenêtre | Page à ouvrir | Rôle dans l'histoire |
|---|---|---|
| Navigateur A (ex. Safari) | `http://localhost:3000` | Le **client**, avec son téléphone actuel (celui qu'on va « perdre ») |
| Navigateur B (ex. Chrome) | `/guardian` | L'**appareil de secours** du client |
| Navigateur B, **fenêtre privée** | `/guardian` | Le **contact de confiance** (un proche) |
| Navigateur B, autre onglet | `/recover` | Le **nouvel appareil**, après la perte |
| N'importe lequel | `/desk` | Un **agent Swissquote** au guichet (simulé) |

---

## 1. Ce qu'il te faut avant de commencer

1. **Un accès au dépôt GitHub** : accepte l'invitation reçue par e-mail (dépôt `Moussa-dme/swissquote-wallet`, privé).
2. **Node.js** (le moteur qui fait tourner l'app). Va sur <https://nodejs.org>, télécharge la version **LTS** et installe-la. Pour vérifier, ouvre un terminal et tape `node -v` : tu dois voir un numéro (v20 ou plus).
3. **Git** : sur Mac, tape `git --version` dans un terminal ; s'il manque, le Mac propose de l'installer. Sur Windows : <https://git-scm.com>.
4. **Deux navigateurs différents** (par exemple Safari et Chrome, ou Chrome et Edge). Les passkeys fonctionnent sur `localhost`.
5. **Les 3 adresses ZeroDev** (voir l'étape 3). Moussa te les envoie **en message privé**. Ne les publie jamais.

> **Ouvrir un terminal** : sur Mac, ouvre l'app « Terminal » (⌘ + espace, tape « Terminal »). Sur Windows, utilise « Git Bash » (installé avec Git).

---

## 2. Récupérer le code

Dans le terminal :

```bash
git clone https://github.com/Moussa-dme/swissquote-wallet.git
cd swissquote-wallet
```

Le dépôt est **privé**, donc Git te demande un identifiant :
- **Username** : ton pseudo GitHub.
- **Password** : **pas ton mot de passe GitHub**, mais un « Personal Access Token ». Pour le créer : GitHub → ta photo → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**. Donne-lui un nom, coche seulement la case **repo**, choisis une expiration courte (7 jours), puis **Generate token** et copie-le tout de suite (il ne s'affiche qu'une fois). Colle-le comme mot de passe : le terminal n'affiche rien quand tu colles, c'est normal.

Tu as maintenant un dossier `swissquote-wallet` avec, entre autres :
- `passkey-tutorial/` : l'application web ;
- `mock-swissquote/` : le faux serveur de la banque (simulation) ;
- `AGENTS.md` : le contexte du projet et notre journal ;
- `swissquote-track.md` : les consignes officielles du hackathon.

---

## 3. Configurer l'accès à ZeroDev (le seul secret)

ZeroDev est le service qui fournit le wallet, les passkeys et le paiement des frais. L'app a besoin de **3 adresses**, que Moussa t'a envoyées.

1. Va dans le dossier de l'application :
   ```bash
   cd passkey-tutorial
   ```
2. Crée le fichier de configuration en copiant le modèle :
   ```bash
   cp .env.example .env.local
   ```
3. Ouvre `.env.local` avec un éditeur de texte (TextEdit, VS Code, Bloc-notes) et remplis les trois lignes, **sans guillemets** :
   ```
   NEXT_PUBLIC_BUNDLER_URL=<adresse reçue>
   NEXT_PUBLIC_PAYMASTER_URL=<la même adresse>
   NEXT_PUBLIC_PASSKEY_SERVER_URL=<l'adresse « passkey » reçue>
   ```
   (Le bundler et le paymaster utilisent la même adresse.)

> **Ce fichier ne part jamais sur GitHub** (il est ignoré automatiquement). Ne le copie pas dans un message public ni dans une capture d'écran.

> **Si tu préfères ton propre projet ZeroDev** : crée-en un sur <https://dashboard.zerodev.app> avec le réseau **Sepolia**, copie les URL (« Active Networks » et « Passkeys »), puis dans l'onglet **Gas Policies**, active **Sponsor all transactions**. Sans cette dernière étape, les transactions échouent avec « userOp did not match any gas sponsoring policies ».

---

## 4. Installer et lancer (2 terminaux)

### Terminal 1 : l'application

Toujours dans `passkey-tutorial` :

```bash
npm install
npm run dev
```

`npm install` prend 1 à 2 minutes la première fois. À la fin de `npm run dev`, tu dois lire **« Ready »** et l'adresse `http://localhost:3000`. **Laisse ce terminal ouvert.**

### Terminal 2 : le faux serveur Swissquote

Ouvre un **second** terminal :

```bash
cd swissquote-wallet/mock-swissquote
npm install
node --env-file=../passkey-tutorial/.env.local server.mjs
```

Tu dois lire : `MOCK Swissquote sur http://localhost:4000 — gardien : 0x…`. **Laisse-le ouvert aussi.**

> Si tu fermes un terminal, le service s'arrête. Pour tout arrêter : `Ctrl + C` dans chaque terminal.

---

## 5. Le scénario de test, pas à pas

**Choisis un nom** (par exemple `Alice`) et **utilise exactement le même nom partout** dans ce scénario (les majuscules sont ignorées, mais pas les fautes de frappe). À chaque nouveau test, prends un **nouveau nom** (`Alice2`, `Alice3`…) pour partir de zéro.

### Étape 1 : créer le wallet (Navigateur A)

1. Ouvre `http://localhost:3000`.
2. Dans le champ « Your username », écris `Alice`, puis clique sur **Register**.
3. Ton ordinateur demande **Touch ID** (ou Windows Hello / le code) : valide.
4. Une alerte « Register done » apparaît, et l'**adresse du wallet** s'affiche en haut (`0x…`).
5. *Facultatif :* clique sur **Send UserOp** : une vraie transaction part sur la blockchain **sans que tu paies de frais**. Après quelques secondes, tu vois « UserOp completed ».

### Étape 2 : désigner l'appareil de secours (Navigateur B)

1. Ouvre `http://localhost:3000/guardian`.
2. Garde le bouton **Appareil de secours** sélectionné.
3. Écris `Alice` dans « Nom d'utilisateur du propriétaire ».
4. Clique sur **M'enregistrer comme gardien**. Message vert : « Cet appareil est enregistré… ».

> Une clé est créée automatiquement et stockée dans ce navigateur (c'est une **simulation**, signalée par l'étiquette orange MOCK).

### Étape 3 : désigner le contact de confiance (Navigateur B, fenêtre privée)

1. Ouvre une **fenêtre de navigation privée** (⌘ + Maj + N sur Chrome Mac, Ctrl + Maj + N sur Windows).
2. Va sur `http://localhost:3000/guardian`.
3. Clique sur **Contact de confiance**, écris `Alice`, clique sur **M'enregistrer comme gardien**.

### Étape 4 : installer la récupération (Navigateur A)

1. Reviens sur `http://localhost:3000`. Si besoin, clique sur **Login** (Touch ID) pour te reconnecter.
2. Dans le panneau **« Récupération du wallet (2 gardiens sur 3) »**, tu dois voir deux ✅ (appareil de secours, contact) et un troisième (Swissquote, MOCK).
3. Mets le **délai de sécurité à 60** secondes (en production, ce serait 48 heures).
4. Clique sur **Installer la récupération (Touch ID)**. Patiente 10 à 20 secondes.
5. Message vert : « Récupération installée sur la blockchain ».

### Étape 5 : « j'ai perdu mon appareil » (Navigateur B, nouvel onglet)

1. Ouvre `http://localhost:3000/recover`.
2. Écris `Alice`. La page affiche le wallet à récupérer.
3. Clique sur **Créer un nouveau passkey et demander la récupération** (Touch ID). C'est le **nouvel appareil**.
4. Tu vois « Demande … en cours » et un **compte à rebours** de 60 s.

### Étape 6 : l'ancien appareil voit l'alerte (Navigateur A)

Sur `http://localhost:3000`, un encadré rouge **« ⚠️ Une récupération est en cours sur ton wallet »** apparaît, avec un bouton **Annuler**. C'est la protection : si ce n'est pas toi, tu annules (voir le scénario D plus bas). **Pour l'instant, ne clique pas.**

### Étape 7 : choisir **comment** réunir 2 gardiens sur 3

Tu peux tester **deux variantes**. Fais-les sur des noms différents.

#### Variante 1 : sans Swissquote (appareil de secours + contact)

*Montre que le client récupère son wallet même si Swissquote disparaît.*

1. Navigateur B, `/guardian`, **appareil de secours** (nom `Alice`) : dans la demande, clique sur **Approuver (1 voix)**.
2. Navigateur B **fenêtre privée**, `/guardian`, **contact** (nom `Alice`) : clique sur **Approuver (1 voix)**.
3. Quand le compte à rebours est terminé, clique, sur l'un des deux, sur **Finaliser (je signe et j'envoie)**. Attends 10 à 20 secondes : « Récupération exécutée sur la blockchain ».

#### Variante 2 : avec Swissquote (Swissquote + un gardien)

*Montre le rôle de la banque, et le refus d'un attaquant.*

1. Navigateur B, `/recover` (nom `Alice`), carte **« 3. Approbation de Swissquote »** : clique sur **Demander l'aide de Swissquote**. Un dossier est créé « en attente de vérification en agence ».
2. Clique sur **Simuler un attaquant (SMS / e-mail volés)**. Tu dois voir un message rouge : **« Attaquant refusé… Présentez-vous en agence »**. C'est le point central : *un numéro de téléphone ou un e-mail volés ne suffisent jamais.*
3. Ouvre `http://localhost:3000/desk` (le **guichet**). Le dossier apparaît, avec la mention « 1 tentative par SMS/e-mail refusée ». Clique sur **Pièce d'identité contrôlée, client présent** (l'agent a vérifié le client **en personne**).
4. Reviens sur `/recover` : le statut devient « identité vérifiée en personne ✅ ». Clique sur **Obtenir l'approbation** : Swissquote a donné **1 voix sur 3** (elle ne peut pas finaliser seule).
5. Navigateur B **fenêtre privée** (contact), `/guardian` : **Approuver (1 voix)**, puis, le délai écoulé, **Finaliser**.

### Étape 8 : utiliser le wallet récupéré (Navigateur B, `/recover`)

1. La demande indique **« exécutée ✅ »**.
2. Clique sur **Me connecter avec le nouveau passkey** (Touch ID). *S'il te propose plusieurs passkeys, choisis celui dont le nom commence par `Alice-recovered-`.*
3. Clique sur **Envoyer une transaction test (gasless)** (Touch ID) : message vert « ✅ Transaction signée avec le NOUVEAU passkey, depuis le même wallet ».

### Étape 9 : vérifier que l'ancien appareil est bloqué (Navigateur A)

Retourne sur `http://localhost:3000` et clique sur **Send UserOp** : tu dois obtenir une erreur **« Signature provided for the User Operation is invalid »**. C'est **la bonne nouvelle** : l'ancien appareil n'a plus aucun pouvoir.

---

## 6. Scénario D : le propriétaire annule une récupération suspecte

1. Refais les étapes 1 à 5 avec un **nouveau nom** (par exemple `Alice2`).
2. **Avant la fin du compte à rebours**, dans le Navigateur A, clique sur **Annuler cette récupération (Touch ID)**.
3. Message : « Récupération annulée ». Sur `/recover` et `/guardian`, la demande passe à **« annulée ❌ »** et le bouton **Finaliser** ne permet plus de la terminer : les signatures ne sont plus remises.

---

## 7. Ce que tu dois observer (pour le pitch et le produit)

Pendant que tu testes, note :
- **Les moments confus** : à quelle étape tu hésites, quels mots tu ne comprends pas. C'est précieux pour l'UX (le mentor insiste : *« 80 % de mes clients ne connaissent rien à la crypto »*).
- **Les phrases qui rassurent** (« Swissquote seule ne peut rien », « tes fonds ne bougent pas »).
- **Les points faibles de sécurité** auxquels tu penses : qu'est-ce qu'un attaquant pourrait essayer ? Note-les pour le **modèle de menace**.
- **Les captures d'écran** des moments clés (attaquant refusé, compte à rebours, ancien appareil bloqué) : elles servent pour les slides.

---

## 8. Ce qui est réel et ce qui est simulé (MOCK)

| Élément | Réel ou simulé |
|---|---|
| Wallet, passkey, signature, transactions sur Sepolia | **Réel** |
| Paiement des frais par un « paymaster » (gasless) | **Réel** (sponsorisé par notre projet ZeroDev) |
| Récupération par gardiens 2 sur 3, appliquée sur la blockchain | **Réel** |
| Clés de l'appareil de secours et du contact | **MOCK** : stockées dans le navigateur (en production : passkey / clé matérielle) |
| Gardien « Swissquote » | **MOCK** : un petit serveur à part, avec sa propre clé |
| Vérification d'identité en agence (KYC) | **MOCK** : la page `/desk` joue l'agent |
| Délai de sécurité annulable | **Appliqué hors chaîne** (par notre coordinateur) : limite à expliquer ; en production, un délai sur la blockchain |
| Délai de 60 s | Démo ; en production : 48 h |

---

## 9. Si quelque chose ne marche pas

| Symptôme | Cause probable | Solution |
|---|---|---|
| Les deux ✅ des gardiens n'apparaissent pas sur la page d'accueil | Le nom n'est pas identique partout | Vérifie l'orthographe, ou recommence avec un nom neuf partout |
| « Serveur Swissquote injoignable » | Le terminal 2 n'est pas lancé | Relance la commande de l'étape 4 (terminal 2) |
| Erreur « userOp did not match any gas sponsoring policies » | Le paymaster refuse de payer | Dashboard ZeroDev → Gas Policies → active **Sponsor all transactions** (réseau Sepolia) |
| « HTTP request failed » | Adresse mal copiée dans `.env.local` | Recopie les 3 adresses, sans guillemets, puis **arrête et relance** `npm run dev` |
| **« Signature provided for the User Operation is invalid »** sur le **nouvel** appareil | Tu as choisi le **mauvais passkey** dans la liste proposée par le navigateur | Choisis celui qui s'appelle `<nom>-recovered-…`, pas celui qui s'appelle juste `<nom>` |
| Pas de fenêtre Touch ID | Navigateur ou profil qui ne gère pas les passkeys | Essaie un autre navigateur, ou un profil non privé |
| « Finaliser » est grisé | Le délai n'est pas écoulé, ou il manque l'approbation d'un autre gardien | Attends la fin du compte à rebours ; vérifie « Approbations : 1/3 » ou plus |
| La page est blanche / une erreur rouge s'affiche | Le serveur a redémarré | Rafraîchis la page (⌘ + R) ; sinon relance `npm run dev` |
| `Port 3000 is already in use` | Une autre instance tourne déjà | Ferme-la (`Ctrl + C` dans l'ancien terminal) ou redémarre |
| Tout est confus | État mélangé | **Repars de zéro** : arrête les 2 terminaux, supprime les dossiers `passkey-tutorial/.data` et le fichier `mock-swissquote/data.json`, relance, et prends un **nouveau nom** |

**Pour demander de l'aide**, envoie : la capture d'écran **avec le texte de l'erreur**, l'**étape** où ça bloque, et ce qu'affichent les deux terminaux. **Ne montre jamais** le contenu de `.env.local`.

---

## 10. Petit lexique

- **Wallet** : le « portefeuille » crypto. Le nôtre est un compte intelligent, c'est-à-dire un programme sur la blockchain qui peut avoir des règles.
- **Passkey** : une clé de sécurité qui reste dans la puce de ton appareil et s'utilise avec Touch ID / Face ID. Personne ne peut la copier.
- **Gardien** : une personne ou un appareil qui peut aider à retrouver l'accès (2 sur 3 requis).
- **Gasless** : le client n'a pas besoin de crypto pour payer les frais de transaction : c'est Swissquote qui les paie (via un « paymaster »).
- **KYC** : la vérification d'identité d'un client par la banque.
- **Sepolia** : un réseau de test d'Ethereum, sans valeur réelle.
- **MOCK** : une simulation, clairement étiquetée, de quelque chose qu'on ne peut pas construire pendant le hackathon.
- **Testnet** : un réseau d'essai.

---

## 11. Et ensuite ?

Le contexte complet du projet, les réponses des mentors Swissquote et notre journal de progression sont dans **`AGENTS.md`** ; les consignes officielles dans **`swissquote-track.md`**. Pour ta partie (modèle de garde, modèle de menace, légal, business case, slides), commence par ces deux fichiers.
