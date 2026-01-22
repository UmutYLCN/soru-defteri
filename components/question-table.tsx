'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MathText } from './math-text'


interface Question {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    solution: string | null
    category: {
        id: number
        name: string
    } | null
}

interface QuestionRowProps {
    question: Question
    index: number
    onEdit: (question: Question) => void
}

function QuestionRow({ question, index, onEdit }: QuestionRowProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-sm hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    {/* Question Number & Category */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-zinc-500 font-bold text-lg">#{index + 1}</span>
                        {question.category && (
                            <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs">
                                {question.category.name}
                            </span>
                        )}
                    </div>

                    {/* Question Text */}
                    <MathText
                        text={question.questionText}
                        className="text-white font-medium mb-4 leading-relaxed block text-lg"
                    />

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                            <div
                                key={opt}
                                className={`p-3 rounded-xl transition-all ${question.correctAnswer === opt
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                    : 'bg-zinc-800/50 border border-transparent'
                                    }`}
                            >
                                <span className={`flex gap-2 ${question.correctAnswer === opt ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}`}>
                                    <span className="shrink-0">{opt})</span>
                                    <MathText text={question[(`option${opt}` as keyof Question)] as string} />
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Solution Toggle & Content */}
                    {question.solution && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/50">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className={`flex items-center gap-2 text-sm font-medium transition-colors ${isExpanded ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'
                                    }`}
                            >
                                <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                                {isExpanded ? 'Çözümü Gizle' : 'Çözümü Göster'}
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 opacity-100 max-h-[500px]' : 'max-h-0 opacity-0'
                                }`}>
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Soru Çözümü</div>
                                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        <MathText text={question.solution.replace(/(\d+\.\s*(?:Adım|adım|Basamak|basamak))/g, (match, p1, offset) => offset === 0 ? match : `\n${match}`)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(question)}
                        className="text-zinc-500 hover:text-white hover:bg-zinc-800 shrink-0 h-8 w-8 rounded-lg transition-all"
                        title="Düzenle"
                    >
                        ✏️
                    </Button>
                </div>
            </div>
        </div>
    )
}

interface QuestionTableProps {
    questions: Question[]
    onEdit: (question: Question) => void
}

export function QuestionTable({ questions, onEdit }: QuestionTableProps) {
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
        <div className="space-y-4">
            {questions.map((q, index) => (
                <QuestionRow
                    key={q.id}
                    question={q}
                    index={index}
                    onEdit={onEdit}
                />
            ))}
        </div>
    )
}
