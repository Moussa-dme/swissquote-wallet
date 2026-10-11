"use client"
// Envoi d'USDC avec contrôle selon le montant :
//   - petit montant  : passkey seul (Touch ID) ;
//   - gros montant   : passkey + confirmation du SECOND APPAREIL (appareil de secours) après lecture d'un résumé.
// Avant toute signature : simulation de la transaction (elle ne doit pas échouer) + contrôle de l'adresse
// destinataire par Swissquote (MOCK) qui AVERTIT mais ne bloque jamais (aucun pouvoir sur les fonds).
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Address, encodeFunctionData, isAddress } from "viem"
import { SWISSQUOTE_URL, coord, errText, fmtAddr, isObsoleteSignerError, kernelClientPayingInUsdc, notifyObsolete, publicClient } from "@/lib/recovery"
import { SMALL_LIMIT_USDC, USDC, erc20Abi, fromUnits, isLarge, toUnits } from "@/lib/policy"
import { Btn, Card, Input, MockBadge, Msg, countdown, useNow } from "./ui"

// marge de solde exigée quand les frais sont payés en USDC (frais mesurés : ≈ 1,1 à 1,5 USDC ; ≈ 4 USDC et plus pour le 1er envoi d'un wallet neuf)
const FEE_MARGIN = BigInt(5_000_000)

type Props = { username: string; ready: boolean; account: any; client: any }
type Preview = {
    to: Address; units: bigint; label: string; large: boolean; balance: bigint
    simulationOk: boolean; simulationError?: string; flagged: boolean; flagReason?: string
}

export default function PaymentPanel({ username, ready, account, client }: Props) {
    const [to, setTo] = useState("")
    const [amount, setAmount] = useState("")
    const [balance, setBalance] = useState<bigint | null>(null)
    const [preview, setPreview] = useState<Preview | null>(null)
    const [gas, setGas] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const [payGasUsdc, setPayGasUsdc] = useState(false)
    const [deployed, setDeployed] = useState<boolean | null>(null)
    const [paymentId, setPaymentId] = useState("")
    const [state, setState] = useState<any>(null)
    const [busy, setBusy] = useState("")
    const [msg, setMsg] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null)
    const sending = useRef(false)
    const now = useNow()
    const address: string = account?.address ?? ""

    const copyAddress = async () => {
        try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
    }
    const loadBalance = useCallback(async () => {
        if (!address) return
        try { setBalance(await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address as Address] }) as bigint) } catch {}
    }, [address])
    useEffect(() => { loadBalance() }, [loadBalance])

    // Frais pris en charge : combien d'opérations gratuites reste-t-il aujourd'hui pour ce wallet ?
    const loadGas = useCallback(async () => {
        if (!address) return
        try { setGas(await fetch(`/api/gas/usage?address=${address}`).then((x) => x.json())) } catch {}
    }, [address])
    useEffect(() => { loadGas() }, [loadGas])
    // Le wallet est-il déjà déployé ? (son 1er envoi le déploie : bien plus cher à payer en USDC)
    const loadDeployed = useCallback(async () => {
        if (!address) return
        try { const c = await publicClient.getCode({ address: address as Address }); setDeployed(Boolean(c && c !== "0x")) } catch {}
    }, [address])
    useEffect(() => { loadDeployed() }, [loadDeployed])
    useEffect(() => { if (deployed === false) setPayGasUsdc(false) }, [deployed])
    const quotaExhausted = Boolean(gas && gas.walletUsed >= gas.walletQuota)
    useEffect(() => { if (quotaExhausted) setPayGasUsdc(true) }, [quotaExhausted])

    const refresh = useCallback(async () => {
        if (!username) return
        const r = await coord(`state?username=${encodeURIComponent(username)}`)
        if (r.ok) setState(r.data)
    }, [username])
    useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t) }, [refresh])

    const payment = (state?.payments ?? []).find((p: any) => p.id === paymentId)

    // 1) Simulation en langage clair + contrôle de l'adresse
    const simulate = async () => {
        setBusy("sim"); setMsg(null); setPreview(null); setPaymentId("")
        try {
            if (!isAddress(to)) throw new Error("L'adresse du destinataire n'est pas valide (elle commence par 0x et fait 42 caractères).")
            let units: bigint
            try { units = toUnits(amount) } catch { throw new Error("Le montant n'est pas valide.") }
            if (units <= BigInt(0)) throw new Error("Le montant doit être supérieur à zéro.")
            const bal = (await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [address as Address] })) as bigint
            setBalance(bal)
            // simulation : la transaction réussirait-elle ? (appel à blanc, rien n'est envoyé)
            let simulationOk = true, simulationError: string | undefined
            try { await publicClient.simulateContract({ account: address as Address, address: USDC, abi: erc20Abi, functionName: "transfer", args: [to as Address, units] }) }
            catch (e) { simulationOk = false; simulationError = errText(e) }
            // contrôle de l'adresse par Swissquote (MOCK) : avertit, ne bloque pas
            let flagged = false, flagReason: string | undefined
            try { const sc = await fetch(`${SWISSQUOTE_URL}/screen/${to}`).then((r) => r.json()); flagged = sc.flagged; flagReason = sc.reason } catch {}
            setPreview({ to: to as Address, units, label: fromUnits(units), large: isLarge(units), balance: bal, simulationOk, simulationError, flagged, flagReason })
        } catch (e) { setMsg({ kind: "err", text: errText(e) }) }
        setBusy("")
    }

    // 2) Envoi : petit = Touch ID ; gros = d'abord confirmation de l'appareil de secours
    const doSend = async (pv: Preview) => {
        if (sending.current) return
        sending.current = true
        try {
            setBusy("send")
            const transfer = { to: USDC, value: BigInt(0), data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [pv.to, pv.units] }) }
            let hash, receipt
            if (payGasUsdc) {
                // le client paie ses frais en USDC : autorisation du paymaster + paiement dans la même opération
                const { client: usdcClient, approveCall } = kernelClientPayingInUsdc(account)
                hash = await usdcClient.sendUserOperation({ callData: await account.encodeCalls([await approveCall(), transfer]) }) // Touch ID
                receipt = await usdcClient.waitForUserOperationReceipt({ hash })
            } else {
                hash = await client.sendUserOperation({ callData: await account.encodeCalls([transfer]) }) // Touch ID
                receipt = await client.waitForUserOperationReceipt({ hash })
            }
            if (paymentId) await coord(`payments/${paymentId}/done`, { txHash: receipt.receipt.transactionHash })
            setMsg({ kind: "ok", text: `✅ ${pv.label} USDC envoyés à ${fmtAddr(pv.to)}. {payGasUsdc ? "Frais payés par toi en USDC." : "Frais payés par Swissquote (gasless)."} Transaction : ${fmtAddr(receipt.receipt.transactionHash)}` })
            setPreview(null); setPaymentId(""); setAmount(""); loadBalance(); loadGas(); loadDeployed()
        } catch (e) {
            if (isObsoleteSignerError(e)) notifyObsolete() // l'ancienne clé est refusée : l'accueil affiche « appareil obsolète »
            setMsg({ kind: "err", text: "Envoi impossible : " + errText(e) })
        }
        setBusy(""); sending.current = false
    }

    const send = async () => {
        if (!preview) return
        setMsg(null)
        if (!preview.large) return doSend(preview)
        // gros montant : demande de confirmation au second appareil
        setBusy("ask")
        const r = await coord("payments", { username, to: preview.to, amountUnits: preview.units.toString(), amountLabel: preview.label })
        if (!r.ok) { setMsg({ kind: "err", text: r.data.error }); setBusy(""); return }
        setPaymentId(r.data.id)
        setMsg({ kind: "info", text: "Gros montant : ouvre /guardian sur ton appareil de secours et confirme ce paiement." })
        setBusy("")
    }

    // dès que l'appareil de secours a confirmé, on envoie (Touch ID)
    useEffect(() => {
        if (payment?.status === "approved" && preview && !sending.current && busy === "") doSend(preview)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payment?.status])

    if (!ready) return <Card title="Envoyer des USDC"><p className="text-sm text-gray-400">Connecte-toi d'abord (Register ou Login).</p></Card>

    const waiting = payment?.status === "pending"
    return (
        <Card title={`Envoyer des USDC (petit ≤ ${SMALL_LIMIT_USDC} · gros > ${SMALL_LIMIT_USDC})`}>
            <p className="text-sm flex items-center justify-between gap-2">
                <span className="text-slate-300">Adresse du wallet : <code>{fmtAddr(address)}</code></span>
                <button className="text-sky-300 hover:text-sky-200" onClick={copyAddress}>{copied ? "copié ✓" : "copier l'adresse"}</button>
            </p>
            <p className="text-sm">
                Solde du wallet : <b>{balance === null ? "…" : fromUnits(balance)} USDC</b>{" "}
                <button className="underline text-blue-400" onClick={loadBalance}>actualiser</button>
            </p>
            {balance === BigInt(0) && (
                <Msg kind="info">
                    Pas d'USDC de test. Va sur <b>faucet.circle.com</b>, choisis <b>Ethereum Sepolia</b> et <b>USDC</b>, colle l'adresse de ton wallet : <code>{address}</code>
                </Msg>
            )}
            <Input placeholder="Adresse du destinataire (0x…)" value={to} onChange={(e) => setTo(e.target.value.trim())} />
            <div className="flex gap-2">
                <Input placeholder="Montant en USDC" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                <Btn onClick={simulate} busy={busy === "sim"} disabled={!to || !amount} tone="gray">Vérifier</Btn>
            </div>
            <div className="text-xs text-gray-400">
                Raccourci de test : <button className="underline" onClick={() => setTo("0x2222222222222222222222222222222222222222")}>adresse normale</button>{" · "}
                <button className="underline" onClick={() => setTo("0x000000000000000000000000000000000000dEaD")}>adresse signalée <MockBadge>MOCK</MockBadge></button>
            </div>

            {preview && (
                <Card title="Résumé avant signature">
                    <ul className="text-sm space-y-1">
                        <li>• Tu envoies <b>{preview.label} USDC</b> (jetons de test, aucune valeur réelle) à <code>{fmtAddr(preview.to)}</code>.</li>
                        <li>• Solde après : <b>{fromUnits(preview.balance >= preview.units ? preview.balance - preview.units : BigInt(0))} USDC</b>.</li>
                        <li>• Frais de réseau : {payGasUsdc ? <><b>payés par toi en USDC</b> (≈ 1,5 USDC, davantage pour un wallet neuf ; prélevés en plus du montant)</> : <><b>0</b> pour toi (payés par Swissquote, « gasless »){gas && <> · opérations gratuites aujourd'hui : <b>{gas.walletUsed}/{gas.walletQuota}</b></>}</>}.</li>
                        <li>• Simulation de la transaction : {preview.simulationOk ? <b className="text-green-400">elle réussirait ✅</b> : <b className="text-red-400">elle échouerait ❌ — {preview.simulationError}</b>}</li>
                        <li>• Contrôle de l'adresse (Swissquote, <MockBadge />) : {preview.flagged ? <b className="text-red-400">⚠️ {preview.flagReason}</b> : <b className="text-green-400">aucun signalement ✅</b>}</li>
                        <li>• Niveau de contrôle : {preview.large ? <b className="text-amber-300">GROS montant → passkey + confirmation de l'appareil de secours</b> : <b>petit montant → passkey seul</b>}</li>
                    </ul>
                    <label className="text-sm flex items-start gap-2">
                        <input type="checkbox" className="mt-1" checked={payGasUsdc} disabled={deployed === false} onChange={(e) => setPayGasUsdc(e.target.checked)} />
                        <span>Payer les frais en USDC plutôt qu'utiliser l'offre gratuite de Swissquote.{deployed === false && <b className="text-sky-300"> Ton wallet n'est pas encore déployé : ce premier envoi est offert par Swissquote et le déploie ; ensuite tu pourras payer tes frais en USDC.</b>}{quotaExhausted && <b className="text-amber-300"> Ton quota gratuit du jour est épuisé : c'est la seule option.</b>}</span>
                    </label>
                    {preview.flagged && <Msg kind="err">Swissquote te prévient mais ne bloque pas ton paiement : tes fonds restent sous ton seul contrôle. Es-tu certain de vouloir continuer ?</Msg>}
                    {!waiting && (
                        <Btn tone={preview.large ? "purple" : "green"} onClick={send} busy={busy === "send" || busy === "ask"} disabled={!preview.simulationOk || preview.balance < preview.units + (payGasUsdc ? FEE_MARGIN : BigInt(0))}>
                            {preview.large ? "Demander la confirmation de l'appareil de secours" : "Envoyer (Touch ID)"}
                        </Btn>
                    )}
                    {preview.balance < preview.units + (payGasUsdc ? FEE_MARGIN : BigInt(0)) && <Msg kind="err">Solde insuffisant{payGasUsdc ? " : pour payer les frais en USDC, il faut le montant plus environ 5 USDC de marge" : ""}.</Msg>}
                </Card>
            )}

            {waiting && (
                <Card tone="warn" title="⏳ En attente de ton appareil de secours">
                    <p className="text-sm">Ouvre <b>/guardian</b> (appareil de secours, nom « {username} ») et confirme le paiement de <b>{payment.amountLabel} USDC</b>. Expire dans {countdown(payment.expiresAt - now)}.</p>
                </Card>
            )}
            {payment?.status === "refused" && <Msg kind="err">Ton appareil de secours a refusé ce paiement.</Msg>}
            {msg && <Msg kind={msg.kind}>{msg.text}</Msg>}
        </Card>
    )
}
