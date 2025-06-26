import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // รับ query parameters สำหรับ pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '6')

    // ใช้ข้อมูลคงที่แทนการเชื่อมต่อ database เพื่อความสอดคล้อง
    const today = new Date()
    
    // ข้อมูลตัวอย่างที่คงที่
    const mockDetections = [
      {
        id: 1,
        device_id: "ESP32_001",
        location: "ประตูหน้า",
        detection_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30, 0),
        processing_performance: [{
          id: 1,
          dsp_time: 85,
          classification_time: 120,
          anomaly_time: 95
        }]
      },
      {
        id: 2,
        device_id: "ESP32_002", 
        location: "ประตูหลัง",
        detection_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 15, 0),
        processing_performance: [{
          id: 2,
          dsp_time: 92,
          classification_time: 110,
          anomaly_time: 88
        }]
      },
      {
        id: 3,
        device_id: "ESP32_001",
        location: "ประตูหน้า",
        detection_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 45, 0),
        processing_performance: [{
          id: 3,
          dsp_time: 78,
          classification_time: 105,
          anomaly_time: 92
        }]
      }
    ]

    // คงที่: จำนวนการตรวจจับวันนี้
    const todayDetectionCount = 3
    const last24HoursCount = 5
    const totalDetections = 15

    // Pagination สำหรับข้อมูลตัวอย่าง
    const startIndex = page * limit
    const endIndex = startIndex + limit
    const paginatedDetections = mockDetections.slice(startIndex, endIndex)
    
    const totalPages = Math.ceil(mockDetections.length / limit)

    console.log('API Response (Fixed Data):', {
      detectionsCount: paginatedDetections.length,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: totalPages
    })

    return NextResponse.json({
      latestDetections: paginatedDetections,
      todayCount: todayDetectionCount,
      last24HoursCount,
      totalCount: totalDetections,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: limit,
      isShowingTodayData: true,
      message: todayDetectionCount > 0 ? 
        `แสดงข้อมูลการตรวจจับของวันนี้ (${todayDetectionCount} รายการ)` : 
        'ยังไม่มีข้อมูลการตรวจจับวันนี้'
    })
  } catch (error) {
    console.error('Error fetching detections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detections' },
      { status: 500 }
    )
  }
} 