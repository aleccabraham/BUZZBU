export const maxDuration = 60

import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { Readable } from "stream"
import { authOptions } from "@/lib/auth"
import { getDriveClient } from "@/lib/drive"

// GET /api/drive/files?folderId=xxx — list files in an album
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get("folderId")

  if (!folderId) {
    return NextResponse.json({ error: "folderId is required" }, { status: 400 })
  }

  try {
    const drive = getDriveClient(session.accessToken)

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, thumbnailLink, createdTime, size)",
      orderBy: "createdTime",
      pageSize: 1000,
    })

    return NextResponse.json({ files: res.data.files ?? [] })
  } catch (err) {
    console.error("files GET error", err)
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 })
  }
}

// POST /api/drive/files — upload a file to a folder
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderId = formData.get("folderId") as string | null

    if (!file || !folderId) {
      return NextResponse.json(
        { error: "file and folderId are required" },
        { status: 400 }
      )
    }

    const drive = getDriveClient(session.accessToken)

    const buffer = Buffer.from(await file.arrayBuffer())
    const stream = Readable.from(buffer)

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || "application/octet-stream",
        body: stream,
      },
      fields: "id, name, mimeType, thumbnailLink, createdTime, size",
    })

    return NextResponse.json({ file: uploaded.data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error("files POST error", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/drive/files?fileId=xxx — delete a file
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get("fileId")

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 })
  }

  try {
    const drive = getDriveClient(session.accessToken)
    await drive.files.delete({ fileId })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("files DELETE error", err)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
