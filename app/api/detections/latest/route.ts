import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

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

    // นับจำนวนการตรวจจับของวันนี้
    const todayDetectionCount = await prisma.general_information.count({
      where: {
        detection_time: {
          gte: todayStartUTC,
          lt: tomorrowStartUTC
        }
      }
    })

    // ดึงข้อมูลการตรวจจับของวันนี้เท่านั้น
    const latestDetections = await prisma.general_information.findMany({
      where: {
        detection_time: {
          gte: todayStartUTC,
          lt: tomorrowStartUTC
        }
      },
      orderBy: {
        detection_time: 'desc' // เรียงจากใหม่ไปเก่า
      },
      skip: skip,
      take: limit
    })

    // ดึงข้อมูล performance ที่สอดคล้องกับการตรวจจับ
    const performanceData = await prisma.processing_Performance.findMany({
      orderBy: {
        id: 'desc'
      },
      take: latestDetections.length
    })

    // รวมข้อมูล detection กับ performance
    const detectionsWithPerformance = latestDetections.map((detection, index) => ({
      ...detection,
      processing_performance: performanceData[index] ? [performanceData[index]] : []
    }))

    // คำนวณสถิติต่างๆ
    const totalDetections = await prisma.general_information.count()
    
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last24HoursCount = await prisma.general_information.count({
      where: {
        detection_time: {
          gte: last24Hours
        }
      }
    })

    // สำหรับการแสดงผล pagination ใช้ข้อมูลวันนี้เท่านั้น
    const todayTotalPages = Math.ceil(todayDetectionCount / limit)

    console.log('API Response:', {
      detectionsCount: detectionsWithPerformance.length,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: todayTotalPages
    })

    return NextResponse.json({
      latestDetections: detectionsWithPerformance,
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