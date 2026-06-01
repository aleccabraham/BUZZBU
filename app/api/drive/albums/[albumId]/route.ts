export const maxDuration = 60

import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getDriveClient } from "@/lib/drive"

// GET /api/drive/albums/[albumId] — get folder metadata (name)
export async function GET(
  _request: NextRequest,
  { params }: { params: { albumId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const drive = getDriveClient(session.accessToken)
    const file = await drive.files.get({
      fileId: params.albumId,
      fields: "id, name, createdTime",
    })
    return NextResponse.json({ album: file.data })
  } catch (err) {
    console.error("album GET error", err)
    return NextResponse.json({ error: "Album not found" }, { status: 404 })
  }
}
