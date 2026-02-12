import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
        const leaderboard = await prisma.user.findMany({
            take: 10,
            orderBy: {
                totalCreditsUsed: 'desc'
            },
            select: {
                id: true,
                name: true,
                image: true,
                totalCreditsUsed: true,
                subscriptionPlan: true
            }
        })

        // Find current user's rank
        const allUsers = await prisma.user.findMany({
            orderBy: {
                totalCreditsUsed: 'desc'
            },
            select: {
                id: true
            }
        })

        const userRank = allUsers.findIndex(u => u.id === user.id) + 1

        return NextResponse.json({
            leaderboard,
            userRank
        })
    } catch (error: any) {
        console.error('API Error /api/leaderboard:', error)
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }
}
