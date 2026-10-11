# Guide du code : comprendre ce qu'on a construit

> Pour toi qui n'as pas suivi le code ligne par ligne. Objectif : pouvoir **expliquer chaque promesse du pitch**, dire **où est la preuve**, et répondre aux questions du jury. Compte **1 h 30** pour tout lire, **20 minutes** pour l'essentiel (sections 1 à 3).

## 1. En chiffres
| | Lignes |
|---|---|
| Application (pages, composants, serveur de l'app, bibliothèques) | ≈ 1 900 |
| Faux serveur Swissquote | ≈ 270 |
| Scripts de test | ≈ 450 |
| Code d'origine du template ZeroDev (créer, se connecter, envoyer) | ≈ 200 |

Tout le reste a été écrit pendant le hackathon avec **Claude Code** (voir la section « Outils d'IA » de `PROJET.md`). **On ne cache pas ça** : le brief demande de déclarer les outils d'IA. Ce qui compte, c'est que tu sois capable d'expliquer **ce que fait chaque morceau et pourquoi on l'a choisi**.

## 2. Ce que tu dois savoir expliquer : les 8 mécanismes
Chacun tient en **une phrase** que tu peux dire au jury.

| # | Mécanisme | La phrase | Où est le code |
|---|---|---|---|
| 1 | **Passkey = clé du propriétaire** | « La clé est générée dans la puce de l'appareil, protégée par Touch ID, elle n'en sort jamais ; le wallet est un compte intelligent dont ce passkey est le propriétaire. » | `app/page.tsx` (fonctions `handleRegister`, `handleLogin`, `createAccountAndClient`) |
| 2 | **Récupération 2 sur 3** | « Un compte "gardien" exige 2 signatures sur 3 ; il peut remplacer la clé du propriétaire, jamais déplacer les fonds. » | `lib/recovery.ts` (`guardianFor`, `buildInstallCallData`, `approveRecovery`, `finalizeRecovery`) |
| 3 | **Délai annulable** | « Un coordinateur garde les signatures et ne les remet qu'après le délai ; si le propriétaire annule, il ne les remet plus. » | `app/api/recovery/[...path]/route.ts` (partie `signatures` et `cancel`) |
| 4 | **Swissquote = 1 voix, en personne** | « Le faux serveur ne signe qu'après la validation d'un agent en agence ; un code SMS est refusé ; il reconstruit lui-même l'opération avant de signer. » | `mock-swissquote/server.mjs` (routes `/cases`, `/otp`, `/desk`, `/approve`) |
| 5 | **Petit / gros montant** | « Au-dessus du seuil, il faut Touch ID **et** la confirmation du second appareil, qui signe ce paiement précis. » | `lib/policy.ts`, `app/components/PaymentPanel.tsx`, routes `payments` du coordinateur |
| 6 | **Preuve de propriété (Travel Rule)** | « Swissquote envoie un message unique ; le wallet le signe ; elle vérifie la signature sur la blockchain, sans voir de clé ; un retrait n'est possible que vers un wallet prouvé. » | `mock-swissquote/server.mjs` (`/wallet/challenge`, `/wallet/link`, `/withdraw`), `app/components/SwissquoteLinkPanel.tsx` |
| 7 | **Gas station (anti-abus) + frais en USDC** | « Un service avant le paymaster applique un quota par wallet, un plafond global et un plafond de gaz ; quand le quota gratuit est épuisé, le client peut payer ses frais en USDC, ce qui ne coûte rien à Swissquote. » | `lib/gas.ts`, `app/api/gas/route.ts` |
| 8 | **dApps : empreinte du code** | « Le wallet recalcule l'empreinte du code d'un contrat sur la blockchain et la compare à celle approuvée : même adresse ne veut pas dire même code. » | `lib/dapps.ts`, `app/components/DappPanel.tsx` |

## 3. Où est la preuve de chaque promesse
Les **scripts de test** (dossier `spike/`) sont la meilleure documentation : chaque ligne `✅` affichée est une preuve que tu peux montrer.

| Promesse | Commande | Ce que tu verras |
|---|---|---|
| Récupération complète, Swissquote seule refusée, code SMS refusé, ancien propriétaire refusé | `cd spike && node --env-file=../passkey-tutorial/.env.local flow-test.mjs` | 9 lignes ✅ |
| Preuve de propriété et Travel Rule | `… link-test.mjs` (à lancer **une seule fois** par wallet de test : le wallet reste lié ensuite) | 10 lignes ✅ |
| Confirmation des gros paiements | `… payment-test.mjs` | 7 lignes ✅ |
| Gas station | `… gas-test.mjs` | 6 lignes ✅ |
| Vérification du code des dApps | `… dapp-test.mjs` | 5 lignes ✅ |

*(Le faux serveur Swissquote et l'app doivent tourner. Voir `DEMARRAGE.md`.)*

## 4. Ordre de lecture conseillé (du plus petit au plus gros)
1. **`lib/policy.ts`** (27 lignes) : le seuil petit / gros, l'adresse de l'USDC de test.
2. **`lib/dapps.ts`** (42 lignes) : la vérification de l'empreinte du code.
3. **`lib/gas.ts`** (47 lignes) : les quotas.
4. **`lib/recovery.ts`** (181 lignes) : **le cœur** : comment on construit le gardien 2 sur 3. Lis les commentaires en tête du fichier.
5. **`app/api/recovery/[...path]/route.ts`** (162 lignes) : le coordinateur : qui peut faire quoi, et où est le délai.
6. **`mock-swissquote/server.mjs`** (270 lignes) : lis les commentaires au-dessus de chaque route, ils expliquent le « pourquoi ».
7. **Les pages** (`app/page.tsx`, `guardian`, `recover`, `desk`) : en survol, elles ne font surtout que de l'affichage.

**Astuce de lecture :** presque chaque fichier commence par un **commentaire qui explique son rôle et ses limites**. Lis d'abord ces commentaires, ils suffisent souvent.

## 5. Comprendre en regardant tourner
- **Journal du faux serveur** : le terminal du faux serveur Swissquote (port 4000) peut montrer les demandes qu'il reçoit.
- **La blockchain** : après une récupération, ouvre l'adresse du wallet sur <https://sepolia.etherscan.io> : tu vois les opérations réelles (installation, récupération, paiements).
- **Les fichiers de données** (lisibles) : `passkey-tutorial/.data/coordinator.json` (demandes, approbations, paiements), `passkey-tutorial/.data/gas.json` (compteurs de la gas station), `mock-swissquote/data.json` (dossiers, clients, registre, liaisons).

## 6. Questions probables du jury, et réponses courtes
**Technique**
1. *Où est la clé du client ?* Dans la puce de son appareil (passkey), protégée par Touch ID ; elle n'en sort pas. Le serveur et Swissquote ne la voient jamais.
2. *Qu'est-ce qu'un compte intelligent (ERC-4337) ?* Un petit programme sur la blockchain qui peut avoir des règles (récupération, frais payés par un tiers), contrairement à un compte classique.
3. *Pourquoi 2 sur 3 et pas un seul gardien ?* Un seul gardien serait un point de compromission ; avec 2 sur 3, Swissquote seule ne peut rien. Testé : une seule signature est refusée par la blockchain.
4. *Qu'est-ce qui empêche Swissquote de vider un wallet ?* Les gardiens ne peuvent que **remplacer la clé**, jamais ordonner un paiement, et Swissquote n'a qu'une voix.
5. *Le délai est-il garanti ?* Non : il est appliqué par un coordinateur, pas par la blockchain. On l'assume ; production : délai sur la blockchain (`TimelockPolicy`).
6. *Qu'avez-vous codé vous-mêmes ?* Les décisions de conception, les tests avec de vrais passkeys, la validation des cas d'attaque. Le code a été écrit avec Claude Code, ce qui est déclaré.

**Sécurité**
6bis. *Pourquoi Swissquote ne peut-elle pas geler un compte volé ?* Un droit de blocage serait un pouvoir sur les fonds (donc de la garde) et les clients n'en veulent pas ; à la place, le client déclenche lui-même une procédure d'urgence (« runaway ») : il récupère l'accès avec ses gardiens puis déplace ses fonds tout de suite.
7. *Et si le téléphone est volé ?* Petits montants limités ; gros paiements : second appareil ; une récupération suspecte est annulable.
8. *Et si l'attaquant a le numéro et l'e-mail ?* Un code SMS ou e-mail ne suffit jamais : Swissquote exige une vérification en personne.
9. *Swissquote + le contact peuvent récupérer sans le client ?* Oui, c'est la zone grise assumée (choix de conception, atténuée par la vérification en personne, le délai et l'alerte) ; un mode « haute sécurité » est décrit.
10. *Les passkeys se synchronisent chez Apple / Google ?* Oui, risque connu et documenté ; atténué par les plafonds et le second appareil.

**Légal et business**
11. *C'est de la garde ?* Swissquote n'a aucune clé du client (seulement sa clé de gardien : 1 voix sur 3) et ne peut rien déplacer seule : plus proche d'un logiciel (à vérifier sur les textes officiels).
12. *Comment respectez-vous la Travel Rule ?* Preuve de propriété par signature vérifiée sur la blockchain avant tout retrait.
13. *Comment Swissquote gagne de l'argent ?* Rétention, service de récupération payant, abonnement « gas station » ; le pourcentage des actifs seul est négligeable (voir `BUSINESS.md`).

**Bonus**
14. *Comment évitez-vous l'abus de frais ?* Quotas par wallet et globaux, plafond de gaz, et une option « payer ses frais en USDC » quand le quota est épuisé ; limite : contournable en dehors de l'app tant que la règle ZeroDev n'est pas durcie.
15. *Pourquoi l'empreinte du code ?* Parce qu'un contrat modifiable garde la même adresse ; le wallet recalcule l'empreinte lui-même.

## 7. Ce qui est simulé (à dire clairement)
Tout ce qui est orange (**MOCK**) : le gardien Swissquote, l'agence, les comptes clients, le registre de dApps, la gas station, les clés de l'appareil de secours et du contact. **La sécurité de la clé du client n'en dépend pas.**
