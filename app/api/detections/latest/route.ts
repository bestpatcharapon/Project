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

    // ดึงข้อมูลการตรวจจับทั้งหมด (สำหรับนับจำนวน)
    const totalDetections = await prisma.general_information.count()

    // ดึงข้อมูลการตรวจจับตาม pagination (เรียงจากเก่าไปใหม่)
    const latestDetections = await prisma.general_information.findMany({
      orderBy: {
        detection_time: 'asc' // เรียงจากเก่าไปใหม่
      },
      skip: skip,
      take: limit
    })

    // ดึงข้อมูล performance ตาม pagination
    const performanceData = await prisma.processing_Performance.findMany({
      orderBy: {
        id: 'asc'
      },
      skip: skip,
      take: limit
    })

    // รวมข้อมูล detection กับ performance
    const detectionsWithPerformance = latestDetections.map((detection, index) => ({
      ...detection,
      processing_performance: performanceData[index] ? [performanceData[index]] : []
    }))

    // นับจำนวนการตรวจจับวันนี้ (ใช้เขตเวลา UTC)
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrowUTC = new Date(todayUTC)
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

    console.log('Today UTC:', todayUTC)
    console.log('Tomorrow UTC:', tomorrowUTC)

    const todayCount = await prisma.general_information.count({
      where: {
        detection_time: {
          gte: todayUTC,
          lt: tomorrowUTC
        }
      }
    })

    console.log('Today count:', todayCount)

    // คำนวณจำนวนการตรวจจับในแต่ละช่วงเวลา
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const last24HoursCount = await prisma.general_information.count({
      where: {
        detection_time: {
          gte: last24Hours
        }
      }
    })

    return NextResponse.json({
      latestDetections: detectionsWithPerformance,
      todayCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: Math.ceil(totalDetections / limit),
      itemsPerPage: limit
    })
  } catch (error) {
    console.error('Error fetching detections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    )
  }
} 