import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ESP32 Setup & Dashboard",
  description: "ระบบตั้งค่าและติดตาม ESP32 อุปกรณ์",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-gray-900">
                ESP32 Control
              </Link>
              <div className="flex gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/">ตั้งค่า</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/dashboard">แดชบอร์ด</Link>
                </Button>
              </div>
            </div>
          </div>
        </nav>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
