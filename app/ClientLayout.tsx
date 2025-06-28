"use client"

import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "next-themes"
import { Sun, Moon, Camera } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"

const inter = Inter({ subsets: ["latin"] })

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [todayDetectionCount, setTodayDetectionCount] = useState<number>(0)

  // ลบการเรียก API ซ้ำซ้อนและใช้ localStorage เพื่อ sync ข้อมูลระหว่าง components
  useEffect(() => {
    // อ่านข้อมูลจาก localStorage
    const updateCountFromStorage = () => {
      const storedCount = localStorage.getItem('todayDetectionCount')
      if (storedCount) {
        setTodayDetectionCount(parseInt(storedCount, 10))
      }
    }

    // อ่านข้อมูลเมื่อ component mount
    updateCountFromStorage()

    // ฟังการเปลี่ยนแปลงของ localStorage
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'todayDetectionCount' && event.newValue) {
        setTodayDetectionCount(parseInt(event.newValue, 10))
      }
    }

    // เพิ่ม event listener สำหรับ custom event
    const handleCustomUpdate = (event: CustomEvent) => {
      if (event.detail?.todayDetectionCount !== undefined) {
        setTodayDetectionCount(event.detail.todayDetectionCount)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('dashboardDataUpdate', handleCustomUpdate as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('dashboardDataUpdate', handleCustomUpdate as EventListener)
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <nav className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50 dark:bg-gray-900/80 dark:border-gray-700">
        <div className="w-full px-2 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-100">
              <Camera className="w-5 h-5" />
              Human Detection System with Edge Computing
            </Link>
            <div className="flex gap-3 items-center">
              <Button variant="ghost" asChild className="relative group">
                <Link href="/" className="px-4 py-2 rounded-xl border-2 border-transparent bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 font-medium transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-900/20 hover:scale-105">
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" asChild className="relative group">
                <Link href="/detections" className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-transparent bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-300 font-medium transition-all duration-300 hover:border-green-300 dark:hover:border-green-600 hover:shadow-lg hover:shadow-green-100 dark:hover:shadow-green-900/20 hover:scale-105">
                  การตรวจจับล่าสุด
                  {todayDetectionCount > 0 && (
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                      วันนี้: {todayDetectionCount} ครั้ง
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" asChild className="relative group">
                <Link href="/settings" className="px-4 py-2 rounded-xl border-2 border-transparent bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 text-purple-700 dark:text-purple-300 font-medium transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg hover:shadow-purple-100 dark:hover:shadow-purple-900/20 hover:scale-105">
                  ตั้งค่า
                </Link>
              </Button>
              <div className="relative group">
                <ModeToggle />
              </div>
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