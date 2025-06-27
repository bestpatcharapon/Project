"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Settings, Activity, Users, Loader2, MapPin, Clock, Zap, Eye, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { DashboardCharts } from "@/components/charts/DashboardCharts"

interface Email {
  id: number
  email: string
}

interface ProcessingPerformance {
  id: number
  dsp_time: number
  classification_time: number
  anomaly_time: number
}

interface Detection {
  id: number
  device_id: string
  location: string
  detection_time: Date
  processing_performance: ProcessingPerformance[]
}

export default function Dashboard() {
  const [emailCount, setEmailCount] = useState<number>(0)
  const [isLoadingEmails, setIsLoadingEmails] = useState(true)
  const [visitorCount, setVisitorCount] = useState<number>(0)
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(true)
  const [detections, setDetections] = useState<Detection[]>([])
  const [todayDetectionCount, setTodayDetectionCount] = useState<number>(0)
  const [last24HoursCount, setLast24HoursCount] = useState<number>(0)
  const [totalDetectionCount, setTotalDetectionCount] = useState<number>(0)
  const [isLoadingDetections, setIsLoadingDetections] = useState(true)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isShowingTodayData, setIsShowingTodayData] = useState<boolean>(false)
  const [dataMessage, setDataMessage] = useState<string>('')
  const [esp32Status, setEsp32Status] = useState<{
    camera: {
      online: boolean
      lastSeen: string | null
      location?: string
      device_type?: string
      uptime?: number
    }
    gateway: {
      online: boolean
      lastSeen: string | null
      location?: string
      device_type?: string
      uptime?: number
    }
  }>({
    camera: { online: false, lastSeen: null },
    gateway: { online: false, lastSeen: null }
  })
  const [isLoadingEsp32, setIsLoadingEsp32] = useState(true)
  
  const ITEMS_PER_PAGE = 6

  useEffect(() => {
    fetchEmailCount()
    fetchVisitorCount()
    fetchDetections()
    fetchEsp32Status()
    recordVisit()

    // รีเฟรชข้อมูลการตรวจจับทุก 30 วินาที
    const fetchInterval = setInterval(() => {
      fetchDetections(currentPage)
    }, 30000)

    // รีเฟรชสถานะ ESP32 ทุก 15 วินาที
    const esp32Interval = setInterval(() => {
      fetchEsp32Status()
    }, 15000)

    return () => {
      clearInterval(fetchInterval)
      clearInterval(esp32Interval)
    }
  }, [])

  // Auto-pagination effect - เปลี่ยนหน้าเฉพาะถ้ามีข้อมูลวันนี้มากกว่า 1 หน้า
  useEffect(() => {
    if (totalPages <= 1 || !isShowingTodayData) return

    const pageInterval = setInterval(() => {
      setCurrentPage((prevPage) => {
        const nextPage = prevPage >= totalPages - 1 ? 0 : prevPage + 1
        fetchDetections(nextPage)
        return nextPage
      })
    }, 60000) // เปลี่ยนหน้าทุก 1 นาที (สำหรับข้อมูลวันนี้)

    return () => clearInterval(pageInterval)
  }, [totalPages, isShowingTodayData])

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

  const fetchDetections = async (page: number = currentPage) => {
    setIsLoadingDetections(true)
    try {
      console.log("Fetching detections for page:", page)
      const response = await fetch(`/api/detections/latest?page=${page}&limit=${ITEMS_PER_PAGE}`)
      console.log("Detection response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Detection data:", data)
        setDetections(data.latestDetections)
        setTodayDetectionCount(data.todayCount)
        setLast24HoursCount(data.last24HoursCount)
        setTotalDetectionCount(data.totalCount)
        setTotalPages(data.totalPages)
        setCurrentPage(data.currentPage)
        setIsShowingTodayData(data.isShowingTodayData)
        setDataMessage(data.message || '')
      } else {
        console.error("Failed to fetch detections:", response.status)
      }
    } catch (error) {
      console.error("Error fetching detections:", error)
    } finally {
      setIsLoadingDetections(false)
    }
  }

  const fetchEsp32Status = async () => {
    setIsLoadingEsp32(true)
    try {
      // ตรวจสอบสถานะทั้งสอง ESP32
      const [cameraResponse, gatewayResponse] = await Promise.all([
        fetch("/api/esp32/heartbeat?device_id=ESP32_Camera_01"),
        fetch("/api/esp32/heartbeat?device_id=ESP32_Gateway_02")
      ])
      
      const cameraStatus = cameraResponse.ok ? await cameraResponse.json() : { online: false, lastSeen: null }
      const gatewayStatus = gatewayResponse.ok ? await gatewayResponse.json() : { online: false, lastSeen: null }
      
      setEsp32Status({
        camera: cameraStatus,
        gateway: gatewayStatus
      })
    } catch (error) {
      console.error("Error fetching ESP32 status:", error)
      setEsp32Status({
        camera: { online: false, lastSeen: null },
        gateway: { online: false, lastSeen: null }
      })
    } finally {
      setIsLoadingEsp32(false)
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

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPerformanceColor = (time: number) => {
    if (time < 100) return "text-green-600 dark:text-green-400"
    if (time < 300) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // ฟังก์ชันสำหรับเปลี่ยนหน้าด้วยตนเอง
  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex)
    fetchDetections(pageIndex)
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
                ที่ลงทะเบียนไว้
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">การตรวจจับวันนี้</CardTitle>
              <Activity className="h-4 w-4 text-green-500 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoadingDetections ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  todayDetectionCount
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isShowingTodayData ? 'การตรวจจับวันนี้' : 'ยังไม่มีข้อมูลวันนี้'}
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
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">สถานะ ESP32</CardTitle>
              {isLoadingEsp32 ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : (
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${esp32Status.camera.online ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'}`}></div>
                  <div className={`w-2 h-2 rounded-full ${esp32Status.gateway.online ? 'bg-green-500 dark:bg-green-400 animate-pulse' : 'bg-red-500 dark:bg-red-400'}`}></div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">📷 Camera:</span>
                  <span className={`text-sm font-semibold ${esp32Status.camera.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isLoadingEsp32 ? <Loader2 className="w-4 h-4 animate-spin" /> : (esp32Status.camera.online ? 'Online' : 'Offline')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">🌐 Gateway:</span>
                  <span className={`text-sm font-semibold ${esp32Status.gateway.online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isLoadingEsp32 ? <Loader2 className="w-4 h-4 animate-spin" /> : (esp32Status.gateway.online ? 'Online' : 'Offline')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {(esp32Status.camera.online && esp32Status.gateway.online) ? 'ระบบทำงานปกติ' : 
                 (esp32Status.camera.online || esp32Status.gateway.online) ? 'ระบบทำงานบางส่วน' : 'ระบบไม่ทำงาน'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">สถิติและแนวโน้ม</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">ข้อมูลการใช้งานและประสิทธิภาพของระบบ</p>
          </div>
          <DashboardCharts />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">การจัดการระบบ</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                เครื่องมือสำหรับจัดการระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Link href="/emails">
                <Button className="w-full justify-start bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 mb-3">
                  <Mail className="w-4 h-4 mr-2" />
                  ดูอีเมลทั้งหมด
                </Button>
              </Link>
              <Link href="/detections">
                <Button className="w-full justify-start bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 mt-3">
                  <Activity className="w-4 h-4 mr-2" />
                  ดูการตรวจจับล่าสุด
                </Button>
              </Link>
          </CardContent>
        </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">สถิติการตรวจจับ</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                ข้อมูลสรุปการทำงานของระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
                             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">การตรวจจับวันนี้</span>
                   <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                     {todayDetectionCount} ครั้ง
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">หน้าทั้งหมด (วันนี้)</span>
                   <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                     {totalPages} หน้า
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">สะสมทั้งหมด</span>
                   <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                     {totalDetectionCount} รายการ
                   </Badge>
                 </div>
               </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}
