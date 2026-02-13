import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: idStr } = await params
        const id = parseInt(idStr)

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Question ID' }, { status: 400 })
        }

        // Verify ownership and delete
        const { data: question, error: fetchError } = await supabase
            .from('Question')
            .select('userId')
            .eq('id', id)
            .single()

        if (fetchError || !question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 })
        }

        if (question.userId !== user.id) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { error: deleteError } = await supabase
            .from('Question')
            .delete()
            .eq('id', id)

        if (deleteError) throw deleteError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting question:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
