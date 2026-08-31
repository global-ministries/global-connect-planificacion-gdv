import { NextResponse } from "next/server"

export async function handleTalleresRoute(req: any) {
  return NextResponse.json({ ok: true })
}

export function toTallerView(data: any) {
  return data
}
