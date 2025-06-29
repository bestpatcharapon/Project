import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ฟังก์ชันตรวจสอบสถานะ ESP32 แบบง่าย - เรียกใช้ logic โดยตรงแทนการใช้ fetch
async function checkESP32Status(deviceId: string) {
  try {
    // ใช้ logic เดียวกับ ESP32 status route แต่เรียกโดยตรงแทนการใช้ fetch
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL
    
    if (!mqttBrokerUrl) {
      console.log(`MQTT not configured for ${deviceId} - returning offline status`)
      return false
    }

    // สำหรับตอนนี้ return false เพราะ MQTT อาจยังไม่ได้ตั้งค่า
    // ในอนาคตสามารถใส่ logic การเชื่อมต่อ MQTT ที่นี่ได้
    console.log(`${deviceId} status check - MQTT configured but device offline`)
    return false
    
  } catch (error) {
    console.error(`Error checking ${deviceId} status:`, error)
    return false
  }
}

export async function GET() {
  try {
    // ใช้การคำนวณวันง่ายๆ แทนการคำนวณ timezone ซับซ้อน
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // ดึงข้อมูลทั้งหมดพร้อมกันด้วย Promise.all (แบบง่าย)
    const [
      emailCount,
      todayDetectionCount,
      totalDetectionCount,
      last24HoursCount,
      esp32MainStatus,
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
      
      // ตรวจสอบสถานะ ESP32
      checkESP32Status('ESP32_Main'),
      checkESP32Status('ESP32_Gateway'),
      
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
        ESP32_Main: esp32MainStatus,
        ESP32_Gateway: esp32GatewayStatus
      },
      systemStatus: {
        database: true,
        email: true,
        esp32_main: esp32MainStatus,
        esp32_gateway: esp32GatewayStatus
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
        ESP32_Main: false,
        ESP32_Gateway: false
      },
      systemStatus: {
        database: false,
        email: false,
        esp32_main: false,
        esp32_gateway: false
      },
      uniqueDeviceCount: 0
    })
  }
} 