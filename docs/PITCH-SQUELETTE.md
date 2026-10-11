# Squelette du pitch (≈ 8 min, en direct)

> Des **repères**, pas un texte à réciter. Pour les réponses aux questions : `FICHE-PITCH.md`. Ordre : **1.** screens (toi) → **2.** légal (toi) → **3.** business (binôme) → **4.** architecture (toi) → **5.** conclusion.

| Partie | Qui | Durée |
|---|---|---|
| 0. Accroche | toi | 0:30 |
| 1. Ce qui marche (screens) | toi | 2:30 |
| 2. Légal | toi | 1:30 |
| 3. Business | binôme | 1:30 |
| 4. Architecture | toi | 1:30 |
| 5. Conclusion | toi | 0:30 |

---

## 0. Accroche (30 s)
- **Le problème** : « Un client Swissquote qui veut garder lui-même ses cryptos doit **sortir de la banque** vers un wallet externe, **sans filet** : s'il perd sa clé, tout est perdu. »
- **L'idée** : « *Leurs clés, leur contrôle, à un pas de leur compte Swissquote.* »
- **Annonce du plan** : « On vous montre ce qui marche, l'aspect légal, le business, puis comment c'est construit. »

## 1. Ce qui marche : les screens (2 min 30)
**Fil rouge : créer → payer → perdre → récupérer.** Montre **6 à 8 écrans**, une phrase par écran.

| # | Écran | Ce que tu dis |
|---|---|---|
| 1 | Création du wallet, « 🔒 Protégé par Touch ID » | « Pas de phrase secrète : Touch ID. La clé reste dans la puce de l'appareil. » |
| 2 | Les 3 gardiens, « Récupération activée ✅ » | « Trois gardiens, **deux sur trois** suffisent. Swissquote en est **un** : seule, elle ne peut rien. » |
| 3 | Résumé d'un paiement (petit, puis gros) | « Résumé clair et simulation avant de signer. Petit montant : Touch ID. Gros : **plus un second appareil**. » |
| 4 | Adresse signalée (avertissement rouge) | « Swissquote **avertit mais ne bloque pas** : le client reste maître. » |
| 5 | Compte Swissquote : preuve de propriété | « Le wallet signe un message, Swissquote le fait vérifier sur la blockchain, **sans voir de clé**. » |
| 6 | Récupération : alerte + compte à rebours, attaquant refusé | « L'ancien appareil est **alerté** et peut annuler. Un attaquant avec SMS et e-mail est **refusé**. » |
| 7 | « Récupération terminée » puis wallet retrouvé | « Même adresse, mêmes fonds, **nouvelle clé**. » |
| 8 | « ⛔ Appareil obsolète » | « Et l'ancien appareil est **bloqué par la blockchain**. » |

**Bonus (30 s, une seule phrase)** : « Les frais sont payés par Swissquote avec un **quota anti-abus**, puis par le client **en USDC** ; et le wallet vérifie que le **code d'une application n'a pas changé**. »

### « Ce qui marche pas » (à dire toi-même, sans attendre qu'on te le demande)
- Le **délai** de sécurité est appliqué par **notre serveur**, pas par la blockchain.
- La règle **petit / gros montant** est appliquée par **l'application**.
- Le **premier envoi d'un wallet neuf** coûte cher en frais (≈ 4 USDC), donc il est **offert** par Swissquote.
- Les services se parlent **sans canal sécurisé** (démo en local).
- Tout ce qui est **orange** est **simulé** : la banque, l'agence, le gardien Swissquote, le registre de dApps.
> Phrase de transition : « On a séparé ce qui est **réel** de ce qui est **simulé** : tout est étiqueté. »

## 2. Légal (1 min 30), toi
- **Critère** : « La garde dépend de **qui peut déplacer les fonds**. Si la banque peut le faire seule, c'est de la garde, avec les règles d'une banque. »
- **Notre réponse** : Swissquote n'a **aucune clé du client**, **une voix sur trois**, **aucun pouvoir de blocage**, et le client peut récupérer **sans elle**. « Plus proche d'un **logiciel** que d'une garde. »
- **La zone grise** : « Swissquote **+ le contact** peuvent remplacer la clé sans le client : on l'**assume** et on l'atténue : vérification **en personne**, **délai** avec alerte et annulation. Mode « haute sécurité » prévu. »
- **Pas de gel** : « Un droit de blocage serait un pouvoir sur les fonds. À la place : **procédure d'urgence côté client** : récupérer, puis déplacer ses fonds. »
- **Travel Rule** : « La FINMA exige de vérifier la propriété d'un wallet externe : notre **signature vérifiée sur la blockchain** l'automatise. »
- **Précaution** : « Ce n'est pas un avis juridique : à confirmer avec un juriste. »
> Transition : « Voyons maintenant ce que ça apporte à Swissquote. » → **binôme**.

## 3. Business (1 min 30), binôme
Repères à lui donner :
- **Problème** : Swissquote **perd** les clients qui veulent le self-custody.
- **Marché** : **23 % des Suisses** possèdent des cryptos (Bitpanda 2024) ; mais **80 à 90 % des clients** ne connaissent pas les wallets : **option complémentaire**.
- **Revenus** : **rétention**, **service de récupération payant**, **abonnement « gas station »** (idée du mentor). Un % des actifs seul est **négligeable**.
- **Coûts et risques** : **pas d'assurance** ; frais **plafonnés** ; le premier envoi d'un wallet neuf (≈ 4 USDC) est un **coût d'activation** assumé ; développement **léger**, **aucune cryptographie maison**.
- **Conclusion** : « **Risque faible** : la banque n'a aucune clé du client et ne peut rien déplacer seule. »
- **Honnêteté** : chiffres du modèle = **hypothèses**, signalées comme telles.
> Transition : « Voyons comment c'est construit. »

## 4. Architecture (1 min 30), toi
**Slide : le schéma à 7 boîtes** (vert = réel, orange = simulé, bleu = externe).
- « Le client signe avec **Touch ID** (sa clé est dans son appareil). »
- « La **blockchain** porte les règles : le **2 sur 3** et le **remplacement de clé**. »
- « Les **gardiens** : appareil de secours, contact, Swissquote. Ils passent par un **coordinateur** qui applique le **délai annulable**, et n'a **aucune clé**. »
- « **ZeroDev** fournit la technologie du compte et paie les frais, mais **ne peut pas signer** à la place du client. »
- « **Swissquote est un processus séparé** avec son propre stockage : l'app n'a jamais accès à sa clé. »
**Slide 2 (si le temps) : « qui contrôle quoi »** : « Les gardiens peuvent **remplacer la clé**, jamais **déplacer les fonds**. »
**Une phrase sur la cryptographie** : « **Aucun algorithme maison** : passkeys, ECDSA, signatures typées, tout vient de bibliothèques établies. »
**Une phrase sur l'IA** : « Le code a été écrit avec **Claude Code** (déclaré) ; nous avons conçu, testé avec de **vrais passkeys** et validé les cas d'attaque. »

## 5. Conclusion (30 s)
1. **Ça marche de bout en bout** : créer, payer, perdre, récupérer, sur une vraie blockchain de test.
2. **Swissquote seule ne peut rien**, et un attaquant avec SMS et e-mail est refusé.
3. **Tout est honnête** : réel, simulé et limites sont écrits.
- **Phrase finale** : « *Leurs clés, leur contrôle, à un pas de leur compte Swissquote.* » Puis : « Nous sommes prêts pour vos questions. »

---

## Si on te donne moins de temps
- **5 min** : coupe les bonus, les écrans 4 et 5, le slide « qui contrôle quoi ».
- **3 min** : accroche, écrans 1, 2, 6, 7, **une** phrase légale, **une** phrase business, le schéma à 7 boîtes.

## Si on t'interrompt avec une question
Réponds avec **fait → raison → preuve** (voir `FICHE-PITCH.md`), puis reprends : « …pour revenir à l'architecture… ».

## Avant de passer (checklist 5 min)
- [ ] Les **screens** sont dans l'ordre et lisibles (zoom suffisant, aucun secret visible).
- [ ] Tu connais **la phrase d'ouverture et la phrase finale** par cœur.
- [ ] Tu sais qui prend la parole à chaque **transition**.
- [ ] Tu as **sous les yeux** `FICHE-PITCH.md`.
- [ ] Le **dépôt** est public et le lien est dans la soumission.
