"use client"
// NOUVEL APPAREIL : le client a perdu son téléphone et récupère son wallet.
// Étapes : (1) créer un nouveau passkey + demander la récupération, (2) deux gardiens sur trois approuvent
// (dont, au choix, Swissquote après vérification EN PERSONNE), (3) délai de sécurité, (4) un gardien finalise,
// (5) le client utilise son wallet (même adresse, mêmes fonds) avec le nouveau passkey.
import React, { useCallback, useEffect, useState } from "react"
import { encodeFunctionData, parseAbi } from "viem"
import {
    SWISSQUOTE_URL, ROLE_LABEL, api, buildRecoveryCallData, coord, errText, fmtAddr, passkeyValidatorFor, passkeyValidatorFromSerialized, recoveredWallet
} from "@/lib/recovery"
import { Btn, Card, Input, MockBadge, Msg, countdown, useNow } from "../components/ui"
import PaymentPanel from "../components/PaymentPanel"
import SwissquoteLinkPanel from "../components/SwissquoteLinkPanel"

const mintAbi = parseAbi(["function mint(address _to) public"])
const MINT_CONTRACT = "0x34bE7f35132E97915633BC1fc020364EA5134863"
const ls = {
    get: (k: string) => { try { return localStorage.getItem(k) ?? "" } catch { return "" } },
    set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }
}

export default function RecoverPage() {
    const [username, setUsername] = useState("")
    const [state, setState] = useState<any>(null)
    const [reqId, setReqId] = useState("")
    const [caseInfo, setCaseInfo] = useState<any>(null)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const [sqMsg, setSqMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const [wallet, setWallet] = useState<any>(null)
    const now = useNow()

    useEffect(() => { setUsername(ls.get("sq-recover-username")) }, [])
    useEffect(() => { setReqId(ls.get(`sq-recover-req-${username}`)) }, [username])

    const refresh = useCallback(async () => {
        if (!username) return
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (r.ok) setState(r.data)
        const rid = ls.get(`sq-recover-req-${username}`)
        const caseId = rid ? ls.get(`sq-recover-case-${rid}`) : ""
        if (!caseId) { setCaseInfo(null); return }
        try { const c = await fetch(`${SWISSQUOTE_URL}/cases/${caseId}`).then((x) => x.json()); setCaseInfo(c.error ? null : c) } catch {}
    }, [username])
    useEffect(() => { refresh(); const t = setInterval(refresh, 2500); return () => clearInterval(t) }, [refresh])

    const setup = state?.setup
    const req = (state?.requests ?? []).find((r: any) => r.id === reqId)

    // 1) nouveau passkey + demande
    const start = async () => {
        setBusy("start"); setMsg(null)
        try {
            ls.set("sq-recover-username", username)
            const passkeyName = `${username}-recovered-${Math.random().toString(36).slice(2, 6)}`
            const validator = await passkeyValidatorFor(passkeyName, "register") // Touch ID sur CET appareil
            const enableData = await validator.getEnableData()
            const callData = await buildRecoveryCallData(setup.guardians, setup.account, validator.address, enableData)
            const r = await coord("requests", { username, newValidator: validator.address, enableData, callData })
            if (!r.ok) throw new Error(r.data.error)
            ls.set(`sq-recover-req-${username}`, r.data.id); ls.set(`sq-recover-pk-${r.data.id}`, passkeyName)
            ls.set(`sq-recover-ser-${r.data.id}`, validator.getSerializedData()) // pour retrouver CE passkey précisément
            setReqId(r.data.id)
            setMsg({ kind: "ok", text: "Demande créée avec un nouveau passkey. Il faut maintenant l'accord de 2 gardiens sur 3, puis la fin du délai de sécurité." })
            refresh()
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    // Swissquote (MOCK)
    const openCase = async () => {
        setBusy("case"); setSqMsg(null)
        try {
            const r = await api(`${SWISSQUOTE_URL}/cases`, { username, account: setup.account })
            if (!r.ok) throw new Error(r.data.error)
            ls.set(`sq-recover-case-${req.id}`, r.data.id); setCaseInfo(r.data)
            setSqMsg({ kind: "info", text: `Dossier ${r.data.id} ouvert. Présente-toi à l'agence (page /desk, simulée) avec ta pièce d'identité.` })
        } catch (e) { setSqMsg({ kind: "err", text: "Serveur Swissquote injoignable : " + errText(e) + " (est-il lancé sur le port 4000 ?)" }) }
        setBusy("")
    }
    const attack = async () => {
        setBusy("attack"); setSqMsg(null)
        const r = await api(`${SWISSQUOTE_URL}/cases/${caseInfo.id}/otp`, { code: "123456" })
        setSqMsg({ kind: "err", text: `🛡️ Attaquant refusé (téléphone + e-mail volés) : ${r.data.reason ?? r.data.error}` })
        refresh(); setBusy("")
    }
    const getSwissquoteApproval = async () => {
        setBusy("sq"); setSqMsg(null)
        try {
            const r = await api(`${SWISSQUOTE_URL}/approve`, { caseId: caseInfo.id, guardians: setup.guardians, target: setup.account, newValidator: req.newValidator, enableData: req.enableData })
            if (!r.ok) throw new Error(r.data.reason ?? r.data.error)
            if (r.data.callData !== req.callData) throw new Error("Swissquote a reconstruit une opération différente : refus de la transmettre.")
            const c = await coord(`requests/${req.id}/approve`, { role: "swissquote", signature: r.data.signature })
            setSqMsg(c.ok ? { kind: "ok", text: "Swissquote a approuvé (1 voix sur 3). Elle ne peut pas finaliser seule." } : { kind: "err", text: c.data.error })
            refresh()
        } catch (e) { setSqMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    // 5) utiliser le wallet récupéré avec le nouveau passkey
    const useWallet = async () => {
        setBusy("wallet"); setMsg(null)
        try {
            const serialized = ls.get(`sq-recover-ser-${reqId}`)
            // idéal : le passkey exact créé pour la récupération ; sinon (ancienne demande) : connexion classique
            const validator = serialized
                ? await passkeyValidatorFromSerialized(serialized)
                : await passkeyValidatorFor(ls.get(`sq-recover-pk-${reqId}`), "login")
            const w = await recoveredWallet(validator, setup.account)
            setWallet(w)
            setMsg({ kind: "ok", text: "Connecté au wallet récupéré avec le nouveau passkey." })
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }
    const testTx = async () => {
        setBusy("tx"); setMsg(null)
        try {
            const hash = await wallet.client.sendUserOperation({
                callData: await wallet.account.encodeCalls([{ to: MINT_CONTRACT, value: BigInt(0), data: encodeFunctionData({ abi: mintAbi, functionName: "mint", args: [wallet.account.address] }) }])
            })
            await wallet.client.waitForUserOperationReceipt({ hash })
            setMsg({ kind: "ok", text: `✅ Transaction signée avec le NOUVEAU passkey, depuis le même wallet (${fmtAddr(wallet.account.address)}). Fonds intacts.` })
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    const waiting = req?.status === "pending" && now < req.readyAt
    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto space-y-4">
                <h1 className="text-3xl font-semibold text-center">J'ai perdu mon appareil</h1>

                <Card title="1. Qui es-tu ?">
                    <Input placeholder="Ton nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
                    {username && !setup && <Msg kind="err">Aucune récupération n'est installée pour « {username} ».</Msg>}
                    {setup && (
                        <p className="text-sm">Wallet à récupérer : <code>{fmtAddr(setup.account)}</code> · gardiens : {(["backup", "contact", "swissquote"] as const).map((r) => ROLE_LABEL[r]).join(", ")}</p>
                    )}
                </Card>

                <Card title="2. Nouveau passkey sur cet appareil">
                    {(!req || req.status !== "pending") && <Btn onClick={start} busy={busy === "start"} disabled={!setup}>{req ? "Faire une NOUVELLE demande de récupération (nouveau passkey)" : "Créer un nouveau passkey et demander la récupération"}</Btn>}
                    {req && (
                        <>
                            <p className="text-sm">Demande <b>{req.id}</b> — statut : <b>{req.status === "pending" ? "en cours" : req.status === "executed" ? "exécutée ✅" : "annulée ❌"}</b></p>
                            <p className="text-sm">Approbations : <b>{req.approvedBy.length}/3</b> (2 requises) — {req.approvedBy.map((r: string) => ROLE_LABEL[r as keyof typeof ROLE_LABEL]).join(", ") || "aucune"}</p>
                            {req.status === "pending" && <p className="text-sm">{waiting ? <>⏳ Délai de sécurité : <b>{countdown(req.readyAt - now)}</b> (le propriétaire actuel peut annuler)</> : "✅ Délai de sécurité écoulé : un gardien peut finaliser."}</p>}
                            {req.status === "cancelled" && <Msg kind="err">Le propriétaire a annulé cette demande.</Msg>}
                        </>
                    )}
                </Card>

                <Card title="3. Approbation de Swissquote" tone="mock">
                    <p className="text-sm"><MockBadge /> Swissquote est <b>un</b> des 3 gardiens : seule, elle ne peut rien. Elle n'approuve qu'après une vérification d'identité <b>en personne</b> : un SMS ou un e-mail ne suffisent jamais.</p>
                    {!caseInfo && <Btn onClick={openCase} busy={busy === "case"} disabled={!req || req.status !== "pending"}>Demander l'aide de Swissquote</Btn>}
                    {caseInfo && <p className="text-sm">Dossier <b>{caseInfo.id}</b> — statut : <b>{{ awaiting_in_person_check: "en attente de vérification en agence", verified_in_person: "identité vérifiée en personne ✅", approved: "approuvé", rejected: "rejeté" }[caseInfo.status as string] ?? caseInfo.status}</b></p>}
                    {caseInfo && caseInfo.status !== "approved" && (
                        <div className="flex gap-2">
                            <Btn tone="red" onClick={attack} busy={busy === "attack"}>Simuler un attaquant (SMS / e-mail volés)</Btn>
                            <Btn tone="green" onClick={getSwissquoteApproval} busy={busy === "sq"} disabled={caseInfo.status !== "verified_in_person" || !req || req.status !== "pending"}>Obtenir l'approbation</Btn>
                        </div>
                    )}
                    {sqMsg && <Msg kind={sqMsg.kind}>{sqMsg.text}</Msg>}
                </Card>

                <Card title="4. Les autres gardiens">
                    <p className="text-sm">Ton appareil de secours ou ton contact de confiance ouvre <b>/guardian</b>, approuve cette demande, puis (une fois le délai écoulé) un des deux clique sur « Finaliser ». <b>Swissquote n'est pas nécessaire</b> : 2 gardiens sur 3 suffisent, même si Swissquote disparaît.</p>
                </Card>

                <Card title="5. Utiliser mon wallet">
                    <Btn onClick={useWallet} busy={busy === "wallet"} disabled={req?.status !== "executed"}>Me connecter avec le nouveau passkey</Btn>
                    <Btn tone="green" onClick={testTx} busy={busy === "tx"} disabled={!wallet}>Envoyer une transaction test (gasless)</Btn>
                </Card>
                {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
                {wallet && <SwissquoteLinkPanel ready={true} account={wallet.account} />}
                {wallet && <PaymentPanel username={username} ready={true} account={wallet.account} client={wallet.client} />}
            </div>
        </main>
    )
}
