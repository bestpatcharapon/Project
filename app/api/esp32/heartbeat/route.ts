import { type NextRequest, NextResponse } from "next/server"

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

// เก็บข้อมูล heartbeat ในหน่วยความจำ (ในการใช้งานจริงควรใช้ database)
const heartbeatData = new Map<string, {
  lastSeen: Date
  data: ESP32Heartbeat
}>()

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

    // บันทึก heartbeat
    heartbeatData.set(body.device_id, {
      lastSeen: new Date(),
      data: body
    })

    console.log(`💓 Heartbeat received from ${body.device_id} (${body.device_type || 'unknown'}) - ${body.location || 'No location'}`)
    console.log(`📊 Heartbeat data stored: lastSeen=${new Date().toISOString()}`)

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

    const deviceData = heartbeatData.get(deviceId)
    
    if (!deviceData) {
      console.log(`❌ No heartbeat data found for device: ${deviceId}`)
      console.log(`📋 Available devices: ${Array.from(heartbeatData.keys()).join(', ')}`)
      return NextResponse.json({
        online: false,
        lastSeen: null,
        message: "No heartbeat data found"
      })
    }

    // ตรวจสอบว่า heartbeat ล่าสุดเมื่อไหร่
    const now = new Date()
    const timeDiff = now.getTime() - deviceData.lastSeen.getTime()
    
    // ใช้ timeout ที่ยืดหยุ่นได้ - รองรับทั้ง original และ optimized version
    // - Original version: ESP32 ส่ง heartbeat ทุก 30 วินาที → timeout 90 วินาที
    // - Optimized version: ESP32 ส่ง heartbeat ทุก 3 นาที → timeout 5 นาที
    const ORIGINAL_TIMEOUT_MS = 90000  // 90 วินาที (3x heartbeat interval)
    const OPTIMIZED_TIMEOUT_MS = 300000 // 5 นาที (1.67x heartbeat interval)
    
    // ใช้ timeout อัตโนมัติตาม device type หรือ interval time
    let timeoutMs = ORIGINAL_TIMEOUT_MS
    
    // ถ้า timeDiff มากกว่า 90 วินาทีแต่น้อยกว่า 5 นาที อาจเป็น optimized version
    if (timeDiff > ORIGINAL_TIMEOUT_MS && timeDiff <= OPTIMIZED_TIMEOUT_MS) {
      timeoutMs = OPTIMIZED_TIMEOUT_MS
      console.log(`🔄 Using optimized timeout (5 minutes) for device: ${deviceId}`)
    }
    
    const isOnline = timeDiff < timeoutMs
    
    console.log(`🔍 Status check for ${deviceId}: timeDiff=${Math.floor(timeDiff/1000)}s, timeout=${Math.floor(timeoutMs/1000)}s, isOnline=${isOnline}`)

    return NextResponse.json({
      online: isOnline,
      lastSeen: deviceData.lastSeen.toISOString(),
      location: deviceData.data.location || "ไม่ระบุ",
      version: deviceData.data.version || "1.0.0",
      signal_strength: deviceData.data.wifi_strength || -50,
      uptime: deviceData.data.uptime || 0,
      free_heap: deviceData.data.free_heap || 0,
      device_type: deviceData.data.device_type || "unknown",
      timeSinceLastSeen: Math.floor(timeDiff / 1000), // วินาที
      timeout_used: Math.floor(timeoutMs / 1000) // วินาที
    })

  } catch (error) {
    console.error("Error checking ESP32 status:", error)
    return NextResponse.json({
      online: false,
      lastSeen: null,
      error: "Failed to check ESP32 status"
    }, { status: 500 })
  }
} 