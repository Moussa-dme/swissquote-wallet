// Petits composants d'interface partagés (style sobre, Tailwind)
import React from "react"

export const Card = ({ title, children, tone = "default" }: { title?: string; children: React.ReactNode; tone?: "default" | "mock" | "warn" }) => (
    <section className={`rounded-xl border p-4 space-y-3 ${tone === "mock" ? "border-amber-500/60 bg-amber-500/5" : tone === "warn" ? "border-red-500/60 bg-red-500/5" : "border-gray-600"}`}>
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {children}
    </section>
)

export const MockBadge = ({ children = "MOCK" }: { children?: React.ReactNode }) => (
    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-black align-middle">{children}</span>
)

export const Btn = ({ onClick, disabled, busy, tone = "blue", children }: { onClick: () => void; disabled?: boolean; busy?: boolean; tone?: "blue" | "green" | "red" | "purple" | "gray"; children: React.ReactNode }) => {
    const c = { blue: "bg-blue-500 hover:bg-blue-700", green: "bg-green-500 hover:bg-green-700", red: "bg-red-500 hover:bg-red-700", purple: "bg-purple-500 hover:bg-purple-700", gray: "bg-gray-500 hover:bg-gray-600" }[tone]
    return (
        <button onClick={onClick} disabled={disabled || busy} className={`px-4 py-2 rounded-lg text-white w-full ${disabled || busy ? "bg-gray-600 cursor-not-allowed" : c}`}>
            {busy ? "…en cours" : children}
        </button>
    )
}

export const Msg = ({ kind, children }: { kind: "ok" | "err" | "info"; children: React.ReactNode }) => (
    <p className={`text-sm rounded-lg p-2 ${kind === "ok" ? "bg-green-500/15 text-green-300" : kind === "err" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-200"}`}>{children}</p>
)

export const useNow = (ms = 1000) => {
    const [now, setNow] = React.useState(Date.now())
    React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
    return now
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} className={`p-2 border border-gray-300 rounded-lg w-full text-black ${p.className ?? ""}`} />
)

export const countdown = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s` }
