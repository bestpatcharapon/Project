import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ฟังก์ชันตรวจสอบสถานะ ESP32 แบบ Real-time
async function checkESP32RealTimeStatus(deviceId: string) {
  try {
    // เรียก Heartbeat API โดยตรง
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_APP_URL || 'https://web-xdtm.onrender.com')
      : 'http://localhost:3000'
    const heartbeatResponse = await fetch(`${baseUrl}/api/esp32/heartbeat?device_id=${deviceId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // ไม่ใช้ AbortSignal.timeout เพื่อหลีกเลี่ยงปัญหา compatibility
    })
    
    if (heartbeatResponse.ok) {
      const heartbeatData = await heartbeatResponse.json()
      console.log(`💓 Real-time heartbeat check for ${deviceId}:`, heartbeatData)
      return {
        online: heartbeatData.online || false,
        lastSeen: heartbeatData.lastSeen || null,
        location: heartbeatData.location || 'Unknown',
        device_id: deviceId
      }
    }
  } catch (error) {
    console.log(`❌ Real-time heartbeat check failed for ${deviceId}:`, error)
  }
  
  // Return offline status if heartbeat check fails
  return {
    online: false,
    lastSeen: null,
    location: 'Unknown',
    device_id: deviceId
  }
}

import { getTodayRangeInThailand } from '@/lib/timezone'

export async function GET() {
  try {
    // คำนวณช่วงเวลาวันนี้ในเขตเวลาไทย
    const { todayStart: todayStartUTC } = getTodayRangeInThailand()

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
      
                         // ตรวจสอบสถานะ ESP32 ทั้งหมดแบบ Real-time จาก Heartbeat API
      checkESP32RealTimeStatus('ESP32_Main'),
      checkESP32RealTimeStatus('ESP32_Gateway'),
      
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
      esp32MainStatus,
      esp32GatewayStatus,
      visitorCount
    ] = await Promise.race([dataPromise, timeout]) as any[]

    // รวมสถานะ ESP32 ทั้งหมด
    const allDevicesOnline = (esp32MainStatus?.online || false) || (esp32GatewayStatus?.online || false)
    const esp32DevicesStatus = {
      ESP32_Main: esp32MainStatus,
      ESP32_Gateway: esp32GatewayStatus,
      anyOnline: allDevicesOnline
    }
    
    console.log(`🔍 ESP32 Real-time Status:`)
    console.log(`   ESP32_Main Online: ${esp32MainStatus?.online || false}`)
    console.log(`   ESP32_Gateway Online: ${esp32GatewayStatus?.online || false}`)
    console.log(`   Any Device Online: ${allDevicesOnline}`)
    console.log(`   Main Last seen: ${esp32MainStatus?.lastSeen || 'Never'}`)
    console.log(`   Gateway Last seen: ${esp32GatewayStatus?.lastSeen || 'Never'}`)

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
          online: allDevicesOnline,
          devices: esp32DevicesStatus,
          mainDevice: esp32MainStatus,
          gatewayDevice: esp32GatewayStatus
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
          devices: {
            ESP32_Main: { online: false, lastSeen: null, location: 'Unknown', device_id: 'ESP32_Main' },
            ESP32_Gateway: { online: false, lastSeen: null, location: 'Unknown', device_id: 'ESP32_Gateway' },
            anyOnline: false
          },
          mainDevice: { online: false, lastSeen: null, location: 'Unknown', device_id: 'ESP32_Main' },
          gatewayDevice: { online: false, lastSeen: null, location: 'Unknown', device_id: 'ESP32_Gateway' }
        }
      }
    }, { status: 500 })
  }
} 