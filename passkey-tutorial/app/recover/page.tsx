"use client"
// NOUVEL APPAREIL : le client a perdu son téléphone et récupère son wallet.
// Parcours : (0) choisir quel wallet récupérer (écran neutre, jamais prérempli), (1) créer un nouveau passkey et
// demander la récupération, (2) deux gardiens sur trois approuvent (dont, au choix, Swissquote après vérification
// EN PERSONNE), (3) délai de sécurité, (4) un gardien finalise, (5) le client utilise son wallet avec le nouveau passkey.
//
// Règles de cette page :
//  - à chaque ouverture, écran neutre : on ne présélectionne PAS le dernier utilisateur ;
//  - on ne charge que les données de l'utilisateur choisi ;
//  - « Changer d'utilisateur » est visible dans tous les états et ne touche JAMAIS aux données conservées
//    (demandes, approbations, gardiens, données du nouveau passkey) : il ne réinitialise que l'AFFICHAGE ;
//  - une réponse réseau qui arrive après un changement d'utilisateur est ignorée (compteur de session).
import React, { useCallback, useEffect, useRef, useState } from "react"
import { encodeFunctionData, parseAbi } from "viem"
import {
    SWISSQUOTE_URL, ROLE_LABEL, api, buildRecoveryCallData, coord, errText, fmtAddr, passkeyValidatorFor, passkeyValidatorFromSerialized, recoveredWallet
} from "@/lib/recovery"
import { Btn, Card, Input, MockBadge, Msg, Pill, RoleHeader, countdown, useNow } from "../components/ui"
import PaymentPanel from "../components/PaymentPanel"
import SwissquoteLinkPanel from "../components/SwissquoteLinkPanel"
import OwnerRecoveryPanel from "../components/OwnerRecoveryPanel"
import DappPanel from "../components/DappPanel"

const mintAbi = parseAbi(["function mint(address _to) public"])
const MINT_CONTRACT = "0x34bE7f35132E97915633BC1fc020364EA5134863"
const ls = {
    get: (k: string) => { try { return localStorage.getItem(k) ?? "" } catch { return "" } },
    set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }
}
// Mémoire locale de ce navigateur : demande en cours par utilisateur (lecture tolérante à la casse)
const reqKey = (u: string) => `sq-recover-req-${u}`
const storedReq = (u: string) => ls.get(reqKey(u)) || ls.get(reqKey(u.trim().toLowerCase()))

export default function RecoverPage() {
    const [nameInput, setNameInput] = useState("") // champ du formulaire : toujours vide à l'ouverture
    const [username, setUsername] = useState("") // utilisateur validé ; "" = écran neutre
    const sessionRef = useRef(0) // change à chaque changement d'utilisateur : sert à ignorer les réponses périmées
    const [state, setState] = useState<any>(null)
    const [reqId, setReqId] = useState("")
    const [forceNew, setForceNew] = useState(false)
    const [caseInfo, setCaseInfo] = useState<any>(null)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const [sqMsg, setSqMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const [wallet, setWallet] = useState<any>(null)
    const [advanced, setAdvanced] = useState(false)
    const [details, setDetails] = useState(false)
    const [copied, setCopied] = useState(false)
    const now = useNow()

    // Vide TOUT l'affichage temporaire (jamais les données conservées : demandes, gardiens, passkey)
    const resetView = () => {
        setState(null); setReqId(""); setForceNew(false); setCaseInfo(null); setBusy("")
        setMsg(null); setSqMsg(null); setWallet(null); setAdvanced(false); setDetails(false); setCopied(false)
    }
    const switchUser = () => { sessionRef.current += 1; resetView(); setUsername(""); setNameInput("") }
    const validateName = () => {
        const n = nameInput.trim()
        if (!n) return
        sessionRef.current += 1; resetView(); setUsername(n)
    }

    const refresh = useCallback(async () => {
        if (!username) return
        const token = sessionRef.current
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (token !== sessionRef.current) return // réponse d'un ancien utilisateur : ignorée
        if (!r.ok) return
        setState(r.data)
        const list: any[] = r.data.requests ?? []
        // demande à afficher : celle de ce navigateur si elle existe encore, sinon la plus récente du serveur
        const stored = storedReq(username)
        const chosen = forceNew ? "" : list.find((x) => x.id === stored)?.id ?? list[0]?.id ?? ""
        setReqId(chosen)
        const caseId = chosen ? ls.get(`sq-recover-case-${chosen}`) : ""
        if (!caseId) { setCaseInfo(null); return }
        try {
            const c = await fetch(`${SWISSQUOTE_URL}/cases/${caseId}`).then((x) => x.json())
            if (token === sessionRef.current) setCaseInfo(c.error ? null : c)
        } catch {}
    }, [username, forceNew])
    useEffect(() => { refresh(); const t = setInterval(refresh, 2500); return () => clearInterval(t) }, [refresh])

    const setup = state?.setup
    const req = (state?.requests ?? []).find((r: any) => r.id === reqId)

    // 1) nouveau passkey + demande
    const start = async () => {
        const token = sessionRef.current
        setBusy("start"); setMsg(null)
        try {
            const passkeyName = `${username}-recovered-${Math.random().toString(36).slice(2, 6)}`
            const validator = await passkeyValidatorFor(passkeyName, "register") // Touch ID sur CET appareil
            const enableData = await validator.getEnableData()
            const callData = await buildRecoveryCallData(setup.guardians, setup.account, validator.address, enableData)
            const r = await coord("requests", { username, newValidator: validator.address, enableData, callData })
            if (!r.ok) throw new Error(r.data.error)
            // données conservées pour retrouver CE passkey (rattachées à la demande)
            ls.set(reqKey(username.trim().toLowerCase()), r.data.id); ls.set(`sq-recover-pk-${r.data.id}`, passkeyName)
            ls.set(`sq-recover-ser-${r.data.id}`, validator.getSerializedData())
            if (token !== sessionRef.current) return
            setForceNew(false); setReqId(r.data.id)
            setMsg({ kind: "ok", text: "Demande créée avec un nouveau passkey. Il faut maintenant l'accord de 2 gardiens sur 3, puis la fin du délai de sécurité." })
            refresh()
        } catch (e) { if (token === sessionRef.current) setMsg({ kind: "err", text: errText(e) }) }
        if (token === sessionRef.current) setBusy("")
    }

    // Swissquote (MOCK)
    const openCase = async () => {
        const token = sessionRef.current
        setBusy("case"); setSqMsg(null)
        try {
            const r = await api(`${SWISSQUOTE_URL}/cases`, { username, account: setup.account })
            if (!r.ok) throw new Error(r.data.error)
            ls.set(`sq-recover-case-${req.id}`, r.data.id)
            if (token !== sessionRef.current) return
            setCaseInfo(r.data)
            setSqMsg({ kind: "info", text: `Dossier ${r.data.id} ouvert. Présente-toi à l'agence (page /desk, simulée) avec ta pièce d'identité.` })
        } catch (e) { if (token === sessionRef.current) setSqMsg({ kind: "err", text: "Serveur Swissquote injoignable : " + errText(e) + " (est-il lancé sur le port 4000 ?)" }) }
        if (token === sessionRef.current) setBusy("")
    }
    const attack = async () => {
        const token = sessionRef.current
        setBusy("attack"); setSqMsg(null)
        const r = await api(`${SWISSQUOTE_URL}/cases/${caseInfo.id}/otp`, { code: "123456" })
        if (token !== sessionRef.current) return
        setSqMsg({ kind: "err", text: `🛡️ Attaquant refusé (téléphone + e-mail volés) : ${r.data.reason ?? r.data.error}` })
        refresh(); setBusy("")
    }
    const getSwissquoteApproval = async () => {
        const token = sessionRef.current
        setBusy("sq"); setSqMsg(null)
        try {
            const r = await api(`${SWISSQUOTE_URL}/approve`, { caseId: caseInfo.id, guardians: setup.guardians, target: setup.account, newValidator: req.newValidator, enableData: req.enableData })
            if (!r.ok) throw new Error(r.data.reason ?? r.data.error)
            if (r.data.callData !== req.callData) throw new Error("Swissquote a reconstruit une opération différente : refus de la transmettre.")
            const c = await coord(`requests/${req.id}/approve`, { role: "swissquote", signature: r.data.signature })
            if (token !== sessionRef.current) return
            setSqMsg(c.ok ? { kind: "ok", text: "Swissquote a approuvé (1 voix sur 3). Elle ne peut pas finaliser seule." } : { kind: "err", text: c.data.error })
            refresh()
        } catch (e) { if (token === sessionRef.current) setSqMsg({ kind: "err", text: errText(e) }) }
        if (token === sessionRef.current) setBusy("")
    }

    // 5) utiliser le wallet récupéré avec le nouveau passkey
    const useWallet = async () => {
        const token = sessionRef.current
        setBusy("wallet"); setMsg(null)
        try {
            const serialized = ls.get(`sq-recover-ser-${reqId}`)
            const pkName = ls.get(`sq-recover-pk-${reqId}`)
            if (!serialized && !pkName) throw new Error("Ce navigateur n'a pas créé le nouveau passkey de cette demande : connecte-toi depuis l'appareil où tu as lancé la récupération.")
            // idéal : le passkey exact créé pour la récupération ; sinon (ancienne demande) : connexion classique
            const validator = serialized ? await passkeyValidatorFromSerialized(serialized) : await passkeyValidatorFor(pkName, "login")
            const w = await recoveredWallet(validator, setup.account)
            if (token !== sessionRef.current) return
            setWallet(w)
            setMsg({ kind: "ok", text: "Connecté au wallet récupéré avec le nouveau passkey." })
        } catch (e) { if (token === sessionRef.current) setMsg({ kind: "err", text: errText(e) }) }
        if (token === sessionRef.current) setBusy("")
    }
    const testTx = async () => {
        const token = sessionRef.current
        setBusy("tx"); setMsg(null)
        try {
            const hash = await wallet.client.sendUserOperation({
                callData: await wallet.account.encodeCalls([{ to: MINT_CONTRACT, value: BigInt(0), data: encodeFunctionData({ abi: mintAbi, functionName: "mint", args: [wallet.account.address] }) }])
            })
            await wallet.client.waitForUserOperationReceipt({ hash })
            if (token === sessionRef.current) setMsg({ kind: "ok", text: `✅ Transaction signée avec le NOUVEAU passkey, depuis le même wallet (${fmtAddr(wallet.account.address)}). Fonds intacts.` })
        } catch (e) { if (token === sessionRef.current) setMsg({ kind: "err", text: errText(e) }) }
        if (token === sessionRef.current) setBusy("")
    }
    const copyAddress = async () => {
        try { await navigator.clipboard.writeText(setup.account); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
    }

    const waiting = req?.status === "pending" && now < req.readyAt
    const recovered = req?.status === "executed"
    const statusLabel = req ? (req.status === "pending" ? "en cours" : req.status === "executed" ? "exécutée ✅" : "annulée ❌") : ""
    const approvals = req && (
        <>
            <p className="text-sm">Demande <b>{req.id}</b> — statut : <b>{statusLabel}</b></p>
            <p className="text-sm">Approbations : <b>{req.approvedBy.length}/3</b> (2 requises) — {req.approvedBy.map((r: string) => ROLE_LABEL[r as keyof typeof ROLE_LABEL]).join(", ") || "aucune"}</p>
        </>
    )
    // barre visible dans TOUS les états : qui on est en train de récupérer, et comment changer
    const userBar = (
        <div className="flex items-center justify-between gap-2 text-sm rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <span className="text-slate-300">Wallet : <b className="text-white">{username}</b></span>
            <button className="text-sky-300 hover:text-sky-200 font-medium" onClick={switchUser}>Changer d'utilisateur</button>
        </div>
    )

    // ---------- ÉCRAN NEUTRE : aucun utilisateur choisi ----------
    if (!username) {
        return (
            <main className="min-h-screen px-4 py-12">
                <div className="max-w-lg mx-auto space-y-4">
                    <RoleHeader emoji="📱" title="Récupérer un wallet" subtitle="Retrouve ton wallet sur ce nouvel appareil avec l'aide de tes gardiens. Tes fonds ne bougent pas : seule la clé qui les contrôle change." />
                    <Card title="Quel wallet veux-tu récupérer ?">
                        <Input placeholder="Nom d'utilisateur du wallet" value={nameInput} autoComplete="off" onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") validateName() }} />
                        <Btn onClick={validateName} disabled={!nameInput.trim()}>Continuer</Btn>
                        <p className="text-xs text-slate-400">Si une récupération est déjà en cours pour ce wallet, tu pourras la reprendre là où elle en est.</p>
                    </Card>
                </div>
            </main>
        )
    }

    // ---------- CHARGEMENT / AUCUNE RÉCUPÉRATION INSTALLÉE ----------
    if (!state || !setup) {
        return (
            <main className="min-h-screen px-4 py-12">
                <div className="max-w-lg mx-auto space-y-4">
                    <RoleHeader emoji="📱" title="Récupérer un wallet" subtitle="Retrouve ton wallet sur ce nouvel appareil avec l'aide de tes gardiens." />
                    {userBar}
                    <Card>
                        {!state ? <p className="text-sm text-slate-300">Chargement de la configuration de « {username} »…</p>
                            : <Msg kind="err">Aucune récupération n'est installée pour « {username} ». Vérifie l'orthographe du nom, ou change d'utilisateur.</Msg>}
                    </Card>
                </div>
            </main>
        )
    }

    // ---------- ÉTAT C : le wallet est récupéré ET connecté : interface normale ----------
    if (wallet) {
        return (
            <main className="min-h-screen px-4 py-8 sm:py-12">
                <div className="w-full max-w-lg mx-auto space-y-4">
                    <header className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">Swissquote Wallet</h1>
                            <p className="text-xs text-slate-400">Leurs clés, leur contrôle, à un pas de leur compte Swissquote.</p>
                        </div>
                        <Pill tone="amber">Réseau de test</Pill>
                    </header>
                    {userBar}
                    <Card tone="ok">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm text-slate-300">Wallet récupéré ✅</p>
                                <p className="text-xl font-semibold">{username}</p>
                            </div>
                            <Pill tone="green">🔒 Nouveau passkey</Pill>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-slate-300">Adresse : <code>{fmtAddr(setup.account)}</code></span>
                            <span className="space-x-3">
                                <button className="text-sky-300 hover:text-sky-200" onClick={copyAddress}>{copied ? "copié ✓" : "copier"}</button>
                                <a className="text-sky-300 hover:text-sky-200" target="_blank" rel="noopener noreferrer" href={`https://sepolia.etherscan.io/address/${setup.account}`}>voir sur la blockchain</a>
                            </span>
                        </div>
                        <p className="text-sm text-slate-300">Même adresse, mêmes fonds. Ton ancien appareil n'a plus aucun accès.</p>
                    </Card>

                    <PaymentPanel username={username} ready={true} account={wallet.account} client={wallet.client} />

                    <button className="w-full text-sm text-sky-300 hover:text-sky-200 py-2" onClick={() => setAdvanced(!advanced)}>
                        {advanced ? "▲ Masquer le mode avancé" : "▼ Mode avancé : transaction de test, récupération, compte Swissquote, applications"}
                    </button>
                    {advanced && (
                        <div className="space-y-4">
                            <Card title="Transaction de test">
                                <Btn tone="green" onClick={testTx} busy={busy === "tx"}>Envoyer une transaction de test (gasless)</Btn>
                            </Card>
                            <OwnerRecoveryPanel username={username} accountAddress={setup.account} ready={true} kernelClient={wallet.client} kernelAccount={wallet.account} />
                            <SwissquoteLinkPanel ready={true} account={wallet.account} />
                            <DappPanel username={username} ready={true} account={wallet.account} client={wallet.client} />
                        </div>
                    )}

                    <button className="w-full text-xs text-slate-400 hover:text-slate-200 py-1" onClick={() => setDetails(!details)}>
                        {details ? "▲ Masquer les détails de la récupération" : "▼ Détails de la récupération qui vient d'avoir lieu"}
                    </button>
                    {details && <Card title="Récupération effectuée">{approvals}<p className="text-xs text-slate-400">Gardiens : {(["backup", "contact", "swissquote"] as const).map((r) => ROLE_LABEL[r]).join(", ")}.</p></Card>}
                    {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
                </div>
            </main>
        )
    }

    // ---------- ÉTAT B : récupération terminée, il reste à se connecter avec le nouveau passkey ----------
    if (recovered) {
        return (
            <main className="min-h-screen px-4 py-12">
                <div className="max-w-lg mx-auto space-y-4">
                    <RoleHeader emoji="🎉" title="Récupération terminée" subtitle="Les gardiens ont remplacé la clé qui contrôle ton wallet. Il ne reste qu'à te connecter avec ton nouveau passkey." />
                    {userBar}
                    <Card tone="ok">
                        <p className="text-sm">Wallet : <code>{fmtAddr(setup.account)}</code></p>
                        {approvals}
                        <Btn onClick={useWallet} busy={busy === "wallet"}>Me connecter avec mon nouveau passkey</Btn>
                    </Card>
                    <button className="w-full text-xs text-slate-400 hover:text-slate-200 py-1" onClick={() => setForceNew(true)}>
                        J'ai de nouveau perdu mon appareil : faire une nouvelle récupération
                    </button>
                    {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
                </div>
            </main>
        )
    }

    // ---------- ÉTAT A : récupération à faire ou en cours ----------
    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto space-y-4">
                <RoleHeader emoji="📱" title="J'ai perdu mon appareil" subtitle="Retrouve ton wallet sur ce nouvel appareil avec l'aide de tes gardiens. Tes fonds ne bougent pas : seule la clé qui les contrôle change." />
                {userBar}

                <Card title="1. Ton wallet">
                    <p className="text-sm">Wallet à récupérer : <code>{fmtAddr(setup.account)}</code> · gardiens : {(["backup", "contact", "swissquote"] as const).map((r) => ROLE_LABEL[r]).join(", ")}</p>
                </Card>

                <Card title="2. Nouveau passkey sur cet appareil">
                    {(!req || req.status === "cancelled") && <Btn onClick={start} busy={busy === "start"}>{req ? "Faire une NOUVELLE demande de récupération (nouveau passkey)" : "Créer un nouveau passkey et demander la récupération"}</Btn>}
                    {approvals}
                    {req?.status === "pending" && <p className="text-sm">{waiting ? <>⏳ Délai de sécurité : <b>{countdown(req.readyAt - now)}</b> (le propriétaire actuel peut annuler)</> : "✅ Délai de sécurité écoulé : un gardien peut finaliser."}</p>}
                    {req?.status === "cancelled" && <Msg kind="err">Le propriétaire a annulé cette demande.</Msg>}
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
                    <p className="text-xs text-slate-400">Quand la récupération sera exécutée, cette page te proposera de te connecter avec ton nouveau passkey.</p>
                </Card>
                {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
            </div>
        </main>
    )
}
