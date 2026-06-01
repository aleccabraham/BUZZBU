import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

export const maxDuration = 30

// POST /api/drive/upload-url
// Server initiates a Google Drive resumable upload session and returns
// the session URI to the client. The client then uploads the file bytes
// directly to Google — bypassing Vercel's 4.5MB body size limit entirely.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileName, mimeType, fileSize, folderId } = await request.json()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
    "X-Upload-Content-Type": mimeType || "application/octet-stream",
  }
  if (fileSize) headers["X-Upload-Content-Length"] = String(fileSize)

  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,thumbnailLink,createdTime,size",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    }
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    console.error("upload-url initiation failed", initRes.status, err)
    return NextResponse.json(
      { error: `Google ${initRes.status}: ${err.slice(0, 300)}` },
      { status: 500 }
    )
  }

  const uploadUrl = initRes.headers.get("location")
  return NextResponse.json({ uploadUrl })
}
