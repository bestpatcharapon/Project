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

    // ส่งอีเมลแจ้งเตือนหากมีการตรวจพบคน (confidence > 0.5)
    if (confidence && confidence > 0.5) {
      try {
        await fetch(`https://alertemail.vercel.app/api/test-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: `🔍 Object Detection Report - ${location}`,
            customMessage: `
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
                    <span style="margin-left: 8px; color: #1f2937;">${device_id}</span>
                  </div>
                  <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="color: #ef4444; margin-right: 8px;">📍</span>
                    <span style="color: #64748b; font-weight: 500;">Location:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${location}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="color: #ec4899; margin-right: 8px;">⏰</span>
                    <span style="color: #64748b; font-weight: 500;">Detection Time:</span>
                    <span style="margin-left: 8px; color: #1f2937;">${new Date().toLocaleString('th-TH', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}</span>
                  </div>
                </div>

                <!-- Processing Performance -->
                ${dsp_time !== undefined ? `
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
                  <h3 style="margin: 0 0 16px 0; color: #166534; font-size: 16px; font-weight: 600;">
                    ⚡ Processing Performance
                  </h3>
                  <div style="margin-bottom: 12px;">
                    <span style="color: #64748b; font-weight: 500;">DSP Time:</span>
                    <span style="margin-left: 8px; color: ${dsp_time < 100 ? '#16a34a' : dsp_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${dsp_time} ms</span>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <span style="color: #64748b; font-weight: 500;">Classification Time:</span>
                    <span style="margin-left: 8px; color: ${classification_time < 100 ? '#16a34a' : classification_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${classification_time} ms</span>
                  </div>
                  <div>
                    <span style="color: #64748b; font-weight: 500;">Anomaly Time:</span>
                    <span style="margin-left: 8px; color: ${anomaly_time < 100 ? '#16a34a' : anomaly_time < 300 ? '#eab308' : '#dc2626'}; font-weight: 600;">${anomaly_time} ms</span>
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
          })
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
      }
    }

    return NextResponse.json({ 
      message: 'Detection recorded successfully',
      detection_id: detection.id
    })
  } catch (error) {
    console.error('Error recording detection:', error)
    return NextResponse.json(
      { error: 'Failed to record detection' },
      { status: 500 }
    )
  }
}

// สำหรับสร้างข้อมูลตัวอย่าง
export async function GET() {
  try {
    const sampleData = [
      {
        device_id: 'ESP32_Camera_01',
        location: 'Front Door',
        dsp_time: 3,
        classification_time: 319,
        anomaly_time: 0,
        confidence: 0.996
      },
      {
        device_id: 'ESP32_Camera_02',
        location: 'Back Garden',
        dsp_time: 5,
        classification_time: 287,
        anomaly_time: 12,
        confidence: 0.854
      },
      {
        device_id: 'ESP32_Camera_01',
        location: 'Front Door',
        dsp_time: 4,
        classification_time: 301,
        anomaly_time: 0,
        confidence: 0.923
      },
      {
        device_id: 'ESP32_Camera_03',
        location: 'Living Room',
        dsp_time: 2,
        classification_time: 276,
        anomaly_time: 8,
        confidence: 0.789
      },
      {
        device_id: 'ESP32_Camera_02',
        location: 'Back Garden',
        dsp_time: 6,
        classification_time: 295,
        anomaly_time: 5,
        confidence: 0.912
      },
      {
        device_id: 'ESP32_Camera_01',
        location: 'Front Door',
        dsp_time: 3,
        classification_time: 283,
        anomaly_time: 0,
        confidence: 0.887
      },
      {
        device_id: 'ESP32_Camera_03',
        location: 'Living Room',
        dsp_time: 4,
        classification_time: 267,
        anomaly_time: 15,
        confidence: 0.756
      },
      {
        device_id: 'ESP32_Camera_02',
        location: 'Back Garden',
        dsp_time: 2,
        classification_time: 312,
        anomaly_time: 3,
        confidence: 0.934
      },
      {
        device_id: 'ESP32_Camera_01',
        location: 'Front Door',
        dsp_time: 5,
        classification_time: 298,
        anomaly_time: 0,
        confidence: 0.891
      },
      {
        device_id: 'ESP32_Camera_03',
        location: 'Living Room',
        dsp_time: 3,
        classification_time: 289,
        anomaly_time: 7,
        confidence: 0.823
      }
    ]

    const results = []
    for (const data of sampleData) {
             // สร้างข้อมูลการตรวจจับ
       const detection = await prisma.general_information.create({
         data: {
           device_id: data.device_id,
           location: data.location,
           detection_time: new Date(Date.now() - Math.random() * 86400000), // สุ่มเวลาในช่วง 24 ชั่วโมงที่ผ่านมา
           detection_human: data.confidence > 0.5
         }
       })

       // สร้างข้อมูล performance
       await prisma.processing_Performance.create({
         data: {
           dsp_time: data.dsp_time,
           classification_time: data.classification_time,
           anomaly_time: data.anomaly_time
         }
       })

      results.push(detection)
    }

    return NextResponse.json({ 
      message: 'Sample data created successfully',
      created_records: results.length
    })
  } catch (error) {
    console.error('Error creating sample data:', error)
    return NextResponse.json(
      { error: 'Failed to create sample data' },
      { status: 500 }
    )
  }
} 