import { type NextRequest, NextResponse } from "next/server"

interface ConfigureRequest {
  ssid: string
  password: string
  emails: string[]
  appToken: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfigureRequest = await request.json()

    // Validate required fields
    if (!body.ssid || !body.password || !body.appToken) {
      return NextResponse.json({ error: "Missing required fields: ssid, password, or appToken" }, { status: 400 })
    }

    // Validate emails
    if (!body.emails || body.emails.length === 0) {
      return NextResponse.json({ error: "At least one email is required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = body.emails.filter((email) => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return NextResponse.json({ error: `Invalid email format: ${invalidEmails.join(", ")}` }, { status: 400 })
    }

    // Here you would typically send the configuration to your ESP32
    // This could be done via HTTP request to the ESP32's IP address
    // or through a message queue system like MQTT

    // Example ESP32 communication:
    const esp32Config = {
      wifi: {
        ssid: body.ssid,
        password: body.password,
      },
      notifications: {
        emails: body.emails,
        token: body.appToken,
      },
      timestamp: new Date().toISOString(),
    }

    // Simulate ESP32 communication
    // In a real implementation, you would:
    // 1. Send HTTP POST to ESP32's IP address
    // 2. Or publish to MQTT topic that ESP32 subscribes to
    // 3. Or use WebSocket connection

    console.log("Sending configuration to ESP32:", esp32Config)

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate success/failure based on some conditions
    // In real implementation, this would be based on ESP32 response
    const success = Math.random() > 0.2 // 80% success rate for demo

    if (!success) {
      return NextResponse.json({ error: "ESP32 connection timeout or configuration failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "ESP32 configured successfully",
      config: {
        ssid: body.ssid,
        emailCount: body.emails.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("ESP32 configuration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET endpoint to check ESP32 status
export async function GET() {
  try {
    // In a real implementation, you would ping the ESP32 or check its status
    // This could involve checking if the device is online, its current configuration, etc.

    return NextResponse.json({
      status: "online",
      lastSeen: new Date().toISOString(),
      version: "1.0.0",
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to get ESP32 status" }, { status: 500 })
  }
}
