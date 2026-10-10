# Faisabilité juridique (suisse)

> **Squelette à compléter par le binôme.** Il contient les faits techniques de notre design et les arguments qu'ils permettent, avec le cadre posé par le brief. **Rien ici n'est un avis juridique** (le brief le dit lui-même) ; les points marqués **[À VÉRIFIER]** demandent une source ou un juriste. Le brief juge la **qualité du raisonnement** (« realistic reasoning about custody and wallet ownership verification »).

## 1. Notre wallet est-il de la « garde » ?

**Règle de départ donnée par le brief (simplifiée).** La garde dépend de *qui peut déplacer les fonds*. Si Swissquote peut déplacer les cryptos du client **seule**, c'est de la garde, avec les règles de fonds propres et de ségrégation d'une banque. Si elle **ne peut pas agir seule**, le wallet est plus proche d'un **logiciel**. Le contrôle partagé avec un tiers (Swissquote plus un partenaire) est une **zone grise** à argumenter.

**Faits de notre design (tous vérifiés par des tests) :**
| Fait | Conséquence juridique à argumenter |
|---|---|
| La clé qui signe les paiements est le **passkey du client**, dans la puce de son appareil. Swissquote ne la détient pas et ne la voit jamais. | Swissquote **ne peut pas déplacer les fonds**. |
| Swissquote est **un seul des trois gardiens de récupération** (1 voix sur 3). Le test montre qu'une seule voix est refusée par la blockchain. | Seule, elle ne peut **ni payer, ni changer la clé**. |
| Les gardiens ne peuvent que **remplacer la clé** du propriétaire, **jamais** ordonner un paiement. | La récupération n'est pas un pouvoir de disposition sur les fonds. |
| Swissquote **ne peut ni bloquer ni geler** un paiement : elle **avertit** seulement si l'adresse est signalée. | Pas de pouvoir de blocage : le client garde la maîtrise (le mentor a précisé que les clients n'accepteraient pas un droit de blocage). |
| La récupération se fait aussi **sans Swissquote** (appareil de secours + contact). | Aucune dépendance de la banque pour retrouver l'accès. |

**Argument central (à reformuler)** : *Swissquote fournit un logiciel et un service d'assistance à la récupération ; elle ne détient pas les clés et ne peut pas, seule, disposer des fonds. Le wallet est donc plus proche d'un logiciel que d'une garde.* **[À VÉRIFIER : qualification exacte et conséquences prudentielles.]**

### La zone grise : Swissquote + un autre gardien
Dans la version actuelle, Swissquote **et** le contact de confiance (2 voix sur 3) pourraient remplacer la clé du client **sans lui**. Le brief l'appelle une zone grise ; il faut **argumenter pourquoi c'est, ou n'est pas, de la garde**.
- Arguments **pour** que ce ne soit pas de la garde : le contact est **choisi par le client** ; la banque n'agit qu'après une **vérification d'identité en personne** ; un **délai** laisse au client le temps d'être alerté et d'**annuler** ; la récupération est une **obligation de moyens** (le mentor l'a dit : « best effort »).
- Arguments **contre** : deux tiers, dont la banque, pourraient agir sans le client.
- **Variante stricte** (déjà prévue techniquement, une ligne de configuration) : Swissquote ne peut aider **qu'avec l'appareil du client**, ce qui supprime la zone grise au prix d'une récupération plus difficile si le client perd tous ses appareils. **Décision à prendre et à justifier** (voir `MENACE.md`, 3.1).

## 2. Travel Rule et preuve de propriété

**Règle donnée par le brief (simplifiée).** La Travel Rule impose que les transferts de cryptos portent des informations sur qui envoie et qui reçoit. La Suisse l'applique strictement : selon la FINMA, une banque suisse ne peut envoyer ou recevoir de la crypto **d'un wallet externe qu'après avoir vérifié qui le possède**. **[À VÉRIFIER : référence exacte (circulaire / communication FINMA) pour la citer.]**

**Ce qu'on a construit (simulation de la banque, vérification réelle) :**
1. Le client se connecte à son compte Swissquote (simulé).
2. Swissquote envoie un **message unique** à signer (usage unique, expire en 5 minutes).
3. Le wallet **signe** avec le passkey du client (Touch ID).
4. Swissquote **vérifie la signature sur la blockchain** (ERC-1271, standard des comptes intelligents) : elle sait que ce wallet est contrôlé par le client, **sans jamais voir de clé**.
5. Un retrait du compte Swissquote **n'est autorisé que vers un wallet dont la propriété est prouvée**. Vers une adresse inconnue : refusé.
6. La liaison **survit à une récupération** : l'adresse du wallet ne change pas.

**Argument** : un wallet fourni par Swissquote peut **automatiser** la vérification de propriété exigée par la FINMA, pour l'utilisateur comme pour la banque.

### Quand le client paie un tiers depuis son wallet, Swissquote est-elle l'établissement émetteur ?
Le mentor a donné la comparaison du **distributeur de billets** : une fois les fonds sortis de l'écosystème Swissquote vers un wallet self-custody, la banque n'est plus « derrière l'épaule » du client, et celui-ci en assume la responsabilité. Dans notre design, Swissquote n'intervient pas dans les paiements du wallet (elle avertit seulement). **[À VÉRIFIER : conséquences, notamment pour les transferts vers une adresse hébergée par un prestataire.]**

## 3. Autres points à traiter (idées)
- **Responsabilité et assurance** : le mentor a indiqué qu'il n'y a **pas d'assurance** dans ce projet et que la récupération est une **obligation de moyens** (« best effort »), pas de résultat.
- **Protection des données** : la banque ne détient que l'adresse du wallet et la preuve de propriété, pas de clé. **[À COMPLÉTER : nLPD / LPD.]**
- **KYC et lutte contre le blanchiment** : la vérification en personne à l'agence réutilise le KYC existant de la banque (simulé ici).
- **Sanctions** : on avertit sans bloquer. Le contrôle de la banque porte sur **ses** transferts (retraits depuis son compte), pas sur les paiements du wallet du client. **[À VÉRIFIER.]**

## 4. Questions à poser à un juriste (si l'occasion se présente)
1. Un compte où la banque détient **1 voix sur 3 dans un mécanisme de récupération** est-il de la garde ?
2. Et si deux voix sur trois, dont la banque, peuvent remplacer la clé sans le client ?
3. Quelle preuve de propriété suffit pour la Travel Rule : une signature de message vérifiée sur la blockchain ?
