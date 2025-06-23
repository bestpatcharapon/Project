"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50 dark:bg-gray-900/80 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {" "}
            {/* Reverted to justify-between */}
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ESP32 Control
            </Link>
            <div className="flex gap-2 items-center">
              <Button variant="ghost" asChild>
                <Link href="/">ตั้งค่า</Link>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </div>
      </nav>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}

function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
