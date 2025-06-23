import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"
import nodemailer from "nodemailer"

const prisma = new PrismaClient()

// SMTP Configuration from ESP32 code
const SMTP_CONFIG = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "testarduino01@gmail.com",
    pass: process.env.SMTP_PASSWORD || "zbufqmfsumtwromp", // App password
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testMessage } = body

    // Get all emails from database
    const emails = await prisma.email.findMany()
    
    if (emails.length === 0) {
      return NextResponse.json({ error: "ไม่มีอีเมลในระบบ กรุณาเพิ่มอีเมลก่อน" }, { status: 400 })
    }

    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG)

    // Verify connection
    console.log("Verifying SMTP connection...")
    await transporter.verify()
    console.log("SMTP connection verified successfully")

    const emailList = emails.map(e => e.email)
    const subject = "🔔 การทดสอบระบบแจ้งเตือน ESP32"
    const message = testMessage || "นี่คือการทดสอบระบบการส่งอีเมลแจ้งเตือนจาก ESP32 Setup System"

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; text-align: center;">🔔 ESP32 Test Alert</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #495057; margin-top: 0;">การทดสอบระบบแจ้งเตือน</h2>
          <p style="color: #6c757d; font-size: 16px; line-height: 1.6;">
            ${message}
          </p>
          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #1976d2; font-weight: bold;">
              ✅ ระบบทำงานปกติ - อีเมลนี้ส่งจาก ESP32 Setup System
            </p>
          </div>
          <p style="color: #868e96; font-size: 14px; margin-bottom: 0;">
            📅 เวลาที่ส่ง: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
          </p>
        </div>
      </div>
    `

    // Send email to all addresses
    const mailOptions = {
      from: `"ESP32 System" <${SMTP_CONFIG.auth.user}>`,
      to: emailList.join(', '),
      subject: subject,
      html: htmlContent,
      text: message, // Fallback for plain text
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