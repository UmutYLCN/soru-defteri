'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { MathText } from '@/components/math-text'
import { DrawingCanvas } from '@/components/drawing-canvas'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, Check, Loader2, Sparkles, Home, Trophy, RefreshCcw, PencilLine } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Question {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    solution: string | null
    imageUrl: string | null
}

function ExamContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const supabase = createClient()

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
    const [examFinished, setExamFinished] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number | null>(null)

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const categories = searchParams.get('categories')?.split(',')
                const limit = parseInt(searchParams.get('limit') || '10')
                const timeStr = searchParams.get('time')

                if (timeStr && parseInt(timeStr) > 0) {
                    setTimeLeft(parseInt(timeStr) * 60)
                }

                const res = await fetch('/api/questions')
                if (!res.ok) throw new Error('Failed to fetch questions')

                const data = await res.json()

                // Client-side filtering by categories
                let filtered = data
                if (categories && categories.length > 0 && categories[0] !== '') {
                    const categoryIds = categories.map(Number)
                    filtered = data.filter((q: any) => categoryIds.includes(q.categoryId))
                }

                // Shuffle all available questions
                const shuffled = [...(filtered || [])].sort(() => 0.5 - Math.random())

                // Apply limit
                setQuestions(shuffled.slice(0, limit))
            } catch (error) {
                console.error('Exam questions fetch error:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchQuestions()
    }, [searchParams])

    // Timer effect
    useEffect(() => {
        if (timeLeft === null || examFinished) return

        if (timeLeft === 0) {
            setExamFinished(true)
            return
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev !== null ? prev - 1 : null))
        }, 1000)

        return () => clearInterval(timer)
    }, [timeLeft, examFinished])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleAnswer = (option: string) => {
        if (userAnswers[currentIndex] !== undefined) return
        setUserAnswers(prev => ({ ...prev, [currentIndex]: option }))
    }

    const currentQuestion = questions[currentIndex]
    const isAnswered = userAnswers[currentIndex] !== undefined

    const calculateScore = () => {
        let correctCount = 0
        questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctAnswer) correctCount++
        })
        return {
            correct: correctCount,
            total: questions.length,
            percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                    <p className="text-zinc-500 font-black tracking-widest uppercase text-xs">Sorular Hazırlanıyor...</p>
                </div>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                        <X className="w-10 h-10 text-zinc-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white">SORU BULUNAMADI</h2>
                    <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-[0.2em]">Seçtiğin kriterlere uygun soru mevcut değil.</p>
                    <Link href="/dashboard">
                        <Button className="w-full bg-white text-black font-black py-6 rounded-2xl hover:bg-zinc-200 shadow-xl shadow-white/5">DASHBOARD'A DÖN</Button>
                    </Link>
                </div>
            </div>
        )
    }

    if (examFinished) {
        const stats = calculateScore()
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl w-full bg-[#0c0c0e] border border-white/10 p-12 rounded-[40px] text-center shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent" />
                    <Trophy className="w-20 h-20 text-white mx-auto mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                    <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">Pratik Tamamlandı!</h2>
                    <p className="text-zinc-500 font-bold mb-12 uppercase tracking-widest text-[10px]">Oturum Özetin</p>

                    <div className="grid grid-cols-3 gap-6 mb-12">
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                            <span className="block text-zinc-600 text-[10px] font-black uppercase mb-1">Doğru</span>
                            <span className="text-3xl font-black text-emerald-500">{stats.correct}</span>
                        </div>
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                            <span className="block text-zinc-600 text-[10px] font-black uppercase mb-1">Yanlış</span>
                            <span className="text-3xl font-black text-red-500">{stats.total - stats.correct}</span>
                        </div>
                        <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/5">
                            <span className="block text-zinc-600 text-[10px] font-black uppercase mb-1">Başarı</span>
                            <span className="text-3xl font-black text-white">%{stats.percentage}</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-white/[0.05] border border-white/10 text-white font-black py-7 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 border-0 active:scale-95 uppercase text-xs tracking-widest"
                        >
                            <RefreshCcw size={18} />
                            TEKRAR DENE
                        </Button>
                        <Link href="/dashboard" className="flex-1">
                            <Button className="w-full bg-white hover:bg-zinc-200 text-black font-black py-7 rounded-2xl shadow-xl shadow-white/10 border-0 flex items-center justify-center gap-3 active:scale-95 uppercase text-xs tracking-widest">
                                <Home size={18} />
                                ANA SAYFA
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black font-[family-name:var(--font-geist-sans)] text-white overflow-hidden">
            {/* Grid BG */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:40px_40px]" />
            </div>

            {/* Header / Nav */}
            <div className="fixed top-0 left-0 w-full z-50 p-6 flex items-center justify-between border-b border-white/5 bg-black/60 backdrop-blur-3xl">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10">
                            <ChevronLeft size={24} />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter uppercase tracking-[0.2em] text-white">Sınav Modu</h1>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Canlı Oturum</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {timeLeft !== null && (
                        <div className={`flex flex-col items-end px-4 py-2 rounded-2xl border ${timeLeft < 60 ? 'bg-red-500/10 border-red-500/50 animate-pulse' : 'bg-white/5 border-white/10'}`}>
                            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-1">Kalan Süre</span>
                            <span className={`text-xl font-black leading-none ${timeLeft < 60 ? 'text-red-500' : 'text-white'}`}>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest leading-none mb-1">İlerleme</span>
                        <span className="text-xl font-black text-white leading-none">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <Button
                        onClick={() => setExamFinished(true)}
                        className="bg-white/5 hover:bg-red-500/20 text-red-500 border border-red-500/50 px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                        Sınavı Bitir
                    </Button>
                </div>
            </div>

            <div className="flex h-screen pt-28">
                {/* Left: Question Area */}
                <div className="flex-1 overflow-y-auto px-6 md:px-12 py-8 custom-scrollbar relative z-10">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="max-w-4xl mx-auto space-y-12 pb-20"
                    >
                        {/* Question Content Card */}
                        <div className="bg-[#0c0c0e]/80 border border-white/[0.05] p-8 md:p-12 rounded-[40px] shadow-2xl space-y-8">
                            <div className="flex items-center justify-between">
                                <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Soru #{currentIndex + 1}</span>
                            </div>

                            <div className="text-xl md:text-2xl font-medium leading-relaxed text-zinc-100">
                                <MathText text={currentQuestion.questionText} />
                            </div>

                            {currentQuestion.imageUrl && (
                                <div className="rounded-[32px] overflow-hidden border border-white/5 bg-zinc-900/40 p-2 shadow-inner">
                                    <img src={currentQuestion.imageUrl} alt="Question Diagram" className="max-w-full h-auto mx-auto rounded-[24px]" />
                                </div>
                            )}

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 gap-3">
                                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                    const optionText = currentQuestion[`option${opt}` as keyof Question] as string
                                    const isSelected = userAnswers[currentIndex] === opt
                                    const showResult = isAnswered
                                    const isCorrectOpt = opt === currentQuestion.correctAnswer

                                    let stateStyles = "bg-white/[0.03] border-white/[0.05] hover:border-white/15 text-zinc-400"
                                    if (showResult) {
                                        if (isCorrectOpt) stateStyles = "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                                        else if (isSelected) stateStyles = "bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)] opacity-100"
                                        else stateStyles = "bg-zinc-900/20 border-white/5 text-zinc-600 opacity-60"
                                    } else if (isSelected) {
                                        stateStyles = "bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                    }

                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => handleAnswer(opt)}
                                            disabled={isAnswered}
                                            className={`group flex items-center gap-6 p-5 md:p-6 rounded-[24px] border transition-all duration-300 text-left relative overflow-hidden ${stateStyles}`}
                                        >
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${isSelected ? 'bg-current text-current' : 'bg-white/5'}`}>
                                                <span className={isSelected ? 'text-black' : ''}>{opt}</span>
                                            </div>
                                            <div className="text-base md:text-lg font-medium flex-1">
                                                <MathText text={optionText} />
                                            </div>
                                            {showResult && isCorrectOpt && <Check className="text-emerald-500 w-6 h-6" />}
                                            {showResult && isSelected && !isCorrectOpt && <X className="text-red-500 w-6 h-6" />}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Solution Area */}
                            <AnimatePresence>
                                {isAnswered && currentQuestion.solution && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-8 pt-8 border-t border-white/5 space-y-4"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-4 h-4 text-orange-500" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Çözüm Detayı</h4>
                                        </div>
                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-sm text-zinc-300 leading-relaxed font-medium">
                                            {currentQuestion.solution.includes('STEP_START') ? (
                                                <div className="space-y-6">
                                                    {currentQuestion.solution.split('STEP_START').filter(Boolean).map((section, idx) => {
                                                        const [title, ...contentParts] = section.split('STEP_END')
                                                        const content = contentParts.join('STEP_END')
                                                        const isStepLabel = title.trim().length < 60 && !title.includes('\\')

                                                        return (
                                                            <div key={idx} className="space-y-1">
                                                                {isStepLabel && (
                                                                    <div className="text-[10px] font-black text-orange-500/70 uppercase tracking-widest mb-2">{title.trim()}</div>
                                                                )}
                                                                <div className="text-zinc-300">
                                                                    <MathText text={isStepLabel ? content.trim() : section.replace(/STEP_END/g, '').trim()} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <MathText text={currentQuestion.solution} />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Navigation Bar */}
                        <div className="flex items-center justify-between pb-10">
                            <Button
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="bg-white/5 text-white border border-white/10 px-8 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-30 transition-all active:scale-95"
                            >
                                <ChevronLeft className="mr-2 w-4 h-4" /> ÖNCEKİ
                            </Button>

                            {currentIndex === questions.length - 1 && isAnswered ? (
                                <Button
                                    onClick={() => setExamFinished(true)}
                                    className="bg-white hover:bg-zinc-200 text-white shadow-xl shadow-white/20 px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-0 active:scale-95 transition-all"
                                >
                                    SINAVI TAMAMLA <Trophy className="ml-2 w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                    disabled={currentIndex === questions.length - 1 || !isAnswered}
                                    className="bg-white text-black hover:bg-zinc-200 px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] border-0 disabled:opacity-30 transition-all active:scale-95"
                                >
                                    SIRADAKİ SORU <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right: Divider & Canvas (Tablet/Large screen visible) */}
                <div className="hidden min-[1100px]:flex w-[450px] border-l border-white/5 bg-[#080809] p-8 flex-col gap-6 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                <PencilLine className="text-white w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white">Çözüm Alanı</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">Tablet ve Kalem Dostu</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <DrawingCanvas />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ExamPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
        }>
            <ExamContent />
        </Suspense>
    )
}
