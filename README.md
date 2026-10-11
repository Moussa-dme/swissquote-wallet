# Swissquote Self-Custody Wallet

*Hackathon BSA EPFL 2026, track Swissquote.* **Leurs clés, leur contrôle, à un pas de leur compte Swissquote.**

Un wallet crypto dont le client garde les clés (passkey, Touch ID), avec une **récupération par gardiens 2 sur 3** où **Swissquote seule ne peut rien faire**, des paiements contrôlés selon le montant, et une liaison au compte Swissquote qui automatise la preuve de propriété (Travel Rule). Tout tourne sur **Sepolia** (réseau de test, aucun argent réel).

## À lire
| Document | Contenu |
|---|---|
| [`docs/PROJET.md`](docs/PROJET.md) | **Description complète du projet** (garde, menace, architecture, authentification, récupération, bonus, éléments simulés, outils d'IA) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Schémas : composants, récupération, paiement, liaison de compte |
| [`docs/MENACE.md`](docs/MENACE.md) | Modèle de menace et limites assumées |
| [`docs/LEGAL.md`](docs/LEGAL.md) | Garde et Travel Rule |
| [`docs/BUSINESS.md`](docs/BUSINESS.md) | Business case |
| [`docs/DEMARRAGE.md`](docs/DEMARRAGE.md) | **Installer et tester la démo pas à pas** |
| [`docs/PITCH-SQUELETTE.md`](docs/PITCH-SQUELETTE.md) | Squelette du pitch en direct (≈ 8 min) |
| [`docs/FICHE-PITCH.md`](docs/FICHE-PITCH.md) | Fiche d'une page : pitch en 5 phrases et réponses clés |
| [`docs/SCRIPT-VIDEO.md`](docs/SCRIPT-VIDEO.md) | Script de la vidéo de démo, minute par minute |
| [`docs/GUIDE-DU-CODE.md`](docs/GUIDE-DU-CODE.md) | **Comprendre le code** : les 8 mécanismes, où est la preuve, questions du jury |
| [`swissquote-track.md`](swissquote-track.md) | Consignes officielles du track |

## Ce qui est réel, ce qui est simulé
Tout élément simulé est marqué **MOCK** dans le code et l'interface. Tableau complet : `docs/PROJET.md`, section 10.

## Lancer la démo
Voir [`docs/DEMARRAGE.md`](docs/DEMARRAGE.md). En bref : `cd passkey-tutorial && npm install && npm run dev` (application, port 3000), et dans un second terminal `cd mock-swissquote && npm install && node --env-file=../passkey-tutorial/.env.local server.mjs` (faux serveur Swissquote, port 4000). Il faut un fichier `passkey-tutorial/.env.local` (modèle : `.env.example`).

## Structure du dépôt
- `passkey-tutorial/` : l'application web (Next.js) et le coordinateur de récupération (routes `app/api/recovery`).
- `mock-swissquote/` : **MOCK**, faux serveur Swissquote (processus séparé, stockage propre).
- `spike/` : scripts de test sur la blockchain (récupération, liaison, paiements).
- `docs/` : documentation.
- `AGENTS.md` : contexte du projet et journal de progression.

## Technologies (aucune cryptographie maison)
Compte intelligent **Kernel** (ZeroDev, ERC-4337), **passkeys** (WebAuthn), multisig pondéré ZeroDev, paymaster ZeroDev, `viem`, Next.js. Réseau : Sepolia.
