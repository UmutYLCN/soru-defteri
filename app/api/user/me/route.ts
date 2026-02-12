import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ensureUserExists } from '@/lib/user'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Kullanıcıyı oluştur veya güncelle
        const syncedUser = await ensureUserExists(user)

        // Eğer ensureUserExists null dönerse (hata aldıysa) manuel çekmeyi dene
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'User could not be created or found' }, { status: 404 })
        }

        return NextResponse.json(dbUser)
    } catch (error: any) {
        console.error('API Error /api/user/me:', error)
        return NextResponse.json({
            error: 'Failed to fetch user',
            message: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}
