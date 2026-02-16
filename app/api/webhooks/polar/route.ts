import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { validateEvent } from '@polar-sh/sdk/webhooks'

export async function POST(req: Request) {
    const body = await req.text()
    const signature = req.headers.get('webhook-signature') || ''
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

    if (!webhookSecret) {
        console.error('POLAR_WEBHOOK_SECRET is not set')
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    try {
        const event = validateEvent(body, { 'webhook-signature': signature }, webhookSecret) as any

        const supabase = await createClient()

        // Handle specific event types
        if (event.type === 'order.created') {
            const order = event.data
            const metadata = order.customFieldData || {}
            const userId = (metadata as any).userId || order.userId
            const productPriceId = order.productPriceId

            // Map product price IDs to credit amounts
            // Note: These IDs should be replaced with actual Polar product price IDs
            const creditMapping: Record<string, number> = {
                'STARTER_PRICE_ID': 500,
                'PRO_PRICE_ID': 2000,
                'ELITE_PRICE_ID': 10000
            }

            const creditsToAdd = creditMapping[productPriceId] || 0

            if (userId && creditsToAdd > 0) {
                // Get current user data
                const { data: user } = await supabase
                    .from('User')
                    .select('credits')
                    .eq('id', userId)
                    .single()

                if (user) {
                    await supabase
                        .from('User')
                        .update({
                            credits: (user.credits || 0) + creditsToAdd,
                            subscriptionPlan: creditsToAdd === 500 ? 'STARTER' : creditsToAdd === 2000 ? 'PRO' : 'ELITE',
                            subscriptionStatus: 'ACTIVE'
                        })
                        .eq('id', userId)

                    console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
                }
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook verification failed:', error.message)
        return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 })
    }
}
