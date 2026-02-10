'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MathText } from './math-text'
import { Trash2, Edit2, ChevronDown, Copy, Loader2, Check, X, Layers } from 'lucide-react'
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
    groupId: number | null
    group: {
        id: number
        stemText: string
        stemTextEN: string | null
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
                    const [title, ...contentParts] = section.split('STEP_END');
                    const content = contentParts.join('STEP_END');
                    return (
                        <div key={i} className="flex flex-col gap-1.5">
                            {title && (
                                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-tighter flex items-center gap-1.5 opacity-80">
                                    {title.trim()}
                                </span>
                            )}
                            <div className="text-zinc-300 leading-relaxed text-sm">
                                <MathText text={content.trim()} />
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
                                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-tighter opacity-80">
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
        <div className={`p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-sm hover:shadow-md`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-zinc-500 font-bold text-lg">#{index + 1}</span>
                        {question.category && (
                            <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs">
                                {question.category.name}
                            </span>
                        )}
                    </div>

                    <MathText
                        text={language === 'en' && question.questionTextEN ? question.questionTextEN : question.questionText}
                        className="text-white font-medium mb-4 leading-relaxed block text-lg"
                    />

                    <OptionsGrid question={question} language={language} />

                    {(language === 'en' ? (question.solutionEN || question.solution) : question.solution) && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/50">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-2 text-sm font-semibold transition-all group ${isExpanded ? 'text-emerald-500' : 'text-zinc-500 hover:text-emerald-500'}`}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                {isExpanded ? (language === 'en' ? 'Hide Solution' : 'Çözümü Gizle') : (language === 'en' ? 'Show Solution' : 'Çözümü Göster')}
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 opacity-100 max-h-[500px]' : 'max-h-0 opacity-0'}`}>
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-zinc-800/50">
                                    <SolutionContent question={question} language={language} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2" ref={variantRef}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(question)}
                        className="text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10 shrink-0 h-9 w-9 rounded-xl transition-all"
                        title="Düzenle"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowVariantPopover(!showVariantPopover)}
                            className={`shrink-0 h-9 w-9 rounded-xl transition-all ${showVariantPopover || generatingVariants
                                ? 'text-orange-500 bg-orange-500/10'
                                : 'text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10'
                                }`}
                            title="Benzer Soru Üret"
                            disabled={generatingVariants}
                        >
                            {generatingVariants ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>

                        {showVariantPopover && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold text-white">Benzer Soru Üret</h4>
                                    <button
                                        onClick={() => setShowVariantPopover(false)}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                                    Bu soruya benzer, farklı sayılarla yeni sorular üretilir.
                                </p>

                                {variantResult === 'success' ? (
                                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                                        <Check className="w-4 h-4 text-emerald-500" />
                                        <span className="text-emerald-400 text-sm font-semibold">Varyantlar oluşturuldu!</span>
                                    </div>
                                ) : variantResult === 'error' ? (
                                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <X className="w-4 h-4 text-red-500" />
                                        <span className="text-red-400 text-sm font-semibold">Hata oluştu, tekrar deneyin.</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4">
                                            <label className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block mb-2">Adet (max 5)</label>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setVariantCount(n)}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${variantCount === n
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
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
                                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl h-10 text-sm shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                                        >
                                            {generatingVariants ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Üretiliyor...
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    {variantCount} Varyant Üret
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
        </div >
    )
}

// ─── Grouped Question Card (Bütünleşik Soru) ─────────────
interface GroupedQuestionCardProps {
    groupId: number
    stemText: string
    stemTextEN: string | null
    questions: Question[]
    startIndex: number
    onEdit: (question: Question) => void
    onDelete: (id: number) => void
    language: 'tr' | 'en'
}

function GroupedQuestionCard({ groupId, stemText, stemTextEN, questions, startIndex, onEdit, onDelete, language }: GroupedQuestionCardProps) {
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
        <div className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-zinc-900/80 to-zinc-900/80 shadow-lg shadow-violet-500/5 overflow-hidden">
            {/* Group Header */}
            <div className="px-6 py-4 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-violet-400 font-bold text-sm">
                            Bütünleşik Soru {startIndex + 1}–{startIndex + questions.length}
                        </span>
                        <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full text-[10px] font-bold">
                            {questions.length} alt soru
                        </span>
                    </div>
                    {questions[0]?.category && (
                        <span className="text-zinc-500 text-xs">{questions[0].category.name}</span>
                    )}
                </div>
            </div>

            {/* Shared Stem/Scenario */}
            <div className="px-6 py-5 border-b border-zinc-800/50">
                <div className="flex items-start gap-3">
                    <div className="w-1 self-stretch bg-violet-500/40 rounded-full shrink-0 mt-1" />
                    <MathText
                        text={displayStem}
                        className="text-zinc-200 leading-relaxed block text-[15px]"
                    />
                </div>
            </div>

            {/* Sub-Questions */}
            <div className="divide-y divide-zinc-800/50">
                {questions.map((q, subIdx) => {
                    const isExpanded = expandedSolutions.has(q.id)
                    return (
                        <div key={q.id} className="px-6 py-5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Sub-question number + text */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            {subIdx + 1}
                                        </span>
                                        <MathText
                                            text={language === 'en' && q.questionTextEN ? q.questionTextEN : q.questionText}
                                            className="text-white font-medium leading-relaxed block"
                                        />
                                    </div>

                                    <div className="ml-10">
                                        <OptionsGrid question={q} language={language} />

                                        {(language === 'en' ? (q.solutionEN || q.solution) : q.solution) && (
                                            <div className="mt-3 pt-3 border-t border-zinc-800/30">
                                                <button
                                                    onClick={() => toggleSolution(q.id)}
                                                    className={`flex items-center gap-2 text-xs font-semibold transition-all ${isExpanded ? 'text-emerald-500' : 'text-zinc-500 hover:text-emerald-500'}`}
                                                >
                                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                    {isExpanded ? 'Çözümü Gizle' : 'Çözümü Göster'}
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-3 opacity-100 max-h-[500px]' : 'max-h-0 opacity-0'}`}>
                                                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-zinc-800/50">
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
                                    className="text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10 shrink-0 h-8 w-8 rounded-lg transition-all"
                                    title="Düzenle"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
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
}

export function QuestionTable({ questions, onEdit, onDelete, onVariantsGenerated, language }: QuestionTableProps) {
    const [search, setSearch] = useState('')

    const filtered = questions.filter(q =>
        q.questionText.toLowerCase().includes(search.toLowerCase()) ||
        q.category?.name.toLowerCase().includes(search.toLowerCase()) ||
        q.group?.stemText.toLowerCase().includes(search.toLowerCase())
    )

    // Build display items: group questions by groupId, keep standalone questions as-is
    type DisplayItem =
        | { type: 'standalone'; question: Question; index: number }
        | { type: 'group'; groupId: number; stemText: string; stemTextEN: string | null; questions: Question[]; startIndex: number }

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
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
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
                                    questions={item.questions}
                                    startIndex={item.startIndex}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    language={language}
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
