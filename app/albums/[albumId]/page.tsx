"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { PhotoGrid } from "@/components/PhotoGrid"
import { Lightbox } from "@/components/Lightbox"
import { ShareModal } from "@/components/ShareModal"
import { UploadButton } from "@/components/UploadButton"

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  createdTime?: string
  size?: string
}

export default function AlbumPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const albumId = params.albumId as string

  const [files, setFiles] = useState<DriveFile[]>([])
  const [albumName, setAlbumName] = useState("")
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/drive/files?folderId=${albumId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFiles(data.files ?? [])
    } catch {
      setError("Could not load files. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [albumId])

  // Fetch files + album name
  useEffect(() => {
    if (status !== "authenticated") return
    fetchFiles()
    // Try sessionStorage first (set by albums page on click), then fall back to API
    const cached = sessionStorage.getItem(`album_name_${albumId}`)
    if (cached) {
      setAlbumName(cached)
    } else {
      fetch(`/api/drive/albums/${albumId}`)
        .then((r) => r.json())
        .then((d) => d.album?.name && setAlbumName(d.album.name))
        .catch(() => {})
    }
  }, [status, fetchFiles, albumId])

  async function handleDelete(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return
    setDeletingId(fileId)
    try {
      const res = await fetch(`/api/drive/files?fileId=${fileId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      if (lightboxIndex !== null) {
        const currentFile = files[lightboxIndex]
        if (currentFile?.id === fileId) {
          setLightboxIndex(null)
        }
      }
    } catch {
      alert("Failed to delete file.")
    } finally {
      setDeletingId(null)
    }
  }

  function handleUploadComplete(uploaded: DriveFile[]) {
    setFiles((prev) => [...prev, ...uploaded])
  }

  // Only images and videos for lightbox navigation
  const mediaFiles = files.filter(
    (f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/")
  )

  if (status === "loading") {
    return <PageSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push("/albums")}
            className="text-slate-400 hover:text-white transition-colors p-1 -ml-1 rounded-lg hover:bg-[#1a1a1a]"
          >
            <BackIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate text-slate-100">
              {albumName || "Album"}
            </h1>
            <p className="text-xs text-slate-500">
              {loading ? "Loading…" : `${files.length} item${files.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] px-3 py-1.5 rounded-lg transition-colors"
            >
              <ShareIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <UploadButton
              folderId={albumId}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square rounded-lg" />
            ))}
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center py-32 text-slate-600">
            <PhotoEmptyIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-slate-500">This album is empty</p>
            <p className="text-sm mt-1">
              Upload photos or videos to get started
            </p>
          </div>
        )}

        {!loading && files.length > 0 && (
          <PhotoGrid
            files={files}
            deletingId={deletingId}
            onOpenFile={(file) => {
              const idx = mediaFiles.findIndex((f) => f.id === file.id)
              if (idx !== -1) setLightboxIndex(idx)
            }}
            onDeleteFile={handleDelete}
          />
        )}
      </main>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          files={mediaFiles}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          folderId={albumId}
          albumName={albumName}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="skeleton h-7 w-48 rounded mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BackIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
    </svg>
  )
}

function PhotoEmptyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}
