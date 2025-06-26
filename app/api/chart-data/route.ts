import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Return fixed data to ensure consistency across all deployments
    const today = new Date()
    const dates = []
    
    // Generate consistent dates for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      dates.push(date.toLocaleDateString('th-TH', { 
        month: 'short', 
        day: 'numeric' 
      }))
    }

    const chartData = {
      detectionTrends: [
        { date: dates[0], detections: 5 },
        { date: dates[1], detections: 8 },
        { date: dates[2], detections: 3 },
        { date: dates[3], detections: 12 },
        { date: dates[4], detections: 7 },
        { date: dates[5], detections: 15 },
        { date: dates[6], detections: 9 }
      ],
      visitorTrends: [
        { date: dates[0], visitors: 25 },
        { date: dates[1], visitors: 32 },
        { date: dates[2], visitors: 28 },
        { date: dates[3], visitors: 45 },
        { date: dates[4], visitors: 38 },
        { date: dates[5], visitors: 52 },
        { date: dates[6], visitors: 41 }
      ],
      performanceData: [
        { index: 1, dsp_time: 95, classification_time: 180, anomaly_time: 65 },
        { index: 2, dsp_time: 110, classification_time: 195, anomaly_time: 70 },
        { index: 3, dsp_time: 85, classification_time: 165, anomaly_time: 55 },
        { index: 4, dsp_time: 125, classification_time: 210, anomaly_time: 80 },
        { index: 5, dsp_time: 105, classification_time: 175, anomaly_time: 62 },
        { index: 6, dsp_time: 90, classification_time: 190, anomaly_time: 75 },
        { index: 7, dsp_time: 115, classification_time: 185, anomaly_time: 68 },
        { index: 8, dsp_time: 100, classification_time: 200, anomaly_time: 85 },
        { index: 9, dsp_time: 120, classification_time: 170, anomaly_time: 58 },
        { index: 10, dsp_time: 95, classification_time: 195, anomaly_time: 72 }
      ],
      hourlyData: [
        { hour: "00:00", detections: 0 },
        { hour: "01:00", detections: 0 },
        { hour: "02:00", detections: 0 },
        { hour: "03:00", detections: 1 },
        { hour: "04:00", detections: 0 },
        { hour: "05:00", detections: 1 },
        { hour: "06:00", detections: 2 },
        { hour: "07:00", detections: 3 },
        { hour: "08:00", detections: 5 },
        { hour: "09:00", detections: 4 },
        { hour: "10:00", detections: 6 },
        { hour: "11:00", detections: 3 },
        { hour: "12:00", detections: 4 },
        { hour: "13:00", detections: 7 },
        { hour: "14:00", detections: 5 },
        { hour: "15:00", detections: 3 },
        { hour: "16:00", detections: 2 },
        { hour: "17:00", detections: 1 },
        { hour: "18:00", detections: 1 },
        { hour: "19:00", detections: 0 },
        { hour: "20:00", detections: 0 },
        { hour: "21:00", detections: 0 },
        { hour: "22:00", detections: 0 },
        { hour: "23:00", detections: 0 }
      ]
    }

    return NextResponse.json(chartData)
  } catch (error) {
    console.error("Error generating chart data:", error)
    return NextResponse.json(
      { error: "Failed to generate chart data" },
      { status: 500 }
    )
  }
} 