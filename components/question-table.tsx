'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MathText } from './math-text'
import { Trash2, Edit2, ChevronDown, Copy, Loader2, Check, X, Layers, Sparkles } from 'lucide-react'
import { ConfirmDialog } from './confirm-dialog'


interface Question {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    solution: string | null
    questionTextEN: string | null
    optionAEN: string | null
    optionBEN: string | null
    optionCEN: string | null
    optionDEN: string | null
    solutionEN: string | null
    imageUrl: string | null
    groupId: number | null
    group: {
        id: number
        stemText: string
        stemTextEN: string | null
        imageUrl: string | null
    } | null
    category: {
        id: number
        name: string
    } | null
}

// ─── Shared: Solution renderer ────────────────────────────
function SolutionContent({ question, language }: { question: Question; language: 'tr' | 'en' }) {
    const solutionText = language === 'en' && question.solutionEN ? question.solutionEN : question.solution
    if (!solutionText) return null

    if (solutionText.includes('STEP_START')) {
        return (
            <div className="space-y-5">
                {solutionText.split('STEP_START').filter(Boolean).map((section, i) => {
                    const stepEndParts = section.split('STEP_END');

                    // If there's no STEP_END, the whole section is content (not title)
                    if (stepEndParts.length === 1) {
                        return (
                            <div key={i} className="text-zinc-300 leading-relaxed text-sm">
                                <MathText text={stepEndParts[0].trim()} />
                            </div>
                        );
                    }

                    const title = stepEndParts[0];
                    const content = stepEndParts.slice(1).join('STEP_END');

                    // Check if the title looks like an actual step label (short, no LaTeX)
                    const isStepLabel = title.trim().length < 60 && !title.includes('\\frac') && !title.includes('$$');

                    return (
                        <div key={i} className="flex flex-col gap-1.5">
                            {isStepLabel && title.trim() && (
                                <span className="text-[11px] font-black text-emerald-500 tracking-tighter flex items-center gap-1.5 opacity-80">
                                    {title.trim()}
                                </span>
                            )}
                            <div className="text-zinc-300 leading-relaxed text-sm">
                                <MathText text={isStepLabel ? content.trim() : section.replace(/STEP_END/g, '').trim()} />
                            </div>
                        </div>
                    );
                })}
            </div>
        )
    } else if (solutionText.match(/(\d+\.\s*Adım|Adım\s*\d+|Step\s*\d+)/i)) {
        return (
            <div className="space-y-5">
                {solutionText.split(/(\d+\.\s*Adım:?|Adım\s*\d+:?|Step\s*\d+:?)/gi).filter(Boolean).map((part, i, arr) => {
                    if (part.match(/(\d+\.\s*Adım:?|Adım\s*\d+:?|Step\s*\d+:?)/i)) {
                        return (
                            <div key={i} className="flex flex-col gap-1">
                                <span className="text-[11px] font-black text-emerald-500 tracking-tighter opacity-80">
                                    {part.trim().replace(/:$/, '')}
                                </span>
                                <div className="text-zinc-300 leading-relaxed text-sm pl-0">
                                    <MathText text={arr[i + 1]?.trim() || ''} />
                                </div>
                            </div>
                        )
                    }
                    return null;
                })}
            </div>
        )
    } else {
        return (
            <div className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                <MathText text={solutionText} />
            </div>
        )
    }
}

// ─── Shared: Options grid ─────────────────────────────────
function OptionsGrid({ question, language }: { question: Question; language: 'tr' | 'en' }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const optionKey = `option${opt}` as keyof Question
                const optionKeyEN = `option${opt}EN` as keyof Question
                const optionText = language === 'en' && question[optionKeyEN]
                    ? question[optionKeyEN] as string
                    : question[optionKey] as string
                return (
                    <div
                        key={opt}
                        className={`p-3 rounded-xl transition-all ${question.correctAnswer === opt
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'bg-zinc-800/50 border border-transparent'
                            }`}
                    >
                        <span className={`flex gap-2 ${question.correctAnswer === opt ? 'text-orange-500 font-semibold' : 'text-zinc-400'}`}>
                            <span className="shrink-0">{opt})</span>
                            <MathText text={optionText} />
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Standalone Question Row ──────────────────────────────
interface QuestionRowProps {
    question: Question
    index: number
    onEdit: (question: Question) => void
    onDelete: (id: number) => void
    onVariantsGenerated: () => void
    language: 'tr' | 'en'
}

function QuestionRow({ question, index, onEdit, onDelete, onVariantsGenerated, language }: QuestionRowProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [showVariantPopover, setShowVariantPopover] = useState(false)
    const [variantCount, setVariantCount] = useState(3)
    const [generatingVariants, setGeneratingVariants] = useState(false)
    const [variantResult, setVariantResult] = useState<'success' | 'error' | null>(null)
    const variantRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (variantRef.current && !variantRef.current.contains(event.target as Node)) {
                setShowVariantPopover(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleGenerateVariants = async () => {
        setGeneratingVariants(true)
        setVariantResult(null)
        try {
            const res = await fetch('/api/generate-variants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    count: variantCount
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setVariantResult('success')
            onVariantsGenerated()
            setTimeout(() => {
                setShowVariantPopover(false)
                setVariantResult(null)
            }, 1500)
        } catch (err) {
            console.error('Variant generation error:', err)
            setVariantResult('error')
            setTimeout(() => setVariantResult(null), 3000)
        } finally {
            setGeneratingVariants(false)
        }
    }

    return (
        <div
            className="group relative p-6 rounded-[28px] border border-white/[0.05] bg-[#0c0c0e] hover:bg-[#111113] transition-all duration-500 shadow-xl hover:shadow-black/60"
            style={{ zIndex: showVariantPopover ? 50 : 1 }}
        >
            {/* Subtle Gradient Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            {/* Header row: number + category on left, action buttons on right */}
            <div className={`flex items-center justify-between mb-5 relative ${showVariantPopover ? 'z-50' : 'z-10'}`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-950/50 border border-white/[0.05] shadow-inner">
                        <span className="text-zinc-500 font-black text-xs">#{index + 1}</span>
                    </div>
                    {question.category && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                            <div className="w-1 h-1 rounded-full bg-orange-500" />
                            <span className="text-orange-500 font-extrabold text-[10px] uppercase tracking-widest">
                                {question.category.name}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2" ref={variantRef}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(question)}
                        className="text-zinc-500 hover:text-white hover:bg-white/5 shrink-0 h-10 w-10 rounded-2xl transition-all duration-300"
                        title="Düzenle"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowVariantPopover(!showVariantPopover)}
                            className={`shrink-0 h-10 w-10 rounded-2xl transition-all duration-300 ${showVariantPopover || generatingVariants
                                ? 'text-orange-500 bg-orange-500/10 border border-orange-500/20'
                                : 'text-zinc-500 hover:text-orange-500 hover:bg-orange-500/5'
                                }`}
                            title="Benzer Soru Üret"
                            disabled={generatingVariants}
                        >
                            {generatingVariants ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                        </Button>

                        {showVariantPopover && (
                            <div className="absolute right-0 top-full mt-3 w-72 bg-zinc-950/95 border border-white/[0.08] backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-6 z-[100] animate-in fade-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-black text-white tracking-tight uppercase tracking-widest">Akıllı Varyant</h4>
                                    <button
                                        onClick={() => setShowVariantPopover(false)}
                                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-zinc-500 mb-6 font-medium leading-relaxed">
                                    Bu soruya benzer, farklı sayılarla akademik kalitede yeni varyasyonlar üretilir.
                                </p>

                                {variantResult === 'success' ? (
                                    <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span className="text-emerald-400 text-xs font-black uppercase">Tamamlandı!</span>
                                    </div>
                                ) : variantResult === 'error' ? (
                                    <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl animate-in shake">
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                                            <X className="w-4 h-4 text-red-500" />
                                        </div>
                                        <span className="text-red-400 text-xs font-black uppercase">Hata Oluştu</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-6">
                                            <label className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] block mb-3 ml-1">Varyant Sayısı</label>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setVariantCount(n)}
                                                        className={`h-9 rounded-xl text-xs font-black transition-all duration-300 ${variantCount === n
                                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.1]'
                                                            : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleGenerateVariants}
                                            disabled={generatingVariants}
                                            className="w-full bg-white hover:bg-zinc-200 text-black font-black rounded-2xl h-12 text-xs shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-0"
                                        >
                                            {generatingVariants ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                                                    VARYANTLAR HAZIRLANIYOR...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    ŞİMDİ ÜRET
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Question content */}
            <div className="relative z-10">
                <div className="text-white text-xl font-medium mb-6 leading-relaxed block">
                    <MathText
                        text={language === 'en' && question.questionTextEN ? question.questionTextEN : question.questionText}
                    />
                </div>

                {question.imageUrl && (
                    <div className="mb-8 rounded-[32px] overflow-hidden border border-white/[0.05] bg-black/40 p-2 group cursor-zoom-in relative">
                        <img
                            src={question.imageUrl}
                            alt="Question Diagram"
                            className="max-w-full h-auto mx-auto rounded-[24px] transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                )}

                <OptionsGrid question={question} language={language} />

                {(language === 'en' ? (question.solutionEN || question.solution) : question.solution) && (
                    <div className="mt-6 pt-5 border-t border-white/[0.05]">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all group ${isExpanded ? 'text-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-emerald-500/10' : 'bg-white/[0.03]'}`}>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            {isExpanded ? (language === 'en' ? 'Hide Step-by-Step' : 'Çözümü Gizle') : (language === 'en' ? 'Show Step-by-Step' : 'Çözüm Analizini Göster')}
                        </button>

                        <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'mt-6 opacity-100 max-h-[1000px]' : 'max-h-0 opacity-0'}`}>
                            <div className="p-6 rounded-[32px] bg-emerald-500/[0.02] border border-emerald-500/10 backdrop-blur-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] rounded-full pointer-events-none" />
                                <SolutionContent question={question} language={language} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}


// ─── Grouped Question Card (Bütünleşik Soru) ─────────────
interface GroupedQuestionCardProps {
    groupId: number
    stemText: string
    stemTextEN: string | null
    imageUrl: string | null
    questions: Question[]
    startIndex: number
    onEdit: (question: Question) => void
    onDelete: (id: number) => void
    language: 'tr' | 'en'
    categories?: { id: number; name: string; parentId?: number | null }[]
}

function GroupedQuestionCard({ groupId, stemText, stemTextEN, imageUrl, questions, startIndex, onEdit, onDelete, language, categories = [] }: GroupedQuestionCardProps) {
    const [expandedSolutions, setExpandedSolutions] = useState<Set<number>>(new Set())

    const toggleSolution = (id: number) => {
        setExpandedSolutions(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const displayStem = language === 'en' && stemTextEN ? stemTextEN : stemText

    return (
        <div className="rounded-[40px] border border-orange-500/20 bg-[#080809] shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] via-transparent to-transparent pointer-events-none" />

            {/* Group Header */}
            <div className="px-8 py-6 bg-orange-500/[0.03] border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-[22px] bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                        <Layers className="w-7 h-7 text-orange-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-white font-black text-lg tracking-tight">
                                Bütünleşik Soru Seti
                            </span>
                            <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                                {questions.length} Alt Soru
                            </div>
                        </div>
                        {questions[0]?.category && (
                            <div className="flex items-center gap-2">
                                <span className="text-zinc-500 text-xs font-bold uppercase tracking-tighter">
                                    {startIndex + 1}–{startIndex + questions.length} . Bölüm
                                </span>
                                <div className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span className="text-orange-500/70 text-xs font-black uppercase tracking-widest">
                                    {(() => {
                                        const cat = questions[0].category!;
                                        const parentCat = categories.find(c => c.id === (categories.find(child => child.id === cat.id)?.parentId));
                                        return parentCat ? `${parentCat.name} › ${cat.name}` : cat.name;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Shared Stem/Scenario */}
            <div className="px-10 py-10 border-b border-white/[0.03] relative">
                <div className="flex items-start gap-6">
                    <div className="w-1.5 h-12 bg-gradient-to-b from-orange-500 to-transparent rounded-full shrink-0 opacity-50" />
                    <div className="text-zinc-200 leading-relaxed block text-xl font-medium">
                        <MathText text={displayStem} />
                    </div>
                </div>
                {imageUrl && (
                    <div className="mt-10 rounded-[32px] overflow-hidden border border-white/[0.05] bg-black/40 p-2 group cursor-zoom-in relative max-w-2xl mx-auto">
                        <img
                            src={imageUrl}
                            alt="Group Diagram"
                            className="max-w-full h-auto mx-auto rounded-[24px] transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                )}
            </div>

            {/* Sub-Questions */}
            <div className="divide-y divide-white/[0.03]">
                {questions.map((q, subIdx) => {
                    const isExpanded = expandedSolutions.has(q.id)
                    return (
                        <div key={q.id} className="px-10 py-10 hover:bg-white/[0.01] transition-all duration-500 group/sub">
                            <div className="flex items-start justify-between gap-8">
                                <div className="flex-1 min-w-0">
                                    {/* Sub-question number + text */}
                                    <div className="flex items-start gap-6 mb-6">
                                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/[0.05] text-orange-500 flex items-center justify-center text-sm font-black shrink-0 shadow-inner group-hover/sub:border-orange-500/30 transition-colors">
                                            {subIdx + 1}
                                        </div>
                                        <div className="text-white text-lg font-medium leading-relaxed pt-1.5">
                                            <MathText
                                                text={language === 'en' && q.questionTextEN ? q.questionTextEN : q.questionText}
                                            />
                                        </div>
                                    </div>

                                    <div className="ml-16">
                                        <OptionsGrid question={q} language={language} />

                                        {(language === 'en' ? (q.solutionEN || q.solution) : q.solution) && (
                                            <div className="mt-6 pt-5 border-t border-white/[0.03]">
                                                <button
                                                    onClick={() => toggleSolution(q.id)}
                                                    className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isExpanded ? 'text-emerald-500' : 'text-zinc-600 hover:text-emerald-500'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-emerald-500/10' : 'bg-white/[0.03]'}`}>
                                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    {isExpanded ? 'Analizi Gizle' : 'Çözüm Analizi'}
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'mt-6 opacity-100 max-h-[800px]' : 'max-h-0 opacity-0'}`}>
                                                    <div className="p-6 rounded-[28px] bg-emerald-500/[0.02] border border-emerald-500/10 backdrop-blur-sm">
                                                        <SolutionContent question={q} language={language} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(q)}
                                    className="text-zinc-600 hover:text-white hover:bg-white/5 shrink-0 h-10 w-10 rounded-2xl transition-all duration-300 border border-transparent hover:border-white/10"
                                    title="Düzenle"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}



// ─── Question Table ───────────────────────────────────────
interface QuestionTableProps {
    questions: Question[]
    onEdit: (question: Question) => void
    onDelete: () => void
    onVariantsGenerated: () => void
    language: 'tr' | 'en'
    categories?: { id: number; name: string; parentId?: number | null }[]
}

export function QuestionTable({ questions, onEdit, onDelete, onVariantsGenerated, language, categories = [] }: QuestionTableProps) {
    const [search, setSearch] = useState('')

    const filtered = questions.filter(q =>
        q.questionText.toLowerCase().includes(search.toLowerCase()) ||
        q.category?.name.toLowerCase().includes(search.toLowerCase()) ||
        q.group?.stemText.toLowerCase().includes(search.toLowerCase())
    )

    // Build display items: group questions by groupId, keep standalone questions as-is
    type DisplayItem =
        | { type: 'standalone'; question: Question; index: number }
        | { type: 'group'; groupId: number; stemText: string; stemTextEN: string | null; imageUrl: string | null; questions: Question[]; startIndex: number }

    const displayItems: DisplayItem[] = []
    const processedGroupIds = new Set<number>()
    let currentIndex = 0

    for (const q of filtered) {
        if (q.groupId && q.group) {
            if (processedGroupIds.has(q.groupId)) continue
            processedGroupIds.add(q.groupId)

            // Gather all questions in this group from the filtered list
            const groupQuestions = filtered.filter(gq => gq.groupId === q.groupId)
            displayItems.push({
                type: 'group',
                groupId: q.groupId,
                stemText: q.group.stemText,
                stemTextEN: q.group.stemTextEN,
                imageUrl: q.group.imageUrl || q.imageUrl,
                questions: groupQuestions,
                startIndex: currentIndex,
            })
            currentIndex += groupQuestions.length
        } else {
            displayItems.push({
                type: 'standalone',
                question: q,
                index: currentIndex,
            })
            currentIndex++
        }
    }

    if (questions.length === 0) {
        return (
            <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-semibold text-white mb-2">Henüz soru eklenmemiş</h3>
                <p className="text-zinc-400">Yeni soru ekleyerek veya CSV dosyası içe aktararak başlayın.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Sorularda veya kategorilerde ara..."
                    className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-5 py-4 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all shadow-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {displayItems.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                    <p className="text-zinc-500">Arama kriterine uygun soru bulunamadı.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayItems.map((item) => {
                        if (item.type === 'group') {
                            return (
                                <GroupedQuestionCard
                                    key={`group-${item.groupId}`}
                                    groupId={item.groupId}
                                    stemText={item.stemText}
                                    stemTextEN={item.stemTextEN}
                                    imageUrl={item.imageUrl}
                                    questions={item.questions}
                                    startIndex={item.startIndex}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    language={language}
                                    categories={categories}
                                />
                            )
                        }
                        return (
                            <QuestionRow
                                key={item.question.id}
                                question={item.question}
                                index={item.index}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onVariantsGenerated={onVariantsGenerated}
                                language={language}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}
