import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // รับ query parameters สำหรับ pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '6')
    const skip = page * limit

    // ใช้การคำนวณวันง่ายๆ แทนการคำนวณ timezone ซับซ้อน (เหมือนกับ dashboard/stats)
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    // ตรวจสอบข้อมูลใน 24 ชั่วโมงล่าสุดแทนการใช้ "วันนี้" เฉพาะ
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // ใช้ Promise.all เพื่อ query พร้อมกัน (แบบง่าย)
    const [
      latestDetections,
      todayDetectionCount,
      totalDetections,
      last24HoursCount
    ] = await Promise.all([
      // ดึงข้อมูลพร้อม join กับ processing_performance (ใช้ 24 ชั่วโมงล่าสุด)
      prisma.general_information.findMany({
        where: {
          detection_time: {
            gte: last24Hours
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
      
      // นับจำนวนของ 24 ชั่วโมงล่าสุด
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: last24Hours
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

    // การแสดงผล pagination ใช้ข้อมูล 24 ชั่วโมงล่าสุด
    const recentTotalPages = Math.ceil(todayDetectionCount / limit)

    const responseData = {
      latestDetections,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: recentTotalPages,
      isShowingTodayData: todayDetectionCount > 0,
      message: todayDetectionCount > 0 
        ? `แสดงข้อมูลการตรวจจับล่าสุด (${todayDetectionCount} รายการ)`
        : "ไม่มีข้อมูลการตรวจจับในช่วง 24 ชั่วโมงที่ผ่านมา"
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