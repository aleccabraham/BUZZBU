"use client"

type Album = {
  id: string
  name: string
  createdTime?: string
  coverThumbnail?: string | null
  coverFileId?: string | null
  itemCount: number
}

type Props = {
  album: Album
  onClick: () => void
}

export function AlbumCard({ album, onClick }: Props) {
  function handleClick() {
    sessionStorage.setItem(`album_name_${album.id}`, album.name)
    onClick()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleClick()
    }
  }

  const formattedDate = album.createdTime
    ? new Date(album.createdTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  // Drive thumbnail URL first, proxy fallback if it fails or is missing
  const coverSrc = album.coverThumbnail
    ? album.coverThumbnail.replace(/=s\d+$/, "=s400")
    : album.coverFileId
    ? `/api/drive/media/${album.coverFileId}`
    : null

  const proxyFallback = album.coverFileId
    ? `/api/drive/media/${album.coverFileId}`
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff5c2e] focus:ring-offset-2 focus:ring-offset-[#0e0d0c] rounded-xl"
    >
      {/* Cover image */}
      <div className="aspect-square rounded-xl overflow-hidden bg-[#161412] border border-[#2e2b28] group-hover:border-[#3a3530] transition-colors relative">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const img = e.currentTarget
              if (proxyFallback && img.src !== proxyFallback) {
                img.src = proxyFallback
              } else {
                img.style.display = "none"
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#3a3530]">
            <FolderIcon className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Info */}
      <div className="mt-2.5 px-0.5">
        <p className="font-medium text-[#f0ebe5] text-sm truncate leading-snug">
          {album.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#7a736b]">
          <span>{album.itemCount} item{album.itemCount !== 1 ? "s" : ""}</span>
          {formattedDate && (
            <>
              <span>·</span>
              <span>{formattedDate}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FolderIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}
