import { createClient } from '@/lib/supabase-server'

/**
 * Supabase Auth kullanıcısını local User tablosunda senkronize eder.
 */
export async function ensureUserExists(authUser: {
    id: string
    email?: string
    user_metadata?: {
        full_name?: string
        avatar_url?: string
        name?: string
    }
}) {
    if (!authUser?.id) return null

    const supabase = await createClient()
    const email = authUser.email || ''
    const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
    const image = authUser.user_metadata?.avatar_url || null

    // Attempt to upsert the user record
    // This is more robust than select-then-insert/update
    const now = new Date().toISOString()
    const { data: user, error } = await supabase
        .from('User')
        .upsert({
            id: authUser.id,
            email,
            name,
            image,
            lastLoginAt: now,
            updatedAt: now, // Satisfy NOT NULL constraint
        }, { onConflict: 'id' })
        .select()
        .single()

    if (error) {
        console.error('ensureUserExists failed:', error)

        // If it's a "column does not exist" error, it might be because of naming
        if (error.message.includes('column') || error.message.includes('relation')) {
            throw new Error(`Database Schema Error: ${error.message}`)
        }

        // Try a simple select to see if user exists at least
        const { data: existing } = await supabase
            .from('User')
            .select('*')
            .eq('id', authUser.id)
            .single()

        if (existing) return existing

        throw error
    }

    return user
}

export async function hasCredits(userId: string, amount: number = 1): Promise<boolean> {
    try {
        const supabase = await createClient()
        const { data: user } = await supabase
            .from('User')
            .select('credits')
            .eq('id', userId)
            .single()

        return (user?.credits ?? 0) >= amount
    } catch {
        return false
    }
}

export async function consumeCredits(userId: string, amount: number = 1) {
    try {
        const supabase = await createClient()

        // Supabase update doesnt have atomic increment/decrement easily via JS client
        // Fetch current credits first (or use an RPC if defined in Supabase)
        const { data: user } = await supabase
            .from('User')
            .select('credits, totalCreditsUsed')
            .eq('id', userId)
            .single()

        if (!user) return null

        return await supabase
            .from('User')
            .update({
                credits: (user.credits || 0) - amount,
                totalCreditsUsed: (user.totalCreditsUsed || 0) + amount,
            })
            .eq('id', userId)
            .select()
            .single()
    } catch (error) {
        console.error('consumeCredits failed:', error)
    }
}
