import { type NextRequest, NextResponse } from "next/server"
import { recordHeartbeat, getESP32Status, getHeartbeatData } from '@/lib/esp32-heartbeat'

interface ESP32Heartbeat {
  device_id: string
  timestamp: number
  location?: string
  version?: string
  wifi_strength?: number
  uptime?: number
  free_heap?: number
  device_type?: string // 'camera' หรือ 'gateway'
  status?: string
}

// POST endpoint สำหรับรับ heartbeat จาก ESP32
export async function POST(request: NextRequest) {
  try {
    const body: ESP32Heartbeat = await request.json()

    // Validate required fields
    if (!body.device_id || !body.timestamp) {
      return NextResponse.json({ 
        error: "Missing required fields: device_id or timestamp" 
      }, { status: 400 })
    }

    // บันทึก heartbeat ผ่าน shared library
    recordHeartbeat(body.device_id, body)

    return NextResponse.json({
      success: true,
      message: "Heartbeat received",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error processing ESP32 heartbeat:", error)
    return NextResponse.json({ 
      error: "Failed to process heartbeat" 
    }, { status: 500 })
  }
}

// GET endpoint สำหรับตรวจสอบสถานะ
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id') || 'ESP32_001'

    // ใช้ shared library เพื่อตรวจสอบสถานะ
    const status = getESP32Status(deviceId)
    
    if (!status.online && !status.lastSeen) {
      const heartbeatData = getHeartbeatData()
      return NextResponse.json({
        ...status,
        message: "No heartbeat data found",
        availableDevices: Array.from(heartbeatData.keys())
      })
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error("Error checking ESP32 status:", error)
    return NextResponse.json({
      online: false,
      lastSeen: null,
      error: "Failed to check ESP32 status"
    }, { status: 500 })
  }
} 