import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Test database connection และ query
    const emailCount = await prisma.email.count()
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      emailCount,
      environment: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPassword: !!process.env.SMTP_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check failed:", error)
    
    return NextResponse.json({
      status: "unhealthy",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      environment: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSmtpUser: !!process.env.SMTP_USER,
        hasSmtpPassword: !!process.env.SMTP_PASSWORD,
        nodeEnv: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
} 