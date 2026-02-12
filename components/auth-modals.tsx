'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Github, Mail, Lock, User, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { signInWithEmail, signUpWithEmail, signInWithGithub, signInWithGoogle } from '@/app/auth/actions'

interface AuthModalsProps {
    isOpen: boolean
    onClose: () => void
    initialView?: 'login' | 'register'
}

export function AuthModals({ isOpen, onClose, initialView = 'login' }: AuthModalsProps) {
    const [view, setView] = useState<'login' | 'register'>(initialView)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    // Sync view with initialView when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setView(initialView)
            setError(null)
        }
    }, [isOpen, initialView])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const name = formData.get('name') as string

        try {
            if (view === 'login') {
                const { error } = await signInWithEmail(email, password)
                if (error) throw error
            } else {
                const { error } = await signUpWithEmail(email, password, name)
                if (error) throw error
            }

            router.push('/dashboard')
            onClose()
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    const handleSocialLogin = async (provider: 'github' | 'google') => {
        setLoading(true)
        try {
            if (provider === 'github') await signInWithGithub()
            if (provider === 'google') await signInWithGoogle()
        } catch (err: any) {
            setError(err.message || 'Sosyal giriş yapılamadı.')
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] bg-zinc-950 border-white/5 p-0 overflow-hidden rounded-[32px] shadow-2xl">
                <div className="relative p-8">
                    {/* Background Gradient Effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />

                    <DialogHeader className="relative z-10 mb-8 text-center sm:text-center">
                        <div className="mx-auto w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 ring-1 ring-orange-500/20">
                            <Sparkles size={24} />
                        </div>
                        <DialogTitle className="text-3xl font-black text-white tracking-tighter">
                            {view === 'login' ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 font-medium text-base mt-2">
                            {view === 'login'
                                ? 'Quesly dünyasına geri dönün.'
                                : 'Premium soru deneyimine hemen başlayın.'}
                        </DialogDescription>
                    </DialogHeader>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center animate-in fade-in zoom-in-95 duration-200">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
                        {view === 'register' && (
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">Ad Soyad</Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        placeholder="John Doe"
                                        className="bg-white/[0.03] border-white/5 h-12 pl-12 rounded-xl focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all text-white placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-zinc-500 ml-1">E-Posta</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    className="bg-white/[0.03] border-white/5 h-12 pl-12 rounded-xl focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all text-white placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <Label htmlFor="pass" className="text-xs font-black uppercase tracking-widest text-zinc-500">Şifre</Label>
                                {view === 'login' && (
                                    <button type="button" className="text-[10px] font-black uppercase tracking-wider text-orange-500 hover:text-orange-400 transition-colors">
                                        Şifremi Unuttum
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                                <Input
                                    id="pass"
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="bg-white/[0.03] border-white/5 h-12 pl-12 rounded-xl focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all text-white placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <Button
                            disabled={loading}
                            className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 group"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                <>
                                    {view === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 relative z-10">
                        <div className="relative flex items-center justify-center mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <span className="relative px-4 bg-zinc-950 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Veya İle Devam Et</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleSocialLogin('github')}
                                disabled={loading}
                                className="flex items-center justify-center gap-3 h-12 bg-white/[0.03] border border-white/5 rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all font-bold text-sm disabled:opacity-50"
                            >
                                <Github size={18} />
                                Github
                            </button>
                            <button
                                onClick={() => handleSocialLogin('google')}
                                disabled={loading}
                                className="flex items-center justify-center gap-3 h-12 bg-white/[0.03] border border-white/5 rounded-xl text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-all font-bold text-sm disabled:opacity-50"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                        </div>
                    </div>

                    <p className="text-center mt-8 text-zinc-500 text-sm font-medium relative z-10">
                        {view === 'login' ? 'Henüz hesabınız yok mu?' : 'Zaten bir hesabınız var mı?'}
                        <button
                            onClick={() => setView(view === 'login' ? 'register' : 'login')}
                            className="ml-2 text-white font-black hover:text-orange-500 transition-colors"
                        >
                            {view === 'login' ? 'Kayıt Ol' : 'Giriş Yap'}
                        </button>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
