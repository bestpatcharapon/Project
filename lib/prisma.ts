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