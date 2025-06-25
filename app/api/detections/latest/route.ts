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

    // คำนวณช่วงเวลาสำหรับวันปัจจุบัน (ใช้เขตเวลาท้องถิ่น)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)

    console.log('Today range:', todayStart, 'to', tomorrowStart)

    // นับจำนวนการตรวจจับของวันนี้
    const todayDetectionCount = await prisma.general_information.count({
      where: {
        detection_time: {
          gte: todayStart,
          lt: tomorrowStart
        }
      }
    })

    // ดึงข้อมูลการตรวจจับของวันนี้เป็นหลัก
    let latestDetections = await prisma.general_information.findMany({
      where: {
        detection_time: {
          gte: todayStart,
          lt: tomorrowStart
        }
      },
      orderBy: {
        detection_time: 'desc' // เรียงจากใหม่ไปเก่า
      },
      skip: skip,
      take: limit
    })

    // ถ้าข้อมูลวันนี้ไม่พอ ให้เติมด้วยข้อมูลล่าสุดจากวันก่อน
    if (latestDetections.length < limit) {
      const remainingCount = limit - latestDetections.length
      const oldDetections = await prisma.general_information.findMany({
        where: {
          detection_time: {
            lt: todayStart // ก่อนวันนี้
          }
        },
        orderBy: {
          detection_time: 'desc'
        },
        take: remainingCount
      })
      
      latestDetections = [...latestDetections, ...oldDetections]
    }

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

    // สำหรับการแสดงผล pagination ใช้ข้อมูลวันนี้เป็นหลัก
    const todayTotalPages = Math.ceil(todayDetectionCount / limit)
    const actualTotalPages = todayTotalPages > 0 ? todayTotalPages : Math.ceil(totalDetections / limit)

    console.log('API Response:', {
      detectionsCount: detectionsWithPerformance.length,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: actualTotalPages
    })

    return NextResponse.json({
      latestDetections: detectionsWithPerformance,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: actualTotalPages,
      itemsPerPage: limit,
      isShowingTodayData: todayDetectionCount > 0, // บอกว่าแสดงข้อมูลวันนี้หรือไม่
      message: todayDetectionCount > 0 ? 
        `แสดงข้อมูลการตรวจจับของวันนี้ (${todayDetectionCount} รายการ)` : 
        'ยังไม่มีข้อมูลการตรวจจับวันนี้ แสดงข้อมูลล่าสุด'
    })
  } catch (error) {
    console.error('Error fetching detections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    )
  }
} 