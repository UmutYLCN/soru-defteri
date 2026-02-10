export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVariants } from '@/lib/gemini'

export async function POST(request: Request) {
    try {
        const { questionId, count } = await request.json()

        if (!questionId || !count) {
            return NextResponse.json({ error: 'questionId and count are required' }, { status: 400 })
        }

        if (count < 1 || count > 5) {
            return NextResponse.json({ error: 'Count must be between 1 and 5' }, { status: 400 })
        }

        // Fetch the original question
        const originalQuestion = await prisma.question.findUnique({
            where: { id: questionId },
            include: { category: true }
        })

        if (!originalQuestion) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        // Generate variants using Gemini
        const variants = await generateVariants({
            questionText: originalQuestion.questionText,
            optionA: originalQuestion.optionA,
            optionB: originalQuestion.optionB,
            optionC: originalQuestion.optionC,
            optionD: originalQuestion.optionD,
            correctAnswer: originalQuestion.correctAnswer,
            solution: originalQuestion.solution,
            questionTextEN: originalQuestion.questionTextEN,
            optionAEN: originalQuestion.optionAEN,
            optionBEN: originalQuestion.optionBEN,
            optionCEN: originalQuestion.optionCEN,
            optionDEN: originalQuestion.optionDEN,
            solutionEN: originalQuestion.solutionEN,
        }, count)

        // Save all variants to the database under the same category
        const savedVariants = await Promise.all(
            variants.map((variant: any) =>
                prisma.question.create({
                    data: {
                        questionText: variant.questionText,
                        optionA: variant.optionA,
                        optionB: variant.optionB,
                        optionC: variant.optionC,
                        optionD: variant.optionD,
                        correctAnswer: variant.correctAnswer,
                        solution: variant.solution || null,
                        questionTextEN: variant.questionTextEN || null,
                        optionAEN: variant.optionAEN || null,
                        optionBEN: variant.optionBEN || null,
                        optionCEN: variant.optionCEN || null,
                        optionDEN: variant.optionDEN || null,
                        solutionEN: variant.solutionEN || null,
                        imageUrl: originalQuestion.imageUrl,
                        categoryId: originalQuestion.categoryId,
                    },
                    include: { category: true }
                })
            )
        )

        return NextResponse.json({
            message: `${savedVariants.length} variant(s) created successfully`,
            variants: savedVariants
        })
    } catch (error: any) {
        console.error('Error generating variants:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate variants' },
            { status: 500 }
        )
    }
}
