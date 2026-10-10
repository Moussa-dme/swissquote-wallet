// Stockage du coordinateur de récupération (MOCK : simple fichier JSON local, côté serveur uniquement).
import fs from "node:fs"
import path from "node:path"

export type Role = "backup" | "contact" | "swissquote"
export type RecoveryRequest = {
    id: string
    username: string
    target: string // compte du client à récupérer
    newValidator: string
    enableData: string
    callData: string
    createdAt: number
    readyAt: number // fin du délai (MOCK : appliqué par le coordinateur, pas sur la blockchain)
    status: "pending" | "cancelled" | "executed"
    approvals: Partial<Record<Role, string>>
    txHash?: string
}
export type Setup = {
    username: string
    account: string
    guardians: Record<Role, string>
    guardianAccount: string
    delaySeconds: number
    installedAt: number
}
type DB = {
    registry: Record<string, Partial<Record<"backup" | "contact", string>>>
    setups: Record<string, Setup>
    requests: Record<string, RecoveryRequest>
}

const FILE = path.join(process.cwd(), ".data", "coordinator.json")
export function readDB(): DB {
    try { return JSON.parse(fs.readFileSync(FILE, "utf8")) } catch { return { registry: {}, setups: {}, requests: {} } }
}
export function writeDB(db: DB) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
}
