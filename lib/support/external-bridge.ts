import { NextResponse } from "next/server"

export async function handleExternalInbound(req: Request) {
  return NextResponse.json({ received: true })
}

export async function supportExternalInboundRoute(req: any) {
  return NextResponse.json({ ok: true })
}
