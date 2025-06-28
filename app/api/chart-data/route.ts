import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    // แก้ปัญหา timezone สำหรับ Thailand (UTC+7)
    const thailandOffset = 7 * 60 * 60 * 1000
    
    // ใช้เวลาไทยในการสร้าง dates array
    const todayThailand = new Date(today.getTime() + thailandOffset)
    const dates = []
    
    // Generate dates for the last 30 days (1 month) ใช้เวลาไทย
    for (let i = 29; i >= 0; i--) {
      const date = new Date(todayThailand)
      date.setDate(date.getDate() - i)
      dates.push(date.toLocaleDateString('th-TH', { 
        month: 'short', 
        day: 'numeric' 
      }))
    }

    // ดึงข้อมูลการตรวจจับจริงจาก database สำหรับ 30 วันล่าสุด
    const detectionTrends = []
    
    // ใช้เวลาไทยปัจจุบันเป็นฐาน (ใช้ตัวแปรเดียวกัน)
    const nowThailand = todayThailand
    
    for (let i = 29; i >= 0; i--) {
      const targetDateThailand = new Date(nowThailand)
      targetDateThailand.setDate(targetDateThailand.getDate() - i)
      
      // คำนวณช่วงเวลาสำหรับวันนั้นๆ ในเขตเวลาไทย
      const dayStartThailand = new Date(targetDateThailand.getFullYear(), targetDateThailand.getMonth(), targetDateThailand.getDate())
      const dayEndThailand = new Date(dayStartThailand)
      dayEndThailand.setDate(dayEndThailand.getDate() + 1)
      
      // แปลงเป็น UTC สำหรับ database query
      const dayStartUTC = new Date(dayStartThailand.getTime() - thailandOffset)
      const dayEndUTC = new Date(dayEndThailand.getTime() - thailandOffset)

      const count = await prisma.general_information.count({
        where: {
          detection_time: {
            gte: dayStartUTC,
            lt: dayEndUTC
          }
        }
      })

      detectionTrends.push({
        date: dates[29 - i],
        detections: count
      })
    }

    // ดึงข้อมูลการตรวจจับจริงจากฐานข้อมูลแบ่งตามช่วงเวลา
    const totalDetectionsFromDB = await prisma.general_information.count()
    
    // ดึงข้อมูลการตรวจจับแบ่งตามช่วงเวลาจริงจากฐานข้อมูล
    let morningCount = 0, afternoonCount = 0, eveningCount = 0, nightCount = 0
    
    // ดึงข้อมูลทั้งหมดและแบ่งตามเวลา
    const allDetections = await prisma.general_information.findMany({
      select: {
        detection_time: true
      }
    })
    
    // นับจำนวนการตรวจจับในแต่ละช่วงเวลา (ใช้เวลาไทย)
    allDetections.forEach(detection => {
      // แปลงเป็นเวลาไทย (UTC+7)
      const thailandTime = new Date(detection.detection_time.getTime() + (7 * 60 * 60 * 1000))
      const hour = thailandTime.getHours()
      
      if (hour >= 6 && hour < 12) {
        morningCount++
      } else if (hour >= 12 && hour < 18) {
        afternoonCount++
      } else if (hour >= 18 && hour < 22) {
        eveningCount++
      } else {
        nightCount++
      }
    })
    
    // ใช้จำนวนจริงจากฐานข้อมูล
    const actualTotalDetections = totalDetectionsFromDB

    const detectionStats = {
      totalDetections: actualTotalDetections,
      timeDistribution: [
        { 
          name: "เช้า (06:00-12:00)", 
          value: morningCount, 
          color: "#A7C7E7", // Pastel Blue - สีฟ้าพาสเทล
          percentage: actualTotalDetections > 0 ? Math.round((morningCount / actualTotalDetections) * 100 * 10) / 10 : 0
        },
        { 
          name: "บ่าย (12:00-18:00)", 
          value: afternoonCount, 
          color: "#B8E6B8", // Pastel Green - สีเขียวพาสเทล
          percentage: actualTotalDetections > 0 ? Math.round((afternoonCount / actualTotalDetections) * 100 * 10) / 10 : 0
        },
        { 
          name: "เย็น (18:00-22:00)", 
          value: eveningCount, 
          color: "#FFD1A9", // Pastel Orange - สีส้มพาสเทล
          percentage: actualTotalDetections > 0 ? Math.round((eveningCount / actualTotalDetections) * 100 * 10) / 10 : 0
        },
        { 
          name: "กลางคืน (22:00-06:00)", 
          value: nightCount, 
          color: "#D1C4E9", // Pastel Purple - สีม่วงพาสเทล
          percentage: actualTotalDetections > 0 ? Math.round((nightCount / actualTotalDetections) * 100 * 10) / 10 : 0
        }
      ]
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

    // ดึงข้อมูลการตรวจจับรายชั่วโมงของวันนี้ (แสดงผลในรูปแบบที่อ่านง่าย)
    const hourlyData = []
    const todayStartThailand = new Date(todayThailand.getFullYear(), todayThailand.getMonth(), todayThailand.getDate())

    // สร้างข้อมูลรายชั่วโมงพร้อมรายละเอียดเวลา (ใช้เวลาไทย)
    for (let hour = 0; hour < 24; hour++) {
      // สร้างช่วงเวลาในไทย
      const hourStartThailand = new Date(todayStartThailand)
      hourStartThailand.setHours(hour)
      const hourEndThailand = new Date(hourStartThailand)
      hourEndThailand.setHours(hour + 1)
      
      // แปลงเป็น UTC สำหรับ database query
      const hourStartUTC = new Date(hourStartThailand.getTime() - thailandOffset)
      const hourEndUTC = new Date(hourEndThailand.getTime() - thailandOffset)

      const hourCount = await prisma.general_information.count({
        where: {
          detection_time: {
            gte: hourStartUTC,
            lt: hourEndUTC
          }
        }
      })

      // สร้างป้ายเวลาที่อ่านง่าย (เวลาไทย)
      const timeLabel = hour.toString().padStart(2, '0') + ':00'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const period = hour < 12 ? 'AM' : 'PM'
      
      hourlyData.push({
        hour: timeLabel,
        hourDisplay: `${displayHour}:00 ${period}`,
        timeSlot: `${timeLabel} - ${(hour + 1).toString().padStart(2, '0')}:00`,
        detections: hourCount,
        period: hour < 6 ? 'ดึก' : hour < 12 ? 'เช้า' : hour < 18 ? 'บ่าย' : 'เย็น'
      })
    }

    const chartData = {
      detectionTrends,
      detectionStats,
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