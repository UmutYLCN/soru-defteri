import { NextResponse } from 'next/server'
import { generateSubtopics } from '@/lib/gemini'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { category, topic } = await req.json()

        if (!category) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 })
        }

        const subtopics = await generateSubtopics(category, topic)

        return NextResponse.json({ subtopics })
    } catch (error: any) {
        console.error('Error in /api/generate-subtopics:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
