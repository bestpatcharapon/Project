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

    // ดึงข้อมูลทั้งหมดพร้อมกันด้วย Promise.all
    const [
      emailCount,
      todayDetectionCount,
      totalDetectionCount,
      last24HoursCount,
      esp32Status,
      visitorCount
    ] = await Promise.all([
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
      
      // ใช้ raw query สำหรับนับ unique visitors (ถ้ามี table visitors)
      prisma.$queryRaw`SELECT COUNT(*) as count FROM (SELECT DISTINCT device_id FROM general_information) as unique_devices`.catch(() => 0)
    ])

    // ตรวจสอบว่า ESP32 online หรือไม่ (ถ้าส่งข้อมูลใน 5 นาทีที่ผ่านมา)
    const isEsp32Online = esp32Status && 
      (Date.now() - new Date(esp32Status.detection_time).getTime()) < 5 * 60 * 1000

    // ถ้าไม่มี table visitors ใช้ device_id แทน
    const uniqueVisitors = Array.isArray(visitorCount) && visitorCount[0] ? 
      Number(visitorCount[0].count) : 
      totalDetectionCount

    return NextResponse.json({
      success: true,
      data: {
        emailCount,
        visitorCount: uniqueVisitors,
        todayDetectionCount,
        totalDetectionCount,
        last24HoursCount,
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
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 