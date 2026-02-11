import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { createClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const questions = await prisma.question.findMany({
            where: {
                userId: user.id
            },
            include: {
                category: true,
                group: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(questions)
    } catch (error) {
        console.error('Error fetching questions:', error)
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { categoryId, questionText, optionA, optionB, optionC, optionD, correctAnswer, solution } = body

        // Validation
        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }

        if (!['A', 'B', 'C', 'D'].includes(correctAnswer.toUpperCase())) {
            return NextResponse.json({ error: 'Correct answer must be A, B, C, or D' }, { status: 400 })
        }

        const question = await prisma.question.create({
            data: {
                userId: user.id,
                categoryId: categoryId ? parseInt(String(categoryId)) : null,
                questionText: String(questionText).trim(),
                optionA: String(optionA).trim(),
                optionB: String(optionB).trim(),
                optionC: String(optionC).trim(),
                optionD: String(optionD).trim(),
                correctAnswer: String(correctAnswer).toUpperCase(),
                solution: solution?.trim() || null
            },
            include: {
                category: true
            }
        })

        return NextResponse.json(question, { status: 201 })
    } catch (error) {
        console.error('Error creating question:', error)
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
        }

        const questionId = parseInt(id)
        if (isNaN(questionId)) {
            return NextResponse.json({ error: 'Invalid Question ID' }, { status: 400 })
        }

        // Verify ownership
        const question = await prisma.question.findUnique({
            where: { id: questionId }
        })

        if (!question || question.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        await prisma.question.delete({
            where: { id: questionId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting question:', error)
        return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, categoryId, questionText, optionA, optionB, optionC, optionD, correctAnswer, solution } = body

        // Validation
        if (!id) {
            return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
        }

        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
        }

        if (!['A', 'B', 'C', 'D'].includes(correctAnswer.toUpperCase())) {
            return NextResponse.json({ error: 'Correct answer must be A, B, C, or D' }, { status: 400 })
        }

        const questionId = parseInt(id)
        if (isNaN(questionId)) {
            return NextResponse.json({ error: 'Invalid Question ID' }, { status: 400 })
        }

        // Verify ownership
        const existingQuestion = await prisma.question.findUnique({
            where: { id: questionId }
        })

        if (!existingQuestion || existingQuestion.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const question = await prisma.question.update({
            where: { id: questionId },
            data: {
                categoryId: categoryId ? parseInt(String(categoryId)) : null,
                questionText: String(questionText).trim(),
                optionA: String(optionA).trim(),
                optionB: String(optionB).trim(),
                optionC: String(optionC).trim(),
                optionD: String(optionD).trim(),
                correctAnswer: String(correctAnswer).toUpperCase(),
                solution: solution?.trim() || null
            },
            include: {
                category: true
            }
        })

        return NextResponse.json(question)
    } catch (error) {
        console.error('Error updating question:', error)
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }
}
