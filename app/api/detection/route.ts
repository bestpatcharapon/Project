import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

// Interface for detection data
interface DetectionData {
  device_id: string
  location: string
  dsp_time?: number
  classification_time?: number
  anomaly_time?: number
  confidence?: number
  human_detected?: boolean
  detected_objects?: string
  detection_time?: string // For batch processing
}

// ฟังก์ชันหลักสำหรับรับข้อมูลการตรวจจับ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ตรวจสอบว่าเป็น batch หรือ single detection
    if (body.detections && Array.isArray(body.detections)) {
      // Batch processing
      return await processBatchDetections(body)
    } else {
      // Single detection processing
      return await processSingleDetection(body)
    }
  } catch (error) {
    console.error('❌ Detection API Error:', error)
    return NextResponse.json(
      { error: 'Invalid request format or server error' },
      { status: 400 }
    )
  }
}

// Function to process batch detections
async function processBatchDetections(body: { detections: DetectionData[], batch_id?: string }) {
  try {
    const { detections, batch_id } = body
    
    if (!detections || detections.length === 0) {
      return NextResponse.json(
        { error: 'No detections provided in batch' },
        { status: 400 }
      )
    }

    console.log(`📦 Processing batch detection: ${detections.length} detections (Batch ID: ${batch_id || 'N/A'})`)

    const processedDetections = []
    let humanDetectionCount = 0
    let highestConfidence = 0
    let humanDetectionData: DetectionData | null = null

    // Process each detection in the batch
    for (const detectionData of detections) {
      const { 
        device_id, 
        location, 
        dsp_time, 
        classification_time, 
        anomaly_time, 
        confidence,
        human_detected,
        detected_objects,
        detection_time
      } = detectionData
      
      if (!device_id || !location) {
        console.warn('⚠️ Skipping detection with missing required fields:', detectionData)
        continue
      }

      // ใช้ human_detected ที่ส่งมาจาก ESP32 หรือใช้ confidence เป็น fallback
      const isHumanDetected = human_detected !== undefined ? human_detected : (confidence && confidence > 0.5)

      // บันทึกข้อมูลการตรวจจับ - ใช้เวลาจาก database โดยตรง
      const detectionTimestamp = detection_time ? new Date(detection_time) : new Date()
      const detection = await prisma.general_information.create({
        data: {
          device_id,
          location,
          detection_time: detectionTimestamp,
          detection_human: isHumanDetected || false
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

      processedDetections.push({
        detection_id: detection.id,
        human_detected: isHumanDetected,
        confidence: confidence,
        device_id,
        location
      })

      // Track human detections for email notification
      if (isHumanDetected) {
        humanDetectionCount++
        if (!humanDetectionData || (confidence && confidence > highestConfidence)) {
          humanDetectionData = detectionData
          highestConfidence = confidence || 0
        }
      }

      console.log(`✅ Batch detection saved: ${detection.id} | Human: ${isHumanDetected} | Confidence: ${confidence || 'N/A'}`)
    }

    // ส่งอีเมลแจ้งเตือนหากพบคน
    if (humanDetectionCount > 0 && humanDetectionData) {
      console.log(`🚨 Human detected in batch! Sending email notification... (${humanDetectionCount}/${detections.length} detections)`)
      
      // ดึงข้อมูล detection ล่าสุดที่บันทึกไว้
      const latestDetection = await prisma.general_information.findFirst({
        where: { device_id: humanDetectionData.device_id },
        orderBy: { detection_time: 'desc' }
      })

      await sendEmailNotification(humanDetectionData, {
        isBatch: true,
        batchId: batch_id,
        totalDetections: detections.length,
        humanDetections: humanDetectionCount
      }, latestDetection)
    }

    return NextResponse.json({
      success: true,
      message: `Batch processed successfully: ${processedDetections.length}/${detections.length} detections`,
      batch_id: batch_id,
      processed_count: processedDetections.length,
      human_detections: humanDetectionCount,
      detections: processedDetections,
      email_sent: humanDetectionCount > 0
    })

  } catch (error) {
    console.error('❌ Batch processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch detections' },
      { status: 500 }
    )
  }
}

// Function to process single detection (original version)
async function processSingleDetection(body: DetectionData) {
  const { 
    device_id, 
    location, 
    dsp_time, 
    classification_time, 
    anomaly_time, 
    confidence,
    human_detected,
    detected_objects
  } = body
  
  if (!device_id || !location) {
    return NextResponse.json(
      { error: 'Missing required fields: device_id, location' },
      { status: 400 }
    )
  }

  // ใช้ human_detected ที่ส่งมาจาก ESP32 หรือใช้ confidence เป็น fallback
  const isHumanDetected = human_detected !== undefined ? human_detected : (confidence && confidence > 0.5)

  // บันทึกข้อมูลการตรวจจับ - ใช้เวลาปัจจุบันจาก database
  const detection = await prisma.general_information.create({
    data: {
      device_id,
      location,
      detection_time: new Date(), // ใช้เวลาปัจจุบันโดยตรง
      detection_human: isHumanDetected || false
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

  // ส่งอีเมลแจ้งเตือนถ้าตรวจพบคน
  if (isHumanDetected) {
    console.log('🚨 Human detected! Sending email notification...')
    try {
      await sendEmailNotification(body, undefined, detection)
      console.log('📧 Email notification sent successfully')
    } catch (emailError) {
      console.error('❌ Failed to send email notification:', emailError)
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Detection recorded successfully',
    detection_id: detection.id,
    human_detected: isHumanDetected,
    confidence: confidence,
    email_sent: isHumanDetected
  })
}

// ฟังก์ชันส่งอีเมลแจ้งเตือน
async function sendEmailNotification(detectionData: DetectionData, batchInfo?: {
  isBatch: boolean,
  batchId?: string,
  totalDetections: number,
  humanDetections: number
}, detectionRecord?: any) {
  try {
    const { device_id, location, confidence } = detectionData
    
    // ส่งข้อมูลไปยัง test-email API
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/test-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        testMessage: batchInfo ? 
          `🚨 BATCH HUMAN DETECTION ALERT!\n\nBatch ID: ${batchInfo.batchId || 'N/A'}\nTotal Detections: ${batchInfo.totalDetections}\nHuman Detections: ${batchInfo.humanDetections}\nDevice: ${device_id}\nLocation: ${location}\nConfidence: ${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%` :
          `🚨 HUMAN DETECTION ALERT!\n\nDevice: ${device_id}\nLocation: ${location}\nConfidence: ${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%`,
        customMessage: true,
        subject: batchInfo ? 
          `🚨 Batch Human Detection Alert - ${batchInfo.humanDetections}/${batchInfo.totalDetections} detections` :
          '🚨 Human Detection Alert',
        emailContent: `
        <!-- Detection Alert Email Content -->
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Alert Header -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🚨 Human Detection Alert</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">
              ${batchInfo ? `Batch Detection - ${batchInfo.humanDetections} humans detected` : 'Single Detection Alert'}
            </p>
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
            <span style="margin-left: 8px; color: #1f2937;">${detectionRecord ? formatDatabaseTime(detectionRecord.detection_time) : formatDatabaseTime(new Date())}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="color: #10b981; margin-right: 8px;">🎯</span>
            <span style="color: #64748b; font-weight: 500;">Confidence:</span>
            <span style="margin-left: 8px; color: #dc2626; font-weight: 600;">${confidence ? (confidence * 100).toFixed(1) : 'N/A'}%</span>
          </div>
        </div>

        ${batchInfo ? `
        <!-- Batch Information -->
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px; font-weight: 600;">
            📦 Batch Information
          </h3>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="color: #f59e0b; margin-right: 8px;">🆔</span>
            <span style="color: #64748b; font-weight: 500;">Batch ID:</span>
            <span style="margin-left: 8px; color: #1f2937;">${batchInfo.batchId || 'N/A'}</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="color: #10b981; margin-right: 8px;">📊</span>
            <span style="color: #64748b; font-weight: 500;">Total Detections:</span>
            <span style="margin-left: 8px; color: #1f2937;">${batchInfo.totalDetections}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="color: #dc2626; margin-right: 8px;">👥</span>
            <span style="color: #64748b; font-weight: 500;">Human Detections:</span>
            <span style="margin-left: 8px; color: #dc2626; font-weight: 600;">${batchInfo.humanDetections}</span>
          </div>
        </div>
        ` : ''}

        <!-- Action Required -->
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 16px; font-weight: 600;">🔔 Action Required</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Please check the monitoring system and take appropriate action if necessary.
          </p>
        </div>

        </div>
        `
      }),
    })

    if (emailResponse.ok) {
      console.log('📧 Email notification sent successfully')
    } else {
      console.error('❌ Failed to send email notification')
    }
  } catch (error) {
    console.error('❌ Email notification error:', error)
    throw error
  }
}

export const dynamic = 'force-dynamic' 