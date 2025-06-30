interface ESP32Heartbeat {
  device_id: string
  timestamp: number
  location?: string
  version?: string
  wifi_strength?: number
  uptime?: number
  free_heap?: number
  device_type?: string
  status?: string
}

interface ESP32Status {
  online: boolean
  lastSeen: string | null
  location?: string
  version?: string
  signal_strength?: number
  uptime?: number
  free_heap?: number
  device_type?: string
  timeSinceLastSeen?: number
  timeout_used?: number
}

// เก็บข้อมูล heartbeat ในหน่วยความจำ (shared กับ heartbeat API)
const heartbeatData = new Map<string, {
  lastSeen: Date
  data: ESP32Heartbeat
}>()

// ฟังก์ชันสำหรับบันทึก heartbeat
export function recordHeartbeat(deviceId: string, data: ESP32Heartbeat) {
  heartbeatData.set(deviceId, {
    lastSeen: new Date(),
    data: data
  })
  
  console.log(`💓 Heartbeat recorded for ${deviceId} (${data.device_type || 'unknown'}) - ${data.location || 'No location'}`)
}

// ฟังก์ชันสำหรับตรวจสอบสถานะ ESP32
export function getESP32Status(deviceId: string): ESP32Status {
  const deviceData = heartbeatData.get(deviceId)
  
  if (!deviceData) {
    console.log(`❌ No heartbeat data found for device: ${deviceId}`)
    console.log(`📋 Available devices: ${Array.from(heartbeatData.keys()).join(', ')}`)
    return {
      online: false,
      lastSeen: null
    }
  }

  // ตรวจสอบว่า heartbeat ล่าสุดเมื่อไหร่
  const now = new Date()
  const timeDiff = now.getTime() - deviceData.lastSeen.getTime()
  
  // ใช้ timeout ที่ยืดหยุ่นได้ - รองรับทั้ง original และ optimized version
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

  return {
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
  }
}

// ฟังก์ชันสำหรับรับ heartbeat data map (สำหรับ API route)
export function getHeartbeatData() {
  return heartbeatData
} 