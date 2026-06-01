"use client"

import type { DriveFile } from "@/app/albums/[albumId]/page"

type Props = {
  files: DriveFile[]
  deletingId: string | null
  onOpenFile: (file: DriveFile) => void
  onDeleteFile: (fileId: string) => void
}

export function PhotoGrid({ files, deletingId, onOpenFile, onDeleteFile }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
      {files.map((file) => (
        <FileCell
          key={file.id}
          file={file}
          isDeleting={deletingId === file.id}
          onOpen={() => onOpenFile(file)}
          onDelete={() => onDeleteFile(file.id)}
        />
      ))}
    </div>
  )
}

function FileCell({
  file,
  isDeleting,
  onOpen,
  onDelete,
}: {
  file: DriveFile
  isDeleting: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const isImage = file.mimeType.startsWith("image/")
  const isVideo = file.mimeType.startsWith("video/")
  const isMedia = isImage || isVideo

  const thumbnailSrc = file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+$/, "=s400")
    : null

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && isMedia) {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      className={`group relative aspect-square rounded-lg overflow-hidden bg-[#111] border border-[#1a1a1a] ${
        isMedia ? "cursor-pointer" : ""
      } ${isDeleting ? "opacity-40 pointer-events-none" : ""}`}
      role={isMedia ? "button" : undefined}
      tabIndex={isMedia ? 0 : undefined}
      onClick={isMedia ? onOpen : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* Thumbnail */}
      {thumbnailSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailSrc}
          alt={file.name}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1 p-2">
          <FileIcon className="w-8 h-8" />
          <span className="text-xs text-center truncate w-full px-1 text-slate-500">
            {file.name}
          </span>
        </div>
      )}

      {/* Video badge */}
      {isVideo && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/70 rounded px-1 py-0.5 flex items-center gap-1">
          <PlayIcon className="w-3 h-3 text-white" />
          <span className="text-white text-[10px] font-medium">VIDEO</span>
        </div>
      )}

      {/* Hover overlay + delete button */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete"
        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600/80 transition-all"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </button>

      {/* Deleting spinner */}
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
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

function FileIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}
