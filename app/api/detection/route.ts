import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ตรวจสอบข้อมูลที่จำเป็น
    const { device_id, location, dsp_time, classification_time, anomaly_time, confidence } = body
    
    if (!device_id || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, location' },
        { status: 400 }
      )
    }

         // บันทึกข้อมูลการตรวจจับ
     const detection = await prisma.general_information.create({
       data: {
         device_id,
         location,
         detection_time: new Date(),
         detection_human: confidence > 0.5 // ตั้งค่า detection_human ตาม confidence
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

    // ส่งอีเมลแจ้งเตือนถ้าตรวจพบคน
    if (confidence > 0.5) {
      console.log('🚨 Human detected! Sending email notification...')
      
      try {
        // เรียก API ส่งอีเมลแจ้งเตือน
        const emailResponse = await fetch('https://alertemail.vercel.app/api/test-email', {
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
                    <span style="margin-left: 8px; color: #dc2626; font-weight: 600;">${(confidence * 100).toFixed(1)}%</span>
                  </div>
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
                </div>

                <!-- Footer -->
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                    This is an automated message from ESP32 Security System
                  </p>
                </div>
              </div>
            `,
            customSubject: `🚨 Human Detected - ${location} (${(confidence * 100).toFixed(1)}%)`
          }),
        })

        if (emailResponse.ok) {
          console.log('✅ Email notification sent successfully')
        } else {
          console.error('❌ Failed to send email notification')
        }
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Detection data received and processed',
      detection_id: detection.id,
      human_detected: confidence > 0.5
    })
  } catch (error) {
    console.error('Error processing detection:', error)
    return NextResponse.json(
      { error: 'Failed to process detection data' },
      { status: 500 }
    )
  }
} 