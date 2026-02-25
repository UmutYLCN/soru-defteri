import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * POST /api/user/reset-credits
 * Resets the current user's credits to 1000 if they are 0 or depleted.
 * This handles old accounts created under the previous free-tier limit.
 */
export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('User')
            .select('credits')
            .eq('id', user.id)
            .single()

        const currentCredits = profile?.credits ?? 0

        if (currentCredits > 0) {
            return NextResponse.json({ message: 'Credits are fine', credits: currentCredits })
        }

        const { data: updated, error } = await supabase
            .from('User')
            .update({ credits: 1000, updatedAt: new Date().toISOString() })
            .eq('id', user.id)
            .select('credits')
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, credits: updated?.credits })
    } catch (error: any) {
        console.error('Error resetting credits:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
