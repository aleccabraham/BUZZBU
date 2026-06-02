import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getDriveClient } from "@/lib/drive"

export const maxDuration = 30

// POST /api/drive/make-public
// Sets a file or folder to "anyone with link" reader access.
// Returns the public Google Drive download/view link.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId, type = "file" } = await request.json()
  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 })
  }

  try {
    const drive = getDriveClient(session.accessToken)

    // Check if already public
    const perms = await drive.permissions.list({
      fileId,
      fields: "permissions(id, type, role)",
    })

    const alreadyPublic = perms.data.permissions?.some(
      (p) => p.type === "anyone" && p.role === "reader"
    )

    if (!alreadyPublic) {
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      })
    }

    // Get the file's web links
    const file = await drive.files.get({
      fileId,
      fields: "id, webViewLink, webContentLink, mimeType",
    })

    const isFolder = file.data.mimeType === "application/vnd.google-apps.folder"

    return NextResponse.json({
      publicUrl: isFolder
        ? file.data.webViewLink
        : `https://drive.google.com/uc?export=download&id=${fileId}`,
      viewUrl: file.data.webViewLink,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
