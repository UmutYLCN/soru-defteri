'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react'

export default function PaymentCancelPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-orange-500/30 font-[family-name:var(--font-geist-sans)] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-zinc-800/20 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
            </div>

            <div className="relative z-10 w-full max-w-md text-center">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.2 }}
                    className="w-24 h-24 bg-zinc-900 border border-white/10 rounded-[32px] flex items-center justify-center mx-auto mb-8"
                >
                    <XCircle className="w-10 h-10 text-zinc-500" />
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <h1 className="text-4xl font-black tracking-tight mb-4 text-white">
                        İşlem İptal Edildi
                    </h1>
                    <p className="text-zinc-500 font-medium mb-12 px-4 leading-relaxed">
                        Ödeme işlemi sizin tarafınızdan veya bir hata nedeniyle sonlandırıldı. Herhangi bir ücret tahsil edilmedi.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col gap-4"
                >
                    <Link
                        href="/profile"
                        className="group relative flex items-center justify-center gap-2 h-14 bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-widest text-xs rounded-2xl overflow-hidden transition-all hover:bg-zinc-800 active:scale-[0.98]"
                    >
                        <RefreshCcw className="w-4 h-4 text-zinc-500 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Tekrar Dene</span>
                    </Link>

                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center h-14 text-zinc-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:text-white transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard'a Dön
                    </Link>
                </motion.div>
            </div>
        </div>
    )
}
