import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // รับ query parameters สำหรับ pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '6')
    const skip = page * limit

    // ใช้การคำนวณวันง่ายๆ แทนการคำนวณ timezone ซับซ้อน
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    // ใช้ Promise.all เพื่อ query พร้อมกัน (แบบง่าย)
    const [
      latestDetections,
      todayDetectionCount,
      totalDetections,
      last24HoursCount
    ] = await Promise.all([
      // ดึงข้อมูลพร้อม join กับ processing_performance
      prisma.general_information.findMany({
        where: {
          detection_time: {
            gte: todayStart,
            lt: tomorrowStart
          }
        },
        include: {
          processing_performance: {
            take: 1,
            orderBy: { id: 'desc' }
          }
        },
        orderBy: {
          detection_time: 'desc'
        },
        skip: skip,
        take: limit
      }),
      
      // นับจำนวนของวันนี้
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: todayStart,
            lt: tomorrowStart
          }
        }
      }),
      
      // นับจำนวนทั้งหมด
      prisma.general_information.count(),
      
      // นับจำนวน 24 ชั่วโมงล่าสุด (แบบง่าย)
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // การแสดงผล pagination ใช้ข้อมูลวันนี้เท่านั้น
    const todayTotalPages = Math.ceil(todayDetectionCount / limit)

    const responseData = {
      latestDetections,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: todayTotalPages,
      isShowingTodayData: todayDetectionCount > 0,
      message: todayDetectionCount > 0 
        ? `แสดงข้อมูลการตรวจจับวันนี้ (${todayDetectionCount} รายการ)`
        : "ไม่มีข้อมูลการตรวจจับในวันนี้"
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching latest detections:", error)
    return NextResponse.json(
      { error: "Failed to fetch detections" },
      { status: 500 }
    )
  }
} 