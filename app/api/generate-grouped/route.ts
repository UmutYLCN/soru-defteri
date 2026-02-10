export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateGroupedQuestions } from '@/lib/gemini'

export async function POST(request: Request) {
    try {
        const { prompt, subQuestionCount, categoryId } = await request.json()

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        if (!subQuestionCount || subQuestionCount < 2 || subQuestionCount > 5) {
            return NextResponse.json({ error: 'Sub-question count must be between 2 and 5' }, { status: 400 })
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
        }

        const result = await generateGroupedQuestions(prompt, subQuestionCount)

        // Create the QuestionGroup first
        const group = await prisma.questionGroup.create({
            data: {
                stemText: result.stemText,
                stemTextEN: result.stemTextEN || null,
                categoryId: categoryId ? parseInt(categoryId) : null,
            }
        })

        // Create all sub-questions linked to this group
        const savedQuestions = await Promise.all(
            result.questions.map((q: any) =>
                prisma.question.create({
                    data: {
                        questionText: q.questionText,
                        optionA: q.optionA,
                        optionB: q.optionB,
                        optionC: q.optionC,
                        optionD: q.optionD,
                        correctAnswer: q.correctAnswer,
                        solution: q.solution || null,
                        questionTextEN: q.questionTextEN || null,
                        optionAEN: q.optionAEN || null,
                        optionBEN: q.optionBEN || null,
                        optionCEN: q.optionCEN || null,
                        optionDEN: q.optionDEN || null,
                        solutionEN: q.solutionEN || null,
                        categoryId: categoryId ? parseInt(categoryId) : null,
                        groupId: group.id,
                    },
                    include: { category: true }
                })
            )
        )

        return NextResponse.json({
            success: true,
            groupId: group.id,
            count: savedQuestions.length
        })
    } catch (error: any) {
        console.error('Error generating grouped questions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate grouped questions' },
            { status: 500 }
        )
    }
}
