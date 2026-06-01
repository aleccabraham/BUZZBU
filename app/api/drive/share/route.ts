export const maxDuration = 60

import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getDriveClient } from "@/lib/drive"

// POST /api/drive/share — share a folder with an email (viewer access)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { folderId, email } = await request.json()

  if (!folderId || !email) {
    return NextResponse.json(
      { error: "folderId and email are required" },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  try {
    const drive = getDriveClient(session.accessToken)

    await drive.permissions.create({
      fileId: folderId,
      sendNotificationEmail: true,
      requestBody: {
        role: "reader",
        type: "user",
        emailAddress: email,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error("share POST error", err)
    const message =
      err instanceof Error ? err.message : "Failed to share album"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
