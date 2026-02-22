'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Zap, Check, BookOpen, Sparkles, Search, GraduationCap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Category {
    id: number
    name: string
    parentId?: number | null
    _count?: { questions: number }
}

interface ExamSetupDialogProps {
    categories: Category[]
}

export function ExamSetupDialog({ categories }: ExamSetupDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1) // 1: Categories, 2: Options
    const [selectedCategories, setSelectedCategories] = useState<number[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [questionCount, setQuestionCount] = useState(10)
    const [timeLimit, setTimeLimit] = useState(20) // minutes

    const parentCategories = categories.filter(c => !c.parentId)

    const toggleCategory = (id: number) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter((c: any) => c !== id) : [...prev, id]
        )
    }

    const selectAllFromParent = (parentId: number) => {
        const children = categories.filter(c => c.parentId === parentId).map(c => c.id)
        const allParentAndChildren = [parentId, ...children]

        const isAllSelected = allParentAndChildren.every(id => selectedCategories.includes(id))

        if (isAllSelected) {
            setSelectedCategories(prev => prev.filter(id => !allParentAndChildren.includes(id)))
        } else {
            setSelectedCategories(prev => Array.from(new Set([...prev, ...allParentAndChildren])))
        }
    }

    const handleStart = () => {
        const params = new URLSearchParams()
        if (selectedCategories.length > 0) {
            params.set('categories', selectedCategories.join(','))
        }
        params.set('limit', questionCount.toString())
        params.set('time', timeLimit.toString())

        router.push(`/exam?${params.toString()}`)
        setOpen(false)
        setStep(1) // Reset for next time
    }

    const getTotalQuestionsAvailable = () => {
        return categories
            .filter(c => selectedCategories.includes(c.id))
            .reduce((acc, curr) => acc + (curr._count?.questions || 0), 0)
    }

    const nextStep = () => setStep(2)
    const prevStep = () => setStep(1)

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) setStep(1)
        }}>
            <DialogTrigger asChild>
                <Button
                    className="bg-white/[0.03] text-white border border-white/[0.08] backdrop-blur-xl font-black px-7 h-12 rounded-xl flex items-center gap-2.5 hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-95 group shadow-2xl"
                >
                    <div className="relative">
                        <Zap className="w-5 h-5 text-orange-500 group-hover:animate-pulse" />
                    </div>
                    <span className="tracking-tight uppercase text-xs">Pratik Yap</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 p-0 overflow-hidden rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] max-h-[85vh] flex flex-col">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-zinc-500/5 blur-[120px] pointer-events-none" />

                <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
                    {/* Header */}
                    <div className="p-8 pb-4">
                        <DialogHeader>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                                        <Zap className="text-orange-500" size={24} />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black text-white tracking-tight uppercase">Pratik Oturumu</DialogTitle>
                                        <DialogDescription className="text-zinc-500 font-medium uppercase tracking-widest text-[9px]">
                                            {step === 1 ? 'Konularını seç ve hemen çözmeye başla' : 'Oturum ayarlarını özelleştir'}
                                        </DialogDescription>
                                    </div>
                                </div>
                                {/* Step Indicator */}
                                <div className="flex items-center gap-2">
                                    <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step === 1 ? 'bg-orange-500' : 'bg-white/10'}`} />
                                    <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step === 2 ? 'bg-orange-500' : 'bg-white/10'}`} />
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex-1 flex flex-col overflow-hidden px-8 no-scrollbar"
                            >
                                <div className="relative mb-6">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Kategori ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all font-medium"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-6">
                                    {parentCategories.map(parent => {
                                        const children = categories.filter(c => c.parentId === parent.id)
                                        const isParentSelected = selectedCategories.includes(parent.id)
                                        const matchesSearch = parent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

                                        if (searchQuery && !matchesSearch) return null

                                        return (
                                            <div key={parent.id} className="space-y-3">
                                                <div
                                                    onClick={() => selectAllFromParent(parent.id)}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${isParentSelected ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isParentSelected ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-zinc-900 border-white/10 text-zinc-600'}`}>
                                                            <GraduationCap size={20} />
                                                        </div>
                                                        <div>
                                                            <span className={`text-sm font-black uppercase tracking-tight ${isParentSelected ? 'text-white' : 'text-zinc-400'}`}>
                                                                {parent.name}
                                                            </span>
                                                            <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
                                                                {parent._count?.questions || 0} Soru Mevcut
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isParentSelected ? 'bg-orange-500 border-orange-400' : 'border-white/10'}`}>
                                                        {isParentSelected && <Check className="text-white w-3 h-3" />}
                                                    </div>
                                                </div>

                                                {children.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                                                        {children.map(child => {
                                                            const isChildSelected = selectedCategories.includes(child.id)
                                                            if (searchQuery && !child.name.toLowerCase().includes(searchQuery.toLowerCase())) return null

                                                            return (
                                                                <div
                                                                    key={child.id}
                                                                    onClick={() => toggleCategory(child.id)}
                                                                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${isChildSelected ? 'bg-white/10 border-white/20' : 'bg-white/[0.01] border-white/[0.03] hover:border-white/5'}`}
                                                                >
                                                                    <span className={`text-[11px] font-bold uppercase tracking-tight leading-tight ${isChildSelected ? 'text-white' : 'text-zinc-500'}`}>
                                                                        {child.name}
                                                                    </span>
                                                                    <div className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isChildSelected ? 'bg-white border-white' : 'border-white/10'}`}>
                                                                        {isChildSelected && <Check className="text-black w-3 h-3" />}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Footer Navigation Step 1 */}
                                <div className="pt-6 pb-8 border-t border-white/5 mt-auto flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Seçilen Kategori</span>
                                        <span className="text-xl font-black text-white">{selectedCategories.length}</span>
                                    </div>
                                    <Button
                                        disabled={selectedCategories.length === 0}
                                        onClick={nextStep}
                                        className="bg-white hover:bg-zinc-200 text-black font-black px-10 h-14 rounded-2xl transition-all active:scale-95 disabled:opacity-20 flex items-center gap-3 uppercase text-xs tracking-[0.2em]"
                                    >
                                        İlerle
                                        <ChevronRight size={18} />
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 flex flex-col p-8 pt-4 space-y-10"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Soru Sayısı</h4>
                                        <span className="text-orange-500 font-black text-3xl">{questionCount}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="range"
                                            min="5"
                                            max="100"
                                            step="5"
                                            value={questionCount}
                                            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                            className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none">
                                            <span>Min 5 Soru</span>
                                            <span>Max 100 Soru</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Oturum Süresi</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-3xl">{timeLimit === 0 ? '∞' : timeLimit}</span>
                                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{timeLimit === 0 ? 'Sınırsız' : 'dk'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="180"
                                            step="10"
                                            value={timeLimit}
                                            onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                                            className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-white"
                                        />
                                        <div className="flex justify-between text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none">
                                            <span>Sınırsız</span>
                                            <span>3 Saat</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[32px] grid grid-cols-2 gap-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl pointer-events-none" />
                                    <div className="space-y-2">
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] block leading-none">Soru Havuzu</span>
                                        <span className="text-3xl font-black text-white leading-none">{getTotalQuestionsAvailable()}</span>
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] block leading-none">Hedeflenen</span>
                                        <span className="text-3xl font-black text-orange-500 leading-none">{Math.min(questionCount, getTotalQuestionsAvailable())}</span>
                                    </div>
                                </div>

                                {/* Footer Navigation Step 2 */}
                                <div className="pt-6 border-t border-white/5 mt-auto flex items-center gap-4">
                                    <Button
                                        onClick={prevStep}
                                        variant="ghost"
                                        className="flex-1 h-16 rounded-2xl hover:bg-white/5 text-zinc-500 hover:text-white font-black uppercase text-xs tracking-[0.2em] transition-all"
                                    >
                                        Geri Dön
                                    </Button>
                                    <Button
                                        onClick={handleStart}
                                        className="flex-[2] bg-white hover:bg-zinc-200 text-black font-black h-16 rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em]"
                                    >
                                        <Sparkles size={18} />
                                        Oturumu Başlat
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    )
}
