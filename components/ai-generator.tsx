'use client'

import { useState, Fragment } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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
import { Wand2, Loader2, BookOpen, AlertCircle, Calculator, Brain, BarChart3, Shuffle, Layers } from 'lucide-react'

interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface AIGeneratorProps {
    categories: Category[]
    onSuccess: (lang?: 'tr' | 'en') => void
}

const questionTypes = [
    { value: 'Hesaplama', label: 'Hesaplama', icon: Calculator, desc: 'Sayısal problem çözme' },
    { value: 'Kavramsal', label: 'Kavramsal', icon: Brain, desc: 'Teori ve anlama soruları' },
    { value: 'Grafik/Tablo', label: 'Grafik / Tablo', icon: BarChart3, desc: 'Veri yorumlama' },
    { value: 'Karışık', label: 'Karışık', icon: Shuffle, desc: 'Hepsinden karışık' },
]

export function AIGenerator({ categories, onSuccess }: AIGeneratorProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'normal' | 'integrated'>('normal')
    const [prompt, setPrompt] = useState('')
    const [questionType, setQuestionType] = useState('Karışık')
    const [count, setCount] = useState('5')
    const [integratedCount, setIntegratedCount] = useState('3')
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
            const endpoint = mode === 'normal' ? '/api/generate' : '/api/generate-grouped'
            const body = mode === 'normal'
                ? {
                    prompt,
                    questionType,
                    count: parseInt(count),
                    categoryId: categoryId || null,
                }
                : {
                    prompt,
                    subQuestionCount: parseInt(integratedCount),
                    categoryId: categoryId || null,
                }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu')
            }

            onSuccess()
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
                        Gemini AI ile sınav kalitesinde sorular üretin. Her soru otomatik olarak Türkçe ve İngilizce üretilir.
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6">
                    {/* Mode Selection */}
                    <div className="flex p-1 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                        <button
                            onClick={() => setMode('normal')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'normal'
                                ? 'bg-zinc-700 text-white shadow-lg'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Shuffle className="w-4 h-4" />
                            Bağımsız Sorular
                        </button>
                        <button
                            onClick={() => setMode('integrated')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'integrated'
                                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            Bütünleşik Soru (X-Y)
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="prompt" className="text-zinc-300 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {mode === 'normal' ? 'Konu veya Örnek Soru' : 'Senaryo / Problem Tanımı'}
                        </Label>
                        <Textarea
                            id="prompt"
                            placeholder={mode === 'normal'
                                ? "Örn: Newton'un hareket yasaları hakkında soru üret..."
                                : "Örn: Bir RLC devresi ve bu devredeki elemanların değerlerini içeren bir senaryo yazın..."
                            }
                            className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/50 min-h-[120px] resize-none text-zinc-200 placeholder:text-zinc-600"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    {mode === 'normal' ? (
                        /* Question Type Selector for Normal Questions */
                        <div className="space-y-3">
                            <Label className="text-zinc-300">Soru Tipi</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {questionTypes.map(type => {
                                    const Icon = type.icon
                                    return (
                                        <button
                                            key={type.value}
                                            onClick={() => setQuestionType(type.value)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${questionType === type.value
                                                ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/5'
                                                : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/60'
                                                }`}
                                        >
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${questionType === type.value
                                                ? 'bg-orange-500/20 text-orange-500'
                                                : 'bg-zinc-800 text-zinc-500'
                                                }`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${questionType === type.value ? 'text-orange-400' : 'text-zinc-300'
                                                    }`}>
                                                    {type.label}
                                                </div>
                                                <div className="text-[11px] text-zinc-500">{type.desc}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Integrated Info for Grouped Questions */
                        <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3">
                            <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
                                <Layers className="w-4 h-4" />
                                Bütünleşik Soru Yapısı
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Bu modda, verdiğiniz girdiye dayalı <strong>ortak bir senaryo (basamak)</strong> ve bu senaryoya bağlı birden fazla alt soru üretilir. Her alt soru, senaryonun farklı bir yönünü veya ardışık bir adımını test eder.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">
                                {mode === 'normal' ? 'Soru Sayısı' : 'Alt Soru Sayısı'}
                            </Label>
                            {mode === 'normal' ? (
                                <Select value={count} onValueChange={setCount}>
                                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectItem value="3">3 Soru</SelectItem>
                                        <SelectItem value="5">5 Soru</SelectItem>
                                        <SelectItem value="10">10 Soru</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Select value={integratedCount} onValueChange={setIntegratedCount}>
                                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectItem value="2">2 Alt Soru</SelectItem>
                                        <SelectItem value="3">3 Alt Soru</SelectItem>
                                        <SelectItem value="4">4 Alt Soru</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
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

                    {/* Info Banner */}
                    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                        <span className="text-lg">🎯</span>
                        <div className="text-[12px] text-zinc-500 leading-relaxed">
                            <strong className="text-zinc-400">Üniversite vize/final seviyesinde</strong> sorular üretilir. Yanlış şıklar, öğrencilerin sık yaptığı hatalardan türetilir. Her soru <strong className="text-zinc-400">Türkçe + İngilizce</strong> olarak otomatik oluşturulur.
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
