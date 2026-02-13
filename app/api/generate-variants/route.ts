export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { generateVariants } from '@/lib/gemini'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { questionId, count } = await request.json()

        if (!questionId || !count) {
            return NextResponse.json({ error: 'questionId and count are required' }, { status: 400 })
        }

        if (count < 1 || count > 5) {
            return NextResponse.json({ error: 'Count must be between 1 and 5' }, { status: 400 })
        }

        // Fetch the original question
        const { data: originalQuestion, error: fetchError } = await supabase
            .from('Question')
            .select('*, Category(*)')
            .eq('id', questionId)
            .single()

        if (fetchError || !originalQuestion) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        // Verify ownership
        if (originalQuestion.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
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
        const variantsToSave = variants.map((variant: any) => ({
            userId: user.id,
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
        }))

        const { data: savedVariants, error: insertError } = await supabase
            .from('Question')
            .insert(variantsToSave)
            .select('*, category:Category(*)')

        if (insertError) throw insertError

        return NextResponse.json({
            message: `${savedVariants?.length || 0} variant(s) created successfully`,
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
