"use client"
// Interaction avec une application (dApp), avec les contrôles « conformes » du brief :
//   1. liste d'applications approuvées par Swissquote (MOCK) ;
//   2. empreinte du code du contrat recalculée sur la blockchain (adresse identique ≠ code identique) ;
//   3. simulation de la transaction et résumé en langage clair avant de signer ;
//   4. contrôles renforcés : application inconnue => confirmation du SECOND APPAREIL ; code changé => refus.
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Address, encodeFunctionData, isAddress } from "viem"
import { coord, errText, fmtAddr, isObsoleteSignerError, notifyObsolete, publicClient } from "@/lib/recovery"
import { DappCheck, DappEntry, checkDapp, dappAbi, loadRegistry } from "@/lib/dapps"
import { Btn, Card, Input, MockBadge, Msg, countdown, useNow } from "./ui"

type Props = { username: string; ready: boolean; account: any; client: any }
const CUSTOM = "custom"

export default function DappPanel({ username, ready, account, client }: Props) {
    const [registry, setRegistry] = useState<DappEntry[]>([])
    const [selected, setSelected] = useState("")
    const [custom, setCustom] = useState("")
    const [check, setCheck] = useState<DappCheck | null>(null)
    const [sim, setSim] = useState<{ ok: boolean; error?: string } | null>(null)
    const [ack, setAck] = useState(false)
    const [paymentId, setPaymentId] = useState("")
    const [state, setState] = useState<any>(null)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const sending = useRef(false)
    const now = useNow()

    useEffect(() => { loadRegistry().then((r) => { setRegistry(r); if (r[0]) setSelected(r[0].id) }).catch(() => setSelected(CUSTOM)) }, [])

    const refresh = useCallback(async () => {
        if (!username) return
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (r.ok) setState(r.data)
    }, [username])
    useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t) }, [refresh])

    const payment = (state?.payments ?? []).find((p: any) => p.id === paymentId)
    const entry = registry.find((d) => d.id === selected)
    const target = (selected === CUSTOM ? custom : entry?.address ?? "") as string

    const verify = async () => {
        setBusy("check"); setMsg(null); setCheck(null); setSim(null); setAck(false); setPaymentId("")
        try {
            if (!isAddress(target)) throw new Error("L'adresse de l'application n'est pas valide.")
            const reg = await loadRegistry(); setRegistry(reg) // registre à jour
            const c = await checkDapp(target as Address, reg)
            setCheck(c)
            try { await publicClient.simulateContract({ account: account.address as Address, address: target as Address, abi: dappAbi, functionName: "mint", args: [account.address as Address] }); setSim({ ok: true }) }
            catch (e) { setSim({ ok: false, error: errText(e) }) }
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    const doCall = async () => {
        if (sending.current || !check) return
        sending.current = true
        try {
            setBusy("send")
            const hash = await client.sendUserOperation({
                callData: await account.encodeCalls([{ to: target as Address, value: BigInt(0), data: encodeFunctionData({ abi: dappAbi, functionName: "mint", args: [account.address] }) }])
            }) // Touch ID
            const receipt = await client.waitForUserOperationReceipt({ hash })
            if (paymentId) await coord(`payments/${paymentId}/done`, { txHash: receipt.receipt.transactionHash })
            setMsg({ kind: "ok", text: `✅ Application appelée (${check.entry?.name ?? fmtAddr(target)}). Transaction : ${fmtAddr(receipt.receipt.transactionHash)}` })
            setCheck(null); setSim(null); setPaymentId("")
        } catch (e) {
            if (isObsoleteSignerError(e)) notifyObsolete()
            setMsg({ kind: "err", text: "Appel impossible : " + errText(e) })
        }
        setBusy(""); sending.current = false
    }

    const go = async () => {
        if (!check) return
        setMsg(null)
        if (check.status === "approved") return doCall()
        // application non approuvée : confirmation du second appareil
        setBusy("ask")
        const r = await coord("payments", { username, to: target, amountUnits: "0", amountLabel: "0", description: "appeler une application non approuvée par Swissquote (fonction mint)" })
        if (!r.ok) { setMsg({ kind: "err", text: r.data.error }); setBusy(""); return }
        setPaymentId(r.data.id)
        setMsg({ kind: "info", text: "Application non approuvée : ouvre /guardian sur ton appareil de secours et confirme." })
        setBusy("")
    }

    useEffect(() => {
        if (payment?.status === "approved" && check && !sending.current && busy === "") doCall()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payment?.status])

    if (!ready) return <Card title="Applications (dApps)"><p className="text-sm text-slate-400">Connecte-toi d'abord.</p></Card>

    const waiting = payment?.status === "pending"
    const level = check?.status
    return (
        <Card title="Applications (dApps) : liste approuvée et contrôle du code">
            <p className="text-sm text-slate-300">Avant d'appeler une application, ton wallet vérifie qu'elle est approuvée par Swissquote <MockBadge /> et que <b>son code n'a pas changé</b> depuis l'approbation (une adresse identique ne garantit pas un code identique).</p>
            <select className="px-3 py-2.5 rounded-xl w-full bg-white/10 border border-white/15 text-white" value={selected} onChange={(e) => { setSelected(e.target.value); setCheck(null); setSim(null) }}>
                {registry.map((d) => <option key={d.id} value={d.id} className="text-black">✅ {d.name}</option>)}
                <option value={CUSTOM} className="text-black">Autre application (adresse à saisir)</option>
            </select>
            {entry && selected !== CUSTOM && <p className="text-xs text-slate-400">{entry.description} · <code>{fmtAddr(entry.address)}</code></p>}
            {selected === CUSTOM && <Input placeholder="Adresse de l'application (0x…)" value={custom} onChange={(e) => setCustom(e.target.value.trim())} />}
            <Btn tone="gray" onClick={verify} busy={busy === "check"} disabled={!target}>Vérifier l'application</Btn>

            {check && (
                <Card title="Résultat des contrôles">
                    <ul className="text-sm space-y-1">
                        <li>• Approuvée par Swissquote : {check.entry ? <b className="text-green-400">oui ✅</b> : <b className="text-amber-300">non ⚠️</b>}</li>
                        <li>• Code identique à celui approuvé : {check.status === "approved" ? <b className="text-green-400">oui ✅ (empreinte {check.onchainHash?.slice(0, 10)}…)</b> : check.status === "changed" ? <b className="text-red-400">NON ⛔</b> : <b className="text-slate-300">non vérifiable (application inconnue)</b>}</li>
                        <li>• Contrat modifiable (proxy) : {check.isProxy ? <b className="text-amber-300">oui ⚠️</b> : <b>non</b>}</li>
                        <li>• Simulation : {sim?.ok ? <b className="text-green-400">elle réussirait ✅</b> : <b className="text-red-400">elle échouerait ❌{sim?.error ? ` — ${sim.error.slice(0, 90)}` : ""}</b>}</li>
                        <li>• Ce que tu vas faire : appeler la fonction <b>mint</b> de {check.entry ? <b>{check.entry.name}</b> : <code>{fmtAddr(target)}</code>}, qui crée un jeton de test pour ton wallet. <b>Aucun fonds ne quitte ton wallet</b> ; frais payés par Swissquote.</li>
                    </ul>
                    <Msg kind={level === "approved" ? "ok" : level === "changed" ? "err" : "info"}>
                        {level === "approved" && "Application de confiance : un seul contrôle (Touch ID) suffit."}
                        {level === "changed" && <>⛔ <b>Appel bloqué par ton wallet.</b> {check.reason} Attends que Swissquote ré-approuve la nouvelle version.</>}
                        {level === "unknown" && <>⚠️ {check.reason} Contrôle renforcé : il faut cocher la case ci-dessous <b>et</b> la confirmation de ton appareil de secours.</>}
                    </Msg>
                    {level === "unknown" && !waiting && (
                        <label className="text-sm flex items-start gap-2"><input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Je comprends que cette application n'a pas été vérifiée et que je l'appelle à mes risques.</label>
                    )}
                    {level !== "changed" && !waiting && (
                        <Btn tone={level === "approved" ? "green" : "purple"} onClick={go} busy={busy === "send" || busy === "ask"} disabled={!sim?.ok || (level === "unknown" && !ack)}>
                            {level === "approved" ? "Appeler l'application (Touch ID)" : "Demander la confirmation de l'appareil de secours"}
                        </Btn>
                    )}
                </Card>
            )}

            {waiting && (
                <Card tone="warn" title="⏳ En attente de ton appareil de secours">
                    <p className="text-sm">Ouvre <b>/guardian</b> (appareil de secours, nom « {username} ») et confirme l'appel de cette application. Expire dans {countdown(payment.expiresAt - now)}.</p>
                </Card>
            )}
            {payment?.status === "refused" && <Msg kind="err">Ton appareil de secours a refusé cet appel.</Msg>}
            {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        </Card>
    )
}
