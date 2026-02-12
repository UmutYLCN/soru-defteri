'use client'

import React, { useState, useEffect } from 'react'
import { ArrowRight, BookOpen, Brain, FileText, Layout, Sparkles, CheckCircle2, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModals } from '@/components/auth-modals'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function LandingPage() {
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [authView, setAuthView] = useState<'login' | 'register'>('login')
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUser(user)
        })
    }, [])

    const openLogin = () => {
        setAuthView('login')
        setAuthModalOpen(true)
    }

    const openRegister = () => {
        setAuthView('register')
        setAuthModalOpen(true)
    }

    return (
        <div className="min-h-screen bg-black selection:bg-orange-500/30 font-[family-name:var(--font-geist-sans)] overflow-x-hidden">
            {/* Background Effects - Matching Dashboard */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-zinc-800/10 blur-[100px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
            </div>

            {/* Premium Floating Header - Same Design as Dashboard */}
            <header className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl">
                <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-2xl rounded-[32px] px-8 py-3.5 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                    <div className="flex items-center gap-2 group cursor-pointer">
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent font-[family-name:var(--font-outfit)] flex items-center">
                            Quesly<span className="text-orange-500 text-4xl leading-[0] ml-0.5">.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {!user && (
                            <>
                                <button
                                    onClick={openLogin}
                                    className="text-zinc-500 hover:text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all px-4 py-2 hover:scale-105"
                                >
                                    Giriş Yap
                                </button>
                                <Button
                                    onClick={openRegister}
                                    className="bg-white hover:bg-zinc-100 text-black font-black px-6 py-2.5 rounded-[20px] transition-all duration-500 active:scale-[0.97] shadow-[0_15px_30px_rgba(255,255,255,0.1)] border border-white/20 flex items-center gap-3 group"
                                >
                                    <div className="w-8 h-8 bg-black/5 rounded-xl flex items-center justify-center group-hover:bg-black/10 transition-all duration-300">
                                        <Sparkles size={16} className="text-orange-500 animate-pulse" />
                                    </div>
                                    <span className="font-[family-name:var(--font-outfit)] text-sm tracking-tight">Ücretsiz Başla</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-60 pb-32 px-6">
                <div className="container mx-auto max-w-6xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles size={14} />
                        <span>Yapay Zeka Destekli Soru Yönetimi</span>
                    </div>

                    <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                        Sorularınızı Dijitalleştirin, <br />
                        <span className="text-orange-500">Zekanızı Özgür Bırakın.</span>
                    </h2>

                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
                        Yapay zeka ile saniyeler içinde yeni sorular türetin, derslerinizi profesyonel bir hiyerarşide yönetin ve tek tıkla şık PDF'ler hazırlayın.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
                        {user ? (
                            <Link href="/dashboard">
                                <Button
                                    className="bg-white hover:bg-zinc-100 text-black font-black px-10 py-7 text-lg rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-[0_25px_50px_rgba(255,255,255,0.15)] transition-all duration-500 flex items-center gap-3 group active:scale-95 border border-white/20"
                                >
                                    <div className="w-8 h-8 bg-black/5 rounded-xl flex items-center justify-center group-hover:bg-black/10 transition-all duration-300">
                                        <LayoutDashboard size={20} className="text-black" />
                                    </div>
                                    Dashboard'a Dön
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                onClick={openRegister}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-7 text-lg rounded-2xl shadow-[0_20px_40px_rgba(249,115,22,0.3)] hover:shadow-[0_25px_50px_rgba(249,115,22,0.4)] transition-all duration-500 flex items-center gap-3 group active:scale-95"
                            >
                                Şimdi Başla
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        )}
                        <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 font-bold px-10 py-7 text-lg rounded-2xl transition-all duration-300">
                            Demo İzle
                        </Button>
                    </div>

                    {/* Abstract Visualization */}
                    <div className="mt-32 relative animate-in fade-in zoom-in-95 duration-1000 delay-500">
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                        <div className="bg-zinc-900/50 border border-white/5 rounded-[40px] p-4 aspect-[16/9] max-w-5xl mx-auto overflow-hidden shadow-2xl backdrop-blur-3xl group">
                            <div className="w-full h-full bg-zinc-950 rounded-[28px] border border-white/5 relative overflow-hidden">
                                {/* Fake UI Preview */}
                                <div className="absolute top-0 left-0 right-0 h-16 bg-zinc-900/50 border-b border-white/5 flex items-center px-6 justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-orange-500/20 border border-orange-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/20" />
                                    </div>
                                    <div className="w-1/3 h-8 bg-black/50 rounded-lg" />
                                    <div className="w-8 h-8 rounded-full bg-zinc-800" />
                                </div>
                                <div className="pt-24 px-12 grid grid-cols-12 gap-8">
                                    <div className="col-span-3 space-y-4">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-zinc-900 rounded-xl w-full" style={{ opacity: 1 - i * 0.2 }} />)}
                                    </div>
                                    <div className="col-span-9 space-y-6">
                                        <div className="h-24 bg-orange-500/5 border border-orange-500/10 rounded-2xl w-full" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="h-40 bg-zinc-900 rounded-2xl" />
                                            <div className="h-40 bg-zinc-900 rounded-2xl" />
                                        </div>
                                    </div>
                                </div>
                                {/* Glowing Effect Overlay */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-orange-500/20 blur-[120px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 bg-zinc-950/30">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="text-center mb-20">
                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">Her Şey Tek Bir Yerde.</h3>
                        <p className="text-zinc-500 text-lg font-medium max-w-xl mx-auto">
                            Soru bankanızı yönetmek hiç bu kadar kolay, hızlı ve estetik olmamıştı.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Brain className="text-orange-500" size={32} />}
                            title="AI Soru Üretimi"
                            description="Sadece bir konu başlığı veya ekran görüntüsüyle saniyeler içinde yeni ve çeşitli sorular oluşturun."
                        />
                        <FeatureCard
                            icon={<Layout className="text-orange-500" size={32} />}
                            title="Hiyerarşik Yönetim"
                            description="Derslerinizi ve konularınızı ağaç yapısında sınırsız derinlikte kategorize edin."
                        />
                        <FeatureCard
                            icon={<FileText className="text-orange-500" size={32} />}
                            title="Profesyonel Export"
                            description="Seçtiğiniz soruları tek tıkla profesyonel görünümlü, cevap anahtarlı PDF'lere dönüştürün."
                        />
                    </div>
                </div>
            </section>

            {/* Quality Section */}
            <section className="py-32 border-t border-white/5 relative overflow-hidden">
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[30%] h-[60%] bg-orange-500/5 blur-[120px] rounded-full" />
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-8 leading-tight">
                                Mükemmel <span className="text-orange-500">PDF Deneyimi.</span>
                            </h3>
                            <div className="space-y-6">
                                <CheckItem text="Matematiksel formüller (LaTeX) için tam destek." />
                                <CheckItem text="Görsel ve diyagramlı soru desteği." />
                                <CheckItem text="Otomatik sayfa numaralandırma ve mizanpaj." />
                                <CheckItem text="Özelleştirilebilir cevap anahtarı sayfası." />
                            </div>
                            <Button className="mt-12 bg-zinc-900 border border-white/10 hover:border-orange-500/50 text-white font-bold p-6 rounded-2xl transition-all">
                                PDF Örneğini İncele
                            </Button>
                        </div>
                        <div className="relative">
                            <div className="bg-white p-8 rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.5)] rotate-2 hover:rotate-0 transition-transform duration-700">
                                <div className="border-b-2 border-zinc-100 pb-4 mb-6">
                                    <h4 className="text-black font-black text-xl">QUESLY EXPORT</h4>
                                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Soru Kağıdı #412</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className="text-orange-500 font-bold text-sm">Soru 1.</span>
                                        <div className="h-3 bg-zinc-100 rounded-full w-full" />
                                        <div className="h-3 bg-zinc-100 rounded-full w-3/4" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="h-8 border border-zinc-100 rounded-lg flex items-center px-3 gap-2">
                                            <div className="w-3 h-3 rounded-full bg-zinc-100" />
                                            <div className="h-2 bg-zinc-50 rounded-full w-2/3" />
                                        </div>)}
                                    </div>
                                    <div className="h-32 bg-zinc-50 rounded-xl w-full border border-dashed border-zinc-200" />
                                </div>
                            </div>
                            {/* Decorative Element */}
                            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-orange-500 rounded-3xl -z-10 blur-2xl opacity-50" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40">
                <div className="container mx-auto px-6 max-w-4xl text-center">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/5 p-12 md:p-20 rounded-[48px] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Brain size={120} className="text-orange-500" />
                        </div>
                        <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 relative z-10">
                            Uygulamanın Geleceği<br />Sizi Bekliyor.
                        </h3>
                        {user ? (
                            <Link href="/dashboard">
                                <Button
                                    className="bg-white hover:bg-zinc-200 text-black font-black px-12 py-8 text-xl rounded-2xl relative z-10 shadow-2xl shadow-black active:scale-95 transition-all"
                                >
                                    Dashboard'a Dön
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                onClick={openRegister}
                                className="bg-white hover:bg-zinc-200 text-black font-black px-12 py-8 text-xl rounded-2xl relative z-10 shadow-2xl shadow-black active:scale-95 transition-all"
                            >
                                Hemen Ücretsiz Deneyin
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pb-40 relative">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="text-center mb-20">
                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">Paketler & <span className="text-orange-500">Fiyatlandırma</span></h3>
                        <p className="text-zinc-500 text-lg font-medium max-w-xl mx-auto">
                            İhtiyacınıza uygun paketi seçin, sınırları ortadan kaldırın.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <PricingCard
                            title="STARTER"
                            price="4.99"
                            description="Hızlı bir başlangıç ve denemek için harika."
                            features={["500 Soru Üretimi", "Standart AI Modelleri", "Sınırlı PDF Export", "Öncelikli Destek"]}
                            buttonText="Hemen Başla"
                        />
                        <PricingCard
                            title="PRO"
                            price="9.99"
                            description="Profesyonellerin güvendiği, en dengeli paket."
                            features={["2000 Soru Üretimi", "Gelişmiş AI Modelleri (Pro)", "Sınırsız PDF Export", "7/24 Teknik Destek"]}
                            highlighted={true}
                            buttonText="Pro'ya Geç"
                        />
                        <PricingCard
                            title="ELITE"
                            price="19.99"
                            description="Limitleri zorlayanlar için durdurulamaz güç."
                            features={["10.000 Soru Üretimi", "En İyi AI Modelleri (Elite)", "Sınırsız PDF Export", "Özel Şablon Tasarımı"]}
                            buttonText="Elite Ol"
                        />
                    </div>

                    <div className="text-center">
                        <p className="text-zinc-500 text-sm font-medium">
                            Hala emin degil misiniz? Hemen <button onClick={openRegister} className="text-zinc-400 underline underline-offset-4 hover:text-white transition-colors">ücretsiz dene</button> ve farkı hisset.
                        </p>
                    </div>
                </div>
            </section>

            <footer className="border-t border-white/5 py-20 bg-black">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
                        <div>
                            <h4 className="text-2xl font-black tracking-tighter bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent font-[family-name:var(--font-outfit)] flex items-center">
                                Quesly<span className="text-orange-500 text-3xl leading-[0] ml-0.5">.</span>
                            </h4>
                            <p className="text-zinc-500 max-w-xs font-medium">
                                Eğitmenler ve öğrenciler için modern, yapay zeka destekli soru bankası yönetim platformu.
                            </p>
                        </div>

                        <div className="flex gap-12 flex-wrap justify-center">
                            <div className="space-y-4">
                                <h5 className="text-white font-bold uppercase tracking-widest text-xs">Ürün</h5>
                                <ul className="space-y-2 text-zinc-500 font-medium">
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">Özellikler</a></li>
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">Fiyatlandırma</a></li>
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">API</a></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h5 className="text-white font-bold uppercase tracking-widest text-xs">Destek</h5>
                                <ul className="space-y-2 text-zinc-500 font-medium">
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">Dokümantasyon</a></li>
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">Yardım Merkezi</a></li>
                                    <li><a href="#" className="hover:text-orange-500 transition-colors">İletişim</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
                            © 2026 Quesly Premium • Built for Excellence
                        </p>
                        <div className="flex gap-6">
                            <span className="text-zinc-600 text-xs font-bold hover:text-white cursor-pointer uppercase tracking-widest transition-colors">Gizlilik</span>
                            <span className="text-zinc-600 text-xs font-bold hover:text-white cursor-pointer uppercase tracking-widest transition-colors">Şartlar</span>
                        </div>
                    </div>
                </div>
            </footer>
            <AuthModals
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                initialView={authView}
            />
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-3xl hover:border-orange-500/30 transition-all duration-500 group">
            <div className="mb-6 p-4 bg-zinc-950 rounded-2xl w-fit group-hover:scale-110 group-hover:bg-orange-500/10 transition-all duration-500">
                {icon}
            </div>
            <h4 className="text-xl font-black text-white mb-4">{title}</h4>
            <p className="text-zinc-500 font-medium leading-relaxed">{description}</p>
        </div>
    )
}

function CheckItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <CheckCircle2 size={16} />
            </div>
            <span className="text-zinc-300 font-medium">{text}</span>
        </div>
    )
}

function PricingCard({ title, price, description, features, highlighted = false, buttonText }: {
    title: string,
    price: string,
    description: string,
    features: string[],
    highlighted?: boolean,
    buttonText: string
}) {
    return (
        <div className={`relative p-8 rounded-[32px] border transition-all duration-500 group overflow-hidden flex flex-col ${highlighted
            ? 'bg-gradient-to-b from-zinc-900 to-black border-orange-500/40 shadow-[0_20px_50px_rgba(249,115,22,0.1)] scale-105 z-10'
            : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
            }`}>
            {highlighted && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                    En Popüler
                </div>
            )}

            <div className="mb-8">
                <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${highlighted ? 'text-orange-500' : 'text-zinc-500'}`}>
                    {title}
                </h4>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${price}</span>
                    <span className="text-zinc-500 text-sm font-bold">/aylık</span>
                </div>
                <p className="text-zinc-500 text-sm mt-4 font-medium leading-relaxed">
                    {description}
                </p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 group/item">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${highlighted ? 'bg-orange-500/20 text-orange-500' : 'bg-zinc-800 text-zinc-500 group-hover/item:text-orange-500'}`}>
                            <CheckCircle2 size={12} />
                        </div>
                        <span className="text-zinc-400 text-sm font-medium transition-colors group-hover/item:text-zinc-200">
                            {feature}
                        </span>
                    </div>
                ))}
            </div>

            <Button
                className={`w-full py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 active:scale-95 ${highlighted
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-white hover:bg-zinc-200 text-black'
                    }`}
            >
                {buttonText}
            </Button>

            {/* Subtle glow for highlighted card */}
            {highlighted && (
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none" />
            )}
        </div>
    )
}
