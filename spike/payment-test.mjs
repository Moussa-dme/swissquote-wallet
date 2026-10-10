// Test du coordinateur : confirmation d'un gros paiement par l'appareil de secours.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
const B = "http://localhost:3000/api/recovery"
const post = async (p, b) => { const r = await fetch(`${B}/${p}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return [r.status, await r.json()] }
const ok = (l, c, x = "") => { console.log(c ? "✅" : "❌", l, x); if (!c) process.exitCode = 1 }
const backup = privateKeyToAccount(generatePrivateKey()), other = privateKeyToAccount(generatePrivateKey())
const A = (n) => "0x" + String(n).padStart(40, "0")
const user = "paytest" + Math.floor(Math.random() * 1e6)
// pas de récupération installée => refus
let [s, r] = await post("payments", { username: user, to: A(9), amountUnits: "8000000", amountLabel: "8" })
ok("sans appareil de secours installé : refusé", s === 400, "→ " + r.error?.slice(0, 50))
await post("setup", { username: user, account: A(1), guardianAccount: A(4), delaySeconds: 60, guardians: { backup: backup.address, contact: A(2), swissquote: A(3) } })
;[s, r] = await post("payments", { username: user, to: A(9), amountUnits: "8000000", amountLabel: "8" })
ok("demande de gros paiement créée", s === 200); const id = r.id
const msg = `Confirmer le paiement ${id} : 8 USDC vers ${A(9)}`
// mauvaise signature (autre clé) => refusée
;[s, r] = await post(`payments/${id}/approve`, { signature: await other.signMessage({ message: msg }) })
ok("signature d'un autre appareil refusée", s === 403, "→ " + r.error?.slice(0, 55))
// signature de l'appareil de secours sur un AUTRE paiement (montant différent) => refusée
;[s, r] = await post(`payments/${id}/approve`, { signature: await backup.signMessage({ message: `Confirmer le paiement ${id} : 800 USDC vers ${A(9)}` }) })
ok("signature portant sur un autre montant refusée", s === 403)
// bonne signature => acceptée
;[s, r] = await post(`payments/${id}/approve`, { signature: await backup.signMessage({ message: msg }) })
ok("signature de l'appareil de secours acceptée", s === 200)
const st = await (await fetch(`${B}/state?username=${user}`)).json()
const p = st.payments.find((x) => x.id === id)
ok("statut = approved, signature jamais exposée", p.status === "approved" && p.approvalSignature === undefined)
// rejouer la même confirmation
;[s, r] = await post(`payments/${id}/approve`, { signature: await backup.signMessage({ message: msg }) })
ok("rejeu de la confirmation refusé", s === 403)
