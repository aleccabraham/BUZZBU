export const maxDuration = 60

import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getDriveClient, getOrCreatePhotoAppFolder } from "@/lib/drive"

// GET /api/drive/albums — list all albums + cover thumbnails
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const shared = searchParams.get("shared") === "true"

  try {
    const drive = getDriveClient(session.accessToken)

    if (shared) {
      // Folders shared with this user by other app users
      const res = await drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder' and sharedWithMe=true and trashed=false",
        fields: "files(id, name, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
      })

      const folders = res.data.files ?? []

      // Fetch first-file thumbnail for each folder in parallel
      const albums = await Promise.all(
        folders.map(async (folder) => {
          const coverRes = await drive.files.list({
            q: `'${folder.id}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
            fields: "files(id, thumbnailLink, mimeType)",
            pageSize: 1,
            orderBy: "createdTime",
          })

          const cover = coverRes.data.files?.[0]

          return {
            id: folder.id,
            name: folder.name,
            createdTime: folder.createdTime,
            coverThumbnail: cover?.thumbnailLink ?? null,
            coverFileId: cover?.id ?? null,
            itemCount: 0,
          }
        })
      )

      return NextResponse.json({ albums })
    }

    // My albums — inside the PhotoApp root folder
    const rootId = await getOrCreatePhotoAppFolder(session.accessToken)

    const res = await drive.files.list({
      q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime desc",
      pageSize: 100,
    })

    const folders = res.data.files ?? []

    const albums = await Promise.all(
      folders.map(async (folder) => {
        const [coverRes, countRes] = await Promise.all([
          drive.files.list({
            q: `'${folder.id}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`,
            fields: "files(id, thumbnailLink)",
            pageSize: 1,
            orderBy: "createdTime",
          }),
          drive.files.list({
            q: `'${folder.id}' in parents and trashed=false`,
            fields: "files(id)",
            pageSize: 1000,
          }),
        ])

        return {
          id: folder.id,
          name: folder.name,
          createdTime: folder.createdTime,
          coverThumbnail: coverRes.data.files?.[0]?.thumbnailLink ?? null,
          coverFileId: coverRes.data.files?.[0]?.id ?? null,
          itemCount: countRes.data.files?.length ?? 0,
        }
      })
    )

    return NextResponse.json({ albums, rootFolderId: rootId })
  } catch (err: unknown) {
    console.error("albums GET error", err)
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    )
  }
}

// POST /api/drive/albums — create a new album folder
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: "Album name is required" }, { status: 400 })
  }

  try {
    const drive = getDriveClient(session.accessToken)
    const rootId = await getOrCreatePhotoAppFolder(session.accessToken)

    const folder = await drive.files.create({
      requestBody: {
        name: name.trim(),
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootId],
      },
      fields: "id, name, createdTime",
    })

    return NextResponse.json({
      album: {
        id: folder.data.id,
        name: folder.data.name,
        createdTime: folder.data.createdTime,
        coverThumbnail: null,
        itemCount: 0,
      },
    })
  } catch (err) {
    console.error("albums POST error", err)
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    )
  }
}
