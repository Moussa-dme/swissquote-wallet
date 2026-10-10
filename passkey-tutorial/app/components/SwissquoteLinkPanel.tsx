"use client"
// Liaison du wallet au compte Swissquote du client + preuve de propriété (Travel Rule / FINMA).
//  - Le compte Swissquote est SIMULÉ (MOCK) : numéro de client + mot de passe, hors périmètre selon le mentor.
//  - Swissquote ne voit ni clé ni fonds : elle fait signer un message au wallet et vérifie la signature
//    sur la blockchain (ERC-1271). La liaison reste valable après une récupération (l'adresse ne change pas).
import React, { useCallback, useEffect, useState } from "react"
import { SWISSQUOTE_URL, api, errText, fmtAddr } from "@/lib/recovery"
import { Btn, Card, Input, MockBadge, Msg } from "./ui"

type Props = { ready: boolean; account: any }
const ss = {
    get: (k: string) => { try { return sessionStorage.getItem(k) ?? "" } catch { return "" } },
    set: (k: string, v: string) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k) } catch {} }
}

export default function SwissquoteLinkPanel({ ready, account }: Props) {
    const [customer, setCustomer] = useState("CH-1001")
    const [password, setPassword] = useState("")
    const [token, setToken] = useState("")
    const [who, setWho] = useState("")
    const [links, setLinks] = useState<any[]>([])
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const [withdrawMsg, setWithdrawMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
    const address: string = account?.address ?? ""
    const linked = links.some((l) => l.address.toLowerCase() === address.toLowerCase())

    const loadLinks = useCallback(async (t: string) => {
        if (!t) return
        const r = await api(`${SWISSQUOTE_URL}/wallet/links`, { token: t })
        if (r.ok) { setLinks(r.data.links); setWho(r.data.customer) } else { setToken(""); ss.set("sq-token", "") }
    }, [])
    useEffect(() => { const t = ss.get("sq-token"); if (t) { setToken(t); loadLinks(t) } }, [loadLinks])

    const login = async () => {
        setBusy("login"); setMsg(null)
        try {
            const r = await api(`${SWISSQUOTE_URL}/auth/login`, { customer, password })
            if (!r.ok) throw new Error(r.data.error)
            setToken(r.data.token); ss.set("sq-token", r.data.token); setPassword("")
            await loadLinks(r.data.token)
        } catch (e) { setMsg({ kind: "err", text: errText(e) + " (le faux serveur Swissquote est-il lancé sur le port 4000 ?)" }) }
        setBusy("")
    }
    const logout = () => { setToken(""); setWho(""); setLinks([]); ss.set("sq-token", "") }

    const prove = async () => {
        setBusy("prove"); setMsg(null)
        try {
            const ch = await api(`${SWISSQUOTE_URL}/wallet/challenge`, { token, address })
            if (!ch.ok) throw new Error(ch.data.error)
            const signature = await account.signMessage({ message: ch.data.message }) // Touch ID : le wallet signe, aucune clé ne sort
            const r = await api(`${SWISSQUOTE_URL}/wallet/link`, { token, address, nonce: ch.data.nonce, message: ch.data.message, signature })
            if (!r.ok) throw new Error(r.data.error)
            setMsg({ kind: "ok", text: "Propriété prouvée : Swissquote a vérifié ta signature sur la blockchain. Ce wallet est lié à ton compte." })
            await loadLinks(token)
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    const withdraw = async (to: string, label: string) => {
        setBusy("w"); setWithdrawMsg(null)
        const r = await api(`${SWISSQUOTE_URL}/withdraw`, { token, to, amount: "100 USDC" })
        setWithdrawMsg(r.ok ? { kind: "ok", text: `✅ ${label} : ${r.data.reason}` } : { kind: "err", text: `⛔ ${label} : ${r.data.reason ?? r.data.error}` })
        setBusy("")
    }

    return (
        <Card tone="mock" title="Compte Swissquote et preuve de propriété">
            <p className="text-sm"><MockBadge /> Le compte Swissquote est simulé. Lier ton wallet permet à Swissquote de respecter la <b>Travel Rule</b> (FINMA) : elle n'envoie de l'argent vers un wallet externe qu'après avoir vérifié <b>qui le possède</b>, sans jamais voir ta clé.</p>
            {!token ? (
                <>
                    <Input placeholder="Numéro de client" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                    <Input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <p className="text-xs text-gray-400">Compte de démonstration : <b>CH-1001</b> / <b>demo1234</b> (MOCK)</p>
                    <Btn onClick={login} busy={busy === "login"} disabled={!customer || !password}>Se connecter à Swissquote</Btn>
                </>
            ) : (
                <>
                    <p className="text-sm">Connecté : <b>{who}</b> <button className="underline text-blue-400" onClick={logout}>se déconnecter</button></p>
                    {links.length > 0 && (
                        <ul className="text-sm space-y-1">
                            {links.map((l) => <li key={l.address}>🔗 Wallet <code>{fmtAddr(l.address)}</code> lié le {new Date(l.verifiedAt).toLocaleString("fr-CH")} — {l.method}</li>)}
                        </ul>
                    )}
                    {!ready ? <p className="text-sm text-gray-400">Connecte ton wallet (Register ou Login) pour le lier.</p> : (
                        <>
                            <p className="text-sm">Wallet à lier : <code>{fmtAddr(address)}</code> {linked && "✅ déjà lié"}</p>
                            <Btn tone="purple" onClick={prove} busy={busy === "prove"} disabled={linked}>Prouver que ce wallet m'appartient (Touch ID)</Btn>
                            <p className="text-sm font-semibold pt-2">Simulation d'un retrait depuis ton compte Swissquote (100 USDC)</p>
                            <div className="flex gap-2">
                                <Btn tone="green" onClick={() => withdraw(address, "Vers mon wallet")} busy={busy === "w"}>Vers mon wallet</Btn>
                                <Btn tone="red" onClick={() => withdraw("0x2222222222222222222222222222222222222222", "Vers une adresse inconnue")} busy={busy === "w"}>Vers une adresse inconnue</Btn>
                            </div>
                            {withdrawMsg && <Msg kind={withdrawMsg.kind}>{withdrawMsg.text}</Msg>}
                        </>
                    )}
                </>
            )}
            {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        </Card>
    )
}
