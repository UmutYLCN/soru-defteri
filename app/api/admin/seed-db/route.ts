import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const INITIAL_COURSES = [
    "COE104 - The History of Engineering",
    "COE208 - Digital Logic Design",
    "CPL102 - Career Planning",
    "CSE102 - Computer Programming II",
    "MTH102 - Mathematics II",
    "OHS202 - Occupational Health and Safety II",
    "PHY102 - Physics II"
]

export async function POST() {
    try {
        const results = []
        for (const courseName of INITIAL_COURSES) {
            const category = await prisma.category.upsert({
                where: { name: courseName },
                update: { name: courseName },
                create: {
                    name: courseName
                },
            })
            results.push(category)
        }

        return NextResponse.json({ success: true, seededCount: results.length })
    } catch (error: any) {
        console.error('Seed DB error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
