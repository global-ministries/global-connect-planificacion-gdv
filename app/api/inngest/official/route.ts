import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Inngest endpoint ready' })
}

export async function POST() {
  return NextResponse.json({ ok: true, message: 'Inngest endpoint ready' })
}

export async function PUT() {
  return NextResponse.json({ ok: true, message: 'Inngest endpoint ready' })
}

