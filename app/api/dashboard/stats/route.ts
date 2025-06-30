import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ฟังก์ชันตรวจสอบสถานะ ESP32 ผ่าน HTTP Heartbeat
async function checkESP32StatusViaHeartbeat(deviceId: string) {
  try {
    // เรียกใช้ Heartbeat API เพื่อตรวจสอบสถานะ
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/esp32/heartbeat?device_id=${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // ป้องกัน cache เพื่อให้ได้ข้อมูลล่าสุดเสมอ
      cache: 'no-store'
    })

    if (!response.ok) {
      console.log(`❌ Failed to fetch status for ${deviceId}:`, response.status)
      return {
        online: false,
        lastSeen: null,
        location: null,
        device_type: null,
        uptime: null
      }
    }

    const data = await response.json()
    
    console.log(`✅ ${deviceId} status via heartbeat:`, {
      online: data.online,
      lastSeen: data.lastSeen,
      timeSinceLastSeen: data.timeSinceLastSeen
    })

    return {
      online: data.online || false,
      lastSeen: data.lastSeen || null,
      location: data.location || null,
      device_type: data.device_type || null,
      uptime: data.uptime || null
    }
    
  } catch (error) {
    console.error(`❌ Error checking ${deviceId} status via heartbeat:`, error)
    return {
      online: false,
      lastSeen: null,
      location: null,
      device_type: null,
      uptime: null
    }
  }
}

export async function GET() {
  try {
    // ใช้การคำนวณวันง่ายๆ แทนการคำนวณ timezone ซับซ้อน
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // ดึงข้อมูลทั้งหมดพร้อมกันด้วย Promise.all (ใช้ HTTP Heartbeat)
    const [
      emailCount,
      todayDetectionCount,
      totalDetectionCount,
      last24HoursCount,
      esp32CameraStatus,
      esp32GatewayStatus,
      uniqueDeviceCount
    ] = await Promise.all([
      // นับจำนวนอีเมล
      prisma.email.count(),
      
      // นับการตรวจจับวันนี้ (แบบง่าย)
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: todayStart
          }
        }
      }),
      
      // นับการตรวจจับทั้งหมด
      prisma.general_information.count(),
      
      // นับการตรวจจับ 24 ชั่วโมงล่าสุด (แบบง่าย)
      prisma.general_information.count({
        where: {
          detection_time: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // ตรวจสอบสถานะ ESP32 ผ่าน HTTP Heartbeat
      checkESP32StatusViaHeartbeat('ESP32_Camera_AI'),
      checkESP32StatusViaHeartbeat('ESP32_Gateway'),
      
      // นับ unique device_id (แบบง่าย)
      prisma.general_information.groupBy({
        by: ['device_id']
      }).then(result => result.length).catch(() => 0)
    ])

    // คำนวณ visitor count แบบง่าย
    const uniqueVisitors = Math.floor(Math.random() * 50) + 10 // ข้อมูลจำลองง่ายๆ

    const statsData = {
      emailCount: emailCount || 0,
      visitorCount: uniqueVisitors,
      todayDetectionCount: todayDetectionCount || 0,
      totalDetectionCount: totalDetectionCount || 0,
      last24HoursCount: last24HoursCount || 0,
      esp32Status: {
        online: esp32GatewayStatus.online || esp32CameraStatus.online,
        lastSeen: esp32GatewayStatus.lastSeen || esp32CameraStatus.lastSeen,
        location: esp32GatewayStatus.location || esp32CameraStatus.location,
        device_type: esp32GatewayStatus.device_type || esp32CameraStatus.device_type,
        uptime: esp32GatewayStatus.uptime || esp32CameraStatus.uptime,
        // รายละเอียดแต่ละอุปกรณ์
        ESP32_Camera_AI: esp32CameraStatus,
        ESP32_Gateway: esp32GatewayStatus
      },
      systemStatus: {
        database: true,
        email: true,
        esp32_camera: esp32CameraStatus.online,
        esp32_gateway: esp32GatewayStatus.online
      },
      uniqueDeviceCount: uniqueDeviceCount || 0
    }

    return NextResponse.json(statsData)
  } catch (error) {
    console.error("Dashboard stats error:", error)
    
    // ส่งข้อมูล fallback แบบง่าย
    return NextResponse.json({
      emailCount: 0,
      visitorCount: 0,
      todayDetectionCount: 0,
      totalDetectionCount: 0,
      last24HoursCount: 0,
      esp32Status: {
        online: false,
        lastSeen: null,
        location: null,
        device_type: null,
        uptime: null,
        ESP32_Camera_AI: {
          online: false,
          lastSeen: null,
          location: null,
          device_type: null,
          uptime: null
        },
        ESP32_Gateway: {
          online: false,
          lastSeen: null,
          location: null,
          device_type: null,
          uptime: null
        }
      },
      systemStatus: {
        database: false,
        email: false,
        esp32_camera: false,
        esp32_gateway: false
      },
      uniqueDeviceCount: 0
    })
  }
} 