import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Providers } from "@/components/Providers"

export const metadata: Metadata = {
  title: "BuzzBu — Your Google Drive Gallery",
  description: "A personal photo and video gallery backed entirely by your own Google Drive. Original quality, always.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-slate-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
