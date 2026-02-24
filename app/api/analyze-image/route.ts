import { NextResponse } from 'next/server'
import { detectDiagram } from '@/lib/ai'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { image } = await req.json()
        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 })
        }

        const hasDiagram = await detectDiagram(image)
        return NextResponse.json({ hasDiagram })
    } catch (error: any) {
        console.error('Error in /api/analyze-image:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
