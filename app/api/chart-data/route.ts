import { NextResponse } from "next/server"
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const today = new Date()
    const dates = []
    
    // Generate dates for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toLocaleDateString('th-TH', { 
        month: 'short', 
        day: 'numeric' 
      }))
    }

    // แก้ปัญหา timezone สำหรับ Thailand (UTC+7)
    const thailandOffset = 7 * 60 * 60 * 1000

    // ดึงข้อมูลการตรวจจับจริงจาก database สำหรับ 7 วันล่าสุด
    const detectionTrends = []
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(today)
      targetDate.setDate(targetDate.getDate() - i)
      
      // คำนวณช่วงเวลาสำหรับวันนั้นๆ ในเขตเวลาไทย
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      
      // แปลงเป็น UTC สำหรับ database query
      const dayStartUTC = new Date(dayStart.getTime() - thailandOffset)
      const dayEndUTC = new Date(dayEnd.getTime() - thailandOffset)

      const count = await prisma.general_information.count({
        where: {
          detection_time: {
            gte: dayStartUTC,
            lt: dayEndUTC
          }
        }
      })

      detectionTrends.push({
        date: dates[6 - i],
        detections: count
      })
    }

    // สร้างข้อมูล visitor trends จากการตรวจจับ (เนื่องจากไม่มีตาราง visitor)
    const visitorTrends = []
    for (let i = 6; i >= 0; i--) {
      // ใช้ข้อมูลจำลองจากการตรวจจับ - สมมติว่า 1 การตรวจจับ = 3-5 visitors
      const detectionCount = detectionTrends[6 - i]?.detections || 0
      const baseVisitors = Math.max(detectionCount * 4, 15) // อย่างน้อย 15 visitors ต่อวัน
      const randomVariation = Math.floor(Math.random() * 15) // ความผันแปร 0-15
      
      visitorTrends.push({
        date: dates[6 - i],
        visitors: baseVisitors + randomVariation
      })
    }

    // ดึงข้อมูล performance จริงจาก database
    const performanceData = []
    const recentPerformance = await prisma.processing_Performance.findMany({
      orderBy: { id: 'desc' },
      take: 10
    })

    if (recentPerformance.length > 0) {
      recentPerformance.forEach((perf, index) => {
        performanceData.push({
          index: index + 1,
          dsp_time: perf.dsp_time,
          classification_time: perf.classification_time,
          anomaly_time: perf.anomaly_time
        })
      })
    } else {
      // ถ้าไม่มีข้อมูล performance ใช้ข้อมูลจำลอง
      for (let i = 1; i <= 10; i++) {
        performanceData.push({
          index: i,
          dsp_time: 80 + Math.random() * 40, // 80-120ms
          classification_time: 150 + Math.random() * 50, // 150-200ms
          anomaly_time: 50 + Math.random() * 30 // 50-80ms
        })
      }
    }

    // ดึงข้อมูลการตรวจจับรายชั่วโมงของวันนี้
    const hourlyData = []
    const todayThailand = new Date(today.getTime() + thailandOffset)
    const todayStartThailand = new Date(todayThailand.getFullYear(), todayThailand.getMonth(), todayThailand.getDate())
    const todayStartUTC = new Date(todayStartThailand.getTime() - thailandOffset)

    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(todayStartUTC)
      hourStart.setHours(hour)
      const hourEnd = new Date(hourStart)
      hourEnd.setHours(hour + 1)

      const hourCount = await prisma.general_information.count({
        where: {
          detection_time: {
            gte: hourStart,
            lt: hourEnd
          }
        }
      })

      hourlyData.push({
        hour: hour.toString().padStart(2, '0') + ':00',
        detections: hourCount
      })
    }

    const chartData = {
      detectionTrends,
      visitorTrends,
      performanceData,
      hourlyData
    }

    return NextResponse.json(chartData)
  } catch (error) {
    console.error("Error generating chart data:", error)
    return NextResponse.json(
      { error: "Failed to generate chart data" },
      { status: 500 }
    )
  }
} 