import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

// POST /api/drive/upload-chunk
// Receives a file chunk from the browser and forwards it to Google Drive.
// Each chunk is ≤ 3.5MB so it stays under Vercel's 4.5MB request body limit.
// No auth needed — the uploadUrl is self-authenticating (Drive resumable session URI).
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chunk = formData.get("chunk") as File | null
    const uploadUrl = formData.get("uploadUrl") as string | null
    const start = parseInt(formData.get("start") as string)
    const total = parseInt(formData.get("total") as string)
    const mimeType = (formData.get("mimeType") as string) || "application/octet-stream"

    if (!chunk || !uploadUrl) {
      return NextResponse.json({ error: "chunk and uploadUrl required" }, { status: 400 })
    }

    const end = start + chunk.size - 1
    const buffer = Buffer.from(await chunk.arrayBuffer())

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
      body: buffer,
    })

    if (res.status === 200 || res.status === 201) {
      const data = await res.json()
      return NextResponse.json({ done: true, file: data })
    }

    if (res.status === 308) {
      const range = res.headers.get("range")
      return NextResponse.json({ done: false, range })
    }

    const err = await res.text()
    return NextResponse.json(
      { error: `Drive chunk error (${res.status}): ${err.slice(0, 200)}` },
      { status: 500 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
