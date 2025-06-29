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
console.log("Host:", SMTP_CONFIG.host)
console.log("Port:", SMTP_CONFIG.port)
console.log("User:", SMTP_CONFIG.auth.user)
console.log("Pass:", SMTP_CONFIG.auth.pass ? SMTP_CONFIG.auth.pass.substring(0, 4) + "****" : "NOT SET")

// ฟังก์ชันสำหรับแปลงเวลาจาก database โดยตรง 100%
function formatDatabaseTime(date: Date): string {
  const utcDate = new Date(date)
  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  const hours = String(utcDate.getUTCHours()).padStart(2, '0')
  const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

export async function POST(request: NextRequest) {
  try {
    const { 
      testMessage, 
      customMessage = false, 
      subject,
      emailContent 
    } = await request.json()

    // ดึงรายการอีเมลจากฐานข้อมูล
    const emails = await prisma.email.findMany()
    
    if (emails.length === 0) {
      return NextResponse.json({
        success: false,
        message: "ไม่พบรายการอีเมลในระบบ",
        details: {
          recipientCount: 0
        }
      })
    }

    const emailList = emails.map(item => item.email)

    // ดึงข้อมูลจาก database สำหรับการทดสอบ
    const latestDetection = await prisma.general_information.findFirst({
      orderBy: { detection_time: 'desc' }
    });

    const latestPerformance = await prisma.processing_Performance.findFirst({
      orderBy: { id: 'desc' }
    });

    // สร้าง transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG)

    let htmlContent = ""
    let message = testMessage || "ระบบทดสอบการส่งอีเมลแจ้งเตือน - ข้อมูลจาก Database"
    const testTime = new Date()

    if (customMessage && emailContent) {
      // ใช้เนื้อหาอีเมลที่กำหนดเอง (สำหรับการแจ้งเตือนจริงจาก ESP32)
      htmlContent = emailContent
    } else {
      // สร้างเนื้อหาอีเมลทดสอบ - ใช้ข้อมูลจาก Database
      htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">📧 Email System Test</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">Testing with Database Data</p>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          
          <!-- Test Info -->
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h2 style="margin: 0 0 12px 0; color: #1d4ed8; font-size: 20px;">🎯 Database Test Complete!</h2>
            <p style="margin: 0; color: #374151; font-size: 16px;">${message}</p>
          </div>

          <!-- Latest Detection from Database -->
          ${latestDetection ? `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #059669; font-size: 16px; font-weight: 600;">
              🔍 Latest Detection (Database)
            </h3>
                         <div style="display: flex; align-items: center; margin-bottom: 8px;">
               <span style="color: #f59e0b; margin-right: 8px;">📱</span>
               <span style="color: #64748b; font-weight: 500;">Device ID:</span>
               <span style="margin-left: 8px; color: #374151; font-weight: 600;">${latestDetection.device_id || 'Unknown'}</span>
             </div>
             <div style="display: flex; align-items: center; margin-bottom: 8px;">
               <span style="color: #10b981; margin-right: 8px;">📍</span>
               <span style="color: #64748b; font-weight: 500;">Location:</span>
               <span style="margin-left: 8px; color: #16a34a; font-weight: 600;">${latestDetection.location || 'Unknown'}</span>
             </div>
            <div style="display: flex; align-items: center;">
              <span style="color: #ec4899; margin-right: 8px;">⏰</span>
              <span style="color: #64748b; font-weight: 500;">Detection Time:</span>
              <span style="margin-left: 8px; color: #1f2937;">${formatDatabaseTime(latestDetection.detection_time)}</span>
            </div>
          </div>
          ` : `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
              🔍 Detection Status
            </h3>
            <p style="margin: 0; color: #92400e;">ไม่พบข้อมูลการตรวจจับในฐานข้อมูล</p>
          </div>
          `}

          <!-- System Performance from Database -->
          ${latestPerformance ? `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 16px; font-weight: 600;">
              📊 System Performance (Database)  
            </h3>
                         <div style="display: flex; align-items: center; margin-bottom: 8px;">
               <span style="color: #10b981; margin-right: 8px;">🔍</span>
               <span style="color: #64748b; font-weight: 500;">DSP Time:</span>
               <span style="margin-left: 8px; color: #374151; font-weight: 600;">${latestPerformance.dsp_time || 0}ms</span>
             </div>
             <div style="display: flex; align-items: center; margin-bottom: 8px;">
               <span style="color: #3b82f6; margin-right: 8px;">🤖</span>
               <span style="color: #64748b; font-weight: 500;">Classification Time:</span>
               <span style="margin-left: 8px; color: #374151; font-weight: 600;">${latestPerformance.classification_time || 0}ms</span>
             </div>
             <div style="display: flex; align-items: center;">
               <span style="color: #ec4899; margin-right: 8px;">⚠️</span>
               <span style="color: #64748b; font-weight: 500;">Anomaly Time:</span>
               <span style="margin-left: 8px; color: #1f2937;">${latestPerformance.anomaly_time || 0}ms</span>
             </div>
          </div>
          ` : `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
              📊 System Performance
            </h3>
            <p style="margin: 0; color: #92400e;">ไม่พบข้อมูลประสิทธิภาพระบบในฐานข้อมูล</p>
          </div>
          `}

          <!-- Test Information -->
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
            <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px; font-weight: 600;">
              🔔 Test Details
            </h3>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="color: #0ea5e9; margin-right: 8px;">📤</span>
              <span style="color: #64748b; font-weight: 500;">Test Type:</span>
              <span style="margin-left: 8px; color: #0369a1; font-weight: 600;">Database Data Test</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="color: #3b82f6; margin-right: 8px;">👥</span>
              <span style="color: #64748b; font-weight: 500;">Recipients:</span>
              <span style="margin-left: 8px; color: #374151;">${emailList.length} email(s)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="color: #8b5cf6; margin-right: 8px;">🗄️</span>
              <span style="color: #64748b; font-weight: 500;">Data Source:</span>
              <span style="margin-left: 8px; color: #7c3aed; font-weight: 600;">Database Records</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="color: #10b981; margin-right: 8px;">✅</span>
              <span style="color: #64748b; font-weight: 500;">Status:</span>
              <span style="margin-left: 8px; color: #16a34a; font-weight: 600;">Successfully Delivered</span>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            🤖 This is a database test notification from ESP32 Email System
          </p>
          <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">
            Test sent at ${formatDatabaseTime(testTime)}
          </p>
        </div>

      </div>
      `
    }

    // Send email to all addresses
    const mailOptions = {
      from: `"ESP32 System" <${SMTP_CONFIG.auth.user}>`,
      to: emailList.join(', '),
      subject: subject || (customMessage ? "🚨 Detection Alert" : `📧 Database Email Test - ${formatDatabaseTime(testTime)}`),
      html: htmlContent,
      text: customMessage ? "Object Detection Alert" : `ระบบทดสอบการส่งอีเมลแจ้งเตือน - ข้อมูลจากฐานข้อมูล - เวลา: ${formatDatabaseTime(testTime)}`, // Fallback for plain text
    }

    console.log("Sending database test email to:", emailList)
    const info = await transporter.sendMail(mailOptions)
    console.log("Database email sent successfully:", info.messageId)

    return NextResponse.json({
      success: true,
      message: "ส่งอีเมลทดสอบด้วยข้อมูลจากฐานข้อมูลสำเร็จ",
      details: {
        messageId: info.messageId,
        recipients: emailList,
        recipientCount: emailList.length,
        timestamp: testTime.toISOString(),
        testType: "database-data-test",
        currentTime: formatDatabaseTime(testTime),
        latestDetection: latestDetection ? {
          deviceId: latestDetection.device_id,
          detectionTime: formatDatabaseTime(latestDetection.detection_time),
          location: latestDetection.location,
          detectionHuman: latestDetection.detection_human
        } : null,
        latestPerformance: latestPerformance ? {
          dspTime: latestPerformance.dsp_time,
          classificationTime: latestPerformance.classification_time,
          anomalyTime: latestPerformance.anomaly_time
        } : null
      }
    })

  } catch (error) {
    console.error("Error sending database test email:", error)
    return NextResponse.json({
      success: false,
      message: "ไม่สามารถส่งอีเมลทดสอบด้วยข้อมูลจากฐานข้อมูลได้",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}