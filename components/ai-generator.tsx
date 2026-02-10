'use client'

import { useState, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Wand2, Loader2, BookOpen, AlertCircle } from 'lucide-react'

interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface AIGeneratorProps {
    categories: Category[]
    onSuccess: (lang?: 'tr' | 'en') => void
}

export function AIGenerator({ categories, onSuccess }: AIGeneratorProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [level, setLevel] = useState('Orta')
    const [language, setLanguage] = useState('Türkçe')
    const [count, setCount] = useState('5')
    const [categoryId, setCategoryId] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Lütfen bir konu veya örnek soru girin.')
            return
        }

        if (!categoryId) {
            setError('Lütfen bir kategori seçin.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    level,
                    language,
                    count: parseInt(count),
                    categoryId: categoryId || null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu')
            }

            onSuccess(language === 'İngilizce' ? 'en' : 'tr')
            setOpen(false)
            setPrompt('')
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-orange-500/50 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-black/20 transition-all duration-300 flex items-center gap-2 border-0 active:scale-95">
                    <Wand2 className="w-5 h-5 text-orange-500" />
                    <span>AI Soru Üret</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white p-0 custom-scrollbar">
                <div className="bg-orange-500/5 px-6 py-6 border-b border-zinc-800">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Wand2 className="w-6 h-6 text-orange-500" />
                        AI Soru Üretici
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 mt-1">
                        Gemini 1.5 Flash ile saniyeler içinde kaliteli sorular hazırlayın.
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="prompt" className="text-zinc-300 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Konu veya Örnek Soru
                        </Label>
                        <Textarea
                            id="prompt"
                            placeholder="Örn: Newton'un hareket yasaları hakkında soru üret..."
                            className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/50 min-h-[120px] resize-none text-zinc-200 placeholder:text-zinc-600"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Zorluk Seviyesi</Label>
                            <Select value={level} onValueChange={setLevel}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="Kolay">Kolay</SelectItem>
                                    <SelectItem value="Orta">Orta</SelectItem>
                                    <SelectItem value="Zor">Zor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Dil</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="Türkçe">Türkçe</SelectItem>
                                    <SelectItem value="İngilizce">İngilizce</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Soru Sayısı</Label>
                            <Select value={count} onValueChange={setCount}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                    <SelectItem value="5">5 Soru</SelectItem>
                                    <SelectItem value="10">10 Soru</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Kategori *</Label>
                            <Select value={categoryId} onValueChange={setCategoryId} required>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                    <SelectValue placeholder="Bir kategori seçin *" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
                                    {(!Array.isArray(categories) || categories.length === 0) && (
                                        <div className="p-2 text-sm text-zinc-500 text-center">Önce kategori oluşturun</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            disabled={loading}
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 border-0"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Üretiliyor...
                                </>
                            ) : (
                                'Soruları Oluştur'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
