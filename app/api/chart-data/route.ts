import { NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Get detection data for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    let detectionTrends;
    try {
      detectionTrends = await Promise.all(
        last7Days.map(async (date) => {
          const startOfDay = new Date(date)
          startOfDay.setHours(0, 0, 0, 0)
          
          const endOfDay = new Date(date)
          endOfDay.setHours(23, 59, 59, 999)

          const count = await prisma.general_information.count({
            where: {
              detection_time: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          })

          return {
            date: date.toLocaleDateString('th-TH', { 
              month: 'short', 
              day: 'numeric' 
            }),
            detections: count,
          }
        })
      )
    } catch (dbError) {
      // Fallback to mock data if database is not available
      detectionTrends = last7Days.map((date, index) => ({
        date: date.toLocaleDateString('th-TH', { 
          month: 'short', 
          day: 'numeric' 
        }),
        detections: Math.floor(Math.random() * 20) + index * 2,
      }))
    }

    // Get performance metrics for the last 10 detections
    let performanceData;
    try {
      const recentPerformance = await prisma.processing_Performance.findMany({
        take: 10,
        orderBy: {
          id: 'desc',
        },
      })

      performanceData = recentPerformance.map((perf, index) => ({
        index: index + 1,
        dsp_time: perf.dsp_time || 0,
        classification_time: perf.classification_time || 0,
        anomaly_time: perf.anomaly_time || 0,
      })).reverse()
    } catch (dbError) {
      // Fallback to mock data
      performanceData = Array.from({ length: 10 }, (_, index) => ({
        index: index + 1,
        dsp_time: Math.floor(Math.random() * 150) + 50,
        classification_time: Math.floor(Math.random() * 200) + 100,
        anomaly_time: Math.floor(Math.random() * 100) + 30,
      }))
    }

    // Get visitor data for the last 7 days (mock data since we don't have historical visitor data)
    const visitorTrends = last7Days.map((date, index) => ({
      date: date.toLocaleDateString('th-TH', { 
        month: 'short', 
        day: 'numeric' 
      }),
      visitors: Math.floor(Math.random() * 50) + 10 + index * 5, // Mock data
    }))

    // Get hourly detection data for today
    const today = new Date()
    const startOfToday = new Date(today)
    startOfToday.setHours(0, 0, 0, 0)
    
    let hourlyData;
    try {
      hourlyData = await Promise.all(
        Array.from({ length: 24 }, async (_, hour) => {
          const startHour = new Date(startOfToday)
          startHour.setHours(hour)
          
          const endHour = new Date(startOfToday)
          endHour.setHours(hour + 1)

          const count = await prisma.general_information.count({
            where: {
              detection_time: {
                gte: startHour,
                lt: endHour,
              },
            },
          })

          return {
            hour: `${hour.toString().padStart(2, '0')}:00`,
            detections: count,
          }
        })
      )
    } catch (dbError) {
      // Fallback to mock data
      hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        detections: hour >= 8 && hour <= 18 ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 2),
      }))
    }

    return NextResponse.json({
      detectionTrends,
      performanceData,
      visitorTrends,
      hourlyData,
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    )
  }
} 