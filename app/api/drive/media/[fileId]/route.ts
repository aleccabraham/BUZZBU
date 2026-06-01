import { getServerSession } from "next-auth/next"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { getDriveClient } from "@/lib/drive"
import { Readable } from "stream"

// GET /api/drive/media/[fileId] — proxy file content from Drive to browser
// Supports Range requests for video seeking
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { fileId } = params

  try {
    const drive = getDriveClient(session.accessToken)

    // Get file metadata first
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType, name, size",
    })

    const mimeType = meta.data.mimeType ?? "application/octet-stream"
    const fileSize = parseInt(meta.data.size ?? "0", 10)

    const rangeHeader = request.headers.get("range")

    if (rangeHeader && mimeType.startsWith("video/")) {
      // Partial content for video seeking
      const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-")
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1
      const chunkSize = end - start + 1

      const res = await drive.files.get(
        { fileId, alt: "media" },
        {
          responseType: "stream",
          headers: { Range: `bytes=${start}-${end}` },
        }
      )

      const webStream = nodeToWebStream(res.data as unknown as Readable)

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": mimeType,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }

    // Full file download
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    )

    const webStream = nodeToWebStream(res.data as unknown as Readable)

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600",
      "Accept-Ranges": "bytes",
    }
    if (fileSize > 0) headers["Content-Length"] = String(fileSize)

    return new NextResponse(webStream, { status: 200, headers })
  } catch (err) {
    console.error("media proxy error", err)
    return new NextResponse("Failed to fetch file", { status: 500 })
  }
}

function nodeToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      nodeStream.on("end", () => controller.close())
      nodeStream.on("error", (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}
