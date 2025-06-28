import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ตรวจสอบข้อมูลที่จำเป็น
    const { 
      device_id, 
      location, 
      dsp_time, 
      classification_time, 
      anomaly_time, 
      confidence,
      human_detected,  // เพิ่มการรับข้อมูล human_detected
      detected_objects  // เพิ่มการรับข้อมูล detected_objects
    } = body
    
    if (!device_id || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, location' },
        { status: 400 }
      )
    }

    // ใช้ human_detected ที่ส่งมาจาก ESP32 หรือใช้ confidence เป็น fallback
    const isHumanDetected = human_detected !== undefined ? human_detected : (confidence > 0.5)

    // บันทึกข้อมูลการตรวจจับ
    const detection = await prisma.general_information.create({
      data: {
        device_id,
        location,
        detection_time: new Date(),
        detection_human: isHumanDetected // ใช้ human_detected หรือ confidence
      }
    })

    // บันทึกข้อมูล performance หากมี
    if (dsp_time !== undefined || classification_time !== undefined || anomaly_time !== undefined) {
      await prisma.processing_Performance.create({
        data: {
          dsp_time: dsp_time || 0,
          classification_time: classification_time || 0,
          anomaly_time: anomaly_time || 0
        }
      })
    }

    console.log('✅ Detection data saved:', detection)
    console.log('🔍 Human Detected:', isHumanDetected, '| Confidence:', confidence)
    console.log('📋 Detected Objects:', detected_objects || 'None specified')

    // ส่งอีเมลแจ้งเตือนถ้าตรวจพบคน (ใช้ human_detected เป็นหลัก)
    if (isHumanDetected) {
      console.log('🚨 Human detected! Sending email notification...')
      
      try {
        // ใช้ absolute URL สำหรับ production หรือ localhost สำหรับ development
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? (process.env.NEXT_PUBLIC_APP_URL || 'https://project-ex9u.onrender.com')
          : 'http://localhost:3000'
        
        console.log('📧 Email API URL:', `${baseUrl}/api/test-email`)
        
        // เรียก API ส่งอีเมลแจ้งเตือน
        const emailResponse = await fetch(`${baseUrl}/api/test-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customMessage: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; border-radius: 8px;">
                
                <!-- Header -->
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #dc2626;">
                  <h2 style="margin: 0; color: #dc2626; font-size: 20px; font-weight: 600;">
                    🚨 Human Detection Alert
                  </h2>
                </div>

                <!-- General Information -->
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                  <h3 style="margin: 0 0 16px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                    📋 Detection Information
                  </h3>
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #f59e0b; margin-right: 8px;">🏷️</span>
                    <span style="color: #64748b; font-weight: 500;">Device ID:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${device_id}</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #ef4444; margin-right: 8px;">📍</span>
                    <span style="color: #64748b; font-weight: 500;">Location:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${location}</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #ec4899; margin-right: 8px;">⏰</span>
                    <span style="color: #64748b; font-weight: 500;">Detection Time:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${new Date().toLocaleString('th-TH')}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="color: #10b981; margin-right: 8px;">🎯</span>
                    <span style="color: #64748b; font-weight: 500;">Confidence:</span>
                    <span style="margin-left: 8px; color: #dc2626; font-weight: 600;">${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%</span>
                  </div>
                  ${detected_objects ? `
                  <div style="display: flex; align-items: center; margin-top: 12px;">
                    <span style="color: #8b5cf6; margin-right: 8px;">👁️</span>
                    <span style="color: #64748b; font-weight: 500;">Objects Detected:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${detected_objects}</span>
                  </div>
                  ` : ''}
                </div>

                <!-- Performance Information -->
                ${dsp_time !== undefined || classification_time !== undefined || anomaly_time !== undefined ? `
                <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                  <h3 style="margin: 0 0 16px 0; color: #475569; font-size: 16px; font-weight: 600;">
                    ⚡ Performance Metrics
                  </h3>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                    <div style="text-align: center; background: white; padding: 12px; border-radius: 6px;">
                      <div style="color: #059669; font-size: 18px; font-weight: 600;">${dsp_time || 0}ms</div>
                      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">DSP Processing</div>
                    </div>
                    <div style="text-align: center; background: white; padding: 12px; border-radius: 6px;">
                      <div style="color: #dc2626; font-size: 18px; font-weight: 600;">${classification_time || 0}ms</div>
                      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">AI Classification</div>
                    </div>
                    <div style="text-align: center; background: white; padding: 12px; border-radius: 6px;">
                      <div style="color: #7c3aed; font-size: 18px; font-weight: 600;">${anomaly_time || 0}ms</div>
                      <div style="color: #64748b; font-size: 12px; margin-top: 4px;">Anomaly Detection</div>
                    </div>
                  </div>
                </div>
                ` : ''}

                <!-- Action Required -->
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca;">
                  <h3 style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                    🚨 Action Required
                  </h3>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">
                    A human has been detected in the monitored area. Please check the security system immediately.
                  </p>
                  ${detected_objects ? `
                  <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
                    Additional objects detected: ${detected_objects}
                  </p>
                  ` : ''}
                </div>

                <!-- Footer -->
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    This is an automated message from ESP32 Security System
                  </p>
                </div>
              </div>
            `,
            customSubject: `🚨 Human Detected - ${location} (${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%)`
          }),
        })

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          console.log('✅ Email notification sent successfully:', emailResult)
        } else {
          const errorText = await emailResponse.text()
          console.error('❌ Failed to send email notification:', emailResponse.status, errorText)
        }
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError)
      }
    } else {
      console.log('👍 No human detected - Email not sent')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Detection data received and processed',
      detection_id: detection.id,
      human_detected: isHumanDetected,
      confidence: confidence,
      email_sent: isHumanDetected
    })
  } catch (error) {
    console.error('Error processing detection:', error)
    return NextResponse.json(
      { error: 'Failed to process detection data' },
      { status: 500 }
    )
  }
} 