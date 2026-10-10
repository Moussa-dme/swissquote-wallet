"use client"
// Page d'un GARDIEN : « appareil de secours » ou « contact de confiance ».
// MOCK : la clé du gardien est générée et gardée dans le stockage de CE navigateur.
// En production : un passkey / une clé matérielle sur l'appareil de secours, une app pour le contact.
import React, { useCallback, useEffect, useState } from "react"
import { Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { paymentMessage } from "@/lib/policy"
import {
    Guardians, ROLE_LABEL, addressOf, approveRecovery, coord, errText, finalizeRecovery, fmtAddr, newGuardianKey
} from "@/lib/recovery"
import { Btn, Card, Input, MockBadge, Msg, countdown, useNow } from "../components/ui"

type GRole = "backup" | "contact"
const keyName = (role: GRole) => `sq-guardian-key-${role}`

export default function GuardianPage() {
    const [role, setRole] = useState<GRole>("backup")
    const [username, setUsername] = useState("")
    const [pk, setPk] = useState<Hex | null>(null)
    const [state, setState] = useState<any>(null)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const now = useNow()

    // clé locale du gardien (créée au premier usage)
    useEffect(() => {
        try {
            let k = localStorage.getItem(keyName(role)) as Hex | null
            if (!k) { k = newGuardianKey(); localStorage.setItem(keyName(role), k) }
            setPk(k)
            setUsername(localStorage.getItem("sq-guardian-username") ?? "")
        } catch { setMsg({ kind: "err", text: "Le stockage du navigateur est bloqué : impossible de garder la clé du gardien." }) }
    }, [role])

    const refresh = useCallback(async () => {
        if (!username) return
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (r.ok) setState(r.data)
    }, [username])
    useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t) }, [refresh])

    const myAddress = pk ? addressOf(pk) : ""
    const setup = state?.setup
    const registered = state?.registry?.[role]?.toLowerCase() === myAddress.toLowerCase()
    const guardians: Guardians | null = setup?.guardians ?? null
    const imInSetup = guardians && guardians[role]?.toLowerCase() === myAddress.toLowerCase()

    const register = async () => {
        setBusy("reg"); setMsg(null)
        try { localStorage.setItem("sq-guardian-username", username) } catch {}
        const r = await coord("registry", { username, role, address: myAddress })
        setMsg(r.ok ? { kind: "ok", text: `Cet appareil est enregistré comme « ${ROLE_LABEL[role]} » de ${username}. Le propriétaire peut maintenant installer la récupération.` } : { kind: "err", text: r.data.error })
        refresh(); setBusy("")
    }

    const approve = async (req: any) => {
        if (!pk || !guardians) return
        setBusy("a" + req.id); setMsg(null)
        try {
            const reqFull = await fetchCallData(req.id)
            const signature = await approveRecovery(guardians, pk, reqFull as Hex)
            const r = await coord(`requests/${req.id}/approve`, { role, signature })
            setMsg(r.ok ? { kind: "ok", text: "Approbation enregistrée (1 voix). Il en faut 2 sur 3." } : { kind: "err", text: r.data.error })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    // le callData est dans la demande ; l'état public ne le renvoie pas toujours, on le relit
    const fetchCallData = async (id: string) => {
        const r = state.requests.find((x: any) => x.id === id)
        return r.callData
    }

    const finalize = async (req: any) => {
        if (!pk || !guardians) return
        setBusy("f" + req.id); setMsg(null)
        try {
            const sigs = await coord(`requests/${req.id}/signatures?exclude=${role}`)
            if (!sigs.ok) throw new Error(sigs.data.error)
            if (sigs.data.signatures.length < 1) throw new Error("Il faut l'approbation d'au moins un AUTRE gardien avant de finaliser.")
            const res = await finalizeRecovery(guardians, pk, req.callData, sigs.data.signatures)
            await coord(`requests/${req.id}/executed`, { txHash: res.hash })
            setMsg(res.success ? { kind: "ok", text: "Récupération exécutée sur la blockchain : le wallet est maintenant contrôlé par le nouveau passkey." } : { kind: "err", text: "L'opération a été refusée par la blockchain." })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    const requests: any[] = state?.requests ?? []
    const payments: any[] = (state?.payments ?? []).filter((x: any) => x.status === "pending" && x.expiresAt > now)

    // Gros paiement : l'appareil de secours confirme (ou refuse) un paiement précis en le signant
    const confirmPayment = async (pay: any) => {
        if (!pk) return
        setBusy("p" + pay.id); setMsg(null)
        try {
            const signature = await privateKeyToAccount(pk).signMessage({ message: paymentMessage(pay.id, pay.to, pay.amountLabel) })
            const r = await coord(`payments/${pay.id}/approve`, { signature })
            setMsg(r.ok ? { kind: "ok", text: "Paiement confirmé depuis l'appareil de secours. Le propriétaire peut le signer avec son passkey." } : { kind: "err", text: r.data.error })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }
    const refusePayment = async (pay: any) => { await coord(`payments/${pay.id}/refuse`, {}); refresh() }

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto space-y-4">
                <h1 className="text-3xl font-semibold text-center">Gardien du wallet</h1>

                <Card title="Qui es-tu ?">
                    <div className="flex gap-2">
                        {(["backup", "contact"] as GRole[]).map((r) => (
                            <button key={r} onClick={() => setRole(r)} className={`flex-1 px-3 py-2 rounded-lg ${role === r ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-200"}`}>{ROLE_LABEL[r]}</button>
                        ))}
                    </div>
                    <Input placeholder="Nom d'utilisateur du propriétaire" value={username} onChange={(e) => setUsername(e.target.value)} />
                    <p className="text-sm">Clé de ce gardien : <code>{fmtAddr(myAddress)}</code> <MockBadge>MOCK : clé stockée dans ce navigateur</MockBadge></p>
                    <Btn onClick={register} busy={busy === "reg"} disabled={!username || !pk} tone={registered ? "gray" : "blue"}>
                        {registered ? "Déjà enregistré ✓ (ré-enregistrer)" : "M'enregistrer comme gardien"}
                    </Btn>
                </Card>

                {setup && !imInSetup && registered && (
                    <Msg kind="err">Cette clé n'est pas celle utilisée à l'installation de la récupération (une autre clé a été enregistrée). Elle ne comptera pas parmi les gardiens.</Msg>
                )}

                {role === "backup" && (
                    <Card title="Confirmation des gros paiements" tone={payments.length ? "warn" : "default"}>
                        {!setup && <p className="text-sm text-gray-400">Disponible une fois la récupération installée.</p>}
                        {setup && payments.length === 0 && <p className="text-sm text-gray-400">Aucun gros paiement en attente de confirmation.</p>}
                        {payments.map((pay) => (
                            <div key={pay.id} className="space-y-2">
                                <p className="text-sm">
                                    <b>{username}</b> veut envoyer <b>{pay.amountLabel} USDC</b> à <code>{fmtAddr(pay.to)}</code>.
                                    C'est un <b>gros montant</b> : ton passkey ne suffit pas, ton appareil de secours doit confirmer.
                                </p>
                                <Msg kind="info">Confirme seulement si c'est bien le propriétaire qui fait ce paiement (appelle-le si tu n'es pas sûr). Dans le doute, refuse.</Msg>
                                <div className="flex gap-2">
                                    <Btn tone="green" onClick={() => confirmPayment(pay)} busy={busy === "p" + pay.id} disabled={!imInSetup}>Confirmer ce paiement</Btn>
                                    <Btn tone="red" onClick={() => refusePayment(pay)}>Refuser</Btn>
                                </div>
                            </div>
                        ))}
                    </Card>
                )}

                <Card title="Demandes de récupération">
                    {!setup && <p className="text-sm text-gray-400">La récupération n'est pas encore installée pour « {username || "…"} ».</p>}
                    {setup && requests.length === 0 && <p className="text-sm text-gray-400">Aucune demande pour l'instant.</p>}
                    {requests.map((req) => {
                        const mine = req.approvedBy.includes(role)
                        const others = req.approvedBy.filter((r: string) => r !== role).length
                        const waiting = req.status === "pending" && now < req.readyAt
                        return (
                            <Card key={req.id} title={`Demande ${req.id} — ${req.status === "pending" ? "en cours" : req.status === "executed" ? "exécutée" : "annulée"}`}>
                                <p className="text-sm">
                                    Quelqu'un demande à <b>remplacer la clé du propriétaire</b> du wallet <code>{fmtAddr(req.target)}</code> par un nouveau passkey (<code>{fmtAddr(req.newValidator)}</code>).
                                    Les fonds ne bougent pas ; seule la clé qui contrôle le wallet change.
                                </p>
                                <p className="text-sm">Approbations : <b>{req.approvedBy.length}/3</b> ({req.approvedBy.map((r: string) => ROLE_LABEL[r as keyof typeof ROLE_LABEL]).join(", ") || "aucune"})</p>
                                {req.status === "pending" && (
                                    <>
                                        <p className="text-sm">{waiting ? <>⏳ Délai de sécurité : <b>{countdown(req.readyAt - now)}</b></> : "✅ Délai de sécurité écoulé."}</p>
                                        <Msg kind="info">Vérifie par un autre canal que c'est bien le propriétaire qui demande cette récupération avant d'approuver.</Msg>
                                        <div className="flex gap-2">
                                            <Btn onClick={() => approve(req)} busy={busy === "a" + req.id} disabled={!imInSetup || mine} tone="green">{mine ? "Approuvé ✓" : "Approuver (1 voix)"}</Btn>
                                            <Btn onClick={() => finalize(req)} busy={busy === "f" + req.id} disabled={!imInSetup || waiting || others < 1} tone="purple">Finaliser (je signe et j'envoie)</Btn>
                                        </div>
                                        <p className="text-xs text-gray-400">« Finaliser » exige l'approbation d'un autre gardien et la fin du délai.</p>
                                    </>
                                )}
                            </Card>
                        )
                    })}
                </Card>
                {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
            </div>
        </main>
    )
}
