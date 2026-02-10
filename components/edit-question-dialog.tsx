'use client'

import { useState, useEffect } from 'react'
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
import { MathText } from './math-text'


interface Category {
    id: number
    name: string
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Soruyu Düzenle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="category" className="text-zinc-300">Kategori</Label>
                        <Select
                            value={formData.categoryId}
                            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Kategori seçin (opsiyonel)" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()} className="text-white hover:bg-zinc-700">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="questionText" className="text-zinc-300">Soru Metni *</Label>
                        <Textarea
                            id="questionText"
                            value={formData.questionText}
                            onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                            placeholder="Sorunuzu yazın..."
                            className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="optionA" className="text-zinc-300">A Şıkkı *</Label>
                            <Input
                                id="optionA"
                                value={formData.optionA}
                                onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="optionB" className="text-zinc-300">B Şıkkı *</Label>
                            <Input
                                id="optionB"
                                value={formData.optionB}
                                onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="optionC" className="text-zinc-300">C Şıkkı *</Label>
                            <Input
                                id="optionC"
                                value={formData.optionC}
                                onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="optionD" className="text-zinc-300">D Şıkkı *</Label>
                            <Input
                                id="optionD"
                                value={formData.optionD}
                                onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                                className="bg-zinc-800 border-zinc-700 text-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="correctAnswer" className="text-zinc-300">Doğru Cevap *</Label>
                        <Select
                            value={formData.correctAnswer}
                            onValueChange={(value) => setFormData({ ...formData, correctAnswer: value })}
                            required
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Doğru cevabı seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="A" className="text-white hover:bg-zinc-700">A</SelectItem>
                                <SelectItem value="B" className="text-white hover:bg-zinc-700">B</SelectItem>
                                <SelectItem value="C" className="text-white hover:bg-zinc-700">C</SelectItem>
                                <SelectItem value="D" className="text-white hover:bg-zinc-700">D</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="solution" className="text-zinc-300">Cevap Çözümü (Opsiyonel)</Label>
                        <Textarea
                            id="solution"
                            value={formData.solution}
                            onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                            placeholder="Soru çözümünü buraya yazabilirsiniz..."
                            className="bg-zinc-800 border-zinc-700 text-white min-h-[80px]"
                        />
                    </div>

                    {/* Live Preview */}
                    {(formData.questionText || formData.optionA || formData.optionB || formData.optionC || formData.optionD) && (
                        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Canlı Önizleme</Label>
                            {formData.questionText && (
                                <MathText text={formData.questionText} className="text-white block" />
                            )}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {formData.optionA && <div className="text-zinc-400">A) <MathText text={formData.optionA} /></div>}
                                {formData.optionB && <div className="text-zinc-400">B) <MathText text={formData.optionB} /></div>}
                                {formData.optionC && <div className="text-zinc-400">C) <MathText text={formData.optionC} /></div>}
                                {formData.optionD && <div className="text-zinc-400">D) <MathText text={formData.optionD} /></div>}
                            </div>
                            {formData.solution && (
                                <div className="mt-2 pt-2 border-t border-zinc-800">
                                    <Label className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Çözüm Önizleme</Label>
                                    <MathText text={formData.solution} className="text-zinc-300 text-sm block mt-1" />
                                </div>
                            )}

                            {formData.imageUrl && (
                                <div className="mt-2 pt-2 border-t border-zinc-800">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Soru Diyagramı</Label>
                                    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-black/40 p-2">
                                        <img
                                            src={formData.imageUrl}
                                            alt="Diagram"
                                            className="max-w-full h-auto mx-auto rounded-md"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    <div className="flex gap-3 pt-2">
                        <Button
                            type="submit"
                            disabled={loading || deleting}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl border-0"
                        >
                            {loading ? 'Kaydediliyor...' : '💾 Güncelle'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loading || deleting}
                            onClick={handleDelete}
                            className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold py-3 rounded-xl"
                        >
                            {deleting ? 'Siliniyor...' : '🗑️ Sil'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

