import { NextResponse } from 'next/server'
import { generate } from '@/lib/gemini'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('API Request: /api/generate');
        const { prompt, count, questionType, categoryId, image, originalImage } = await req.json()

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 })
        }

        const generatedQuestions = await generate(prompt, image, questionType || 'Karışık', count, originalImage)

        // Save to database
        const questionsToSave = generatedQuestions.map((q: any) => ({
            userId: user.id,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            solution: q.solution,
            imageUrl: q.imageUrl,
            // English translations
            questionTextEN: q.questionTextEN,
            optionAEN: q.optionAEN,
            optionBEN: q.optionBEN,
            optionCEN: q.optionCEN,
            optionDEN: q.optionDEN,
            solutionEN: q.solutionEN,
            categoryId: categoryId ? parseInt(categoryId) : null,
        }))

        const { data: savedQuestions, error } = await supabase
            .from('Question')
            .insert(questionsToSave)
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, count: savedQuestions?.length || 0 })
    } catch (error: any) {
        console.error('Error in /api/generate:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
