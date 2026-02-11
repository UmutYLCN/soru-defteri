'use client'

import { createClient } from '@/lib/supabase'

export async function signInWithEmail(email: string, pass: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
    })
    return { data, error }
}

export async function signUpWithEmail(email: string, pass: string, name: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
            data: {
                full_name: name,
            },
        },
    })
    return { data, error }
}

export async function signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function signInWithGithub() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    return { data, error }
}

export async function signInWithGoogle() {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    return { data, error }
}
