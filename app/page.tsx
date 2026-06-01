"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push("/albums")
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0e0d0c] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ff5c2e] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0e0d0c] text-[#f0ebe5] flex flex-col">
      {/* Nav */}
      <nav className="px-6 sm:px-10 py-5 flex items-center justify-between">
        <span className="font-bold text-xl tracking-tight">BuzzBu</span>
        <button
          onClick={() => signIn("google", { callbackUrl: "/albums" })}
          className="text-sm text-[#7a736b] hover:text-[#f0ebe5] transition-colors"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col lg:flex-row items-center gap-10 px-6 sm:px-10 py-10 lg:py-0 max-w-6xl mx-auto w-full">

        {/* Left — text + CTA (always first on mobile) */}
        <div className="flex-1 flex flex-col items-start justify-center order-1">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5">
            Your photos.<br />
            <span className="text-[#ff5c2e]">Your Drive.</span>
          </h1>
          <p className="text-[#7a736b] text-lg leading-relaxed mb-10 max-w-sm">
            A gallery backed by your own Google Drive.
            Original quality, always.
          </p>
          <button
            onClick={() => signIn("google", { callbackUrl: "/albums" })}
            className="flex items-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-100 active:scale-95 transition-all shadow-xl"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {/* Right — hero image */}
        <HeroImage />
      </div>
    </main>
  )
}

function HeroImage() {
  return (
    <div className="flex-1 flex items-center justify-center order-2">
      <div
        className="relative w-56 h-72 sm:w-80 sm:h-96 lg:w-96 lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
        id="hero-container"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.jpg"
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            if (img.src.endsWith("hero.jpg")) {
              img.src = "/hero.png"
            } else {
              const container = document.getElementById("hero-container")
              if (container) container.style.display = "none"
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
