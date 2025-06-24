"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Settings, Activity, Users, Loader2 } from "lucide-react"
import Link from "next/link"

interface Email {
  id: number
  email: string
}

export default function Dashboard() {
  const [emailCount, setEmailCount] = useState<number>(0)
  const [isLoadingEmails, setIsLoadingEmails] = useState(true)
  const [visitorCount, setVisitorCount] = useState<number>(0)
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(true)

  useEffect(() => {
    fetchEmailCount()
    fetchVisitorCount()
    recordVisit()
  }, [])

  const fetchEmailCount = async () => {
    setIsLoadingEmails(true)
    try {
      const response = await fetch("/api/emails")
      if (response.ok) {
        const emails: Email[] = await response.json()
        setEmailCount(emails.length)
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
    } finally {
      setIsLoadingEmails(false)
    }
  }

  const fetchVisitorCount = async () => {
    setIsLoadingVisitors(true)
    try {
      const response = await fetch("/api/visitors")
      if (response.ok) {
        const data = await response.json()
        setVisitorCount(data.uniqueVisitors)
      }
    } catch (error) {
      console.error("Error fetching visitors:", error)
    } finally {
      setIsLoadingVisitors(false)
    }
  }

  const recordVisit = async () => {
    try {
      // สร้าง visitor ID จาก timestamp และ random number
      const visitorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await fetch("/api/visitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visitorId }),
      })
      
      // อัปเดตจำนวนผู้เข้าชมหลังจากบันทึก
      setTimeout(fetchVisitorCount, 500)
    } catch (error) {
      console.error("Error recording visit:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">ระบบจัดการอีเมลและการตรวจจับ</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">อีเมลทั้งหมด</CardTitle>
              <Mail className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoadingEmails ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  emailCount
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                จำนวนอีเมลในระบบ
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">การตรวจจับวันนี้</CardTitle>
              <Activity className="h-4 w-4 text-green-500 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">-</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                จำนวนครั้งที่ตรวจพบ
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">ผู้เข้าชม</CardTitle>
              <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoadingVisitors ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  visitorCount
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                จำนวนผู้เข้าชมเว็บไซต์
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">สถานะระบบ</CardTitle>
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">ออนไลน์</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ระบบทำงานปกติ
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">การตรวจจับล่าสุด</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                ข้อมูลการตรวจจับจาก ESP32
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-gray-600 dark:text-gray-300">ยังไม่มีข้อมูลการตรวจจับ</p>
                <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">ข้อมูลจะแสดงที่นี่เมื่อ ESP32 ส่งข้อมูลมา</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">การจัดการระบบ</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                เครื่องมือสำหรับจัดการระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/emails">
                <Button className="w-full justify-start bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  <Mail className="w-4 h-4 mr-2" />
                  ดูอีเมลทั้งหมด
                </Button>
              </Link>
              <Button className="w-full justify-start bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" disabled>
                <Activity className="w-4 h-4 mr-2" />
                ประวัติการตรวจจับ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
