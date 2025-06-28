import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import nodemailer from "nodemailer"

// SMTP Configuration from ESP32 code - ใช้ค่าจาก .env
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.AUTHOR_EMAIL || process.env.SMTP_USER || "testarduino01@gmail.com",
    pass: process.env.AUTHOR_PASSWORD || process.env.SMTP_PASSWORD || "zbufqmfsumtwromp",
  },
}

// Debug: แสดงการตั้งค่า SMTP (ไม่แสดงรหัสผ่านเต็ม)
console.log("🔧 SMTP Configuration:")
console.log("  Host:", SMTP_CONFIG.host)
console.log("  Port:", SMTP_CONFIG.port)
console.log("  User:", SMTP_CONFIG.auth.user)
console.log("  Pass:", SMTP_CONFIG.auth.pass ? `${SMTP_CONFIG.auth.pass.substring(0, 4)}****` : "NOT SET")
console.log("  Environment variables:")
console.log("    AUTHOR_EMAIL:", process.env.AUTHOR_EMAIL || "NOT SET")
console.log("    AUTHOR_PASSWORD:", process.env.AUTHOR_PASSWORD ? `${process.env.AUTHOR_PASSWORD.substring(0, 4)}****` : "NOT SET")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testMessage, customMessage, subject: customSubject } = body

    // Get all emails from database
    const emails = await prisma.email.findMany()
    
    if (emails.length === 0) {
      return NextResponse.json({ error: "ไม่มีอีเมลในระบบ กรุณาเพิ่มอีเมลก่อน" }, { status: 400 })
    }

    // ดึงข้อมูลการตรวจจับล่าสุด
    const latestDetection = await prisma.general_information.findFirst({
      orderBy: {
        detection_time: 'desc'
      }
    })

    // ดึงข้อมูล performance ล่าสุด
    const latestPerformance = await prisma.processing_Performance.findFirst({
      orderBy: {
        id: 'desc'
      }
    })

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG)

    // Verify connection
    console.log("Verifying SMTP connection...")
    await transporter.verify()
    console.log("SMTP connection verified successfully")

    const emailList = emails.map(e => e.email)
    
    // ใช้ customMessage หากมี (จากการตรวจจับ) หรือใช้เทมเพลตทดสอบ
    let subject, htmlContent
    
    if (customMessage) {
      // อีเมลจากการตรวจจับ - ใช้ customMessage ที่ส่งมา
      subject = customSubject || "🔍 Object Detection Report"
      htmlContent = customMessage
        } else {
      // อีเมลทดสอบ - ใช้ข้อมูลการตรวจจับล่าสุด
      if (latestDetection) {
        subject = `🔍 Object Detection Report - ${latestDetection.location}`
        
        // คำนวณ confidence จากการตรวจจับ (สมมติว่าถ้า detection_human = true แสดงว่า confidence > 0.5)
        const confidence = latestDetection.detection_human ? 0.996 : 0.3
        
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 8px;">
            
            <!-- Header -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #3b82f6;">
              <h2 style="margin: 0; color: #1f2937; font-size: 20px; font-weight: 600;">
                🔍 Object Detection Report
              </h2>
            </div>

            <!-- General Information -->
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 16px 0; color: #475569; font-size: 16px; font-weight: 600;">
                📋 General Information
              </h3>
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="color: #f59e0b; margin-right: 8px;">🏷️</span>
                <span style="color: #64748b; font-weight: 500;">Device ID:</span>
                <span style="margin-left: 8px; color: #1f2937;">${latestDetection.device_id}</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="color: #ef4444; margin-right: 8px;">📍</span>
                <span style="color: #64748b; font-weight: 500;">Location:</span>
                <span style="margin-left: 8px; color: #1f2937;">${latestDetection.location}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="color: #ec4899; margin-right: 8px;">⏰</span>
                <span style="color: #64748b; font-weight: 500;">Detection Time:</span>
                <span style="margin-left: 8px; color: #1f2937;">${new Date(latestDetection.detection_time).toLocaleString('th-TH', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}</span>
              </div>
            </div>

            ${latestPerformance ? `
            <!-- Processing Performance -->
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 16px 0; color: #166534; font-size: 16px; font-weight: 600;">
                ⚡ Processing Performance
              </h3>
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-weight: 500;">DSP Time:</span>
                <span style="margin-left: 8px; color: ${latestPerformance.dsp_time < 100 ? '#16a34a' : latestPerformance.dsp_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${latestPerformance.dsp_time} ms</span>
              </div>
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-weight: 500;">Classification Time:</span>
                <span style="margin-left: 8px; color: ${latestPerformance.classification_time < 100 ? '#16a34a' : latestPerformance.classification_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${latestPerformance.classification_time} ms</span>
              </div>
              <div>
                <span style="color: #64748b; font-weight: 500;">Anomaly Time:</span>
                <span style="margin-left: 8px; color: ${latestPerformance.anomaly_time < 100 ? '#16a34a' : latestPerformance.anomaly_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${latestPerformance.anomaly_time} ms</span>
              </div>
            </div>
            ` : ''}

            <!-- Detection Results -->
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 16px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                🎯 Detection Results (1 objects found)
              </h3>
              <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="color: #f59e0b; margin-right: 8px;">👤</span>
                  <span style="color: #1f2937; font-weight: 600;">Human</span>
                  <span style="margin-left: 8px; color: #64748b;">(${Math.round(confidence * 100)}% confidence)</span>
                </div>
                <div style="color: #64748b; font-size: 14px; padding-left: 24px;">
                  Position: Detected in frame
                </div>
              </div>
            </div>

          </div>
        `
      } else {
        // ไม่มีข้อมูลการตรวจจับ - แสดงข้อความแจ้งเตือนแบบมินิมอล
        subject = "🔍 System Test Report"
        const message = testMessage || "ระบบทดสอบการส่งอีเมลแจ้งเตือน"
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
            
            <!-- Header -->
            <div style="background: white; padding: 16px 20px; border-left: 4px solid #3b82f6; margin-bottom: 2px;">
              <h2 style="margin: 0; color: #374151; font-size: 18px; font-weight: 600;">
                🔍 System Test Report
              </h2>
            </div>

            <!-- General Information -->
            <div style="background: #f8fafc; padding: 16px 20px; margin-bottom: 2px;">
              <h3 style="margin: 0 0 12px 0; color: #64748b; font-size: 14px; font-weight: 600;">
                📋 Test Information
              </h3>
              <div style="margin-bottom: 8px;">
                <span style="color: #f59e0b; margin-right: 6px;">🏷️</span>
                <span style="color: #64748b; font-weight: 500; font-size: 14px;">System:</span>
                <span style="margin-left: 6px; color: #374151; font-size: 14px;">ESP32 Email System</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="color: #ef4444; margin-right: 6px;">📍</span>
                <span style="color: #64748b; font-weight: 500; font-size: 14px;">Status:</span>
                <span style="margin-left: 6px; color: #374151; font-size: 14px;">Active</span>
              </div>
              <div>
                <span style="color: #ec4899; margin-right: 6px;">⏰</span>
                <span style="color: #64748b; font-weight: 500; font-size: 14px;">Test Time:</span>
                <span style="margin-left: 6px; color: #374151; font-size: 14px;">${new Date().toLocaleString('th-TH', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}</span>
              </div>
            </div>

            <!-- Test Results -->
            <div style="background: #fef3c7; padding: 16px 20px;">
              <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px; font-weight: 600;">
                🎯 Test Results
              </h3>
              <div style="background: white; padding: 12px 16px; border-left: 4px solid #16a34a;">
                <div style="margin-bottom: 6px;">
                  <span style="color: #16a34a; margin-right: 6px;">✅</span>
                  <span style="color: #374151; font-weight: 600; font-size: 14px;">Email System</span>
                  <span style="margin-left: 6px; color: #64748b; font-size: 14px;">(Working Properly)</span>
                </div>
                <div style="color: #64748b; font-size: 13px; padding-left: 20px;">
                  ${message}
                </div>
              </div>
            </div>

          </div>
        `
      }
    }

    // Send email to all addresses
    const mailOptions = {
      from: `"ESP32 System" <${SMTP_CONFIG.auth.user}>`,
      to: emailList.join(', '),
      subject: subject,
      html: htmlContent,
      text: customMessage ? "Object Detection Alert" : (testMessage || "ระบบทดสอบการส่งอีเมลแจ้งเตือน"), // Fallback for plain text
    }

    console.log("Sending email to:", emailList)
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info.messageId)

    return NextResponse.json({
      success: true,
      message: "ส่งอีเมลทดสอบสำเร็จ",
      details: {
        messageId: info.messageId,
        recipients: emailList,
        recipientCount: emailList.length,
        timestamp: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error("Test email error:", error)
    
    let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมล"
    
    if (error instanceof Error) {
      if (error.message.includes("Invalid login")) {
        errorMessage = "ข้อมูล SMTP ไม่ถูกต้อง กรุณาตรวจสอบ email และ app password"
      } else if (error.message.includes("Network")) {
        errorMessage = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ SMTP ได้"
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
} 