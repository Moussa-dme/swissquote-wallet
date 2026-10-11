# Faisabilité juridique (suisse)

> **Brouillon argumenté, avec sources.** Ce n'est **pas un avis juridique** (le brief le dit lui-même : « simplified, not legal advice »). Les références viennent de **commentaires de cabinets d'avocats et de prestataires de conformité** trouvés pendant le hackathon : certaines datent de 2019 à 2023 et le cadre peut avoir évolué. Les points marqués **[À VÉRIFIER]** sont à confirmer sur le texte officiel (**finma.ch**, **fedlex.admin.ch**) avant d'être affirmés devant le jury. Le brief juge la **qualité du raisonnement** (« realistic reasoning about custody and wallet ownership verification »).

## 1. Notre wallet est-il de la « garde » ?

### Le critère
- **Brief** : la garde dépend de *qui peut déplacer les fonds*. Si Swissquote peut déplacer les cryptos du client **seule**, c'est de la garde (règles bancaires de fonds propres et de ségrégation). Si elle **ne peut pas agir seule**, le wallet est plus proche d'un **logiciel**. Le contrôle partagé avec un tiers est une **zone grise**.
- **Pratique de la FINMA (selon un commentaire de cabinet, [MME](https://www.mme.ch/en/magazine/articles/provision-of-custody-services-for-digital-assets-under-swiss-law))** : un wallet est non-custodial si le prestataire **n'a aucun pouvoir de disposition sur les clés privées ni sur les actifs** et **ne peut influencer les transactions ni commercialement ni juridiquement**. L'analyse ne se limite pas à la technique : elle regarde aussi le **cadre contractuel**. Les prestataires de wallets non-custodial n'ont généralement **pas d'obligation de licence**. **[À VÉRIFIER sur finma.ch]**

### Nos faits (tous vérifiés par des tests) face au critère
| Critère | Notre design |
|---|---|
| Pouvoir sur les **clés privées** | **Aucun.** La clé du client est un passkey dans la puce de son appareil. Swissquote ne la détient ni ne la voit. |
| Pouvoir de **disposition** des actifs, seule | **Aucun.** Elle n'a qu'**1 voix sur 3** dans le multisig de récupération. Le test montre qu'**une seule voix est refusée** par la blockchain. |
| Les gardiens peuvent-ils **ordonner un paiement** ? | **Non.** Ils peuvent seulement **remplacer la clé** du propriétaire (jamais déplacer des fonds). |
| Influence **commerciale ou juridique** sur les transactions | **Aucune.** Swissquote **n'a pas le droit de bloquer ou geler** un paiement : elle **avertit** seulement si l'adresse est signalée (le mentor a précisé que les clients n'accepteraient pas un droit de blocage). |
| Dépendance à la banque | **Aucune** pour récupérer : appareil de secours + contact de confiance suffisent. |
| **Cadre contractuel** à prévoir | La récupération assistée est une **obligation de moyens** (« best effort », selon le mentor), pas un droit de la banque sur les fonds. Les conditions doivent dire que Swissquote **ne peut ni bloquer, ni déplacer, ni modifier le contrôle seule**. |

### Argument central
*Swissquote fournit un logiciel et un service d'assistance à la récupération. Elle ne détient aucune clé du client, ne peut pas disposer seule des fonds, ne peut ni bloquer ni geler un paiement, et le client peut se passer d'elle. Le wallet est donc plus proche d'un **logiciel** que d'une **garde**.*

**Absence de pouvoir de blocage et « runaway ».** Swissquote ne se réserve **aucun droit de geler ou bloquer** un wallet (ce serait un pouvoir sur les fonds, et les clients ne l'accepteraient pas, selon le mentor). Elle offre à la place au client une **procédure d'urgence qu'il déclenche lui-même** : récupérer l'accès puis déplacer ses fonds sans attendre.

### La zone grise : Swissquote + un autre gardien
Dans la version actuelle, Swissquote **et** le contact de confiance (2 voix sur 3) pourraient remplacer la clé du client **sans lui**.
- **Pour que ce ne soit pas de la garde** : le contact est **choisi par le client** ; Swissquote n'agit qu'après une **vérification d'identité en personne** ; un **délai** laisse au client le temps d'être alerté et d'**annuler** ; la banque ne peut **jamais agir seule**.
- **Contre** : deux tiers, dont la banque, pourraient agir sans le client ; la qualification peut dépendre de l'influence réelle, y compris contractuelle.
- **Variante stricte** (une ligne de configuration) : Swissquote n'aide **qu'avec l'appareil du client**. Cela **supprime la zone grise**, au prix d'une récupération plus difficile si le client perd tous ses appareils (voir `MENACE.md` 3.1). **Décision prise : on garde la version actuelle (option 1)**, car elle permet à un client qui a tout perdu de récupérer avec le contact et Swissquote après vérification en personne, ce que le mentor a décrit comme le « pire cas » acceptable. La variante stricte reste un **mode « haute sécurité »** configurable, non implémenté.

## 2. Travel Rule et vérification de propriété du wallet

### Ce que dit le cadre
- **FINMA, [Guidance 02/2019 du 26 août 2019](https://www.finma.ch/en/news/2019/08/20190826-mm-kryptogwg)**, sur les paiements sur la blockchain : la FINMA applique la Travel Rule de façon plus stricte que le standard international du GAFI. Les établissements assujettis doivent respecter ces règles. **[À VÉRIFIER : statut actuel de la guidance]**
- **Pour un wallet externe (« self-hosted ») appartenant à un client déjà identifié**, l'établissement doit **vérifier que le client en est propriétaire**, par des « **moyens techniques appropriés** » (source : [Mondaq](https://www.mondaq.com/fin-tech/843804/practical-implications-of-the-new-finma-guidance-on-payments-on-the-blockchain), [21 Analytics](https://www.21analytics.ch/travel-rule-regulations/switzerland-travel-rule-regulation/)). La guidance **ne prescrit pas une technique unique** : les commentaires citent notamment la **signature d'un message avec la clé privée** ou un petit virement test.
- **Seuil** : les sources divergent. Pour la preuve de propriété, certaines parlent d'**aucun seuil** (CHF 0) ; le seuil de **CHF 1 000** cité par d'autres concerne la Travel Rule en général (art. 51a OBA-FINMA). **[À VÉRIFIER]**. Notre design **vérifie pour chaque retrait, quel que soit le montant** : c'est l'approche la plus prudente.

### Ce qu'on a construit
1. Le client se connecte à son compte Swissquote (**MOCK**).
2. Swissquote envoie un **message unique** (usage unique, expire en 5 minutes).
3. Le wallet **signe** avec le passkey du client (Touch ID).
4. Swissquote **vérifie la signature sur la blockchain** (ERC-1271, standard des comptes intelligents) : elle sait que le wallet est contrôlé par le client, **sans voir de clé**.
5. **Un retrait du compte Swissquote n'est autorisé que vers un wallet dont la propriété est prouvée.** Vers une adresse inconnue : refusé.
6. La liaison **survit à une récupération** (l'adresse ne change pas).

**Argument** : une **signature de message** est l'une des méthodes citées par les commentateurs de la guidance ; un wallet fourni par la banque rend cette vérification **automatique** et **fiable** (vérifiée sur la blockchain), pour le client comme pour la banque.

### Quand le client paie un tiers depuis son wallet
Le mentor a comparé avec le **distributeur de billets** : une fois les fonds sortis vers un wallet self-custody, la banque n'est plus « derrière l'épaule » du client. Dans notre design, Swissquote **n'intervient pas** dans les paiements du wallet (elle avertit seulement sur les adresses signalées) : elle **n'est pas l'établissement émetteur** de ces paiements. Le contrôle de la banque porte sur **ses propres transferts** (retraits depuis son compte). **[À VÉRIFIER : conséquences, notamment si le destinataire est un prestataire de services d'actifs virtuels.]**

## 3. Autres points
- **Assimilation à un intermédiaire financier (LBA)** : les sources divergent sur la situation d'un fournisseur de wallet non-custodial ; la réponse dépend de sa **participation effective aux transferts**. Dans notre design, la banque ne participe pas aux paiements du wallet. **[À VÉRIFIER]**
- **Ségrégation en cas de faillite** (loi sur les banques, art. 16, modifié par la loi DLT) : elle concerne les prestataires **custodial** ; un wallet réellement non-custodial n'est normalement pas concerné. **[À VÉRIFIER sur fedlex.admin.ch : texte exact]**
- **Responsabilité et assurance** : le mentor a indiqué qu'il n'y a **pas d'assurance** dans ce projet et que la récupération est une **obligation de moyens**.
- **Protection des données** : la banque ne conserve que l'adresse du wallet et la preuve de propriété, jamais de clé. **[À COMPLÉTER : LPD]**
- **KYC** : la vérification en personne à l'agence **réutilise** le KYC existant de la banque (simulé ici).

## 4. Position à défendre devant le jury (résumé)
1. **Swissquote ne détient aucune clé du client et ne peut pas disposer seule des fonds** (elle n'a que la clé de son rôle de gardien : 1 voix sur 3, qui ne sert qu'à aider à remplacer la clé, jamais à payer). Le wallet est donc plus proche d'un logiciel que d'une garde.
2. **Elle n'a aucun pouvoir de blocage** (elle avertit), et **le client peut récupérer sans elle**.
3. **La zone grise** (Swissquote + un autre gardien) est reconnue, atténuée (vérification en personne, délai, alerte, annulation) et peut être **supprimée** par une variante stricte.
4. **La Travel Rule est respectée** par une preuve de propriété par signature vérifiée sur la blockchain, avant tout retrait.

## 5. Sources
- FINMA, communiqué sur la Guidance 02/2019 : <https://www.finma.ch/en/news/2019/08/20190826-mm-kryptogwg>
- Mondaq, « Practical implications of the new FINMA guidance on payments on the blockchain » : <https://www.mondaq.com/fin-tech/843804/practical-implications-of-the-new-finma-guidance-on-payments-on-the-blockchain>
- 21 Analytics, Travel Rule en Suisse : <https://www.21analytics.ch/travel-rule-regulations/switzerland-travel-rule-regulation/>
- MME, « Provision of custody services for digital assets under Swiss law » : <https://www.mme.ch/en/magazine/articles/provision-of-custody-services-for-digital-assets-under-swiss-law>
- Goldblum, Travel Rule en Suisse : <https://goldblum.ch/knowledgebase/travel-rule-switzerland/>

> Aucune de ces sources n'a été lue en intégralité sur le texte officiel pendant le hackathon.
