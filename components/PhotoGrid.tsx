"use client"

import { useState } from "react"
import type { DriveFile } from "@/app/albums/[albumId]/page"

type Props = {
  files: DriveFile[]
  deletingId: string | null
  onOpenFile: (file: DriveFile) => void
  onDeleteFile: (fileId: string) => void
}

export function PhotoGrid({ files, deletingId, onOpenFile, onDeleteFile }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sharing, setSharing] = useState(false)

  const isSelecting = selected.size > 0

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function shareSelected() {
    const toShare = files.filter((f) => selected.has(f.id))
    setSharing(true)
    try {
      // Make all selected files public and collect download URLs
      const urls = await Promise.all(
        toShare.map(async (f) => {
          const res = await fetch("/api/drive/make-public", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: f.id }),
          })
          const data = await res.json()
          return { name: f.name, url: data.publicUrl as string }
        })
      )

      const text = urls.map((u) => `${u.name}\n${u.url}`).join("\n\n")

      if (navigator.share) {
        await navigator.share({ text, title: `${toShare.length} file${toShare.length !== 1 ? "s" : ""}` })
      } else {
        await navigator.clipboard.writeText(text)
        alert("Download links copied to clipboard!")
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        alert("Failed to share: " + e.message)
      }
    } finally {
      setSharing(false)
      setSelected(new Set())
    }
  }

  return (
    <div>
      {/* Multi-select toolbar */}
      {isSelecting && (
        <div className="flex items-center justify-between mb-4 bg-[#161412] border border-[#2e2b28] rounded-xl px-4 py-3">
          <span className="text-sm text-[#f0ebe5] font-medium">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={shareSelected}
              disabled={sharing}
              className="flex items-center gap-1.5 bg-[#ff5c2e] hover:bg-[#ff7347] disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              {sharing ? "Sharing…" : "Share"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-[#7a736b] hover:text-[#f0ebe5] px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 no-select">
        {files.map((file) => (
          <FileCell
            key={file.id}
            file={file}
            isDeleting={deletingId === file.id}
            isSelected={selected.has(file.id)}
            isSelecting={isSelecting}
            onOpen={() => {
              if (isSelecting) { toggleSelect(file.id); return }
              onOpenFile(file)
            }}
            onLongPress={() => toggleSelect(file.id)}
            onDelete={() => onDeleteFile(file.id)}
          />
        ))}
      </div>

      {!isSelecting && files.length > 0 && (
        <p className="text-center text-xs text-[#4a453f] mt-4">
          Long press a photo to select multiple
        </p>
      )}
    </div>
  )
}

function FileCell({
  file, isDeleting, isSelected, isSelecting, onOpen, onLongPress, onDelete,
}: {
  file: DriveFile
  isDeleting: boolean
  isSelected: boolean
  isSelecting: boolean
  onOpen: () => void
  onLongPress: () => void
  onDelete: () => void
}) {
  const isImage = file.mimeType.startsWith("image/")
  const isVideo = file.mimeType.startsWith("video/")
  const isGif = file.mimeType === "image/gif"
  const isMedia = isImage || isVideo

  // GIFs must use the media proxy — Drive's thumbnailLink is a static PNG
  const thumbnailSrc = isGif
    ? `/api/drive/media/${file.id}`
    : file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+$/, "=s400")
    : isMedia
    ? `/api/drive/media/${file.id}`
    : null

  // Long press detection
  let pressTimer: ReturnType<typeof setTimeout> | null = null

  function handleTouchStart() {
    pressTimer = setTimeout(() => onLongPress(), 500)
  }
  function handleTouchEnd() {
    if (pressTimer) clearTimeout(pressTimer)
  }

  return (
    <div
      className={`group relative aspect-square rounded-lg overflow-hidden bg-[#161412] border-2 transition-all cursor-pointer ${
        isSelected ? "border-[#ff5c2e] scale-95" : "border-transparent"
      } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
      onClick={onOpen}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {/* Thumbnail */}
      {thumbnailSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailSrc}
          alt={file.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget
            // Videos: never load the video file as <img> — just hide and show placeholder
            if (isVideo) { img.style.display = "none"; return }
            const proxyUrl = `/api/drive/media/${file.id}`
            const staticThumb = file.thumbnailLink?.replace(/=s\d+$/, "=s400")
            if (isGif && img.src === proxyUrl && staticThumb) {
              img.src = staticThumb
            } else if (!isGif && img.src !== proxyUrl) {
              img.src = proxyUrl
            } else {
              img.style.display = "none"
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-[#4a453f] gap-1 p-2">
          <FileIcon className="w-8 h-8" />
          <span className="text-xs text-center truncate w-full px-1 text-[#7a736b]">{file.name}</span>
        </div>
      )}

      {/* Video/GIF badge */}
      {isVideo && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/70 rounded px-1 py-0.5 flex items-center gap-1">
          <PlayIcon className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-medium">VIDEO</span>
        </div>
      )}
      {isGif && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/70 rounded px-1 py-0.5">
          <span className="text-white text-[10px] font-bold">GIF</span>
        </div>
      )}

      {/* Selection checkbox */}
      {(isSelecting || isSelected) && (
        <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected ? "bg-[#ff5c2e] border-[#ff5c2e]" : "border-white/60 bg-black/30"
        }`}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </div>
      )}

      {/* Hover overlay + delete button (only when not selecting) */}
      {!isSelecting && (
        <>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Delete"
            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600/80 transition-all"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
  )
}

function PlayIcon({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}

function FileIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
