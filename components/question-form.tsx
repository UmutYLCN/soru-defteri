'use client'

import { useState, Fragment } from 'react'
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
    DialogTrigger,
} from '@/components/ui/dialog'
import { MathText } from './math-text'
import { Plus, Save, Eye, X } from 'lucide-react'


interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface QuestionFormProps {
    categories: Category[]
    onSuccess: () => void
}

export function QuestionForm({ categories, onSuccess }: QuestionFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        categoryId: '',
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: '',
        solution: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    categoryId: formData.categoryId ? parseInt(formData.categoryId) : null
                })
            })

            if (res.ok) {
                setFormData({
                    categoryId: '',
                    questionText: '',
                    optionA: '',
                    optionB: '',
                    optionC: '',
                    optionD: '',
                    correctAnswer: '',
                    solution: ''
                })
                setOpen(false)
                onSuccess()
            }
        } catch (error) {
            console.error('Error creating question:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-7 py-2.5 rounded-xl shadow-lg shadow-orange-900/20 hover:shadow-orange-500/30 transition-all duration-300 flex items-center gap-2 border-0 active:scale-95">
                    <Plus className="w-5 h-5 stroke-[3px]" />
                    <span>Yeni Soru</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Yeni Soru Ekle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="category" className="text-zinc-300">Kategori</Label>
                        <Select
                            value={formData.categoryId}
                            onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                            required
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Bir kategori seçin *" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                                    <Fragment key={parent.id}>
                                        <SelectItem value={parent.id.toString()} className="text-white font-bold bg-zinc-800/50">
                                            {parent.name}
                                        </SelectItem>
                                        {categories.filter(c => c.parentId === parent.id).map(child => (
                                            <SelectItem key={child.id} value={child.id.toString()} className="text-zinc-300 pl-6 hover:bg-zinc-700">
                                                ㄴ {child.name}
                                            </SelectItem>
                                        ))}
                                    </Fragment>
                                ))}
                                {(!Array.isArray(categories) || (categories.filter(c => !c.parentId && !categories.some(child => child.parentId === c.id)).length === 0 &&
                                    categories.filter(c => !c.parentId).length === 0)) && (
                                        <div className="p-2 text-sm text-zinc-500 text-center">Önce kategori oluşturun</div>
                                    )}
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
                        </div>
                    )}


                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 border-0"
                    >
                        {loading ? 'Kaydediliyor...' : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Kaydet</span>
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
