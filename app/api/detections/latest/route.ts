import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // รับ query parameters สำหรับ pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '6')
    const skip = page * limit

    // แก้ปัญหา timezone โดยใช้ UTC และแปลงให้ถูกต้อง
    const now = new Date()
    
    // สำหรับ Thailand (UTC+7), เราต้องปรับเวลาให้ถูกต้อง
    const thailandOffset = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
    const thailandNow = new Date(now.getTime() + thailandOffset)
    
    // คำนวณช่วงเวลาสำหรับวันปัจจุบันในเขตเวลาไทย
    const todayStart = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    
    // แปลงกลับเป็น UTC สำหรับ database query
    const todayStartUTC = new Date(todayStart.getTime() - thailandOffset)
    const tomorrowStartUTC = new Date(tomorrowStart.getTime() - thailandOffset)

    console.log('Thailand time range:', todayStart, 'to', tomorrowStart)
    console.log('UTC time range for query:', todayStartUTC, 'to', tomorrowStartUTC)

    // ใช้ Promise.all เพื่อ query พร้อมกัน
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
            gte: todayStartUTC,
            lt: tomorrowStartUTC
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
            gte: todayStartUTC,
            lt: tomorrowStartUTC
          }
        }
      }),
      
      // นับจำนวนทั้งหมด
      prisma.general_information.count(),
      
      // นับจำนวน 24 ชั่วโมงล่าสุด
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    // สำหรับการแสดงผล pagination ใช้ข้อมูลวันนี้เท่านั้น
    const todayTotalPages = Math.ceil(todayDetectionCount / limit)

    console.log('API Response:', {
      detectionsCount: latestDetections.length,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: todayTotalPages
    })

    return NextResponse.json({
      latestDetections,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: todayTotalPages,
      itemsPerPage: limit,
      isShowingTodayData: true, // แสดงเฉพาะข้อมูลวันนี้เสมอ
      message: todayDetectionCount > 0 ? 
        `แสดงข้อมูลการตรวจจับของวันนี้ (${todayDetectionCount} รายการ)` : 
        'ยังไม่มีข้อมูลการตรวจจับวันนี้'
    })
  } catch (error) {
    console.error('Error fetching detections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    )
  }
} 