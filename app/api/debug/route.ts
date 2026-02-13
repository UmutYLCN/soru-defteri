import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Try to query common tables to see which one exists
        const tests = ['User', 'user', 'Question', 'question', 'Category', 'category']
        const results: any = {}

        for (const table of tests) {
            const { error } = await supabase.from(table).select('count').limit(1)
            results[table] = error ? error.message : 'Exists'
        }

        return NextResponse.json(results)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
