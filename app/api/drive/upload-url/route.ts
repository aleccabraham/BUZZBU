import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"

export const maxDuration = 30

// POST /api/drive/upload-url
// Uses googleapis auth to initiate a Drive resumable upload session.
// Returns the session URI so the browser can upload directly to Google Drive,
// bypassing Vercel's payload size limit entirely.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileName, mimeType, fileSize, folderId } = await request.json()

  try {
    // Use googleapis auth object — handles token correctly for all scopes
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })

    const reqHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Upload-Content-Type": mimeType || "application/octet-stream",
    }
    if (fileSize) reqHeaders["X-Upload-Content-Length"] = String(fileSize)

    const authHeaders = await auth.getRequestHeaders(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
    )

    const initRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=${encodeURIComponent("id,name,mimeType,thumbnailLink,createdTime,size")}`,
      {
        method: "POST",
        headers: { ...reqHeaders, ...authHeaders },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      }
    )

    if (!initRes.ok) {
      const err = await initRes.text()
      console.error("upload-url failed", initRes.status, err)
      return NextResponse.json(
        { error: `Google ${initRes.status}: ${err.slice(0, 300)}` },
        { status: 500 }
      )
    }

    const uploadUrl = initRes.headers.get("location")
    if (!uploadUrl) {
      return NextResponse.json({ error: "No upload URL returned by Google" }, { status: 500 })
    }

    return NextResponse.json({ uploadUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error("upload-url error", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
