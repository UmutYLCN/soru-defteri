import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ensureUserExists } from '@/lib/user'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Kullanıcıyı oluştur veya güncelle
        let syncedUser;
        try {
            syncedUser = await ensureUserExists(user)
        } catch (syncError: any) {
            console.error('API /api/user/me: Sync failed:', syncError)
            return NextResponse.json({
                error: 'Sync Failed',
                message: syncError?.message || 'Failed to sync user with database'
            }, { status: 500 })
        }

        console.log('API /api/user/me: Sync result:', syncedUser ? 'Success' : 'Failed')

        // Veritabanından kullanıcıyı çek
        const { data: dbUser, error } = await supabase
            .from('User')
            .select('*')
            .eq('id', user.id)
            .single()

        if (error || !dbUser) {
            console.error('API /api/user/me: User not found in database', { error, userId: user.id })
            return NextResponse.json({
                error: 'User not found',
                message: error?.message || 'User could not be created or found in data store'
            }, { status: 404 })
        }

        return NextResponse.json(dbUser)
    } catch (error: any) {
        console.error('API Error /api/user/me:', error)
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}
