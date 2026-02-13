import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ensureUserExists } from '@/lib/user'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Kullanıcı kaydını senkronize et
        await ensureUserExists(user)

        const { data: questions, error } = await supabase
            .from('Question')
            .select('*, category:Category(*), group:QuestionGroup(*)')
            .eq('userId', user.id)
            .order('createdAt', { ascending: false })

        if (error) throw error

        return NextResponse.json(questions)
    } catch (error: any) {
        console.error('Error fetching questions:', error)
        return NextResponse.json({
            error: 'Failed to fetch questions',
            message: error?.message || 'Unknown error'
        }, { status: 500 })
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

        const { data: question, error } = await supabase
            .from('Question')
            .insert({
                userId: user.id,
                categoryId: categoryId ? parseInt(String(categoryId)) : null,
                questionText: String(questionText).trim(),
                optionA: String(optionA).trim(),
                optionB: String(optionB).trim(),
                optionC: String(optionC).trim(),
                optionD: String(optionD).trim(),
                correctAnswer: String(correctAnswer).toUpperCase(),
                solution: solution?.trim() || null
            })
            .select('*, category:Category(*)')
            .single()

        if (error) throw error

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

        // Verify ownership and delete
        const { data: question, error: fetchError } = await supabase
            .from('Question')
            .select('userId')
            .eq('id', questionId)
            .single()

        if (fetchError || !question || question.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied or not found' }, { status: 403 })
        }

        const { error: deleteError } = await supabase
            .from('Question')
            .delete()
            .eq('id', questionId)

        if (deleteError) throw deleteError

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
        const { data: existingQuestion, error: fetchError } = await supabase
            .from('Question')
            .select('userId')
            .eq('id', questionId)
            .single()

        if (fetchError || !existingQuestion || existingQuestion.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied or not found' }, { status: 403 })
        }

        const { data: question, error: updateError } = await supabase
            .from('Question')
            .update({
                categoryId: categoryId ? parseInt(String(categoryId)) : null,
                questionText: String(questionText).trim(),
                optionA: String(optionA).trim(),
                optionB: String(optionB).trim(),
                optionC: String(optionC).trim(),
                optionD: String(optionD).trim(),
                correctAnswer: String(correctAnswer).toUpperCase(),
                solution: solution?.trim() || null
            })
            .eq('id', questionId)
            .select('*, category:Category(*)')
            .single()

        if (updateError) throw updateError

        return NextResponse.json(question)
    } catch (error) {
        console.error('Error updating question:', error)
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }
}
