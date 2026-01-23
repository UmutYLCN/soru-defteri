import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // 1. Find questions with empty fields
        const invalidQuestions = await prisma.question.findMany({
            where: {
                OR: [
                    { questionText: '' },
                    { optionA: '' },
                    { optionB: '' },
                    { optionC: '' },
                    { optionD: '' },
                    { correctAnswer: '' },
                ],
            },
        })

        // 2. Find questions with invalid categories (Prisma handles this mostly, but good to check)
        // Actually Prisma won't allow invalid categoryId if it's set and not found in Category table due to foreign key constraints.

        // 3. Find duplicates (same question text)
        const allQuestions = await prisma.question.findMany({
            select: { id: true, questionText: true }
        })

        const duplicates = allQuestions.filter((q, index) =>
            allQuestions.findIndex(prev => prev.questionText === q.questionText) !== index
        )

        return NextResponse.json({
            health: {
                invalidCount: invalidQuestions.length,
                duplicateCount: duplicates.length,
            },
            invalidQuestions,
            duplicates
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST() {
    try {
        // Auto-fix: Remove invalid questions and duplicates

        // Remove invalid
        const invalidRemovals = await prisma.question.deleteMany({
            where: {
                OR: [
                    { questionText: '' },
                    { optionA: '' },
                    { optionB: '' },
                    { optionC: '' },
                    { optionD: '' },
                    { correctAnswer: '' },
                ],
            },
        })

        // Remove duplicates (keep the first one)
        const allQuestions = await prisma.question.findMany({
            select: { id: true, questionText: true },
            orderBy: { id: 'asc' }
        })

        const idsToRemove: number[] = []
        const seen = new Set()

        for (const q of allQuestions) {
            if (seen.has(q.questionText)) {
                idsToRemove.push(q.id)
            } else {
                seen.add(q.questionText)
            }
        }

        const duplicateRemovals = await prisma.question.deleteMany({
            where: {
                id: { in: idsToRemove }
            }
        })

        return NextResponse.json({
            success: true,
            fixed: {
                invalid: invalidRemovals.count,
                duplicates: duplicateRemovals.count
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
