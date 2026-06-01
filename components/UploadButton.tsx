"use client"

import { useRef, useState } from "react"
import type { DriveFile } from "@/app/albums/[albumId]/page"

type Props = {
  folderId: string
  onUploadComplete: (files: DriveFile[]) => void
}

type UploadItem = {
  name: string
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

export function UploadButton({ folderId, onUploadComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [showToast, setShowToast] = useState(false)

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList)
    if (!files.length) return

    const items: UploadItem[] = files.map((f) => ({ name: f.name, status: "pending" }))
    setQueue(items)
    setShowToast(true)

    const uploaded: DriveFile[] = []

    for (let i = 0; i < files.length; i++) {
      setQueue((q) => q.map((item, idx) => idx === i ? { ...item, status: "uploading" } : item))

      try {
        // Step 1: get a resumable upload URL from our server
        const urlRes = await fetch("/api/drive/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: files[i].name,
            mimeType: files[i].type || "application/octet-stream",
            fileSize: files[i].size,
            folderId,
          }),
        })

        if (!urlRes.ok) {
          const e = await urlRes.json().catch(() => ({}))
          throw new Error(`URL step failed: ${e.error ?? urlRes.status}`)
        }
        const { uploadUrl } = await urlRes.json()

        // Step 2: upload file bytes directly to Google Drive (no Vercel size limit)
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": files[i].type || "application/octet-stream",
            "Content-Length": String(files[i].size),
          },
          body: files[i],
        })

        if (!uploadRes.ok) {
          const body = await uploadRes.text()
          throw new Error(`Drive upload failed (${uploadRes.status}): ${body.slice(0, 200)}`)
        }

        const fileData = await uploadRes.json()

        uploaded.push({
          id: fileData.id,
          name: fileData.name,
          mimeType: fileData.mimeType,
          thumbnailLink: fileData.thumbnailLink,
          createdTime: fileData.createdTime,
          size: fileData.size,
        })

        setQueue((q) => q.map((item, idx) => idx === i ? { ...item, status: "done" } : item))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("upload error", msg)
        setQueue((q) => q.map((item, idx) => idx === i ? { ...item, status: "error", error: msg } : item))
      }
    }

    if (uploaded.length > 0) onUploadComplete(uploaded)

    setTimeout(() => {
      setShowToast(false)
      setQueue([])
    }, 3000)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 bg-[#ff5c2e] hover:bg-[#ff7347] text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        <UploadIcon className="w-4 h-4" />
        <span>Upload</span>
      </button>

      {showToast && queue.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl p-4 min-w-[260px] max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-200">
              Uploading {queue.length} file{queue.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => { setShowToast(false); setQueue([]) }} className="text-slate-500 hover:text-slate-300">
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {queue.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <StatusIcon status={item.status} />
                <span className="text-xs text-slate-400 truncate flex-1">
                  {item.name}
                  {item.error && <span className="block text-red-400 text-[10px]">{item.error}</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff5c2e] transition-all duration-300"
              style={{
                width: `${(queue.filter((i) => i.status === "done" || i.status === "error").length / queue.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

function StatusIcon({ status }: { status: UploadItem["status"] }) {
  if (status === "uploading") return <div className="w-3.5 h-3.5 shrink-0 border border-[#ff5c2e]/30 border-t-[#ff5c2e] rounded-full animate-spin" />
  if (status === "done") return (
    <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
  if (status === "error") return (
    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
  return <div className="w-3.5 h-3.5 shrink-0 rounded-full bg-[#333]" />
}

function UploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
