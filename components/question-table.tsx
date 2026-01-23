'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MathText } from './math-text'
import { Trash2, Edit2, ChevronDown } from 'lucide-react'
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
    category: {
        id: number
        name: string
    } | null
}

interface QuestionRowProps {
    question: Question
    index: number
    onEdit: (question: Question) => void
    onDelete: (id: number) => void
}

function QuestionRow({ question, index, onEdit, onDelete }: QuestionRowProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/questions/${question.id}`, { method: 'DELETE' })
            if (res.ok) {
                onDelete(question.id)
                setShowDeleteConfirm(false)
            }
        } catch (error) {
            console.error('Delete failed:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className={`p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-sm hover:shadow-md ${isDeleting ? 'opacity-50 grayscale' : ''}`}>
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
                                className={`flex items-center gap-2 text-sm font-semibold transition-all group ${isExpanded ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'
                                    }`}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                {isExpanded ? 'Çözümü Gizle' : 'Çözümü Göster'}
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 opacity-100 max-h-[500px]' : 'max-h-0 opacity-0'
                                }`}>
                                <div className="p-4 rounded-xl bg-emerald-500/5 border border-zinc-800/50">
                                    <div className="space-y-5">
                                        {question.solution.includes('STEP_START') ? (
                                            question.solution.split('STEP_START').filter(Boolean).map((section, i) => {
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
                                            })
                                        ) : question.solution.match(/(\d+\.\s*Adım|Adım\s*\d+)/i) ? (
                                            question.solution.split(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/gi).filter(Boolean).map((part, i, arr) => {
                                                if (part.match(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/i)) {
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
                                            })
                                        ) : (
                                            <div className="text-zinc-300 leading-relaxed text-sm whitespace-pre-wrap">
                                                <MathText text={question.solution} />
                                            </div>
                                        )}
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
                        className="text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 shrink-0 h-9 w-9 rounded-xl transition-all"
                        title="Düzenle"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 h-9 w-9 rounded-xl transition-all"
                        title="Sil"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>

                    <ConfirmDialog
                        open={showDeleteConfirm}
                        onOpenChange={setShowDeleteConfirm}
                        onConfirm={handleDelete}
                        loading={isDeleting}
                        title="Soruyu Sil"
                        description="Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
                    />
                </div>
            </div>
        </div>
    )
}

interface QuestionTableProps {
    questions: Question[]
    onEdit: (question: Question) => void
    onDelete: () => void
}

export function QuestionTable({ questions, onEdit, onDelete }: QuestionTableProps) {
    const [search, setSearch] = useState('')

    const filtered = questions.filter(q =>
        q.questionText.toLowerCase().includes(search.toLowerCase()) ||
        q.category?.name.toLowerCase().includes(search.toLowerCase())
    )

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
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                    <p className="text-zinc-500">Arama kriterine uygun soru bulunamadı.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((q, index) => (
                        <QuestionRow
                            key={q.id}
                            question={q}
                            index={index}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
