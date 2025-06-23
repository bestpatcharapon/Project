import { type NextRequest, NextResponse } from "next/server"
import mqtt from "mqtt"

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

    // --- START: Actual ESP32 Communication (MQTT) ---
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL
    const mqttUsername = process.env.MQTT_USERNAME
    const mqttPassword = process.env.MQTT_PASSWORD
    const mqttConfigTopic = "esp32/config" // Topic for sending configuration

    if (!mqttBrokerUrl) {
      return NextResponse.json({ error: "MQTT_BROKER_URL environment variable is not set." }, { status: 500 })
    }

    const client = mqtt.connect(mqttBrokerUrl, {
      username: mqttUsername,
      password: mqttPassword,
      clientId: `nextjs_client_${Math.random().toString(16).substr(2, 8)}`, // Unique client ID
      reconnectPeriod: 1000, // Reconnect after 1 second
    })

    const esp32Config = {
      wifi: {
        ssid: body.ssid,
        password: body.password,
      },
      notifications: {
        emails: body.emails,
        token: body.appToken,
      },
    }

    console.log(`Attempting to send configuration to MQTT topic: ${mqttConfigTopic}`)

    // Use a Promise to handle MQTT connection and publishing
    await new Promise<void>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout

      client.on("connect", () => {
        console.log("Connected to MQTT broker.")
        client.publish(mqttConfigTopic, JSON.stringify(esp32Config), { qos: 1 }, (err) => {
          if (err) {
            console.error("Failed to publish MQTT message:", err)
            client.end()
            clearTimeout(timeoutId)
            reject(new Error("Failed to publish configuration to ESP32 via MQTT."))
          } else {
            console.log("MQTT message published successfully.")
            client.end() // Disconnect after publishing
            clearTimeout(timeoutId)
            resolve()
          }
        })
      })

      client.on("error", (err) => {
        console.error("MQTT connection error:", err)
        client.end()
        clearTimeout(timeoutId)
        reject(new Error(`MQTT connection error: ${err.message}`))
      })

      // Set a timeout for the MQTT operation
      timeoutId = setTimeout(() => {
        console.error("MQTT operation timed out.")
        client.end()
        reject(new Error("MQTT operation timed out."))
      }, 10000) // 10 second timeout for MQTT operation
    })

    return NextResponse.json({
      success: true,
      message: "ESP32 configured successfully via MQTT",
      config: {
        ssid: body.ssid,
        emailCount: body.emails.length,
        timestamp: new Date().toISOString(),
      },
    })
    // --- END: Actual ESP32 Communication (MQTT) ---
  } catch (error) {
    console.error("ESP32 configuration error:", error)
    // Check if the error is due to AbortSignal (timeout)
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "ESP32 connection timed out. Please ensure the device is online and accessible." },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: "Internal server error or ESP32 communication failed" }, { status: 500 })
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
