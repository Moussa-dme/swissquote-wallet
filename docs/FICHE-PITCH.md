# Fiche de pitch (une page)

## Le pitch en 5 phrases
1. **Le problème** : « Un client Swissquote qui veut garder lui-même ses cryptos doit sortir de la banque vers un wallet externe, sans filet : s'il perd sa clé, tout est perdu. »
2. **L'idée** : « Leurs clés, leur contrôle, à un pas de leur compte Swissquote. »
3. **La preuve** : « Création, paiement, perte du téléphone, récupération : tout marche de bout en bout, sur une vraie blockchain de test. »
4. **Le point fort** : « Swissquote seule ne peut rien : une voix sur trois, imposée par la blockchain. Un attaquant qui a le numéro et l'e-mail est refusé. »
5. **L'honnêteté** : « Ce qui est simulé est étiqueté MOCK, et nos limites sont écrites. »

## La structure qui marche pour toute réponse
**Le fait → la raison → la preuve.**

## Les réponses clés
| Question | Réponse courte |
|---|---|
| **Où est la clé du client ?** | Dans la **puce de son appareil** (passkey), protégée par Touch ID. Elle n'en sort jamais. Swissquote ne la voit pas. |
| **Swissquote peut-elle déplacer les fonds ?** | **Non.** Elle n'est qu'**un gardien sur trois** ; seule, elle est refusée par la blockchain (testé). Les gardiens peuvent **remplacer la clé**, jamais ordonner un paiement. |
| **Swissquote + le contact peuvent récupérer sans le client : zone grise ?** | **Oui, on l'assume.** Atténuée par : vérification **en personne** (jamais SMS ou e-mail), **délai de sécurité** avec **alerte et annulation**, contact **choisi par le client**. Mode « haute sécurité » prévu (Swissquote seulement avec l'appareil du client). |
| **Où interviennent les 60 secondes ?** | C'est le **délai de sécurité** entre la demande et la possibilité de finaliser : la **fenêtre d'annulation**. 48 h en production. Réglable à l'installation. On ne peut plus annuler une fois finalisé. |
| **Téléphone volé + numéro + e-mail ?** | Touch ID d'abord. Puis : **petits paiements plafonnés**, **second appareil pour les gros**, **SMS / e-mail refusés** par Swissquote pour la récupération, propriétaire **alerté** et capable d'annuler. |
| **Et si Swissquote disparaît ?** | **Appareil de secours + contact** suffisent (démontré). |
| **Pourquoi Swissquote ne gèle pas un compte volé ?** | Un droit de blocage serait un **pouvoir sur les fonds** (donc de la garde) et les clients n'en veulent pas. À la place : le client **récupère puis déplace ses fonds tout de suite** (procédure d'urgence, « runaway »). |
| **C'est de la garde ?** | Critère : **qui peut déplacer les fonds**. Swissquote n'a **aucune clé** et **ne peut rien déplacer seule**, ne peut ni bloquer ni geler : plus proche d'un **logiciel**. *(Pas un avis juridique ; références à vérifier.)* |
| **Travel Rule ?** | Preuve de propriété : le wallet **signe un message**, Swissquote **vérifie la signature sur la blockchain** sans voir de clé ; retrait **autorisé seulement vers un wallet vérifié**. |
| **Qu'est-ce qui est simulé ?** | Le gardien Swissquote, l'agence, les comptes clients, le registre de dApps, la gas station, les clés de l'appareil de secours et du contact. **La sécurité de la clé du client n'en dépend pas.** |
| **Qui a écrit le code ?** | Écrit avec **Claude Code** (déclaré). Nous : conception, tests avec de vrais passkeys, validation des cas d'attaque. |
| **Comment Swissquote gagne ?** | **Rétention** des clients qui partaient, **service de récupération payant**, **abonnement « gas station »**. Risque faible : aucune clé, aucune assurance. |
| **Les frais ?** | Payés par Swissquote avec **quota** (anti-abus) ; au-delà, **le client paie en USDC**. |
| **Les dApps ?** | Liste approuvée + **empreinte du code vérifiée par le wallet** : une même adresse ne garantit pas le même code. |

## Les limites à dire sans qu'on te les arrache
- Le **délai** est appliqué par **notre serveur**, pas par la blockchain (production : sur la blockchain).
- La règle **petit / gros montant** est appliquée par l'**application** (production : par le wallet).
- Les **passkeys** peuvent être synchronisés par Apple / Google.
- Les **clés de l'appareil de secours et du contact** sont dans le navigateur (production : passkey ou clé matérielle).

## Si tu ne sais pas répondre
> « Bonne question : ce n'est pas couvert par notre prototype. On l'a noté comme limite, voici ce qu'on ferait en production… »

Ne devine jamais ; dire ce qu'on ne sait pas est mieux vu qu'une réponse fausse.
