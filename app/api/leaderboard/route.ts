import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Top 10 users by totalCreditsUsed
        const { data: leaderboard, error: leaderboardError } = await supabase
            .from('User')
            .select('id, name, image, totalCreditsUsed, subscriptionPlan')
            .order('totalCreditsUsed', { ascending: false })
            .limit(10)

        if (leaderboardError) throw leaderboardError

        // Find current user's rank
        // Rank is count of users with more totalCreditsUsed + 1
        const { data: currentUser } = await supabase
            .from('User')
            .select('totalCreditsUsed')
            .eq('id', user.id)
            .single()

        const { count: rankCount, error: rankError } = await supabase
            .from('User')
            .select('*', { count: 'exact', head: true })
            .gt('totalCreditsUsed', currentUser?.totalCreditsUsed || 0)

        if (rankError) throw rankError

        const userRank = (rankCount || 0) + 1

        return NextResponse.json({
            leaderboard,
            userRank
        })
    } catch (error: any) {
        console.error('API Error /api/leaderboard:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
