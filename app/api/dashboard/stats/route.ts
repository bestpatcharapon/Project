import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // คำนวณช่วงเวลาวันนี้
    const now = new Date()
    const thailandOffset = 7 * 60 * 60 * 1000
    const thailandNow = new Date(now.getTime() + thailandOffset)
    const todayStart = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate())
    const todayStartUTC = new Date(todayStart.getTime() - thailandOffset)

    // เพิ่ม timeout สำหรับ database operations
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    )

    // ดึงข้อมูลทั้งหมดพร้อมกันด้วย Promise.all และ timeout
    const dataPromise = Promise.all([
      // นับจำนวนอีเมล
      prisma.email.count(),
      
      // นับการตรวจจับวันนี้
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: todayStartUTC
          }
        }
      }),
      
      // นับการตรวจจับทั้งหมด
      prisma.general_information.count(),
      
      // นับการตรวจจับ 24 ชั่วโมงล่าสุด
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // ตรวจสอบสถานะ ESP32 ล่าสุด
      prisma.general_information.findFirst({
        where: {
          device_id: 'ESP32_Main'
        },
        orderBy: {
          detection_time: 'desc'
        },
        select: {
          detection_time: true,
          device_id: true,
          location: true
        }
      }),
      
      // นับ unique device_id (simplified)
      prisma.general_information.groupBy({
        by: ['device_id']
      }).then(result => result.length).catch(() => 0)
    ])

    const [
      emailCount,
      todayDetectionCount,
      totalDetectionCount,
      last24HoursCount,
      esp32Status,
      visitorCount
    ] = await Promise.race([dataPromise, timeout]) as any[]

    // ตรวจสอบว่า ESP32 online หรือไม่ (ถ้าส่งข้อมูลใน 5 นาทีที่ผ่านมา)
    const isEsp32Online = esp32Status && 
      (Date.now() - new Date(esp32Status.detection_time).getTime()) < 5 * 60 * 1000

    // นับ unique device_id
    const uniqueVisitors = typeof visitorCount === 'number' ? visitorCount : 0

    return NextResponse.json({
      success: true,
      data: {
        emailCount: emailCount || 0,
        visitorCount: uniqueVisitors,
        todayDetectionCount: todayDetectionCount || 0,
        totalDetectionCount: totalDetectionCount || 0,
        last24HoursCount: last24HoursCount || 0,
        esp32Status: {
          online: isEsp32Online,
          lastSeen: esp32Status?.detection_time || null,
          location: esp32Status?.location || 'Unknown',
          device_id: esp32Status?.device_id || 'ESP32_Main'
        }
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    // Return fallback data on error
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackData: {
        emailCount: 0,
        visitorCount: 0,
        todayDetectionCount: 0,
        totalDetectionCount: 0,
        last24HoursCount: 0,
        esp32Status: {
          online: false,
          lastSeen: null,
          location: 'Unknown',
          device_id: 'ESP32_Main'
        }
      }
    }, { status: 500 })
  }
} 