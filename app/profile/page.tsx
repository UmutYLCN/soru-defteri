'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Zap, Calendar, Clock, Globe, ChevronRight, Sparkles, Check, Trophy, Medal, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface UserProfile {
    id: string
    email: string
    name: string | null
    image: string | null
    subscriptionPlan: string
    subscriptionStatus: string
    subscriptionStartAt: string | null
    subscriptionEndAt: string | null
    credits: number
    totalCreditsUsed: number
    preferredLanguage: string
    createdAt: string
    lastLoginAt: string | null
    rank?: number
}

interface LeaderboardUser {
    id: string
    name: string | null
    image: string | null
    totalCreditsUsed: number
    subscriptionPlan: string
}

const planConfig: Record<string, { label: string; color: string; icon: string; credits: number }> = {
    FREE: { label: 'Ücretsiz', color: 'text-zinc-400', icon: '🆓', credits: 10 },
    STARTER: { label: 'Starter', color: 'text-blue-400', icon: '🚀', credits: 500 },
    PRO: { label: 'Pro', color: 'text-purple-400', icon: '⚡', credits: 2000 },
    ELITE: { label: 'Elite', color: 'text-amber-400', icon: '👑', credits: 10000 },
}

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [authUser, setAuthUser] = useState<any>(null)
    const [savingLang, setSavingLang] = useState(false)
    const [savedLang, setSavedLang] = useState(false)
    const [showLeaderboard, setShowLeaderboard] = useState(false)
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([])
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

    useEffect(() => {
        async function fetchProfile() {
            try {
                setError(null)
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/')
                    return
                }
                setAuthUser(user)

                const res = await fetch('/api/user/me', { cache: 'no-store' })
                if (!res.ok) {
                    const errData = await res.json()
                    throw new Error(errData.message || errData.error || 'Profil verisi alınamadı')
                }
                const data = await res.json()
                if (data?.id) {
                    // Fetch rank
                    const lbRes = await fetch('/api/leaderboard')
                    if (lbRes.ok) {
                        const lbData = await lbRes.json()
                        data.rank = lbData.userRank
                        setLeaderboardData(lbData.leaderboard)
                    }
                    setProfile(data)
                } else {
                    setError('Kullanıcı verisi eksik')
                }
            } catch (error) {
                console.error('Profile fetch error:', error)
                setError(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu')
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [router])

    const fetchLeaderboard = async () => {
        setShowLeaderboard(true)
        if (leaderboardData.length > 0) return

        setLoadingLeaderboard(true)
        try {
            const res = await fetch('/api/leaderboard')
            if (res.ok) {
                const data = await res.json()
                setLeaderboardData(data.leaderboard)
            }
        } catch (error) {
            console.error('Leaderboard fetch error:', error)
        } finally {
            setLoadingLeaderboard(false)
        }
    }

    const handleLanguageChange = async (lang: string) => {
        if (!profile) return
        setSavingLang(true)
        setSavedLang(false)
        try {
            await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferredLanguage: lang })
            })
            setProfile({ ...profile, preferredLanguage: lang })
            setSavedLang(true)
            setTimeout(() => setSavedLang(false), 2000)
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSavingLang(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <Globe className="w-8 h-8 text-red-500 opacity-50" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">Hata Oluştu</h1>
                <p className="text-zinc-500 text-sm max-w-xs mb-8">
                    {error || 'Profil bilgilerinize şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyiniz.'}
                </p>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-zinc-200 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Dashboard'a Dön
                </Link>
            </div>
        )
    }

    const plan = planConfig[profile.subscriptionPlan] || planConfig.FREE
    const creditsPercent = plan.credits > 0 ? Math.min(100, (profile.credits / plan.credits) * 100) : 0
    const memberSince = new Date(profile.createdAt).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric'
    })

    const initial = (profile.name || profile.email || 'U').charAt(0).toUpperCase()

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="relative z-10 container mx-auto px-6 py-8 max-w-3xl">
                {/* Back button */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-10 text-sm font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Dashboard'a Dön
                </Link>

                {/* Profile Header */}
                <div className="bg-[#0c0c0e] rounded-[32px] border border-white/[0.05] p-8 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                            {authUser?.user_metadata?.avatar_url ? (
                                <img
                                    src={authUser.user_metadata.avatar_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-2xl"
                                />
                            ) : (
                                <span className="text-2xl font-black text-white">{initial}</span>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">{profile.name || 'Kullanıcı'}</h1>
                            <p className="text-zinc-500 text-sm font-medium">{profile.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-lg">{plan.icon}</span>
                                <span className={`text-xs font-black uppercase tracking-widest ${plan.color}`}>
                                    {plan.label} Plan
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#0c0c0e] rounded-[24px] border border-white/[0.05] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-white" />
                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Kalan Kredi</span>
                        </div>
                        <div className="text-3xl font-black text-white">{profile.credits}</div>

                        {/* Credit bar */}
                        <div className="mt-3 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${creditsPercent > 50 ? 'bg-emerald-500' :
                                    creditsPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${creditsPercent}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                            {plan.credits} kredilik planda
                        </p>
                    </div>

                    <div className="bg-[#0c0c0e] rounded-[24px] border border-white/[0.05] p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Kullanılan</span>
                        </div>
                        <div className="text-3xl font-black text-white">{profile.totalCreditsUsed}</div>
                        <p className="text-[10px] text-zinc-600 mt-2 font-medium">
                            toplam üretilen soru
                        </p>
                    </div>

                    <div
                        onClick={fetchLeaderboard}
                        className="bg-[#0c0c0e] rounded-[24px] border border-white/[0.05] p-5 cursor-pointer hover:border-white/30 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Sıralama</span>
                        </div>
                        <div className="text-3xl font-black text-white">#{profile.rank || '—'}</div>
                        <p className="text-[10px] text-zinc-600 mt-2 font-medium flex items-center gap-1">
                            tüm kullanıcılar arasında <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </p>
                    </div>
                </div>

                {/* Leaderboard Modal */}
                {showLeaderboard && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowLeaderboard(false)}
                        />
                        <div className="relative w-full max-w-md bg-[#0c0c0e] border border-white/[0.1] rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <h3 className="font-black text-white">Global Sıralama</h3>
                                </div>
                                <button
                                    onClick={() => setShowLeaderboard(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                                {loadingLeaderboard ? (
                                    <div className="py-20 flex flex-col items-center gap-4">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    leaderboardData.map((user, index) => (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${user.id === profile.id
                                                ? 'bg-white/10 border-white/20'
                                                : 'bg-white/[0.02] border-transparent hover:border-white/10'
                                                }`}
                                        >
                                            <div className="w-8 flex justify-center">
                                                {index === 0 ? <Medal className="w-5 h-5 text-amber-400" /> :
                                                    index === 1 ? <Medal className="w-5 h-5 text-zinc-400" /> :
                                                        index === 2 ? <Medal className="w-5 h-5 text-zinc-400" /> :
                                                            <span className="text-xs font-black text-zinc-600">#{index + 1}</span>
                                                }
                                            </div>

                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0 overflow-hidden border border-white/10">
                                                {user.image ? (
                                                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-white text-white font-black text-sm">
                                                        {(user.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">
                                                    {user.name || 'Gizli Kullanıcı'}
                                                    {user.id === profile.id && <span className="ml-2 text-[10px] text-white uppercase font-black">(Sen)</span>}
                                                </p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{user.subscriptionPlan} ÜYE</p>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-sm font-black text-white">{user.totalCreditsUsed}</div>
                                                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Soru</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Section */}
                <div className="bg-[#0c0c0e] rounded-[32px] border border-white/[0.05] p-8 mb-6">
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">Tercihler</h2>

                    {/* Language Preference */}
                    <div className="flex items-center justify-between py-4 border-b border-white/[0.03]">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Varsayılan Dil</p>
                                <p className="text-xs text-zinc-500">Soruların varsayılan gösterim dili</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {savedLang && (
                                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-in fade-in">
                                    <Check className="w-3 h-3" /> Kaydedildi
                                </span>
                            )}
                            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-0.5">
                                <button
                                    onClick={() => handleLanguageChange('tr')}
                                    disabled={savingLang}
                                    className={`px-4 py-2 rounded-[10px] text-xs font-black transition-all duration-300 ${profile.preferredLanguage === 'tr'
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Türkçe
                                </button>
                                <button
                                    onClick={() => handleLanguageChange('en')}
                                    disabled={savingLang}
                                    className={`px-4 py-2 rounded-[10px] text-xs font-black transition-all duration-300 ${profile.preferredLanguage === 'en'
                                        ? 'bg-white text-black shadow-lg'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    English
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Crown className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Abonelik Planı</p>
                                <p className="text-xs text-zinc-500">
                                    {plan.label} — {profile.subscriptionStatus === 'ACTIVE' ? 'Aktif' : profile.subscriptionStatus}
                                </p>
                            </div>
                        </div>
                        <button
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-white to-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 active:scale-[0.97]"
                            onClick={() => {/* Polar checkout will go here */ }}
                        >
                            Planı Yükselt
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-[#0c0c0e] rounded-[32px] border border-white/[0.05] p-8">
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">Hesap Bilgileri</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">E-posta</span>
                            <span className="text-sm text-white font-medium">{profile.email}</span>
                        </div>
                        <div className="border-t border-white/[0.03]" />
                        <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Son Giriş</span>
                            <span className="text-sm text-white font-medium">
                                {profile.lastLoginAt
                                    ? new Date(profile.lastLoginAt).toLocaleDateString('tr-TR', {
                                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })
                                    : '—'}
                            </span>
                        </div>
                        <div className="border-t border-white/[0.03]" />
                        <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Kullanıcı ID</span>
                            <span className="text-[10px] text-zinc-600 font-mono">{profile.id}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-[10px] text-zinc-700 font-medium">Quesly v1.0</p>
                </div>
            </div>
        </div>
    )
}
