'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCw, Eye, Trash2, Save } from 'lucide-react'
import { MathText } from './math-text'


interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface Question {
    id: number
    questionText: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    category: {
        id: number
        name: string
    } | null
    solution: string | null
    imageUrl: string | null
    group?: {
        imageUrl: string | null
    } | null
}

interface EditQuestionDialogProps {
    question: Question | null
    categories: Category[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditQuestionDialog({ question, categories, open, onOpenChange, onSuccess }: EditQuestionDialogProps) {
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [formData, setFormData] = useState({
        categoryId: '',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '',
        solution: '',
        imageUrl: ''
    })

    useEffect(() => {
        if (question) {
            setFormData({
                categoryId: question.category?.id.toString() || '',
                questionText: question.questionText,
                optionA: question.optionA,
                optionB: question.optionB,
                optionC: question.optionC,
                optionD: question.optionD,
                correctAnswer: question.correctAnswer,
                solution: question.solution || '',
                imageUrl: question.group?.imageUrl || question.imageUrl || ''
            })
        }
    }, [question])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!question) return

        setLoading(true)

        try {
            const res = await fetch('/api/questions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: question.id,
                    ...formData,
                    categoryId: formData.categoryId ? parseInt(formData.categoryId) : null
                })
            })

            if (res.ok) {
                onOpenChange(false)
                onSuccess()
            }
        } catch (error) {
            console.error('Error updating question:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!question) return
        if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return

        setDeleting(true)

        try {
            const res = await fetch(`/api/questions?id=${question.id}`, { method: 'DELETE' })
            if (res.ok) {
                onOpenChange(false)
                onSuccess()
            }
        } catch (error) {
            console.error('Error deleting question:', error)
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[92vh] overflow-y-auto bg-zinc-950/95 border-white/[0.08] backdrop-blur-2xl text-white p-0 shadow-[0_0_100px_rgba(0,0,0,0.9)] rounded-[32px] custom-scrollbar">
                {/* Radiant Header */}
                <div className="relative overflow-hidden px-8 py-8 border-b border-white/[0.05]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                    <div className="relative z-10 flex flex-col gap-1">
                        <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                <RefreshCw className={`w-6 h-6 text-orange-500 ${loading ? 'animate-spin' : ''}`} />
                            </div>
                            Soruyu Güncelle
                        </DialogTitle>
                        <p className="text-zinc-500 text-sm font-medium mt-1 ml-12">
                            Mevcut sorunun içeriğini, seçeneklerini veya kategorisini düzenleyin.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 relative z-10">
                    <div className="grid grid-cols-1 gap-8">
                        {/* Category Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="category" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                Hedef Kategori
                            </Label>

                            <div className="flex flex-wrap items-center gap-4">
                                {/* Parent Category Select */}
                                <div className="w-full sm:w-[240px]">
                                    <Select
                                        value={categories.find(c => c.id.toString() === formData.categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === formData.categoryId && !c.parentId) ? formData.categoryId : "")}
                                        onValueChange={(value) => {
                                            setFormData({ ...formData, categoryId: value });
                                        }}
                                    >
                                        <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-14 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-orange-500/20 w-full">
                                            <SelectValue placeholder="Ana Kategori Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[24px] max-h-[300px] custom-scrollbar">
                                            {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                                                <SelectItem key={parent.id} value={parent.id.toString()} className="text-orange-500 font-extrabold focus:bg-orange-500/10 focus:text-orange-500 mt-1 py-3">
                                                    {parent.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Child Category Select (Animated with Framer Motion) */}
                                <AnimatePresence>
                                    {(() => {
                                        const selectedParentId = categories.find(c => c.id.toString() === formData.categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === formData.categoryId && !c.parentId) ? formData.categoryId : null);
                                        const children = categories.filter(c => c.parentId?.toString() === selectedParentId);

                                        if (selectedParentId && children.length > 0) {
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                    className="w-full sm:w-[240px]"
                                                >
                                                    <Select
                                                        value={categories.find(c => c.id.toString() === formData.categoryId && c.parentId)?.id.toString() || ""}
                                                        onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                                                    >
                                                        <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-14 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-orange-500/20 border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.05)] w-full">
                                                            <SelectValue placeholder="Alt Kategori Seçin" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[24px] max-h-[300px] custom-scrollbar">
                                                            {children.map(child => (
                                                                <SelectItem key={child.id} value={child.id.toString()} className="text-zinc-400 focus:bg-white/5 focus:text-white transition-colors py-3">
                                                                    {child.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </motion.div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-3">
                            <Label htmlFor="questionText" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                Soru Metni *
                            </Label>
                            <Textarea
                                id="questionText"
                                value={formData.questionText}
                                onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                                placeholder="Sorunuzu yazın..."
                                className="bg-white/[0.02] border-white/[0.08] focus:border-orange-500/50 focus:ring-orange-500/20 min-h-[120px] resize-none text-zinc-200 placeholder:text-zinc-700 rounded-2xl text-base p-5 transition-all duration-300"
                                required
                            />
                        </div>

                        {/* Options Grid */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                Seçenekler
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'optionA', label: 'A Şıkkı', color: 'text-zinc-500' },
                                    { id: 'optionB', label: 'B Şıkkı', color: 'text-zinc-500' },
                                    { id: 'optionC', label: 'C Şıkkı', color: 'text-zinc-500' },
                                    { id: 'optionD', label: 'D Şıkkı', color: 'text-zinc-500' }
                                ].map((opt) => (
                                    <div key={opt.id} className="space-y-2 group">
                                        <div className="flex items-center justify-between px-1">
                                            <Label htmlFor={opt.id} className={`text-[10px] font-black uppercase tracking-widest ${opt.color}`}>{opt.label}</Label>
                                        </div>
                                        <Input
                                            id={opt.id}
                                            value={(formData as any)[opt.id]}
                                            onChange={(e) => setFormData({ ...formData, [opt.id]: e.target.value })}
                                            className="bg-white/[0.02] border-white/[0.08] focus:border-orange-500/50 focus:ring-orange-500/20 h-12 rounded-xl px-4 transition-all"
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Correct Answer Selection */}
                        <div className="space-y-3">
                            <Label htmlFor="correctAnswer" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Doğru Cevap *
                            </Label>
                            <div className="flex p-1.5 bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-sm">
                                {['A', 'B', 'C', 'D'].map((ans) => (
                                    <button
                                        key={ans}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, correctAnswer: ans })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-black transition-all duration-300 ${formData.correctAnswer === ans
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.05]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {ans} Şıkkı
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Solution Text */}
                        <div className="space-y-3">
                            <Label htmlFor="solution" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                Çözüm Analizi
                            </Label>
                            <Textarea
                                id="solution"
                                value={formData.solution}
                                onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                                placeholder="Soru çözüm adımlarını detaylandırın..."
                                className="bg-white/[0.02] border-white/[0.08] focus:border-orange-500/50 focus:ring-orange-500/20 min-h-[100px] resize-none text-zinc-200 placeholder:text-zinc-700 rounded-2xl text-base p-5 transition-all duration-300"
                            />
                        </div>

                        {/* Live Preview Card */}
                        {(formData.questionText || formData.optionA || formData.optionB || formData.optionC || formData.optionD || formData.imageUrl) && (
                            <div className="relative group overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-[24px] pointer-events-none" />
                                <div className="p-6 rounded-[24px] border border-white/[0.08] bg-white/[0.01] space-y-6 backdrop-blur-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">
                                            <Eye className="w-3.5 h-3.5" />
                                            Görünüm Önizleme
                                        </div>
                                        <div className="px-3 py-1 bg-white/[0.05] rounded-full text-[9px] font-black text-zinc-500 uppercase">Düzenleme Modu</div>
                                    </div>

                                    {formData.imageUrl && (
                                        <div className="relative rounded-2xl overflow-hidden border border-white/[0.05] bg-black/40 p-2">
                                            <img
                                                src={formData.imageUrl}
                                                alt="Diagram"
                                                className="max-w-full h-40 mx-auto object-contain rounded-lg"
                                            />
                                            <div className="absolute top-4 right-4 bg-orange-500/80 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-white uppercase tracking-widest">Görsel Kaynağı</div>
                                        </div>
                                    )}

                                    {formData.questionText && (
                                        <div className="text-white text-lg font-medium leading-relaxed">
                                            <MathText text={formData.questionText} />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-2">
                                        {formData.optionA && <div className="text-zinc-400 text-sm flex gap-2"><span className="text-orange-500 font-black">A)</span> <MathText text={formData.optionA} /></div>}
                                        {formData.optionB && <div className="text-zinc-400 text-sm flex gap-2"><span className="text-orange-500 font-black">B)</span> <MathText text={formData.optionB} /></div>}
                                        {formData.optionC && <div className="text-zinc-400 text-sm flex gap-2"><span className="text-orange-500 font-black">C)</span> <MathText text={formData.optionC} /></div>}
                                        {formData.optionD && <div className="text-zinc-400 text-sm flex gap-2"><span className="text-orange-500 font-black">D)</span> <MathText text={formData.optionD} /></div>}
                                    </div>

                                    {formData.solution && (
                                        <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-2">
                                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Çözüm Detayı</div>
                                            <MathText text={formData.solution} className="text-zinc-400 text-sm block italic leading-relaxed" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleDelete}
                            disabled={loading || deleting}
                            className="flex-1 h-14 rounded-2xl text-red-500 font-black hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} />
                            {deleting ? 'SİLİNİYOR...' : 'SİL'}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || deleting}
                            className="flex-[2] bg-white hover:bg-zinc-200 text-black font-black h-14 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-0 group"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    <span>GÜNCELLENİYOR...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span>DEĞİŞİKLİKLERİ KAYDET</span>
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )

}

