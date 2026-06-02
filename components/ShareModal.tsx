"use client"

import { useState, useEffect } from "react"

type Props = {
  folderId: string
  albumName: string
  onClose: () => void
}

export function ShareModal({ folderId, albumName, onClose }: Props) {
  const [tab, setTab] = useState<"link" | "email">("link")
  const [email, setEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [emailError, setEmailError] = useState("")
  const [publicLink, setPublicLink] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  async function getPublicLink() {
    setLinkLoading(true)
    try {
      const res = await fetch("/api/drive/make-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: folderId, type: "folder" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPublicLink(data.viewUrl)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate link")
    } finally {
      setLinkLoading(false)
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleEmailShare() {
    const trimmed = email.trim()
    if (!trimmed) return
    setEmailStatus("loading")
    setEmailError("")
    try {
      const res = await fetch("/api/drive/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, email: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to share")
      setEmailStatus("success")
      setEmail("")
    } catch (e) {
      setEmailStatus("error")
      setEmailError(e instanceof Error ? e.message : "Failed to share")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-lg text-[#f0ebe5]">Share</h2>
            <p className="text-sm text-[#7a736b] mt-0.5 truncate max-w-xs">{albumName || "This album"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[#7a736b] hover:text-[#f0ebe5] hover:bg-[#1a1a1a] transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 mb-5">
          {(["link", "email"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === t ? "bg-[#2a2a2a] text-[#f0ebe5]" : "text-[#7a736b] hover:text-[#f0ebe5]"
              }`}
            >
              {t === "link" ? "Copy link" : "Invite by email"}
            </button>
          ))}
        </div>

        {/* Link tab */}
        {tab === "link" && (
          <div className="space-y-3">
            {!publicLink ? (
              <>
                <p className="text-sm text-[#7a736b]">
                  Generate a link anyone can open to view and download this album — no account needed.
                </p>
                <button
                  onClick={getPublicLink}
                  disabled={linkLoading}
                  className="w-full bg-[#ff5c2e] hover:bg-[#ff7347] disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {linkLoading ? "Generating…" : "Generate public link"}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[#7a736b] mb-2">Anyone with this link can view and download photos.</p>
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5">
                  <span className="text-xs text-[#7a736b] truncate flex-1">{publicLink}</span>
                  <button
                    onClick={() => copyLink(publicLink)}
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                      copied ? "bg-green-600 text-white" : "bg-[#ff5c2e] text-white hover:bg-[#ff7347]"
                    }`}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-[#4a453f]">Link opens in Google Drive where photos can be downloaded.</p>
              </>
            )}
          </div>
        )}

        {/* Email tab */}
        {tab === "email" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#f0ebe5]">
              Share with (Google email)
            </label>
            <div className="flex gap-2">
              <input
                autoFocus
                type="email"
                placeholder="friend@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle") }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailShare()}
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0ebe5] placeholder-[#4a453f] outline-none focus:border-[#ff5c2e]/50 transition-colors"
                style={{ fontSize: "16px" }}
              />
              <button
                onClick={handleEmailShare}
                disabled={!email.trim() || emailStatus === "loading"}
                className="bg-[#ff5c2e] hover:bg-[#ff7347] disabled:opacity-40 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                {emailStatus === "loading" ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin inline-block" />
                    Sharing…
                  </span>
                ) : "Share"}
              </button>
            </div>
            <p className="text-xs text-[#4a453f]">They'll get viewer access and can see it in BuzzBu.</p>

            {emailStatus === "success" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5 text-green-400 text-sm flex items-center gap-2">
                <CheckIcon className="w-4 h-4 shrink-0" />
                Shared! They can now see it under "Shared with Me".
              </div>
            )}
            {emailStatus === "error" && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                {emailError || "Failed to share. Check the email and try again."}
              </div>
            )}
          </div>
        )}

        <button onClick={onClose} className="w-full mt-6 text-sm text-[#7a736b] hover:text-[#f0ebe5] transition-colors">
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
