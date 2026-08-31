import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: true })
}

