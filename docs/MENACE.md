# Modèle de menace

> Brouillon factuel, écrit à partir de ce qui est **réellement construit et testé**. À relire et enrichir par le binôme. Les trois questions que le brief pose explicitement sont traitées en section 1.

## Ce qu'on protège
Les fonds du client (ici des USDC de test sur Sepolia) et son **contrôle** : lui seul décide des paiements, et il peut retrouver l'accès s'il perd son appareil.

## 1. Les trois questions du brief

### Qui pourrait voler les fonds ?
| Attaquant | Peut-il voler ? | Pourquoi |
|---|---|---|
| Un voleur qui a le **téléphone et la biométrie** | **Un peu** : seulement des **petits montants** (≤ seuil, 5 USDC en démo) | Les gros paiements exigent en plus la confirmation d'un **second appareil**. Il peut aussi lancer une récupération, mais le propriétaire est alerté et peut annuler pendant le délai. |
| Un attaquant qui a pris le **numéro de téléphone** (SIM swap) et l'**e-mail** | **Non** | Un code SMS ou e-mail ne suffit **jamais** pour la récupération : Swissquote exige une vérification **en personne**. Il n'a ni l'appareil de secours ni le contact. |
| **Swissquote seule** | **Non** | Elle n'a qu'**1 voix sur 3** dans le multisig. Elle ne détient ni la clé du client ni aucun pouvoir de paiement. Le test montre qu'une seule voix est refusée par la blockchain. |
| Le **contact de confiance seul** | **Non** | Même raison : 1 voix sur 3. |
| **Swissquote + le contact** (sans le client) | **Oui, c'est la zone grise** (voir 3.1) | 2 voix sur 3. Atténué par le délai, l'alerte au propriétaire et la possibilité d'annuler. |
| **L'appareil de secours + le contact** | Oui, c'est voulu | Ce sont les deux gardiens du client : c'est la récupération **sans Swissquote**. |
| Un attaquant qui **vole le compte Apple / Google** du client | Possible (voir 3.2) | Les passkeys peuvent être synchronisés par le système d'exploitation, ce qui n'est pas sous notre contrôle. Limité par les plafonds et le second appareil. |

### Qui pourrait verrouiller le client dehors ?
| Cause | Conséquence | Atténuation |
|---|---|---|
| Le client perd son téléphone **et** son appareil de secours | Plus que 2 gardiens (contact + Swissquote) : récupération possible, mais c'est la zone grise de 3.1 | Choix de conception à trancher : voir 3.1 |
| Swissquote **disparaît définitivement** | Le client récupère avec **appareil de secours + contact** (testé) | Aucune dépendance à la banque |
| Le **coordinateur** tombe ou refuse de remettre les signatures | La récupération est retardée ou bloquée | Limite de la démo (voir 3.4) ; en production : échange direct des signatures entre gardiens ou service tiers |
| Un **attaquant lance des demandes de récupération en boucle** | Alertes répétées au propriétaire | Chaque demande demande 2 voix : il ne peut pas les obtenir sans les gardiens |
| ZeroDev (bundler, paymaster) indisponible | Plus de transactions, plus de frais payés | Dépendance fournisseur assumée (voir 3.7) ; la blockchain, elle, ne bouge pas |

### Swissquote, seule ou avec un partenaire, peut-elle déplacer les fonds sans le client ?
- **Seule : non**, et on l'a démontré (une seule signature est refusée par le contrat).
- **Avec un partenaire : oui dans le design actuel** (Swissquote + contact de confiance). C'est exactement la « zone grise » du brief. On l'**assume**, on l'explique (3.1) et on propose une variante stricte.

## 2. Ce qui nous protège (défense en couches)
1. **Clé dans la puce sécurisée** de l'appareil, protégée par la biométrie : elle ne peut pas être copiée comme un fichier.
2. **Récupération à 2 voix sur 3**, imposée par la blockchain (pas par un serveur).
3. **Swissquote : vérification en personne**, jamais sur SMS / e-mail.
4. **Délai de sécurité annulable** : le propriétaire voit l'alerte et peut annuler avec son passkey.
5. **Plafond des petits paiements et second appareil pour les gros**.
6. **Résumé en langage clair + simulation** avant chaque signature.
7. **Avertissement** si l'adresse destinataire est signalée (sans blocage : le client reste libre).
8. **Preuve de propriété** (signature vérifiée sur la blockchain) avant tout retrait de la banque vers le wallet.

## 3. Limites et risques résiduels (à assumer devant le jury)

### 3.1 Swissquote + un autre gardien (zone grise)
Aujourd'hui les trois gardiens pèsent pareil. Deux d'entre eux suffisent, y compris **Swissquote + le contact de confiance**, sans l'appareil du client.
- **Atténuation actuelle** : délai, alerte au propriétaire, annulation, vérification en personne, contact choisi par le client.
- **Variante stricte étudiée** : donner plus de poids à l'appareil de secours (60) qu'au contact (40) et à Swissquote (40), seuil 100. Alors **Swissquote + contact ne peuvent plus rien sans l'appareil du client**. Coût : si le client perd à la fois son téléphone et son appareil de secours, la récupération par contact + Swissquote disparaît (il faudrait une sauvegarde de dernier recours). Le changement est d'une ligne de configuration.
- **Décision prise (équipe, samedi soir) : on garde l'option actuelle (2 voix sur 3, tous les gardiens à égalité).** Raisons : (1) le mentor a indiqué que, dans le pire cas, le client peut se présenter en agence avec une pièce d'identité, ce qui suppose que Swissquote puisse l'aider **quand il a perdu tous ses appareils**, donc sans son appareil de secours ; (2) le brief pose la question « Swissquote et un partenaire peuvent-ils restaurer sans le client ? » comme une question à **répondre**, les deux réponses se défendent ; (3) la variante stricte créerait un **risque de blocage** si le client perd tout d'un coup (cambriolage, incendie). La variante stricte reste présentée comme un **mode « haute sécurité » configurable** (non implémenté), pour les clients qui préfèrent ne jamais dépendre de la banque.

### 3.2 Passkeys synchronisés (Apple, Google)
Un système d'exploitation peut copier un passkey dans le cloud du client. Un attaquant qui prend le compte Apple ou Google pourrait y accéder. Ce n'est ni sous notre contrôle ni lié au compte Swissquote. **Atténuation** : plafond des petits paiements, second appareil pour les gros montants. **Piste de production** : clé de sécurité physique (« quelque chose de tangible », comme le mentor l'a suggéré) pour les gros montants.

### 3.3 Délai appliqué hors chaîne
Le délai annulable est appliqué par le **coordinateur** (il retient les signatures), pas par la blockchain. Si deux gardiens avaient déjà collecté leurs signatures par un autre moyen, ils pourraient contourner le coordinateur. **Piste de production** : un module de délai sur la blockchain (`TimelockPolicy` publié par ZeroDev, non intégré faute d'aide dans le SDK pendant le hackathon).

### 3.4 Dépendance au coordinateur
Dans la démo, toute récupération passe par le coordinateur (un service à nous). S'il tombe, les gardiens ne peuvent pas s'échanger les signatures via l'interface. **Piste** : export / import manuel des signatures, ou service tiers.

### 3.5 Approbations rejouables
Une approbation de gardien reste valable tant que l'état du compte gardien ne change pas, y compris après l'annulation d'une demande. Il faut donc ne **jamais** divulguer les signatures (le coordinateur ne les expose pas) et, en production, les invalider par un changement d'état du compte gardien.

### 3.6 Règles « petit / gros » appliquées par l'app
Le plafond et la confirmation du second appareil sont appliqués par l'application et le coordinateur, pas par le wallet sur la blockchain. Un attaquant capable de signer directement avec la clé du propriétaire en contournant l'application pourrait donc les ignorer. **Piste de production** : plafond imposé par le compte lui-même (module de politique) ou co-signature.

### 3.7 Éléments simulés (MOCK)
Clés de l'appareil de secours et du contact dans le navigateur ; KYC en agence ; base de clients Swissquote ; liste d'adresses signalées ; retraits de la banque. Rien de cela n'affecte la sécurité de la clé du client, mais ce sont des **simplifications à remplacer** en production (voir `PROJET.md`).

### 3.8 Dépendances fournisseur
ZeroDev fournit le compte intelligent, le serveur de passkeys, le bundler et le paymaster. Il ne peut **pas** signer à la place du client ni déplacer ses fonds, mais il peut refuser de sponsoriser des frais ou être indisponible. La clé publique du client est enregistrée sur la blockchain, qui fait foi.

### 3.9 Gas station et registre de dApps (limites des bonus)
- **Gas station** : elle limite l'abus quand l'app est utilisée normalement, mais la politique du tableau de bord ZeroDev reste « tout sponsoriser » (son webhook ne peut pas joindre un serveur local) : un client modifié pourrait appeler le paymaster directement. En production : politique appliquée chez ZeroDev, clé gardée côté serveur, wallets liés à des clients KYC.
- **Wallets en série** : un attaquant peut créer beaucoup de wallets ; le plafond global limite la perte, et la liaison à un client Swissquote (KYC) la supprimerait.
- **Registre de dApps** : il est simulé ; la vérification de l'empreinte est réelle, mais ne couvre pas les changements de comportement dus à des données externes (oracles) ni les failles déjà présentes dans le code approuvé.

### 3.10 Autres limites
- Une seule famille de blockchains (EVM) avec ce modèle de compte ; le MPC fonctionnerait aussi pour Bitcoin.
- Pendant le délai, l'**ancienne clé reste valide** : un voleur de téléphone peut agir avant la fin de la récupération ; d'où le plafond et le second appareil.
- Seuls Safari et Chrome sur `localhost` ont été testés.
- Politique de frais actuelle trop large en démo (« tout est sponsorisé ») : en production, plafonds par client et liste de contrats.

## 4. Scénarios d'attaque à montrer en démo
1. **Attaquant avec téléphone + e-mail volés** : le « code SMS / e-mail » est refusé par Swissquote.
2. **Récupération suspecte** : le propriétaire voit l'alerte et annule avec son passkey.
3. **Ancien appareil après récupération** : refusé par la blockchain.
4. **Gros paiement sans second appareil** : impossible via l'application.
5. **Adresse signalée** : avertissement visible, décision laissée au client.
