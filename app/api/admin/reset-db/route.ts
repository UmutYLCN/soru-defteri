import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Delete all questions first (due to foreign key if any, though Category doesn't depend on Question)
    await prisma.question.deleteMany()
    // Delete all categories
    await prisma.category.deleteMany()

    return NextResponse.json({ success: true, message: 'Veritabanı başarıyla sıfırlandı.' })
  } catch (error: any) {
    console.error('Reset DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
