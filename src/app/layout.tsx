import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SPMKita — Persediaan SPM Terbaik",
  description: "Platform persediaan SPM yang interaktif dan pintar untuk pelajar Malaysia Tingkatan 1-5",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#6C5CE7",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ms">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
