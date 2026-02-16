'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Sparkles, PartyPopper } from 'lucide-react'

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 font-[family-name:var(--font-geist-sans)] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-orange-600/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                    className="w-24 h-24 bg-orange-500/10 border border-orange-500/20 rounded-[32px] flex items-center justify-center mx-auto mb-8 relative"
                >
                    <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
                    <CheckCircle2 className="w-10 h-10 text-orange-500 relative z-10" />
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <h1 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                        Ödeme Başarılı!
                    </h1>
                    <p className="text-zinc-400 font-medium mb-12 px-4 leading-relaxed">
                        Harika haber! Planın başarıyla aktifleştirildi ve kredilerin hesabına tanımlandı. Artık dilediğin kadar soru üretmeye devam edebilirsin.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-4"
                >
                    <Link
                        href="/dashboard"
                        className="group relative flex items-center justify-center gap-2 h-14 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl overflow-hidden transition-all hover:bg-zinc-200 active:scale-[0.98]"
                    >
                        <span className="relative z-10">Dashboard'a Git</span>
                        <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        href="/profile"
                        className="flex items-center justify-center h-14 border border-white/10 text-zinc-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/5 hover:text-white transition-all"
                    >
                        Plan Detaylarını Gör
                    </Link>
                </motion.div>

                {/* Micro-interactions */}
                <div className="absolute -top-20 -left-20 pointer-events-none opacity-20">
                    <Sparkles className="w-40 h-40 text-orange-500 animate-pulse" />
                </div>
            </div>
        </div>
    )
}
