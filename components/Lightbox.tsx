"use client"

import { useEffect, useCallback, useState } from "react"
import type { DriveFile } from "@/app/albums/[albumId]/page"

type Props = {
  files: DriveFile[]
  initialIndex: number
  onClose: () => void
  onDelete: (fileId: string) => void
}

export function Lightbox({ files, initialIndex, onClose, onDelete }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [loaded, setLoaded] = useState(false)

  const file = files[index]
  const isVideo = file?.mimeType.startsWith("video/")
  const mediaUrl = file ? `/api/drive/media/${file.id}` : null

  const prev = useCallback(() => {
    setLoaded(false)
    setIndex((i) => (i > 0 ? i - 1 : files.length - 1))
  }, [files.length])

  const next = useCallback(() => {
    setLoaded(false)
    setIndex((i) => (i < files.length - 1 ? i + 1 : 0))
  }, [files.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, prev, next])

  // Reset loaded state when index changes
  useEffect(() => {
    setLoaded(false)
  }, [index])

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  if (!file) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="text-sm text-slate-400 truncate max-w-xs">
          <span className="text-slate-300 font-medium">{file.name}</span>
          <span className="ml-2 text-slate-600">
            {index + 1} / {files.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/drive/media/${file.id}`}
            download={file.name}
            title="Download original"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <DownloadIcon className="w-5 h-5" />
          </a>
          <button
            title="Delete"
            onClick={() => {
              onDelete(file.id)
              if (files.length <= 1) {
                onClose()
              } else {
                next()
              }
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Prev arrow */}
        {files.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-3 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
        )}

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center p-4">
          {!loaded && !isVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {isVideo ? (
            <video
              key={file.id}
              src={mediaUrl!}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              style={{ maxHeight: "calc(100vh - 120px)" }}
            />
          ) : (
            mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={file.id}
                src={mediaUrl}
                alt={file.name}
                onLoad={() => setLoaded(true)}
                className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-200 ${
                  loaded ? "opacity-100" : "opacity-0"
                }`}
                style={{ maxHeight: "calc(100vh - 120px)" }}
              />
            )
          )}
        </div>

        {/* Next arrow */}
        {files.length > 1 && (
          <button
            onClick={next}
            className="absolute right-3 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {files.length > 1 && (
        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
            {files.map((f, i) => {
              const thumb = f.thumbnailLink?.replace(/=s\d+$/, "=s80") ?? null
              return (
                <button
                  key={f.id}
                  onClick={() => { setLoaded(false); setIndex(i) }}
                  className={`relative shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${
                    i === index ? "border-sky-500" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#222]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
