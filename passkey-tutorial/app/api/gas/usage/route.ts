import { NextRequest, NextResponse } from "next/server"
import { usage } from "@/lib/gas"
export const dynamic = "force-dynamic"
export async function GET(req: NextRequest) {
    const address = new URL(req.url).searchParams.get("address") ?? undefined
    return NextResponse.json(usage(address))
}
