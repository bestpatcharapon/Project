"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { TrendingUp, Activity, Users, Clock } from "lucide-react"

interface ChartData {
  detectionTrends: Array<{ date: string; detections: number }>
  performanceData: Array<{ index: number; dsp_time: number; classification_time: number; anomaly_time: number }>
  visitorTrends: Array<{ date: string; visitors: number }>
  hourlyData: Array<{ 
    hour: string; 
    hourDisplay?: string; 
    timeSlot?: string; 
    detections: number; 
    period?: string 
  }>
}

const chartConfig = {
  detections: {
    label: "การตรวจจับ",
    color: "hsl(var(--chart-1))",
  },
  visitors: {
    label: "ผู้เข้าชม",
    color: "hsl(var(--chart-2))",
  },
  dsp_time: {
    label: "DSP Time",
    color: "hsl(var(--chart-3))",
  },
  classification_time: {
    label: "Classification",
    color: "hsl(var(--chart-4))",
  },
  anomaly_time: {
    label: "Anomaly",
    color: "hsl(var(--chart-5))",
  },
}

export function DashboardCharts() {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
    // Refresh data every 5 minutes
    const interval = setInterval(fetchChartData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchChartData = async () => {
    try {
      console.log("Fetching chart data...")
      const response = await fetch("/api/chart-data")
      console.log("Response status:", response.status)
      if (response.ok) {
        const data = await response.json()
        console.log("Chart data received:", data)
        setChartData(data)
      } else {
        console.error("API responded with error:", response.status, response.statusText)
        // Set fallback data
        setFallbackData()
      }
    } catch (error) {
      console.error("Error fetching chart data:", error)
      // Set fallback data
      setFallbackData()
    } finally {
      setIsLoading(false)
    }
  }

  const setFallbackData = () => {
    const fallbackData = {
      detectionTrends: [
        { date: "20 มิ.ย.", detections: 5 },
        { date: "21 มิ.ย.", detections: 8 },
        { date: "22 มิ.ย.", detections: 3 },
        { date: "23 มิ.ย.", detections: 12 },
        { date: "24 มิ.ย.", detections: 7 },
        { date: "25 มิ.ย.", detections: 15 },
        { date: "26 มิ.ย.", detections: 9 }
      ],
      visitorTrends: [
        { date: "20 มิ.ย.", visitors: 25 },
        { date: "21 มิ.ย.", visitors: 32 },
        { date: "22 มิ.ย.", visitors: 28 },
        { date: "23 มิ.ย.", visitors: 45 },
        { date: "24 มิ.ย.", visitors: 38 },
        { date: "25 มิ.ย.", visitors: 52 },
        { date: "26 มิ.ย.", visitors: 41 }
      ],
      performanceData: [
        { index: 1, dsp_time: 95, classification_time: 180, anomaly_time: 65 },
        { index: 2, dsp_time: 110, classification_time: 195, anomaly_time: 70 },
        { index: 3, dsp_time: 85, classification_time: 165, anomaly_time: 55 },
        { index: 4, dsp_time: 125, classification_time: 210, anomaly_time: 80 },
        { index: 5, dsp_time: 105, classification_time: 175, anomaly_time: 62 }
      ],
      hourlyData: [
        { hour: "06:00", detections: 0 },
        { hour: "07:00", detections: 1 },
        { hour: "08:00", detections: 3 },
        { hour: "09:00", detections: 5 },
        { hour: "10:00", detections: 4 },
        { hour: "11:00", detections: 6 },
        { hour: "12:00", detections: 3 },
        { hour: "13:00", detections: 4 },
        { hour: "14:00", detections: 7 },
        { hour: "15:00", detections: 5 },
        { hour: "16:00", detections: 3 },
        { hour: "17:00", detections: 2 },
        { hour: "18:00", detections: 1 }
      ]
    }
    setChartData(fallbackData)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-gray-50 dark:bg-gray-700/50 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">ไม่สามารถโหลดข้อมูลกราฟได้</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Detection Trends Chart */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
              แนวโน้มการตรวจจับ
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              30 วันที่ผ่านมา
            </CardDescription>
          </div>
          <TrendingUp className="h-4 w-4 text-blue-500 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48">
            <LineChart data={chartData.detectionTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.detectionTrends.length / 6)} // แสดงประมาณ 6-7 วัน
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 1']}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          วันที่: {label}
                        </p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          การตรวจจับ: {payload[0].value} ครั้ง
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
                cursor={{ stroke: 'hsl(var(--chart-1))', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="detections"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 0, r: 2 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Visitor Trends Chart */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
              สถิติผู้เข้าชม
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              30 วันที่ผ่านมา
            </CardDescription>
          </div>
          <Users className="h-4 w-4 text-purple-500 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48">
            <AreaChart data={chartData.visitorTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.visitorTrends.length / 6)} // แสดงประมาณ 6-7 วัน
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 5']}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          วันที่: {label}
                        </p>
                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          ผู้เข้าชม: {payload[0].value} คน
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
                cursor={{ stroke: 'hsl(var(--chart-2))', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Metrics Chart */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
              ประสิทธิภาพการประมวลผล
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              การตรวจจับล่าสุด 10 ครั้ง (ms)
            </CardDescription>
          </div>
          <Activity className="h-4 w-4 text-green-500 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48">
            <LineChart data={chartData.performanceData}>
              <XAxis 
                dataKey="index" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="dsp_time"
                stroke="hsl(var(--chart-3))"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="classification_time"
                stroke="hsl(var(--chart-4))"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="anomaly_time"
                stroke="hsl(var(--chart-5))"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Hourly Activity Chart */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">
              กิจกรรมรายชั่วโมง
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              การตรวจจับวันนี้ (24 ชั่วโมง)
            </CardDescription>
          </div>
          <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48">
            <BarChart data={chartData.hourlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 9, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                interval={2} // แสดงทุก 3 ชั่วโมง
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 'dataMax + 1']}
              />
              <ChartTooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {data.timeSlot || `${label} - ${(parseInt(label.split(':')[0]) + 1).toString().padStart(2, '0')}:00`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ช่วงเวลา: {data.period || 'ทั่วไป'}
                        </p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          การตรวจจับ: {payload[0].value} ครั้ง
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="detections"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
} 