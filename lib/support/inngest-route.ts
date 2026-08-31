import { NextResponse } from "next/server"

export async function handleInngestRoute(req: Request) {
  return NextResponse.json({ ok: true })
}
