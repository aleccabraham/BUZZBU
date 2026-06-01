"use client"

import { useState, useEffect } from "react"

type Props = {
  folderId: string
  albumName: string
  onClose: () => void
}

export function ShareModal({ folderId, albumName, onClose }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  async function handleShare() {
    const trimmed = email.trim()
    if (!trimmed) return
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/drive/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to share")
      setStatus("success")
      setEmail("")
    } catch (e: unknown) {
      setStatus("error")
      setErrorMsg(e instanceof Error ? e.message : "Failed to share album")
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-lg text-slate-100">Share Album</h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xs">
              {albumName || "This album"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#1a1a1a] transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Email input */}
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Share with (Google email)
        </label>
        <div className="flex gap-2">
          <input
            autoFocus
            type="email"
            placeholder="friend@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle") }}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-slate-100 placeholder-slate-600 text-sm outline-none focus:border-sky-500/60 transition-colors"
          />
          <button
            onClick={handleShare}
            disabled={!email.trim() || status === "loading"}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" />
                Sharing…
              </span>
            ) : "Share"}
          </button>
        </div>

        {/* Permission note */}
        <p className="text-xs text-slate-600 mt-2">
          They will receive viewer (read-only) access and a notification email from Google Drive.
        </p>

        {/* Success */}
        {status === "success" && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-green-400 text-sm flex items-center gap-2">
            <CheckIcon className="w-4 h-4 shrink-0" />
            Album shared successfully! They can now see it under &ldquo;Shared with Me&rdquo;.
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
            {errorMsg || "Failed to share. Please check the email and try again."}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Done
        </button>
      </div>
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

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}
