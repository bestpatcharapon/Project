"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Settings, Activity, Users } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
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
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">-</div>
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
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">ผู้ใช้งาน</CardTitle>
              <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">-</div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                จำนวนผู้ใช้งานระบบ
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
              <Link href="/settings">
                <Button className="w-full justify-start bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  <Settings className="w-4 h-4 mr-2" />
                  ตั้งค่าอีเมล
                </Button>
              </Link>
              <Button className="w-full justify-start bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" disabled>
                <Activity className="w-4 h-4 mr-2" />
                ประวัติการตรวจจับ
              </Button>
              <Button className="w-full justify-start bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300" disabled>
                <Mail className="w-4 h-4 mr-2" />
                ส่งอีเมลทดสอบ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
