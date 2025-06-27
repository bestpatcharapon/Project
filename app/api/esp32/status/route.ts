import { type NextRequest, NextResponse } from "next/server"
import mqtt from "mqtt"

interface ESP32Status {
  online: boolean
  lastSeen: string | null
  location?: string
  version?: string
  signal_strength?: number
}

export async function GET() {
  try {
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL
    const mqttUsername = process.env.MQTT_USERNAME
    const mqttPassword = process.env.MQTT_PASSWORD
    const statusTopic = "esp32/status"
    const heartbeatTopic = "esp32/heartbeat"

    if (!mqttBrokerUrl) {
      return NextResponse.json({ 
        online: false, 
        lastSeen: null,
        error: "MQTT_BROKER_URL environment variable is not set." 
      }, { status: 500 })
    }

    const client = mqtt.connect(mqttBrokerUrl, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `status_client_${Math.random().toString(16).substr(2, 8)}`,
      reconnectPeriod: 1000,
    })

    // ตรวจสอบสถานะ ESP32 ผ่าน MQTT
    const status = await new Promise<ESP32Status>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout
      let statusReceived = false

      client.on("connect", () => {
        console.log("Connected to MQTT broker for status check.")
        
        // Subscribe to status and heartbeat topics
        client.subscribe([statusTopic, heartbeatTopic], (err) => {
          if (err) {
            console.error("Failed to subscribe to MQTT topics:", err)
            client.end()
            clearTimeout(timeoutId)
            reject(new Error("Failed to subscribe to MQTT topics"))
            return
          }
          
          // Request status from ESP32
          client.publish("esp32/status_request", JSON.stringify({ timestamp: Date.now() }), { qos: 1 })
        })
      })

      client.on("message", (topic, message) => {
        try {
          const data = JSON.parse(message.toString())
          
          if (topic === statusTopic || topic === heartbeatTopic) {
            statusReceived = true
            clearTimeout(timeoutId)
            client.end()
            
            resolve({
              online: true,
              lastSeen: new Date().toISOString(),
              location: data.location || "ไม่ระบุ",
              version: data.version || "1.0.0",
              signal_strength: data.signal_strength || -50
            })
          }
        } catch (error) {
          console.error("Error parsing MQTT message:", error)
        }
      })

      client.on("error", (err) => {
        console.error("MQTT connection error:", err)
        client.end()
        clearTimeout(timeoutId)
        resolve({
          online: false,
          lastSeen: null
        })
      })

      // Set timeout - ถ้าไม่ได้รับ response ใน 5 วินาที ถือว่า offline
      timeoutId = setTimeout(() => {
        console.log("ESP32 status check timed out.")
        client.end()
        resolve({
          online: false,
          lastSeen: null
        })
      }, 5000)
    })

    return NextResponse.json(status)
    
  } catch (error) {
    console.error("ESP32 status check error:", error)
    return NextResponse.json({
      online: false,
      lastSeen: null,
      error: "Failed to check ESP32 status"
    }, { status: 500 })
  }
}

// POST endpoint สำหรับรับ heartbeat จาก ESP32
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // บันทึก heartbeat ลงฐานข้อมูล (สามารถขยายได้ในอนาคต)
    console.log("ESP32 heartbeat received:", body)
    
    return NextResponse.json({
      success: true,
      message: "Heartbeat received",
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("Error processing ESP32 heartbeat:", error)
    return NextResponse.json({ error: "Failed to process heartbeat" }, { status: 500 })
  }
} 