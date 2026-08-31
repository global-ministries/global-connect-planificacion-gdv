import { NextResponse } from "next/server"

export async function drainSupportOutbox() {
  return { drained: 0 }
}

export async function drainSupportEventOutbox(options?: any) {
  return { drained: 0 }
}
