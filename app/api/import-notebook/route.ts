import { NextResponse } from 'next/server'
import { processNotebookQuestion } from '@/lib/gemini'
import { createClient } from '@/lib/supabase-server'

interface NotebookQuestion {
    question: string
    answerOptions: {
        text: string
        isCorrect: boolean
        rationale: string
    }[]
    hint: string
}

interface NotebookData {
    quiz: NotebookQuestion[]
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data, categoryId } = await req.json() as { data: NotebookData, categoryId?: string }

        if (!data?.quiz || !Array.isArray(data.quiz)) {
            return NextResponse.json({ error: 'Invalid JSON format. Expected { quiz: [...] }' }, { status: 400 })
        }

        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        }

        // Process questions sequentially to avoid rate limits
        for (let i = 0; i < data.quiz.length; i++) {
            const q = data.quiz[i]

            try {
                console.log(`Processing question ${i + 1}/${data.quiz.length}...`)

                // Process with AI to get full question data
                const processed = await processNotebookQuestion(q)

                // Save to database
                const { error: insertError } = await supabase
                    .from('Question')
                    .insert({
                        userId: user.id,
                        questionText: processed.questionText,
                        optionA: processed.optionA,
                        optionB: processed.optionB,
                        optionC: processed.optionC,
                        optionD: processed.optionD,
                        correctAnswer: processed.correctAnswer,
                        solution: processed.solution,
                        questionTextEN: processed.questionTextEN,
                        optionAEN: processed.optionAEN,
                        optionBEN: processed.optionBEN,
                        optionCEN: processed.optionCEN,
                        optionDEN: processed.optionDEN,
                        solutionEN: processed.solutionEN,
                        categoryId: categoryId ? parseInt(categoryId) : null,
                    })

                if (insertError) throw insertError

                results.success++
            } catch (error: any) {
                console.error(`Error processing question ${i + 1}:`, error)
                results.failed++
                results.errors.push(`Question ${i + 1}: ${error.message}`)
            }

            // Small delay to avoid rate limiting
            if (i < data.quiz.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        }

        return NextResponse.json({
            message: `Import completed. ${results.success} questions added, ${results.failed} failed.`,
            success: results.success,
            failed: results.failed,
            errors: results.errors
        })
    } catch (error: any) {
        console.error('Error in /api/import-notebook:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
