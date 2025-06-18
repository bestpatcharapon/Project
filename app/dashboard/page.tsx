"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, Thermometer, Droplets, Gauge, RefreshCw } from "lucide-react"

interface DeviceStatus {
  online: boolean
  lastSeen: string
  wifiConnected: boolean
  signalStrength: number
  uptime: number
  version: string
  sensors: {
    temperature: number
    humidity: number
    pressure: number
  }
}

export default function Dashboard() {
  const [status, setStatus] = useState<DeviceStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/esp32/status")
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error("Failed to fetch status:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const getSignalStrengthColor = (strength: number) => {
    if (strength > -50) return "text-green-600"
    if (strength > -70) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">ESP32 Dashboard</h1>
            <p className="text-gray-600">ติดตามสถานะและข้อมูลจากอุปกรณ์</p>
          </div>
          <Button onClick={fetchStatus} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            รีเฟรช
          </Button>
        </div>

        {status && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Device Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">สถานะอุปกรณ์</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={status.online ? "default" : "destructive"}>
                    {status.online ? "ออนไลน์" : "ออฟไลน์"}
                  </Badge>
                  <div className="text-right text-sm text-gray-500">
                    <div>เวอร์ชัน {status.version}</div>
                    <div>อัพไทม์: {formatUptime(status.uptime)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WiFi Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="w-4 h-4" />
                  Wi-Fi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant={status.wifiConnected ? "default" : "destructive"}>
                    {status.wifiConnected ? "เชื่อมต่อแล้ว" : "ไม่ได้เชื่อมต่อ"}
                  </Badge>
                  <div className={`text-sm ${getSignalStrengthColor(status.signalStrength)}`}>
                    สัญญาณ: {status.signalStrength} dBm
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Temperature */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  อุณหภูมิ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.sensors.temperature}°C</div>
              </CardContent>
            </Card>

            {/* Humidity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  ความชื้น
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.sensors.humidity}%</div>
              </CardContent>
            </Card>

            {/* Pressure */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-500" />
                  ความดันอากาศ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.sensors.pressure} hPa</div>
              </CardContent>
            </Card>

            {/* Last Seen */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">ครั้งสุดท้ายที่เห็น</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">{new Date(status.lastSeen).toLocaleString("th-TH")}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {loading && !status && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        )}
      </div>
    </div>
  )
}
