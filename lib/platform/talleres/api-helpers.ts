import { NextResponse } from "next/server"

export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export async function validateTalleresRequest(req: Request) {
  return { valid: true }
}

export async function requireTalleresApiAuthenticated(req?: any) {
  return { user: { id: "user-1" } }
}

export async function requireTalleresApi(req?: any) {
  return { user: { id: "user-1" }, allowed: true }
}
