import { NextResponse } from 'next/server'
import { generateGroupedQuestions } from '@/lib/gemini'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('API Request: /api/generate-grouped');
        const { prompt, subQuestionCount, categoryId, image, originalImage } = await request.json()

        if (!prompt && !image) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 })
        }

        if (!subQuestionCount || subQuestionCount < 2 || subQuestionCount > 5) {
            return NextResponse.json({ error: 'Sub-question count must be between 2 and 5' }, { status: 400 })
        }

        const result = await generateGroupedQuestions(prompt, image, subQuestionCount, originalImage)

        // Create the QuestionGroup first
        const { data: group, error: groupError } = await supabase
            .from('QuestionGroup')
            .insert({
                stemText: result.stemText,
                stemTextEN: result.stemTextEN || null,
                imageUrl: result.imageUrl || null,
                categoryId: categoryId ? parseInt(categoryId) : null,
                userId: user.id,
            })
            .select()
            .single()

        if (groupError) throw groupError

        // Create all sub-questions linked to this group
        const questionsToSave = result.questions.map((q: any) => ({
            userId: user.id,
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
        }))

        const { data: savedQuestions, error: questionsError } = await supabase
            .from('Question')
            .insert(questionsToSave)
            .select()

        if (questionsError) throw questionsError

        return NextResponse.json({
            success: true,
            groupId: group.id,
            count: savedQuestions?.length || 0
        })
    } catch (error: any) {
        console.error('Error generating grouped questions:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to generate grouped questions' },
            { status: 500 }
        )
    }
}
