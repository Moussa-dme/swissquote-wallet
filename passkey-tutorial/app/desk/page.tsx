"use client"
// MOCK — Guichet d'agence Swissquote : l'agent vérifie l'identité du client EN PERSONNE
// (pièce d'identité + signature) puis valide le dossier. Aucune vraie banque ici, aucune authentification d'agent.
import React, { useCallback, useEffect, useState } from "react"
import { SWISSQUOTE_URL, api, errText, fmtAddr } from "@/lib/recovery"
import { Btn, Card, MockBadge, Msg, RoleHeader } from "../components/ui"

const STATUS: Record<string, string> = {
    awaiting_in_person_check: "à vérifier en personne",
    verified_in_person: "identité vérifiée ✅",
    approved: "approbation signée",
    rejected: "rejeté"
}

export default function DeskPage() {
    const [cases, setCases] = useState<any[]>([])
    const [err, setErr] = useState("")
    const refresh = useCallback(async () => {
        try { const r = await fetch(`${SWISSQUOTE_URL}/desk/cases`).then((x) => x.json()); setCases(r.cases ?? []); setErr("") }
        catch (e) { setErr("Serveur Swissquote injoignable : " + errText(e) + " — lance-le avec « node --env-file=../passkey-tutorial/.env.local server.mjs » dans mock-swissquote/.") }
    }, [])
    useEffect(() => { refresh(); const t = setInterval(refresh, 2000); return () => clearInterval(t) }, [refresh])
    const act = async (id: string, what: "verify" | "reject") => { await api(`${SWISSQUOTE_URL}/desk/cases/${id}/${what}`, {}); refresh() }

    return (
        <main className="min-h-screen px-4 py-12">
            <div className="max-w-lg mx-auto space-y-4">
                <RoleHeader emoji="🏦" title="Guichet Swissquote (simulé)" subtitle="L'agent contrôle la pièce d'identité du client en personne, puis valide son dossier." />
                <Msg kind="info">Simulation de l'agent en agence. Il contrôle la pièce d'identité du client et sa signature, puis valide le dossier. Sans cette étape, Swissquote ne signe rien.</Msg>
                {err && <Msg kind="err">{err}</Msg>}
                <Card title="Dossiers de récupération">
                    {cases.length === 0 && <p className="text-sm text-gray-400">Aucun dossier.</p>}
                    {cases.map((c) => (
                        <Card key={c.id} tone="mock">
                            <p className="text-sm">Dossier <b>{c.id}</b> — client <b>{c.username}</b> — wallet <code>{fmtAddr(c.account)}</code></p>
                            <p className="text-sm">Statut : <b>{STATUS[c.status] ?? c.status}</b>{c.otpAttempts > 0 && <> · ⚠️ {c.otpAttempts} tentative(s) par SMS/e-mail refusée(s)</>}</p>
                            {c.status === "awaiting_in_person_check" && (
                                <div className="flex gap-2">
                                    <Btn tone="green" onClick={() => act(c.id, "verify")}>Pièce d'identité contrôlée, client présent</Btn>
                                    <Btn tone="red" onClick={() => act(c.id, "reject")}>Refuser</Btn>
                                </div>
                            )}
                        </Card>
                    ))}
                </Card>
            </div>
        </main>
    )
}
