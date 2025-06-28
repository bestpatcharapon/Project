import { PrismaClient } from '@/lib/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ใช้ DATABASE_URL ตามที่กำหนดโดยไม่แปลง protocol
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not defined')
  }
  
  // Debug: ตรวจสอบ environment variables
  console.log('🔍 Environment Variables Debug:')
  console.log('  DATABASE_URL length:', url.length)
  console.log('  DATABASE_URL first 50 chars:', url.substring(0, 50))
  console.log('  DATABASE_URL last 50 chars:', url.substring(url.length - 50))
  console.log('  NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
  
  // ใช้ URL ตามที่กำหนดโดยไม่เปลี่ยน protocol
  // สำหรับ Render PostgreSQL ใช้ postgresql:// ปกติ
  console.log('🔗 Database URL Protocol:', url.split('://')[0])
  return url
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 