import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
    try {
        const { priceId } = await req.json()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Lütfen önce giriş yapın' }, { status: 401 })
        }

        if (!priceId) {
            return NextResponse.json({ error: 'Price ID gerekli' }, { status: 400 })
        }

        // Polar API request to create a checkout session
        // Documentation: https://docs.polar.sh/api-reference/checkouts/create
        const polarResponse = await fetch('https://api.polar.sh/api/v1/checkouts/custom', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.POLAR_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                product_price_id: priceId,
                success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
                cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
                custom_field_data: {
                    userId: user.id
                },
                customer_email: user.email
            })
        })

        const data = await polarResponse.json()

        if (!polarResponse.ok) {
            console.error('Polar Error:', data)
            throw new Error(data.detail || 'Polar checkout session oluşturulamadı')
        }

        return NextResponse.json({ url: data.url })
    } catch (error: any) {
        console.error('Checkout Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
