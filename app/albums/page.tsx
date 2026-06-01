"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { AlbumCard } from "@/components/AlbumCard"

type Album = {
  id: string
  name: string
  createdTime?: string
  coverThumbnail?: string | null
  itemCount: number
}

export default function AlbumsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<"mine" | "shared">("mine")
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState("")
  const [showNewAlbumInput, setShowNewAlbumInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/")
  }, [status, router])

  const fetchAlbums = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = tab === "shared" ? "/api/drive/albums?shared=true" : "/api/drive/albums"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch albums")
      const data = await res.json()
      setAlbums(data.albums ?? [])
    } catch (e) {
      setError("Could not load albums. Please try again.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (status === "authenticated") fetchAlbums()
  }, [status, fetchAlbums])

  async function createAlbum() {
    if (!newAlbumName.trim()) return
    setCreatingAlbum(true)
    try {
      const res = await fetch("/api/drive/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAlbumName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create album")
      const data = await res.json()
      setAlbums((prev) => [data.album, ...prev])
      setNewAlbumName("")
      setShowNewAlbumInput(false)
    } catch (e) {
      alert("Could not create album. Please try again.")
      console.error(e)
    } finally {
      setCreatingAlbum(false)
    }
  }

  if (status === "loading") {
    return <PageSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1f1f1f] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhotoIcon className="w-6 h-6 text-sky-400" />
            <span className="font-semibold text-lg tracking-tight">DrivePhotos</span>
          </div>

          <div className="flex items-center gap-3">
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                className="w-8 h-8 rounded-full border border-[#333]"
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Title + actions row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Albums</h1>
            {session?.user?.name && (
              <p className="text-slate-500 text-sm mt-0.5">
                {session.user.email}
              </p>
            )}
          </div>

          {tab === "mine" && (
            <button
              onClick={() => setShowNewAlbumInput(true)}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              New Album
            </button>
          )}
        </div>

        {/* New album input */}
        {showNewAlbumInput && (
          <div className="mb-6 flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
            <input
              autoFocus
              type="text"
              placeholder="Album name"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createAlbum()
                if (e.key === "Escape") {
                  setShowNewAlbumInput(false)
                  setNewAlbumName("")
                }
              }}
              className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-600"
            />
            <button
              onClick={createAlbum}
              disabled={!newAlbumName.trim() || creatingAlbum}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              {creatingAlbum ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowNewAlbumInput(false)
                setNewAlbumName("")
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#111] border border-[#1f1f1f] rounded-lg p-1 w-fit">
          {(["mine", "shared"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t
                  ? "bg-[#222] text-white shadow"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t === "mine" ? "My Albums" : "Shared with Me"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Session error (token refresh failed) */}
        {session?.error === "RefreshAccessTokenError" && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3 text-yellow-400 text-sm mb-6">
            Your session has expired.{" "}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="underline hover:no-underline"
            >
              Sign in again
            </button>{" "}
            to continue.
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden">
                <div className="skeleton aspect-square rounded-xl" />
                <div className="mt-2 space-y-1.5 px-0.5">
                  <div className="skeleton h-3.5 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Album grid */}
        {!loading && albums.length === 0 && (
          <div className="text-center py-24 text-slate-600">
            {tab === "mine" ? (
              <>
                <FolderIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No albums yet</p>
                <p className="text-sm mt-1">Create an album to get started</p>
              </>
            ) : (
              <>
                <ShareIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No shared albums</p>
                <p className="text-sm mt-1">
                  Albums shared with you will appear here
                </p>
              </>
            )}
          </div>
        )}

        {!loading && albums.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onClick={() => router.push(`/albums/${album.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="skeleton h-8 w-32 rounded mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PhotoIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
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

function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
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
