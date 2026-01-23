import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In Prisma 7, passing the URL explicitly to the constructor helps avoid build-time errors
// when the URL is moved from schema.prisma to prisma.config.ts
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
