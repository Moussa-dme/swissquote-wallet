"use client"

import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient
} from "@zerodev/sdk"
import {
    PasskeyValidatorContractVersion,
    WebAuthnMode,
    toPasskeyValidator,
    toWebAuthnKey
} from "@zerodev/passkey-validator"
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants"
import React, { useEffect, useRef, useState } from "react"
import { createPublicClient, http, parseAbi, encodeFunctionData } from "viem"
import { sepolia } from "viem/chains"
import OwnerRecoveryPanel from "./components/OwnerRecoveryPanel"
import { Btn, Card, Input, Msg, Pill } from "./components/ui"
import { coord, fmtAddr, gasStationUrl } from "@/lib/recovery"
import PaymentPanel from "./components/PaymentPanel"
import SwissquoteLinkPanel from "./components/SwissquoteLinkPanel"

const CHAIN = sepolia
// URLs lues depuis .env.local (voir .env.example) pour ne pas mettre le Project ID dans Git
const PASSKEY_SERVER_URL = process.env.NEXT_PUBLIC_PASSKEY_SERVER_URL ?? ""
const ZERODEV_RPC_URL = process.env.NEXT_PUBLIC_BUNDLER_URL ?? ""
const entryPoint = getEntryPoint("0.7")

const contractAddress = "0x34bE7f35132E97915633BC1fc020364EA5134863"
const contractABI = parseAbi([
    "function mint(address _to) public",
    "function balanceOf(address owner) external view returns (uint256 balance)"
])

const publicClient = createPublicClient({
    transport: http(ZERODEV_RPC_URL),
    chain: CHAIN
})


// Détail d'erreur lisible (Project ID masqué) pour savoir quelle requête HTTP échoue
const describeError = (e: any) =>
    [
        e?.shortMessage ?? e?.message ?? String(e),
        e?.url && "URL: " + String(e.url).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<ID>"),
        e?.status && "HTTP status: " + e.status,
        e?.details && "Détails: " + e.details,
        e?.cause?.message && "Cause: " + e.cause.message
    ]
        .filter(Boolean)
        .join("\n")

let kernelAccount: any
let kernelClient: any

export default function Home() {
    const [mounted, setMounted] = useState(false)
    const [username, setUsername] = useState("")
    const [accountAddress, setAccountAddress] = useState("")
    const [isKernelClientReady, setIsKernelClientReady] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isSendingUserOp, setIsSendingUserOp] = useState(false)
    const [userOpHash, setUserOpHash] = useState("")
    const [userOpStatus, setUserOpStatus] = useState("")
    const [advanced, setAdvanced] = useState(false)
    const advancedRef = useRef<HTMLDivElement>(null)
    const [protection, setProtection] = useState<any>(null)
    const [copied, setCopied] = useState(false)

    const createAccountAndClient = async (passkeyValidator: any) => {
        kernelAccount = await createKernelAccount(publicClient, {
            entryPoint,
            plugins: {
                sudo: passkeyValidator
            },
            kernelVersion: KERNEL_V3_1
        })

        console.log("Kernel account created: ", kernelAccount.address)

        kernelClient = createKernelAccountClient({
            account: kernelAccount,
            chain: CHAIN,
            bundlerTransport: http(ZERODEV_RPC_URL),
            paymaster: {
                getPaymasterData: async (userOperation) => {
                    // sponsoring via la « gas station » (quotas anti-abus), pas directement chez ZeroDev
                    const zeroDevPaymaster = await createZeroDevPaymasterClient(
                        {
                            chain: CHAIN,
                            transport: http(gasStationUrl()),
                        }
                    )
                    return zeroDevPaymaster.sponsorUserOperation({
                        userOperation,
                    })
                }
            }
        })

        setIsKernelClientReady(true)
        setAccountAddress(kernelAccount.address)
    }

    // Function to be called when "Register" is clicked
    const handleRegister = async () => {
        try {
            setIsRegistering(true)

            const webAuthnKey = await toWebAuthnKey({
                passkeyName: username,
                passkeyServerUrl: PASSKEY_SERVER_URL,
                mode: WebAuthnMode.Register,
                passkeyServerHeaders: {}
            })

            const passkeyValidator = await toPasskeyValidator(publicClient, {
                webAuthnKey,
                entryPoint,
                kernelVersion: KERNEL_V3_1,
                validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED
            })

            await createAccountAndClient(passkeyValidator)

            setIsRegistering(false)
        } catch (e: any) {
            console.error("Register failed:", e)
            window.alert("Register failed: " + describeError(e))
            setIsRegistering(false)
        }
    }

    const handleLogin = async () => {
        try {
            setIsLoggingIn(true)

            const webAuthnKey = await toWebAuthnKey({
                passkeyName: username,
                passkeyServerUrl: PASSKEY_SERVER_URL,
                mode: WebAuthnMode.Login,
                passkeyServerHeaders: {}
            })

            const passkeyValidator = await toPasskeyValidator(publicClient, {
                webAuthnKey,
                entryPoint,
                kernelVersion: KERNEL_V3_1,
                validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED
            })

            await createAccountAndClient(passkeyValidator)

            setIsLoggingIn(false)
        } catch (e: any) {
            console.error("Login failed:", e)
            window.alert("Login failed: " + describeError(e))
            setIsLoggingIn(false)
        }
    }

    // Function to be called when "Login" is clicked
    const handleSendUserOp = async () => {
        try {
            setIsSendingUserOp(true)
            setUserOpStatus("Sending UserOp...")

            const userOpHash = await kernelClient.sendUserOperation({
                callData: await kernelAccount.encodeCalls([
                    {
                        to: contractAddress,
                        value: BigInt(0),
                        data: encodeFunctionData({
                            abi: contractABI,
                            functionName: "mint",
                            args: [kernelAccount.address]
                        })
                    }
                ])
            })

            setUserOpHash(userOpHash)

            await kernelClient.waitForUserOperationReceipt({
                hash: userOpHash
            })

            // Update the message based on the count of UserOps
            const userOpMessage = `UserOp completed. <a href="https://jiffyscan.xyz/userOpHash/${userOpHash}?network=sepolia" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700">Click here to view.</a>`

            setUserOpStatus(userOpMessage)
            setIsSendingUserOp(false)
        } catch (e: any) {
            console.error("Send UserOp failed:", e)
            window.alert("Send UserOp failed: " + describeError(e))
            setIsSendingUserOp(false)
            setUserOpStatus("")
        }
    }

    useEffect(() => {
        setMounted(true)
    }, [])

    // Statut de protection (récupération installée ?) pour le mode basique
    useEffect(() => {
        if (!isKernelClientReady || !username) return
        const load = async () => {
            const r = await coord(`state?username=${encodeURIComponent(username)}`)
            if (r.ok) setProtection(r.data)
        }
        load()
        const t = setInterval(load, 4000)
        return () => clearInterval(t)
    }, [isKernelClientReady, username])

    const openAdvanced = () => {
        setAdvanced(true)
        setTimeout(() => advancedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150)
    }

    const copyAddress = async () => {
        try { await navigator.clipboard.writeText(accountAddress); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
    }

    if (!mounted) return <></>

    const connected = isKernelClientReady
    const protectedWallet = Boolean(protection?.setup)
    const busyAuth = isRegistering || isLoggingIn

    return (
        <main className="min-h-screen px-4 py-8 sm:py-12">
            <div className="w-full max-w-lg mx-auto space-y-4">
                {/* En-tête */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Swissquote Wallet</h1>
                        <p className="text-xs text-slate-400">Leurs clés, leur contrôle, à un pas de leur compte Swissquote.</p>
                    </div>
                    <Pill tone="amber">Réseau de test</Pill>
                </header>

                {!connected ? (
                    /* ---------- Accueil : créer ou retrouver son wallet ---------- */
                    <Card>
                        <h2 className="text-xl font-semibold">Votre wallet. Vos clés.</h2>
                        <p className="text-sm text-slate-300">
                            Pas de phrase secrète à noter : <b>Touch ID</b> ou <b>Face ID</b> protège votre wallet. La clé reste dans la puce de votre appareil,
                            personne d'autre ne peut déplacer vos fonds, pas même Swissquote.
                        </p>
                        <Input placeholder="Votre nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Btn onClick={handleRegister} busy={isRegistering} disabled={!username || busyAuth}>Créer mon wallet</Btn>
                            <Btn tone="purple" onClick={handleLogin} busy={isLoggingIn} disabled={!username || busyAuth}>Me connecter</Btn>
                        </div>
                        <p className="text-xs text-slate-400">Première fois : « Créer mon wallet ». Déjà un wallet : « Me connecter ».</p>
                        <div className="text-xs text-slate-400 pt-2 border-t border-white/10 space-x-4">
                            <a className="text-sky-300 hover:text-sky-200" href="/recover">J'ai perdu mon appareil</a>
                            <a className="text-sky-300 hover:text-sky-200" href="/guardian">Je suis un gardien</a>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* ---------- Mon wallet ---------- */}
                        <Card tone="ok">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm text-slate-300">Bonjour</p>
                                    <p className="text-xl font-semibold">{username}</p>
                                </div>
                                <Pill tone="green">🔒 Protégé par Touch ID</Pill>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-slate-300">Adresse : <code>{fmtAddr(accountAddress)}</code></span>
                                <span className="space-x-3">
                                    <button className="text-sky-300 hover:text-sky-200" onClick={copyAddress}>{copied ? "copié ✓" : "copier"}</button>
                                    <a className="text-sky-300 hover:text-sky-200" target="_blank" rel="noopener noreferrer" href={`https://sepolia.etherscan.io/address/${accountAddress}`}>voir sur la blockchain</a>
                                </span>
                            </div>
                        </Card>

                        {/* ---------- Protection ---------- */}
                        {protectedWallet ? (
                            <Card>
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="font-medium">Récupération activée ✅</p>
                                        <p className="text-sm text-slate-300">Si vous perdez cet appareil, 2 gardiens sur 3 vous aident à retrouver votre wallet.</p>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <Card tone="warn">
                                <p className="font-medium">⚠️ Wallet pas encore protégé</p>
                                <p className="text-sm text-slate-200">Sans récupération, perdre cet appareil signifie perdre l'accès. Elle est aussi nécessaire pour les gros paiements.</p>
                                <Btn tone="purple" onClick={openAdvanced}>Activer la protection</Btn>
                            </Card>
                        )}

                        {/* ---------- Envoyer (mode basique) ---------- */}
                        <PaymentPanel username={username} ready={isKernelClientReady} account={kernelAccount} client={kernelClient} />

                        {/* ---------- Mode avancé ---------- */}
                        <button className="w-full text-sm text-sky-300 hover:text-sky-200 py-2" onClick={() => setAdvanced(!advanced)}>
                            {advanced ? "▲ Masquer le mode avancé" : "▼ Mode avancé : récupération, compte Swissquote"}
                        </button>
                        {advanced && (
                            <div className="space-y-4 scroll-mt-4" ref={advancedRef}>
                                <OwnerRecoveryPanel username={username} accountAddress={accountAddress} ready={isKernelClientReady} kernelClient={kernelClient} kernelAccount={kernelAccount} />
                                <SwissquoteLinkPanel ready={isKernelClientReady} account={kernelAccount} />
                                <Card title="Transaction de test">
                                    <p className="text-sm text-slate-300">Envoie une vraie transaction sans frais (création d'un jeton de test).</p>
                                    <Btn tone="green" onClick={handleSendUserOp} busy={isSendingUserOp}>Envoyer une transaction de test</Btn>
                                    {userOpHash && <div className="text-sm" dangerouslySetInnerHTML={{ __html: userOpStatus }} />}
                                </Card>
                                <Card title="Autres écrans de la démo">
                                    <ul className="text-sm space-y-1 text-slate-300">
                                        <li><a className="text-sky-300 hover:text-sky-200" href="/guardian" target="_blank">Gardien</a> : appareil de secours ou contact de confiance</li>
                                        <li><a className="text-sky-300 hover:text-sky-200" href="/recover" target="_blank">Nouvel appareil</a> : récupérer après une perte</li>
                                        <li><a className="text-sky-300 hover:text-sky-200" href="/desk" target="_blank">Guichet Swissquote</a> (simulé)</li>
                                    </ul>
                                </Card>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
