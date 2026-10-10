// « Gas station » (MOCK) : politique de sponsoring des frais, appliquée AVANT le paymaster.
//
// Qui paie : Swissquote (via le paymaster). Comment on évite l'abus (brief, bonus « gasless ») :
//   1. quota quotidien PAR WALLET (un wallet ne peut pas vider le budget à lui seul) ;
//   2. plafond quotidien GLOBAL (limite la perte si quelqu'un crée des wallets en série) ;
//   3. plafond de gaz PAR OPÉRATION (une opération démesurée est refusée) ;
//   4. refus de toute autre requête que « sponsoriser une opération utilisateur ».
// En production : abonnement par client (ex. 100 opérations par mois, idée du mentor), wallets liés à un
// client Swissquote (KYC), et politique appliquée côté ZeroDev (webhook) avec la clé gardée côté serveur.
// LIMITE ASSUMÉE : ici l'app passe par ce service, mais la politique du tableau de bord ZeroDev reste
// « tout sponsoriser » (le webhook ZeroDev ne peut pas joindre un serveur local) : un client modifié
// pourrait contourner ce service. Ce n'est donc pas une barrière de sécurité en production.
import fs from "node:fs"
import path from "node:path"

const FILE = path.join(process.cwd(), ".data", "gas.json")
export const QUOTA_PER_WALLET = Number(process.env.GAS_QUOTA_PER_WALLET_DAILY ?? 40)
export const QUOTA_GLOBAL = Number(process.env.GAS_QUOTA_GLOBAL_DAILY ?? 500)
export const MAX_GAS_PER_OP = Number(process.env.GAS_MAX_PER_OP ?? 5_000_000)

type Day = { global: number; refused: number; paidInUsdc?: number; wallets: Record<string, number> }
type DB = { days: Record<string, Day> }

const read = (): DB => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")) } catch { return { days: {} } } }
const write = (db: DB) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db, null, 2)) }
const today = () => new Date().toISOString().slice(0, 10)

export function usage(address?: string) {
    const d = read().days[today()] ?? { global: 0, refused: 0, wallets: {} }
    return {
        day: today(), walletQuota: QUOTA_PER_WALLET, globalQuota: QUOTA_GLOBAL, maxGasPerOp: MAX_GAS_PER_OP,
        walletUsed: address ? d.wallets[address.toLowerCase()] ?? 0 : undefined, globalUsed: d.global, refusedToday: d.refused, paidInUsdcToday: d.paidInUsdc ?? 0
    }
}

// Compte une opération dont le CLIENT a payé les frais en USDC (aucun coût pour Swissquote, aucun quota)
export function countPaid(_sender: string) {
    const db = read(), key = today()
    const d = (db.days[key] ??= { global: 0, refused: 0, wallets: {} })
    d.paidInUsdc = (d.paidInUsdc ?? 0) + 1
    write(db)
}

// Réserve une opération sponsorisée pour ce wallet, ou explique le refus
export function tryConsume(sender: string): { ok: true } | { ok: false; reason: string } {
    const db = read(), key = today(), s = sender.toLowerCase()
    const d = (db.days[key] ??= { global: 0, refused: 0, wallets: {} })
    const refuse = (reason: string) => { d.refused += 1; write(db); return { ok: false as const, reason } }
    if (d.global >= QUOTA_GLOBAL) return refuse(`Budget de frais du jour épuisé pour tous les clients (${QUOTA_GLOBAL} opérations). Réessaie demain.`)
    if ((d.wallets[s] ?? 0) >= QUOTA_PER_WALLET) return refuse(`Quota de transactions gratuites atteint pour ce wallet (${QUOTA_PER_WALLET} par jour). Les frais ne sont plus pris en charge aujourd'hui.`)
    d.wallets[s] = (d.wallets[s] ?? 0) + 1
    d.global += 1
    write(db)
    return { ok: true }
}
