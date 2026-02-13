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

        // Kullanıcı kaydını senkronize et
        await ensureUserExists(user)

        const { data: categories, error } = await supabase
            .from('Category')
            .select('*, questions:Question(count)')
            .eq('userId', user.id)
            .order('name', { ascending: true })

        if (error) throw error

        // Transform to match Prisma's structure for _count if needed by frontend
        const formattedCategories = categories.map(cat => ({
            ...cat,
            _count: {
                questions: cat.questions?.[0]?.count || 0
            }
        }))

        return NextResponse.json(formattedCategories)
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({
            error: 'Failed to fetch categories',
            message: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Kullanıcı kaydını senkronize et
        await ensureUserExists(user)

        const { name, parentId } = await request.json()

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
        }

        const { data: category, error } = await supabase
            .from('Category')
            .insert({
                name: name.trim(),
                parentId: parentId ? parseInt(String(parentId)) : null,
                userId: user.id
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json(category, { status: 201 })
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }
}
