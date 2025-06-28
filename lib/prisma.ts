import { PrismaClient } from '@/lib/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// แปลง DATABASE_URL ให้ใช้ protocol ที่ถูกต้อง
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not defined')
  }
  
  // ถ้าเป็น postgresql:// ให้เปลี่ยนเป็น prisma+postgres://
  if (url.startsWith('postgresql://')) {
    return url.replace('postgresql://', 'prisma+postgres://')
  }
  
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