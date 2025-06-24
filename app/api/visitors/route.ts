import { NextResponse } from "next/server";

// ใช้ Map เก็บข้อมูล visitors ใน memory (สำหรับ demo)
// ในการใช้งานจริงควรใช้ Redis หรือฐานข้อมูล
let visitorsData = {
  totalVisitors: 0,
  uniqueVisitors: new Set<string>(),
  lastUpdated: new Date()
};

export async function GET() {
  try {
    return NextResponse.json({
      totalVisitors: visitorsData.totalVisitors,
      uniqueVisitors: visitorsData.uniqueVisitors.size,
      lastUpdated: visitorsData.lastUpdated
    });
  } catch (error) {
    console.error("Error fetching visitors:", error);
    return NextResponse.json({ error: "Failed to fetch visitors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { visitorId } = await request.json();
    
    if (!visitorId) {
      return NextResponse.json({ error: "Visitor ID is required" }, { status: 400 });
    }

    // เพิ่ม total visitors
    visitorsData.totalVisitors++;
    
    // เพิ่ม unique visitor
    visitorsData.uniqueVisitors.add(visitorId);
    
    // อัปเดตเวลา
    visitorsData.lastUpdated = new Date();

    return NextResponse.json({
      success: true,
      totalVisitors: visitorsData.totalVisitors,
      uniqueVisitors: visitorsData.uniqueVisitors.size,
      message: "Visitor recorded successfully"
    });
  } catch (error) {
    console.error("Error recording visitor:", error);
    return NextResponse.json({ error: "Failed to record visitor" }, { status: 500 });
  }
} 