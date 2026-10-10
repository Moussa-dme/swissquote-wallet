// Composants d'interface partagés (thème sombre sobre, Tailwind)
import React from "react"
import Link from "next/link"

export const Card = ({ title, children, tone = "default" }: { title?: string; children: React.ReactNode; tone?: "default" | "mock" | "warn" | "ok" }) => (
    <section className={`rounded-2xl border p-4 sm:p-5 space-y-3 backdrop-blur-sm ${
        tone === "mock" ? "border-amber-400/40 bg-amber-400/5"
        : tone === "warn" ? "border-red-400/50 bg-red-500/10"
        : tone === "ok" ? "border-emerald-400/40 bg-emerald-400/5"
        : "border-white/10 bg-white/5"}`}>
        {title && <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>}
        {children}
    </section>
)

export const MockBadge = ({ children = "MOCK" }: { children?: React.ReactNode }) => (
    <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-black align-middle">{children}</span>
)

export const Pill = ({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" | "red" | "blue" }) => {
    const c = { gray: "bg-white/10 text-slate-200", green: "bg-emerald-400/15 text-emerald-300", amber: "bg-amber-400/15 text-amber-300", red: "bg-red-400/15 text-red-300", blue: "bg-sky-400/15 text-sky-300" }[tone]
    return <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${c}`}>{children}</span>
}

export const Btn = ({ onClick, disabled, busy, tone = "blue", children }: { onClick: () => void; disabled?: boolean; busy?: boolean; tone?: "blue" | "green" | "red" | "purple" | "gray"; children: React.ReactNode }) => {
    const c = {
        blue: "bg-sky-500 hover:bg-sky-400", green: "bg-emerald-500 hover:bg-emerald-400",
        red: "bg-red-500 hover:bg-red-400", purple: "bg-violet-500 hover:bg-violet-400", gray: "bg-white/15 hover:bg-white/25"
    }[tone]
    return (
        <button onClick={onClick} disabled={disabled || busy}
            className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium w-full transition-colors ${disabled || busy ? "bg-white/10 text-slate-400 cursor-not-allowed" : c}`}>
            {busy ? "… en cours" : children}
        </button>
    )
}

export const Msg = ({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) => (
    <p className={`text-sm rounded-xl p-3 ${kind === "ok" ? "bg-emerald-400/15 text-emerald-200" : kind === "err" ? "bg-red-400/15 text-red-200" : "bg-sky-400/15 text-sky-100"}`}>{children}</p>
)

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} className={`px-3 py-2.5 rounded-xl w-full bg-white/10 border border-white/15 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${p.className ?? ""}`} />
)

// En-tête commun des pages « rôle » (gardien, nouvel appareil, guichet)
export const RoleHeader = ({ title, subtitle, emoji }: { title: string; subtitle: string; emoji: string }) => (
    <header className="space-y-2 pb-2">
        <Link href="/" className="text-sm text-sky-300 hover:text-sky-200">← Retour au wallet</Link>
        <h1 className="text-3xl font-semibold tracking-tight">{emoji} {title}</h1>
        <p className="text-sm text-slate-300">{subtitle}</p>
    </header>
)

export const useNow = (ms = 1000) => {
    const [now, setNow] = React.useState(Date.now())
    React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
    return now
}

export const countdown = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s` }
