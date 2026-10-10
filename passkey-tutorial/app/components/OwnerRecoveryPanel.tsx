"use client"
// Panneau du PROPRIÉTAIRE (appareil actuel, protégé par passkey) :
//  1. installer la récupération (désigner les gardiens 2-sur-3),
//  2. voir une récupération en cours et l'ANNULER (signature par passkey) pendant le délai de sécurité.
import React, { useCallback, useEffect, useState } from "react"
import {
    Guardians, SWISSQUOTE_URL, ROLE_LABEL, buildInstallCallData, coord, errText, fmtAddr, guardianAccountAddress
} from "@/lib/recovery"
import { Btn, Card, MockBadge, Msg, countdown, useNow } from "./ui"

type Props = { username: string; accountAddress: string; ready: boolean; kernelClient: any; kernelAccount: any }

export default function OwnerRecoveryPanel({ username, accountAddress, ready, kernelClient, kernelAccount }: Props) {
    const [state, setState] = useState<any>(null)
    const [delay, setDelay] = useState(120)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const now = useNow()

    const refresh = useCallback(async () => {
        if (!username) return
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (r.ok) setState(r.data)
    }, [username])
    useEffect(() => { refresh(); const t = setInterval(refresh, 3000); return () => clearInterval(t) }, [refresh])

    const reg = state?.registry ?? {}
    const setup = state?.setup
    const requests: any[] = state?.requests ?? []
    const pending = requests.find((r) => r.status === "pending")
    const lastExecuted = requests.find((r) => r.status === "executed")

    const install = async () => {
        setBusy("install"); setMsg(null)
        try {
            const sq = await fetch(`${SWISSQUOTE_URL}/guardian`).then((r) => r.json())
            const guardians: Guardians = { backup: reg.backup, contact: reg.contact, swissquote: sq.address }
            const guardianAccount = await guardianAccountAddress(guardians)
            const hash = await kernelClient.sendUserOperation({ callData: buildInstallCallData(guardianAccount) }) // Touch ID
            await kernelClient.waitForUserOperationReceipt({ hash })
            await coord("setup", { username, account: accountAddress, guardians, guardianAccount, delaySeconds: delay })
            setMsg({ kind: "ok", text: "Récupération installée sur la blockchain. Les 3 gardiens peuvent désormais t'aider à retrouver ton wallet (2 sur 3 requis)." })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: "Installation impossible : " + errText(e) }) }
        setBusy("")
    }

    const cancel = async (id: string) => {
        setBusy("cancel"); setMsg(null)
        try {
            const message = `Annuler la récupération ${id}`
            const signature = await kernelAccount.signMessage({ message }) // Touch ID : prouve que tu es le propriétaire
            const r = await coord(`requests/${id}/cancel`, { message, signature })
            setMsg(r.ok ? { kind: "ok", text: "Récupération annulée. Les gardiens ne recevront plus aucune signature pour cette demande." } : { kind: "err", text: r.data.error })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: "Annulation impossible : " + errText(e) }) }
        setBusy("")
    }

    if (!ready) return <Card title="Récupération du wallet"><p className="text-sm text-gray-400">Connecte-toi d'abord (Register ou Login) pour gérer la récupération.</p></Card>

    return (
        <Card title="Récupération du wallet (2 gardiens sur 3)">
            {!setup ? (
                <>
                    <p className="text-sm text-gray-300">
                        Désigne tes 3 gardiens. Il en faut <b>2 sur 3</b> pour retrouver ton wallet si tu perds cet appareil.
                        Swissquote <b>seule</b> ne peut jamais bouger tes fonds ni changer ta clé.
                    </p>
                    <ul className="text-sm space-y-1">
                        <li>{reg.backup ? "✅" : "⬜"} {ROLE_LABEL.backup} {reg.backup && <code>{fmtAddr(reg.backup)}</code>}</li>
                        <li>{reg.contact ? "✅" : "⬜"} {ROLE_LABEL.contact} {reg.contact && <code>{fmtAddr(reg.contact)}</code>}</li>
                        <li>✅ {ROLE_LABEL.swissquote} <MockBadge /></li>
                    </ul>
                    {(!reg.backup || !reg.contact) && (
                        <Msg kind="info">
                            Ouvre <b>/guardian</b> dans un autre navigateur (appareil de secours), puis encore une fois pour le contact de confiance. Utilise le même nom d'utilisateur : <b>{username || "…"}</b>.
                        </Msg>
                    )}
                    <label className="text-sm block">Délai de sécurité avant exécution (secondes, démo ≈ 120 ; production : 48 h)
                        <input type="number" min={10} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="p-2 border border-gray-300 rounded-lg w-full text-black mt-1" />
                    </label>
                    <Btn onClick={install} busy={busy === "install"} disabled={!username || !reg.backup || !reg.contact}>Installer la récupération (Touch ID)</Btn>
                </>
            ) : (
                <>
                    <Msg kind="ok">Récupération installée. Compte gardien : <code>{fmtAddr(setup.guardianAccount)}</code> · délai de sécurité : {setup.delaySeconds} s (démo)</Msg>
                    <ul className="text-sm space-y-1">
                        {(["backup", "contact", "swissquote"] as const).map((r) => <li key={r}>• {ROLE_LABEL[r]} : <code>{fmtAddr(setup.guardians[r])}</code></li>)}
                    </ul>
                </>
            )}

            {pending && (
                <Card tone="warn" title="⚠️ Une récupération est en cours sur ton wallet">
                    <p className="text-sm">
                        Quelqu'un demande à remplacer ta clé par une nouvelle. Approbations déjà reçues : <b>{pending.approvedBy.length}/3</b> ({pending.approvedBy.map((r: string) => ROLE_LABEL[r as keyof typeof ROLE_LABEL]).join(", ") || "aucune"}).
                    </p>
                    <p className="text-sm">
                        {now < pending.readyAt ? <>Délai de sécurité : encore <b>{countdown(pending.readyAt - now)}</b> pour annuler.</> : <>Le délai est écoulé : les gardiens peuvent finaliser.</>}
                    </p>
                    <p className="text-sm text-gray-300">Ce n'est pas toi ? Annule maintenant.</p>
                    <Btn tone="red" onClick={() => cancel(pending.id)} busy={busy === "cancel"}>Annuler cette récupération (Touch ID)</Btn>
                </Card>
            )}
            {lastExecuted && !pending && (
                <Msg kind="info">Une récupération a été exécutée : cet appareil n'est plus le propriétaire du wallet. Les opérations signées ici seront refusées.</Msg>
            )}
            {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        </Card>
    )
}
