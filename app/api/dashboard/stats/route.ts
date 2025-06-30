import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getESP32Status } from '@/lib/esp32-heartbeat'

// ฟังก์ชันตรวจสอบสถานะ ESP32 ผ่าน shared library
function checkESP32StatusDirect(deviceId: string) {
  try {
    const status = getESP32Status(deviceId)
    
    console.log(`✅ ${deviceId} status check:`, {
      online: status.online,
      lastSeen: status.lastSeen,
      timeSinceLastSeen: status.timeSinceLastSeen
    })

    return {
      online: status.online || false,
      lastSeen: status.lastSeen || null,
      location: status.location || null,
      device_type: status.device_type || null,
      uptime: status.uptime || null
    }
    
  } catch (error) {
    console.error(`❌ Error checking ${deviceId} status:`, error)
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

    // ดึงข้อมูล database ด้วย Promise.all และตรวจสอบ ESP32 แยก
    const [
      emailCount,
      todayDetectionCount,
      totalDetectionCount,
      last24HoursCount,
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
      
      // นับ unique device_id (แบบง่าย)
      prisma.general_information.groupBy({
        by: ['device_id']
      }).then(result => result.length).catch(() => 0)
    ])
    
    // ตรวจสอบสถานะ ESP32 ผ่าน shared library (sync function)
    const esp32CameraStatus = checkESP32StatusDirect('ESP32_Camera_AI')
    const esp32GatewayStatus = checkESP32StatusDirect('ESP32_Gateway')

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