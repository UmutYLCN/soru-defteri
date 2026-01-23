import { NextResponse } from 'next/server'
import { generateQuestions } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const { prompt, count, level, language, categoryId } = await req.json()

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
        }

        const generatedQuestions = await generateQuestions(prompt, count, level, language)

        // Save to database
        const savedQuestions = await Promise.all(
            generatedQuestions.map((q: any) =>
                prisma.question.create({
                    data: {
                        questionText: q.questionText,
                        optionA: q.optionA,
                        optionB: q.optionB,
                        optionC: q.optionC,
                        optionD: q.optionD,
                        correctAnswer: q.correctAnswer,
                        solution: q.solution,
                        categoryId: categoryId ? parseInt(categoryId) : null,
                    },
                })
            )
        )

        return NextResponse.json({ success: true, count: savedQuestions.length })
    } catch (error: any) {
        console.error('Error in /api/generate:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
