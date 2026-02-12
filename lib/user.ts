import { prisma } from '@/lib/prisma'

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

    const email = authUser.email || ''
    const name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
    const image = authUser.user_metadata?.avatar_url || null

    try {
        // 1. Önce ID ile ara
        const existingUserById = await prisma.user.findUnique({
            where: { id: authUser.id }
        })

        if (existingUserById) {
            // ID bulundu, bilgilerini güncelle
            return await prisma.user.update({
                where: { id: authUser.id },
                data: {
                    email,
                    name,
                    image,
                    lastLoginAt: new Date()
                }
            })
        }

        // 2. ID bulunamadı, Email ile ara (ID değişmiş olabilir)
        const existingUserByEmail = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUserByEmail) {
            // Email bulundu ama ID farklı. ID'yi güncelle ki Supabase ile uyumlu olsun.
            // Bu sayede kullanıcının eski verileri (soruları, kredileri vb.) korunur.
            return await prisma.user.update({
                where: { email },
                data: {
                    id: authUser.id,
                    name,
                    image,
                    lastLoginAt: new Date()
                }
            })
        }

        // 3. Hiç bulunamadı, yeni oluştur
        return await prisma.user.create({
            data: {
                id: authUser.id,
                email,
                name,
                image,
                credits: 10,
                subscriptionPlan: 'FREE',
                subscriptionStatus: 'ACTIVE',
                preferredLanguage: 'tr',
                lastLoginAt: new Date()
            }
        })
    } catch (error) {
        console.error('CRITICAL: ensureUserExists failed!', error)
        return null
    }
}

export async function hasCredits(userId: string, amount: number = 1): Promise<boolean> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true }
        })
        return (user?.credits ?? 0) >= amount
    } catch {
        return false
    }
}

export async function consumeCredits(userId: string, amount: number = 1) {
    try {
        return await prisma.user.update({
            where: { id: userId },
            data: {
                credits: { decrement: amount },
                totalCreditsUsed: { increment: amount },
            },
        })
    } catch (error) {
        console.error('consumeCredits failed:', error)
    }
}
