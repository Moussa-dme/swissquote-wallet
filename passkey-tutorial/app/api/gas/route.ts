// MOCK — Gas station : proxy entre l'app et le paymaster ZeroDev, avec politique anti-abus (voir lib/gas.ts).
// L'adresse du paymaster reste côté serveur ; le navigateur ne parle qu'à ce service.
import { NextRequest, NextResponse } from "next/server"
import { MAX_GAS_PER_OP, tryConsume } from "@/lib/gas"

export const dynamic = "force-dynamic"
const UPSTREAM = process.env.NEXT_PUBLIC_PAYMASTER_URL ?? ""
const rpcError = (id: unknown, message: string) => NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message } })
const num = (v: unknown) => { try { return v ? Number(BigInt(v as string)) : 0 } catch { return 0 } }

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) return rpcError(null, "Requête invalide.")
    // seule la demande de sponsoring d'une opération est autorisée
    if (body.method !== "zd_sponsorUserOperation") return rpcError(body.id, "Gas station : méthode non autorisée.")
    const sender: string | undefined = body.params?.[0]?.userOp?.sender
    if (!sender || !/^0x[0-9a-fA-F]{40}$/.test(sender)) return rpcError(body.id, "Gas station : opération sans expéditeur valide.")

    const verdict = tryConsume(sender)
    if (!verdict.ok) return rpcError(body.id, verdict.reason)

    const upstream = await fetch(UPSTREAM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    const out = await upstream.json().catch(() => ({ jsonrpc: "2.0", id: body.id, error: { code: -32000, message: "Réponse illisible du paymaster." } }))
    // plafond de gaz par opération, vérifié sur la réponse du paymaster
    const r = out?.result
    if (r) {
        const total = num(r.callGasLimit) + num(r.verificationGasLimit) + num(r.preVerificationGas) + num(r.paymasterVerificationGasLimit) + num(r.paymasterPostOpGasLimit)
        if (total > MAX_GAS_PER_OP) return rpcError(body.id, `Gas station : opération trop gourmande (${total} unités de gaz, plafond ${MAX_GAS_PER_OP}). Sponsoring refusé.`)
    }
    return NextResponse.json(out)
}
