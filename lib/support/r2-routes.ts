import { NextResponse } from "next/server"

export async function handleR2Download(attachmentId: string) {
  return NextResponse.json({ url: "" })
}
export async function handleR2Intent(req: Request) {
  return NextResponse.json({ uploadUrl: "", key: "" })
}
export async function handleR2Finalize(req: Request) {
  return NextResponse.json({ success: true })
}

export async function supportAttachmentDownloadRoute(req: any, ctx: any) {
  return NextResponse.json({ ok: true })
}

export async function supportAttachmentDownloadHeadRoute(req: any, ctx: any) {
  return new Response(null, { status: 200 })
}

export async function supportAttachmentFinalizeRoute(req: any) {
  return NextResponse.json({ ok: true })
}

export async function supportAttachmentIntentRoute(req: any) {
  return NextResponse.json({ ok: true })
}
