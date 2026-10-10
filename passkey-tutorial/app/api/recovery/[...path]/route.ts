// MOCK — Coordinateur de récupération.
// Rôle : relayer les demandes et les approbations entre les gardiens, et APPLIQUER LE DÉLAI ANNULABLE.
// Il ne détient AUCUNE clé et ne peut pas signer : il ne peut que retarder ou refuser de remettre
// les signatures (pas de vol possible).
// LIMITE ASSUMÉE : ce délai est appliqué hors chaîne. Deux gardiens qui auraient déjà collecté leurs
// signatures pourraient contourner le coordinateur. En production : TimelockPolicy on-chain (ZeroDev).
import { NextRequest, NextResponse } from "next/server"
import { sepolia } from "viem/chains"
import { createPublicClient, http, Hex, recoverMessageAddress } from "viem"
import { readDB, writeDB, RecoveryRequest, Role, Payment } from "@/lib/store"
import { paymentMessage } from "@/lib/policy"

export const dynamic = "force-dynamic"
const ROLES: Role[] = ["backup", "contact", "swissquote"]
const publicClient = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_BUNDLER_URL) })
const err = (status: number, message: string) => NextResponse.json({ error: message }, { status })
const isAddr = (s: any) => typeof s === "string" && /^0x[0-9a-fA-F]{40}$/.test(s)
const isHex = (s: any) => typeof s === "string" && /^0x[0-9a-fA-F]*$/.test(s)
const lc = (s: string) => s.toLowerCase()
// Le nom du dossier client ne tient compte ni des majuscules ni des espaces (évite « Bob » ≠ « bob »)
const norm = (s: any) => String(s ?? "").trim().toLowerCase()

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    const [a, id, b] = params.path
    const db = readDB()
    const url = new URL(req.url)

    if (a === "state") {
        const username = norm(url.searchParams.get("username"))
        if (!username) return err(400, "username requis")
        const requests = Object.values(db.requests).filter((r) => r.username === username).sort((x, y) => y.createdAt - x.createdAt)
        // on ne renvoie jamais les signatures ici : seulement qui a approuvé
        const safe = requests.map((r) => ({ ...r, approvals: undefined, approvedBy: Object.keys(r.approvals) }))
        const payments = Object.values(db.payments).filter((x) => x.username === username).sort((x, y) => y.createdAt - x.createdAt)
            .map((x) => ({ ...x, approvalSignature: undefined }))
        return NextResponse.json({ now: Date.now(), registry: db.registry[username] ?? {}, setup: db.setups[username] ?? null, requests: safe, payments })
    }

    if (a === "requests" && id && b === "signatures") {
        const r = db.requests[id]
        if (!r) return err(404, "demande inconnue")
        if (r.status === "cancelled") return err(403, "Demande annulée par le propriétaire.")
        if (r.status === "executed") return err(403, "Demande déjà exécutée.")
        if (Date.now() < r.readyAt) return err(403, `Délai de sécurité en cours : encore ${Math.ceil((r.readyAt - Date.now()) / 1000)} s (le propriétaire peut annuler).`)
        const exclude = url.searchParams.get("exclude")
        const signatures = ROLES.filter((x) => x !== exclude && r.approvals[x]).map((x) => r.approvals[x])
        return NextResponse.json({ signatures })
    }
    return err(404, "route inconnue")
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
    const [a, id, b] = params.path
    const body = await req.json().catch(() => ({}))
    const db = readDB()

    // Un gardien (appareil de secours / contact) enregistre sa clé publique pour un client
    if (a === "registry") {
        const { role, address } = body
        const username = norm(body.username)
        if (!username || !["backup", "contact"].includes(role) || !isAddr(address)) return err(400, "paramètres invalides")
        db.registry[username] = { ...(db.registry[username] ?? {}), [role]: address }
        writeDB(db)
        return NextResponse.json({ ok: true })
    }

    // Le propriétaire déclare l'installation de la récupération (après l'avoir installée on-chain)
    if (a === "setup") {
        const { account, guardians, guardianAccount, delaySeconds } = body
        const username = norm(body.username)
        if (!username || !isAddr(account) || !isAddr(guardianAccount) || !ROLES.every((r) => isAddr(guardians?.[r]))) return err(400, "paramètres invalides")
        db.setups[username] = { username, account, guardians, guardianAccount, delaySeconds: Number(delaySeconds) || 120, installedAt: Date.now() }
        writeDB(db)
        return NextResponse.json({ ok: true })
    }

    // Une demande de récupération depuis un nouvel appareil
    if (a === "requests" && !id) {
        const { newValidator, enableData, callData } = body
        const username = norm(body.username)
        const setup = db.setups[username]
        if (!setup) return err(404, "Aucune récupération installée pour ce client.")
        if (!isAddr(newValidator) || !isHex(enableData) || !isHex(callData)) return err(400, "paramètres invalides")
        const now = Date.now()
        const r: RecoveryRequest = {
            id: Math.random().toString(36).slice(2, 10), username, target: setup.account,
            newValidator, enableData, callData, createdAt: now, readyAt: now + setup.delaySeconds * 1000,
            status: "pending", approvals: {}
        }
        db.requests[r.id] = r
        writeDB(db)
        return NextResponse.json({ id: r.id, readyAt: r.readyAt })
    }

    // --- Gros paiements : confirmation par le SECOND APPAREIL du client (appareil de secours) ---
    if (a === "payments") {
        if (!id) {
            const { to, amountUnits, amountLabel } = body
            const username = norm(body.username)
            const setup = db.setups[username]
            if (!setup) return err(400, "Installe d'abord la récupération : l'appareil de secours est requis pour les gros paiements.")
            if (!isAddr(to) || !/^[0-9]+$/.test(String(amountUnits)) || !amountLabel) return err(400, "paramètres invalides")
            const now = Date.now()
            const pay: Payment = { id: Math.random().toString(36).slice(2, 8), username, to, amountUnits: String(amountUnits), amountLabel: String(amountLabel), createdAt: now, expiresAt: now + 5 * 60 * 1000, status: "pending" }
            db.payments[pay.id] = pay
            writeDB(db)
            return NextResponse.json({ id: pay.id })
        }
        const pay = db.payments[id]
        if (!pay) return err(404, "paiement inconnu")
        if (b === "approve") {
            if (pay.status !== "pending") return err(403, "Paiement plus en attente.")
            if (Date.now() > pay.expiresAt) return err(403, "Demande expirée.")
            const setup = db.setups[pay.username]
            const signature = body.signature
            if (!setup || !isHex(signature)) return err(400, "paramètres invalides")
            // la signature doit venir de l'appareil de secours enregistré, et porter sur CE paiement précis
            const who = await recoverMessageAddress({ message: paymentMessage(pay.id, pay.to, pay.amountLabel), signature: signature as Hex }).catch(() => null)
            if (!who || lc(who) !== lc(setup.guardians.backup)) return err(403, "Signature invalide : ce n'est pas l'appareil de secours de ce client.")
            pay.status = "approved"; pay.approvalSignature = signature
            writeDB(db)
            return NextResponse.json({ ok: true })
        }
        if (b === "refuse") { if (pay.status === "pending") { pay.status = "refused"; writeDB(db) } return NextResponse.json({ ok: true }) }
        if (b === "done") { pay.status = "done"; pay.txHash = body.txHash; writeDB(db); return NextResponse.json({ ok: true }) }
        return err(404, "route inconnue")
    }

    const r = id ? db.requests[id] : undefined
    if (a === "requests" && id && !r) return err(404, "demande inconnue")

    if (a === "requests" && r && b === "approve") {
        const { role, signature } = body
        if (!ROLES.includes(role) || !isHex(signature)) return err(400, "paramètres invalides")
        if (r.status !== "pending") return err(403, "Demande plus active.")
        r.approvals[role as Role] = signature
        writeDB(db)
        return NextResponse.json({ ok: true, approvedBy: Object.keys(r.approvals) })
    }

    // Annulation par le propriétaire : prouvée par une signature de son passkey (ERC-1271, vérifiée on-chain)
    if (a === "requests" && r && b === "cancel") {
        const { message, signature } = body
        if (r.status !== "pending") return err(403, "Demande plus active.")
        if (message !== `Annuler la récupération ${r.id}` || !isHex(signature)) return err(400, "message invalide")
        try {
            const ok = await publicClient.verifyMessage({ address: r.target as Hex, message, signature: signature as Hex })
            if (!ok) return err(403, "Signature du propriétaire invalide.")
        } catch (e: any) { return err(403, "Vérification de la signature impossible : " + String(e?.shortMessage ?? e?.message).slice(0, 200)) }
        r.status = "cancelled"
        writeDB(db)
        return NextResponse.json({ ok: true })
    }

    if (a === "requests" && r && b === "executed") {
        r.status = "executed"; r.txHash = body.txHash
        writeDB(db)
        return NextResponse.json({ ok: true })
    }
    return err(404, "route inconnue")
}
